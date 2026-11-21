import express, { type Request, type Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const SHEETS_CONFIG_FILE = path.resolve(__dirname, '.tennispro-sheets.json');

interface PersistedSheetsConfig {
  webhookUrl: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  title?: string;
  savedAt: string;
}

async function readPersistedSheetsConfig(): Promise<PersistedSheetsConfig | null> {
  try {
    const raw = await fs.readFile(SHEETS_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedSheetsConfig>;
    if (!parsed || typeof parsed.webhookUrl !== 'string') return null;
    const valid = isAllowedGoogleAppsScriptUrl(parsed.webhookUrl);
    if (!valid) return null;
    return {
      webhookUrl: valid.toString(),
      spreadsheetId: typeof parsed.spreadsheetId === 'string' ? parsed.spreadsheetId : undefined,
      spreadsheetUrl: typeof parsed.spreadsheetUrl === 'string' ? parsed.spreadsheetUrl : undefined,
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function isAllowedGoogleAppsScriptUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') return null;
    if (
      parsed.hostname !== 'script.google.com' &&
      parsed.hostname !== 'script.googleusercontent.com'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Persistent Google Sheets Web App configuration endpoints
  app.get('/api/sheets-config', async (_req: Request, res: Response) => {
    const config = await readPersistedSheetsConfig();
    res.status(200).json({ ok: true, config });
  });

  app.post('/api/sheets-config', async (req: Request, res: Response) => {
    try {
      const { webhookUrl, spreadsheetId, spreadsheetUrl, title } = req.body || {};
      if (typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
        res.status(400).json({ ok: false, error: 'กรุณาระบุ Google Apps Script Web App URL' });
        return;
      }

      const validUrl = isAllowedGoogleAppsScriptUrl(webhookUrl);
      if (!validUrl) {
        res.status(400).json({
          ok: false,
          error: 'ลิงก์ต้องขึ้นต้นด้วย https://script.google.com/.../exec เท่านั้น',
        });
        return;
      }

      const existing = await readPersistedSheetsConfig();
      const nextConfig: PersistedSheetsConfig = {
        webhookUrl: validUrl.toString(),
        spreadsheetId:
          typeof spreadsheetId === 'string' && spreadsheetId.trim()
            ? spreadsheetId.trim()
            : existing?.spreadsheetId,
        spreadsheetUrl:
          typeof spreadsheetUrl === 'string' && spreadsheetUrl.trim()
            ? spreadsheetUrl.trim()
            : existing?.spreadsheetUrl,
        title: typeof title === 'string' && title.trim() ? title.trim() : existing?.title,
        savedAt: new Date().toISOString(),
      };

      await fs.writeFile(SHEETS_CONFIG_FILE, JSON.stringify(nextConfig, null, 2), 'utf8');
      res.status(200).json({ ok: true, config: nextConfig });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: `ไม่สามารถบันทึกการตั้งค่า Google Sheet ได้: ${message}` });
    }
  });

  app.delete('/api/sheets-config', async (_req: Request, res: Response) => {
    try {
      await fs.unlink(SHEETS_CONFIG_FILE);
    } catch {
      // ignore if file does not exist
    }
    res.status(200).json({ ok: true });
  });

  // Server-side proxy for Google Apps Script Web App requests (bypasses browser/iframe CORS & redirect blocks)
  app.post('/api/sheets-proxy', async (req: Request, res: Response) => {
    try {
      const { webhookUrl, method = 'POST', payload } = req.body || {};

      if (typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
        res.status(400).json({ ok: false, error: 'กรุณาระบุลิงก์ Google Apps Script Web App URL' });
        return;
      }

      const validUrl = isAllowedGoogleAppsScriptUrl(webhookUrl);
      if (!validUrl) {
        res.status(400).json({
          ok: false,
          error:
            'รูปแบบลิงก์ไม่ถูกต้อง ต้องเป็นลิงก์ https://script.google.com/.../exec ที่ได้จากการ Deploy Web App เท่านั้น',
        });
        return;
      }

      const targetMethod = method === 'GET' ? 'GET' : 'POST';
      let targetUrl = validUrl.toString();
      if (targetMethod === 'GET') {
        const sep = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${sep}action=ping&t=${Date.now()}`;
      }

      const upstreamRes = await fetch(targetUrl, {
        method: targetMethod,
        redirect: 'follow',
        headers:
          targetMethod === 'POST'
            ? { 'Content-Type': 'text/plain;charset=utf-8' }
            : undefined,
        body: targetMethod === 'POST' ? JSON.stringify(payload || {}) : undefined,
      });

      const rawText = await upstreamRes.text();

      if (!upstreamRes.ok) {
        if (
          upstreamRes.status === 401 ||
          upstreamRes.status === 403 ||
          rawText.includes('accounts.google.com') ||
          rawText.includes('ServiceLogin')
        ) {
          res.status(403).json({
            ok: false,
            error:
              'Web App ยังไม่อนุญาตให้เข้าถึงสาธารณะ กรุณาตั้งค่า "ผู้ที่มีสิทธิ์เข้าถึง = ทุกคน (Anyone)" ใน Apps Script แล้ว Deploy ใหม่ครับ',
          });
          return;
        }
        res.status(upstreamRes.status).json({
          ok: false,
          error: `ไม่สามารถเชื่อมต่อ Google Apps Script ได้ (HTTP ${upstreamRes.status})`,
        });
        return;
      }

      try {
        const data = JSON.parse(rawText);
        res.status(200).json(data);
      } catch {
        if (
          rawText.includes('accounts.google.com') ||
          rawText.includes('ServiceLogin') ||
          rawText.includes('Sign in')
        ) {
          res.status(403).json({
            ok: false,
            error:
              'ลิงก์ติดหน้าล็อกอิน Google กรุณาแก้ไขการ Deploy ใน Apps Script ให้ "ผู้ที่มีสิทธิ์เข้าถึง = ทุกคน (Anyone)" ครับ',
          });
          return;
        }
        res.status(502).json({
          ok: false,
          error:
            'ไม่พบข้อมูล JSON จาก Apps Script กรุณาตรวจสอบว่าวางโค้ดครบและนำลิงก์ Web App (/exec) มาวางถูกต้อง',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Sheets proxy error:', message);
      res.status(502).json({
        ok: false,
        error: `เชื่อมต่อ Google Apps Script ไม่สำเร็จ: ${message}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TennisPro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

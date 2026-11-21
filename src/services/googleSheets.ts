import { MatchState, PointRecord } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';

const WEBHOOK_URL_KEY = 'tennispro_sheets_webhook_url_v1';
const ACTIVE_SHEET_URL_KEY = 'tennispro_active_sheet_url';
const ACTIVE_SHEET_TITLE_KEY = 'tennispro_active_sheet_title';

export interface SheetConnectionInfo {
  webhookUrl: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  title?: string;
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  ace: 'เอซ (Ace)',
  winner: 'วินเนอร์ (Winner)',
  unforced_error: 'ตีเสียเอง (Unforced Error)',
  double_fault: 'เสิร์ฟเสีย 2 ลูก (Double Fault)',
  regular_point: 'แต้มทั่วไป',
};

const STROKE_TRANSLATIONS: Record<string, string> = {
  forehand: 'โฟร์แฮนด์',
  backhand: 'แบ็คแฮนด์',
  volley: 'วอลเลย์หน้าเน็ต',
  smash: 'สแมช',
  drop_shot: 'ดรอปช็อต',
  return_winner: 'รีเทิร์น',
  serve: 'ลูกเสิร์ฟ',
};

const ERROR_DETAIL_TRANSLATIONS: Record<string, string> = {
  net: 'ติดเน็ต',
  wide: 'ออกข้าง',
  long: 'ออกหลัง',
  unforced_return: 'รับเสิร์ฟเสีย',
  foot_fault: 'ฟุตฟอลต์',
};

export const POINT_LOG_HEADERS: string[] = [
  'แต้มที่',
  'เวลา (Timestamp)',
  'เซต (Set)',
  'เกมที่ (Game)',
  'ผู้เสิร์ฟ (Server)',
  'คอร์ตเสิร์ฟ (Court)',
  'เสิร์ฟ (Serve)',
  'ผู้ได้แต้ม (Winner)',
  'ประเภทช็อต (Category)',
  'รายละเอียดการตี (Stroke)',
  'ข้อผิดพลาด (Error Detail)',
  'แต้มพิเศษ (Context)',
  'คะแนนก่อนหน้า',
  'คะแนนปัจจุบัน',
  'รหัสแต้ม (Point ID)',
  'รหัสแมตช์ (Match ID)',
];

/**
 * Retrieves the permanently saved Google Apps Script Web App URL (no login required).
 */
export function getSheetsWebhookUrl(): string | null {
  try {
    const saved = localStorage.getItem(WEBHOOK_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore storage read error
  }
  const envUrl = (import.meta as any).env?.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim();
  }
  return null;
}

export function getSavedSheetUrl(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SHEET_URL_KEY);
  } catch {
    return null;
  }
}

export function getSavedSheetTitle(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SHEET_TITLE_KEY);
  } catch {
    return null;
  }
}

export function saveSheetsConnection(info: SheetConnectionInfo): void {
  try {
    localStorage.setItem(WEBHOOK_URL_KEY, info.webhookUrl.trim());
    if (info.spreadsheetUrl) {
      localStorage.setItem(ACTIVE_SHEET_URL_KEY, info.spreadsheetUrl);
    }
    if (info.title) {
      localStorage.setItem(ACTIVE_SHEET_TITLE_KEY, info.title);
    }
  } catch (e) {
    console.warn('Failed to save Google Sheets connection info:', e);
  }
}

export function clearSheetsConnection(): void {
  try {
    localStorage.removeItem(WEBHOOK_URL_KEY);
    localStorage.removeItem(ACTIVE_SHEET_URL_KEY);
    localStorage.removeItem(ACTIVE_SHEET_TITLE_KEY);
    localStorage.removeItem('tennispro_active_sheet_id');
  } catch {
    // ignore
  }
}

export function validateWebhookUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('กรุณาวางลิงก์ Google Apps Script Web App URL');
  }
  if (trimmed.includes('docs.google.com/spreadsheets')) {
    throw new Error(
      'ลิงก์นี้เป็นลิงก์ไฟล์ Google Sheet โดยตรง กรุณา Deploy Apps Script เป็น Web App แล้วนำลิงก์ที่ขึ้นต้นด้วย https://script.google.com/.../exec มาวางแทนครับ'
    );
  }
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol !== 'https:' ||
      (parsed.hostname !== 'script.google.com' && parsed.hostname !== 'script.googleusercontent.com')
    ) {
      throw new Error('invalid host');
    }
  } catch {
    throw new Error(
      'รูปแบบลิงก์ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://script.google.com/macros/s/.../exec'
    );
  }
  return trimmed;
}

export function formatPointRow(point: PointRecord, match: MatchState): (string | number)[] {
  const winnerName = match[point.winnerTeam]?.name || point.winnerTeam;
  const serverName = match[point.servingTeam]?.name || point.servingTeam;

  let contextTag = '';
  if (point.isMatchPoint) contextTag = '🏆 Match Point';
  else if (point.isSetPoint) contextTag = '🎯 Set Point';
  else if (point.isBreakPoint) contextTag = '⚡ Break Point';
  else if (point.isGamePoint) contextTag = 'Game Point';

  let shotDescription = '-';
  if (point.category === 'winner') {
    shotDescription = `${winnerName} ตี${STROKE_TRANSLATIONS[point.stroke || ''] || point.stroke || ''}วินเนอร์`;
  } else if (point.category === 'unforced_error') {
    const errorPlayer = point.errorPlayerName || (point.errorTeam ? match[point.errorTeam]?.name : 'ผู้เล่น');
    const strokeName = STROKE_TRANSLATIONS[point.errorStroke || ''] || point.errorStroke || '';
    const errDetailName = ERROR_DETAIL_TRANSLATIONS[point.errorDetail || ''] || point.errorDetail || '';
    shotDescription = `${errorPlayer} ตี${strokeName}${errDetailName ? ' ' + errDetailName : ''}`;
  } else if (point.category === 'double_fault') {
    shotDescription = `${serverName} เสิร์ฟเสีย 2 ลูก (ดับเบิ้ลฟอลต์)`;
  } else if (point.category === 'ace') {
    shotDescription = `${winnerName} เสิร์ฟเอซ (Ace)`;
  }

  return [
    point.pointNumberInMatch,
    new Date(point.timestamp).toLocaleTimeString('th-TH'),
    `Set ${point.setIndex + 1}`,
    `Game ${point.gameIndexInSet + 1}`,
    serverName,
    point.serveCourt === 'deuce' ? 'คอร์ตขวา (Deuce)' : 'คอร์ตซ้าย (Ad)',
    point.isSecondServe ? 'เสิร์ฟสอง' : 'เสิร์ฟแรก',
    winnerName,
    CATEGORY_TRANSLATIONS[point.category] || point.category,
    shotDescription,
    point.errorDetail || '-',
    contextTag,
    `${point.scoreBefore.game.team1} - ${point.scoreBefore.game.team2}`,
    `${point.scoreAfter.game.team1} - ${point.scoreAfter.game.team2}`,
    point.id,
    match.id,
  ];
}

function buildOverviewAndStats(match: MatchState) {
  const stats = calculateMatchStats(match.pointsHistory, match.sets);

  const t1FirstInPct =
    stats.team1.firstServesAttempted > 0
      ? Math.round((stats.team1.firstServesIn / stats.team1.firstServesAttempted) * 100) + '%'
      : '0%';
  const t2FirstInPct =
    stats.team2.firstServesAttempted > 0
      ? Math.round((stats.team2.firstServesIn / stats.team2.firstServesAttempted) * 100) + '%'
      : '0%';

  const statsRows = [
    ['หมวดหมู่สถิติ (Statistic)', match.team1.name, match.team2.name],
    ['แต้มรวมที่ได้ (Total Points Won)', stats.team1.totalPointsWon, stats.team2.totalPointsWon],
    ['เสิร์ฟแรกเข้า % (1st Serve %)', t1FirstInPct, t2FirstInPct],
    ['แต้มที่ได้จากเสิร์ฟแรก (1st Serve Won)', stats.team1.firstServePointsWon, stats.team2.firstServePointsWon],
    ['แต้มที่ได้จากเสิร์ฟสอง (2nd Serve Won)', stats.team1.secondServePointsWon, stats.team2.secondServePointsWon],
    ['เอซ (Aces)', stats.team1.aces, stats.team2.aces],
    ['ดับเบิ้ลฟอลต์ (Double Faults)', stats.team1.doubleFaults, stats.team2.doubleFaults],
    ['วินเนอร์รวม (Total Winners)', stats.team1.winners, stats.team2.winners],
    ['อันฟอร์ซเออเร่อร์ (Unforced Errors)', stats.team1.unforcedErrors, stats.team2.unforcedErrors],
    [
      'เบรกพอยต์สำเร็จ (Break Points Won)',
      `${stats.team1.breakPointsWon}/${stats.team1.breakPointsOpportunities}`,
      `${stats.team2.breakPointsWon}/${stats.team2.breakPointsOpportunities}`,
    ],
    [
      'การขึ้นหน้าเน็ตสำเร็จ (Net Points Won)',
      `${stats.team1.netPointsWon}/${stats.team1.netPointsApproaches}`,
      `${stats.team2.netPointsWon}/${stats.team2.netPointsApproaches}`,
    ],
  ];

  const scoreLine = match.sets
    .map((s, i) => {
      let str = `Set ${i + 1}: ${s.team1Games}-${s.team2Games}`;
      if (s.team1TiebreakPoints !== undefined && s.team2TiebreakPoints !== undefined) {
        str += ` (${Math.min(s.team1TiebreakPoints, s.team2TiebreakPoints)})`;
      }
      return str;
    })
    .join(' | ');

  const isDoubles = match.settings.type === 'doubles';
  const t1Players = match.team1.players?.map((p) => p.name).join(' & ') || match.team1.name;
  const t2Players = match.team2.players?.map((p) => p.name).join(' & ') || match.team2.name;

  const overviewRows = [
    ['🎾 TENNIS MATCH REPORT & LIVE SCOREBOARD', ''],
    ['วันที่บันทึก:', new Date(match.createdAt).toLocaleString('th-TH')],
    ['ประเภทการแข่ง:', isDoubles ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'],
    ['รูปแบบแมตช์:', match.settings.format],
    ['สนาม:', match.settings.courtSurface],
    ['', ''],
    ['ทีม / ผู้เล่น 1:', match.team1.name],
    ['รายชื่อผู้เล่นทีม 1:', t1Players],
    ['ทีม / ผู้เล่น 2:', match.team2.name],
    ['รายชื่อผู้เล่นทีม 2:', t2Players],
    ['สถานะการแข่ง:', match.isFinished ? 'จบการแข่งขันแล้ว' : 'กำลังแข่งขัน (LIVE)'],
    ['ผลการแข่งขัน:', match.matchWinner ? `🏆 ผู้ชนะ: ${match[match.matchWinner].name}` : '-'],
    ['สกอร์เซต:', scoreLine],
    ['แต้มปัจจุบัน:', `${match.currentGame.team1Display} - ${match.currentGame.team2Display}`],
    ['แต้มที่เล่นไปแล้วทั้งหมด:', match.pointsHistory.length],
    ['อัปเดตล่าสุด:', new Date().toLocaleTimeString('th-TH')],
  ];

  return { overviewRows, statsRows };
}

async function callAppsScriptDirect(
  webhookUrl: string,
  method: 'GET' | 'POST',
  payload?: Record<string, any>
): Promise<SheetConnectionInfo> {
  const separator = webhookUrl.includes('?') ? '&' : '?';
  const targetUrl = method === 'GET' ? `${webhookUrl}${separator}action=ping&t=${Date.now()}` : webhookUrl;

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method,
      redirect: 'follow',
      credentials: 'omit',
      headers:
        method === 'POST'
          ? { 'Content-Type': 'text/plain;charset=utf-8' }
          : undefined,
      body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    });
  } catch {
    throw new Error(
      'ไม่สามารถเชื่อมต่อ Google Apps Script ได้ กรุณาตรวจสอบใน Apps Script ว่าตั้งค่า "ผู้ที่มีสิทธิ์เข้าถึง = ทุกคน (Anyone)" และใช้ลิงก์ที่ลงท้ายด้วย /exec แล้วครับ'
    );
  }

  const rawText = await res.text();
  if (!res.ok) {
    if (
      res.status === 401 ||
      res.status === 403 ||
      rawText.includes('accounts.google.com') ||
      rawText.includes('ServiceLogin')
    ) {
      throw new Error(
        'Web App ยังตั้งค่าสิทธิ์ไม่เปิดสาธารณะ กรุณาตั้งค่า "ผู้ที่มีสิทธิ์เข้าถึง = ทุกคน (Anyone)" ใน Google Apps Script แล้ว Deploy ใหม่ครับ'
      );
    }
    throw new Error(`ไม่สามารถเชื่อมต่อ Google Apps Script ได้ (HTTP ${res.status})`);
  }

  let data: any = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    if (
      rawText.includes('accounts.google.com') ||
      rawText.includes('ServiceLogin') ||
      rawText.includes('Sign in')
    ) {
      throw new Error(
        'ลิงก์ติดหน้าล็อกอิน Google กรุณาแก้ไขการ Deploy ใน Apps Script ให้ "ผู้ที่มีสิทธิ์เข้าถึง = ทุกคน (Anyone)" ครับ'
      );
    }
    throw new Error(
      'ไม่พบข้อมูล JSON จาก Apps Script กรุณาตรวจสอบว่าวางโค้ดครบและนำลิงก์ Web App (/exec) มาวางถูกต้อง'
    );
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Google Apps Script ตอบกลับข้อผิดพลาด');
  }

  const info: SheetConnectionInfo = {
    webhookUrl,
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
    title: data.title,
  };
  saveSheetsConnection(info);
  return info;
}

async function callAppsScriptViaProxy(
  webhookUrl: string,
  method: 'GET' | 'POST',
  payload?: Record<string, any>
): Promise<SheetConnectionInfo> {
  try {
    const res = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookUrl,
        method,
        payload,
      }),
    });

    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Edge proxy / static host returned non-JSON (e.g., 403/404/405) — fall back to direct fetch
      return await callAppsScriptDirect(webhookUrl, method, payload);
    }

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `การเชื่อมต่อ Google Sheet ล้มเหลว (${res.status})`);
    }

    const info: SheetConnectionInfo = {
      webhookUrl,
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl,
      title: data.title,
    };
    saveSheetsConnection(info);
    return info;
  } catch (err: any) {
    // If proxy request itself failed at network layer, fall back to direct browser fetch
    if (err instanceof TypeError || (err?.message && err.message.includes('Failed to fetch'))) {
      return await callAppsScriptDirect(webhookUrl, method, payload);
    }
    throw err;
  }
}

async function postToAppsScript(webhookUrl: string, payload: Record<string, any>): Promise<SheetConnectionInfo> {
  return callAppsScriptViaProxy(webhookUrl, 'POST', payload);
}

/**
 * Tests connection to Google Apps Script Web App without any login and retrieves Sheet URL & title.
 */
export async function testSheetsConnection(rawUrl: string): Promise<SheetConnectionInfo> {
  const webhookUrl = validateWebhookUrl(rawUrl);
  return callAppsScriptViaProxy(webhookUrl, 'GET');
}

/**
 * Appends a single point record and updates overview + stats tabs in one login-free request.
 */
export async function appendPointToSheet(
  webhookUrl: string,
  point: PointRecord,
  match: MatchState
): Promise<SheetConnectionInfo> {
  const { overviewRows, statsRows } = buildOverviewAndStats(match);
  return postToAppsScript(webhookUrl, {
    action: 'append_point',
    matchId: match.id,
    pointId: point.id,
    pointRow: formatPointRow(point, match),
    pointLogHeaders: POINT_LOG_HEADERS,
    overviewRows,
    statsRows,
  });
}

/**
 * Syncs all points of the current match (idempotent per matchId) + updates overview & stats tabs.
 */
export async function syncAllPointsToSheet(
  webhookUrl: string,
  match: MatchState
): Promise<SheetConnectionInfo> {
  const { overviewRows, statsRows } = buildOverviewAndStats(match);
  const pointRows = match.pointsHistory.map((pt) => formatPointRow(pt, match));
  return postToAppsScript(webhookUrl, {
    action: 'sync_all',
    matchId: match.id,
    pointRows,
    pointLogHeaders: POINT_LOG_HEADERS,
    overviewRows,
    statsRows,
  });
}

/**
 * Updates full statistics tab and overview in Google Sheet without requiring login.
 */
export async function updateMatchSummarySheet(
  webhookUrl: string,
  match: MatchState
): Promise<SheetConnectionInfo> {
  const { overviewRows, statsRows } = buildOverviewAndStats(match);
  return postToAppsScript(webhookUrl, {
    action: 'update_summary',
    matchId: match.id,
    pointLogHeaders: POINT_LOG_HEADERS,
    overviewRows,
    statsRows,
  });
}

export const APPS_SCRIPT_CODE = `// TennisPro Live Sync - Google Apps Script (ไม่ต้องล็อกอิน เชื่อมต่อตลอดเวลา)
// วิธีใช้: วางโค้ดนี้ใน ส่วนขยาย > Apps Script > บันทึก > Deploy เป็น Web App (สิทธิ์: ทุกคน / Anyone)

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return jsonOut({
    ok: true,
    title: ss.getName(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var payload = JSON.parse(e.postData.contents || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var overviewSheet = getOrCreateSheet(ss, 'สรุปภาพรวมการแข่งขัน');
    var logSheet = getOrCreateSheet(ss, 'บันทึกแต้มเรียลไทม์');
    var statsSheet = getOrCreateSheet(ss, 'สถิติฟอร์มผู้เล่น');

    if (payload.pointLogHeaders && logSheet.getLastRow() === 0) {
      logSheet.getRange(1, 1, 1, payload.pointLogHeaders.length).setValues([payload.pointLogHeaders]);
      logSheet.setFrozenRows(1);
    }

    if (payload.action === 'append_point' && payload.pointRow) {
      var isDuplicate = false;
      var lastRow = logSheet.getLastRow();
      if (lastRow > 1 && payload.pointId) {
        var checkStart = Math.max(2, lastRow - 60);
        var checkRows = logSheet.getRange(checkStart, 15, lastRow - checkStart + 1, 1).getValues();
        for (var i = 0; i < checkRows.length; i++) {
          if (String(checkRows[i][0]) === String(payload.pointId)) {
            isDuplicate = true;
            break;
          }
        }
      }
      if (!isDuplicate) {
        logSheet.appendRow(payload.pointRow);
      }
    } else if (payload.action === 'sync_all') {
      var existingLastRow = logSheet.getLastRow();
      if (existingLastRow > 1 && payload.matchId) {
        var allValues = logSheet.getRange(2, 1, existingLastRow - 1, 16).getValues();
        var keptRows = [];
        for (var r = 0; r < allValues.length; r++) {
          if (String(allValues[r][15]) !== String(payload.matchId)) {
            keptRows.push(allValues[r]);
          }
        }
        logSheet.getRange(2, 1, existingLastRow - 1, 16).clearContent();
        var merged = keptRows.concat(payload.pointRows || []);
        if (merged.length > 0) {
          logSheet.getRange(2, 1, merged.length, merged[0].length).setValues(merged);
        }
      } else if (payload.pointRows && payload.pointRows.length > 0) {
        logSheet.getRange(2, 1, payload.pointRows.length, payload.pointRows[0].length).setValues(payload.pointRows);
      }
    }

    if (payload.overviewRows && payload.overviewRows.length > 0) {
      overviewSheet.getRange(1, 1, payload.overviewRows.length, 2).setValues(payload.overviewRows);
    }

    if (payload.statsRows && payload.statsRows.length > 0) {
      statsSheet.getRange(1, 1, payload.statsRows.length, 3).setValues(payload.statsRows);
    }

    return jsonOut({
      ok: true,
      title: ss.getName(),
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl()
    });
  } catch (err) {
    return jsonOut({ ok: false, error: err && err.message ? err.message : String(err) });
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

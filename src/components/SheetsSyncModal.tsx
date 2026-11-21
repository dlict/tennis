import React, { useState, useEffect, useRef } from 'react';
import { MatchState } from '../types/tennis';
import {
  APPS_SCRIPT_CODE,
  clearSheetsConnectionPersistent,
  getDraftWebhookUrl,
  saveDraftWebhookUrl,
  saveSheetsConnectionPersistent,
  syncAllPointsToSheet,
  testSheetsConnection,
  validateWebhookUrl,
} from '../services/googleSheets';
import { offlineSync } from '../services/offlineSync';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Wifi,
  WifiOff,
  X,
  AlertCircle,
  Check,
  Zap,
  Copy,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string | null;
  activeSheetUrl: string | null;
  activeSheetTitle: string | null;
  onConnectionUpdated: (info: {
    webhookUrl: string | null;
    sheetUrl: string | null;
    sheetTitle: string | null;
  }) => void;
  onSavedAndHidden?: () => void;
  match: MatchState;
  isOnline: boolean;
  pendingSyncCount: number;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  activeSheetUrl,
  activeSheetTitle,
  onConnectionUpdated,
  onSavedAndHidden,
  match,
  isOnline,
  pendingSyncCount,
}) => {
  const [urlInput, setUrlInput] = useState(() => webhookUrl || getDraftWebhookUrl() || '');
  const [isEditingUrl, setIsEditingUrl] = useState(!webhookUrl);
  const [showGuide, setShowGuide] = useState(!webhookUrl);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [canForceSaveUrl, setCanForceSaveUrl] = useState(false);
  const autoCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(webhookUrl || getDraftWebhookUrl() || '');
      setIsEditingUrl(!webhookUrl);
      setShowGuide(!webhookUrl);
      setErrorMessage(null);
      setSuccessMessage(null);
      setCanForceSaveUrl(false);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        window.clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [isOpen, webhookUrl]);

  if (!isOpen) return null;

  const isConnected = Boolean(webhookUrl);

  const scheduleAutoHide = (delayMs = 650) => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = window.setTimeout(() => {
      onSavedAndHidden?.();
      onClose();
    }, delayMs);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      setErrorMessage('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคัดลอกโค้ดในกล่องด้านล่างด้วยตนเอง');
    }
  };

  const handleForceSaveAndHide = async () => {
    setErrorMessage(null);
    setCanForceSaveUrl(false);
    try {
      const validUrl = validateWebhookUrl(urlInput);
      await saveSheetsConnectionPersistent({ webhookUrl: validUrl });
      onConnectionUpdated({
        webhookUrl: validUrl,
        sheetUrl: activeSheetUrl,
        sheetTitle: activeSheetTitle,
      });
      setIsEditingUrl(false);
      setShowGuide(false);
      setSuccessMessage('บันทึกลิงก์ Google Sheet ถาวรแล้ว! กำลังซ่อนหน้าต่างอัตโนมัติ...');
      scheduleAutoHide(650);
    } catch (err: any) {
      setErrorMessage(err?.message || 'รูปแบบลิงก์ไม่ถูกต้อง');
    }
  };

  const handleConnectAndSync = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsConnecting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCanForceSaveUrl(false);

    try {
      const validUrl = validateWebhookUrl(urlInput);
      saveDraftWebhookUrl(validUrl);

      // If offline, permanently save immediately & auto-hide without waiting for network
      if (!isOnline) {
        await saveSheetsConnectionPersistent({ webhookUrl: validUrl });
        onConnectionUpdated({
          webhookUrl: validUrl,
          sheetUrl: activeSheetUrl,
          sheetTitle: activeSheetTitle,
        });
        setIsEditingUrl(false);
        setShowGuide(false);
        setSuccessMessage('บันทึก Google Sheet ถาวรแล้ว! ระบบซ่อนหน้าต่างและจะซิงค์ทันทีที่ต่อเน็ต');
        scheduleAutoHide(800);
        return;
      }

      const info = await testSheetsConnection(validUrl);
      await syncAllPointsToSheet(info.webhookUrl, match);
      await saveSheetsConnectionPersistent(info);
      onConnectionUpdated({
        webhookUrl: info.webhookUrl,
        sheetUrl: info.spreadsheetUrl || null,
        sheetTitle: info.title || null,
      });
      setIsEditingUrl(false);
      setShowGuide(false);
      setSuccessMessage(
        `บันทึก "${info.title || 'Google Sheet'}" ถาวรแล้ว! ระบบซ่อนหน้าต่างและซิงค์ให้อัตโนมัติตลอดเวลา`
      );
      scheduleAutoHide(700);
    } catch (err: any) {
      console.warn('Sheets connection warning:', err);
      const msg = err?.message || 'ไม่สามารถเชื่อมต่อ Google Sheet ได้';
      setErrorMessage(msg);
      try {
        validateWebhookUrl(urlInput);
        setCanForceSaveUrl(true);
      } catch {
        setCanForceSaveUrl(false);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAllNow = async () => {
    if (!webhookUrl) {
      setErrorMessage('กรุณาวางลิงก์ Google Apps Script Web App ก่อน');
      return;
    }
    setIsManualSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const info = await syncAllPointsToSheet(webhookUrl, match);
      await offlineSync.processQueue();
      await saveSheetsConnectionPersistent(info);
      onConnectionUpdated({
        webhookUrl: info.webhookUrl,
        sheetUrl: info.spreadsheetUrl || activeSheetUrl,
        sheetTitle: info.title || activeSheetTitle,
      });
      setSuccessMessage('ซิงค์ชื่อผู้เล่น สกอร์เซต แต้ม และสถิติทั้งหมดลง Google Sheet เรียบร้อยแล้ว!');
    } catch (err: any) {
      console.warn('Sheets sync warning:', err);
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await clearSheetsConnectionPersistent();
    onConnectionUpdated({ webhookUrl: null, sheetUrl: null, sheetTitle: null });
    setUrlInput('');
    setIsEditingUrl(true);
    setShowGuide(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setCanForceSaveUrl(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg max-h-[92vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100 flex flex-col overflow-hidden">
        {/* Sticky Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Google Sheets Live Sync (ไม่ต้องล็อกอิน)
              </h3>
              <p className="text-[10px] text-slate-400 leading-tight">
                เชื่อมต่อตลอดเวลา บันทึกชื่อ สกอร์ และแต้มสดอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition shadow-xs"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>ปิด</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
          {/* Online / Connection Status Bar */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>
                    {isConnected ? 'ออนไลน์ • เชื่อมต่อตลอดเวลา' : 'ออนไลน์ • รอใส่ลิงก์ชีต'}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>ออฟไลน์ (เก็บในเครื่อง &amp; ซิงค์เมื่อต่อเน็ต)</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">
                แต้มรอซิงค์: <strong className="text-white">{pendingSyncCount}</strong>
              </span>
              {pendingSyncCount > 0 && isOnline && isConnected && (
                <button
                  onClick={handleSyncAllNow}
                  disabled={isManualSyncing}
                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>ซิงค์เลย</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {canForceSaveUrl && (
                <button
                  type="button"
                  onClick={handleForceSaveAndHide}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-emerald-300 font-bold text-[11px] transition"
                >
                  บันทึกลิงก์นี้ไว้ถาวรและซ่อนหน้าต่างเลย (ซิงค์อัตโนมัติทีหลัง)
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Connected Summary Card */}
          {isConnected && !isEditingUrl && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="break-words">
                    {activeSheetTitle ? `เชื่อมต่อแล้ว: ${activeSheetTitle}` : 'เชื่อมต่อ Google Sheet ถาวรแล้ว'}
                  </span>
                </span>
                <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded font-mono shrink-0">
                  ALWAYS ON
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                ไม่ต้องล็อกอินอีกต่อไป — ข้อมูลผู้เล่น ({match.team1.name} vs {match.team2.name}),
                สกอร์เซต, แต้มต่อแต้ม และสถิติทั้งหมดจะบันทึกสดอัตโนมัติตลอดเวลา
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {activeSheetUrl && (
                  <a
                    href={activeSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดดูใน Google Sheets</span>
                  </a>
                )}

                <button
                  onClick={handleSyncAllNow}
                  disabled={isManualSyncing}
                  className={`py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm ${
                    !activeSheetUrl ? 'sm:col-span-2' : ''
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                  <span>{isManualSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ซิงค์ข้อมูลทั้งหมดเดี๋ยวนี้'}</span>
                </button>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px]">
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  className="text-slate-400 hover:text-white underline transition flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  <span>เปลี่ยนลิงก์ Google Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-rose-400/80 hover:text-rose-300 transition flex items-center gap-1"
                >
                  <Unlink className="w-3 h-3" />
                  <span>ยกเลิกการเชื่อมต่อ</span>
                </button>
              </div>
            </div>
          )}

          {/* Webhook URL Input Form */}
          {isEditingUrl && (
            <form
              onSubmit={handleConnectAndSync}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>ลิงก์ Google Apps Script Web App URL (ตั้งค่าครั้งเดียว)</span>
                </label>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => setIsEditingUrl(false)}
                    className="text-[10px] text-slate-400 hover:text-white"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>

              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setUrlInput(val);
                  saveDraftWebhookUrl(val);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:outline-none text-xs text-white placeholder:text-slate-500 font-mono"
                required
              />

              <button
                type="submit"
                disabled={isConnecting || !urlInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {isConnecting
                    ? 'กำลังบันทึกและทดสอบการเชื่อมต่อ...'
                    : 'บันทึก Google Sheet ถาวรและซ่อนทันที'}
                </span>
              </button>
            </form>
          )}

          {/* Collapsible 3-Step Setup Guide (hidden automatically after connected unless editing) */}
          {(!isConnected || isEditingUrl) && (
          <div className="rounded-xl bg-slate-950/50 border border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-slate-300 hover:bg-slate-900/60 transition"
            >
              <span>วิธีเชื่อม Google Sheet แบบไม่ต้องล็อกอิน (ทำครั้งเดียว ใช้ได้ตลอด)</span>
              {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showGuide && (
              <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                  <li>
                    เปิดไฟล์ Google Sheet ที่ต้องการใช้งาน → กดเมนู{' '}
                    <strong className="text-white">ส่วนขยาย (Extensions)</strong> →{' '}
                    <strong className="text-white">Apps Script</strong>
                  </li>
                  <li>
                    ลบโค้ดเดิมออกทั้งหมด แล้วกดปุ่ม{' '}
                    <strong className="text-emerald-400">คัดลอกโค้ด Apps Script</strong> ด้านล่างไปวางแทน จากนั้นกดบันทึก (💾)
                  </li>
                  <li>
                    กดปุ่ม <strong className="text-white">ทำให้ใช้งานได้ (Deploy)</strong> →{' '}
                    <strong className="text-white">การทำให้ใช้งานได้รายการใหม่</strong> → เลือกประเภท{' '}
                    <strong className="text-white">เว็บแอป (Web app)</strong> → ช่อง{' '}
                    <strong className="text-amber-300">ผู้ที่มีสิทธิ์เข้าถึง เลือก &quot;ทุกคน (Anyone)&quot;</strong> → กด Deploy แล้วคัดลอกลิงก์{' '}
                    <span className="font-mono text-emerald-300">/exec</span> มาวางด้านบนได้เลย!
                  </li>
                </ol>

                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>คัดลอกโค้ด Apps Script แล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกโค้ด Apps Script (1 คลิก)</span>
                    </>
                  )}
                </button>

                <pre className="max-h-28 overflow-y-auto p-2 rounded-lg bg-slate-900 border border-slate-800 text-[9px] text-slate-400 font-mono leading-snug select-all">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>
            )}
          </div>
          )}

          {/* Feature summary bullet list */}
          <div className="text-[10px] text-slate-400 space-y-0.5 bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
            <p className="font-semibold text-slate-300">ข้อมูลที่บันทึกลง Google Sheet ครบถ้วน:</p>
            <p>• <strong>แท็บ 1 สรุปภาพรวม:</strong> รายชื่อผู้เล่น, ผลแพ้ชนะ, สกอร์เซตสด</p>
            <p>• <strong>แท็บ 2 บันทึกแต้ม:</strong> แต้มต่อแต้มพร้อมช็อต, วินเนอร์, เสียเอง, เบรกพอยต์</p>
            <p>• <strong>แท็บ 3 สถิติ:</strong> % เสิร์ฟแรก, เอซ, ดับเบิ้ลฟอลต์, วินเนอร์, การขึ้นหน้าเน็ต</p>
          </div>
        </div>

        {/* Sticky Modal Footer */}
        <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 text-xs font-bold border border-slate-700 transition text-center"
          >
            ปิดหน้าต่าง (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

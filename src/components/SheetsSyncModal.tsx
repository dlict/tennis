import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { MatchState } from '../types/tennis';
import { createTennisMatchSheet } from '../services/googleSheets';
import { offlineSync } from '../services/offlineSync';
import { googleSignIn, logout } from '../services/firebaseAuth';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Wifi,
  WifiOff,
  X,
  LogOut,
  AlertCircle,
} from 'lucide-react';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
  activeSheetUrl: string | null;
  activeSheetId: string | null;
  onSheetCreated: (id: string, url: string) => void;
  match: MatchState;
  isOnline: boolean;
  pendingSyncCount: number;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
  activeSheetUrl,
  activeSheetId,
  onSheetCreated,
  match,
  isOnline,
  pendingSyncCount,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'การเข้าสู่ระบบ Google ไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!user) {
      setErrorMessage('กรุณาลงชื่อเข้าใช้ Google ก่อนสร้างชีต');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await createTennisMatchSheet(match);
      onSheetCreated(res.spreadsheetId, res.spreadsheetUrl);
      localStorage.setItem('tennispro_active_sheet_id', res.spreadsheetId);
      localStorage.setItem('tennispro_active_sheet_url', res.spreadsheetUrl);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'ไม่สามารถสร้าง Google Sheet ได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    setIsManualSyncing(true);
    try {
      await offlineSync.processQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onUserChange(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Sheets Real-Time Sync</h3>
              <p className="text-xs text-slate-400">บันทึกแต้มและสรุปผลสดลง Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Online / Offline status badge */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Wifi className="w-4 h-4" />
                <span>สถานะ: ออนไลน์ (พร้อมซิงค์)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <WifiOff className="w-4 h-4" />
                <span>สถานะ: ออฟไลน์ (บันทึกในเครื่อง)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              แต้มรอซิงค์: <strong className="text-white">{pendingSyncCount}</strong>
            </span>
            {pendingSyncCount > 0 && isOnline && (
              <button
                onClick={handleForceSync}
                disabled={isManualSyncing}
                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
                <span>ซิงค์เลย</span>
              </button>
            )}
          </div>
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Section */}
        {!user ? (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col items-center text-center gap-3">
            <p className="text-xs text-slate-300">
              เข้าสู่ระบบด้วยบัญชี Google เพื่อเชื่อมต่อและสร้าง Google Spreadsheet
              สำหรับบันทึกผลการแข่งขันนี้
            </p>

            {/* Official Material Design "Sign in with Google" button */}
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex items-center gap-3 px-4 py-2.5 bg-white text-slate-800 font-semibold text-xs rounded-xl shadow-md hover:bg-slate-100 active:scale-98 transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'ลงชื่อเข้าใช้ด้วย Google (Sign in)'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* User Profile Card */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-white">{user.displayName || 'Google User'}</div>
                  <div className="text-[10px] text-slate-400">{user.email}</div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>

            {/* Active Spreadsheet Details */}
            {activeSheetUrl ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>เชื่อมต่อกับ Google Sheet สำเร็จแล้ว</span>
                  </span>
                  <span className="text-[10px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                    LIVE SYNC
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  ทุกคะแนนที่กดนับและสถิติการเล่นจะถูกเขียนลงใน Google Sheet
                  นี้ทันทีแบบเรียลไทม์
                </p>

                <div className="pt-1 flex items-center gap-2">
                  <a
                    href={activeSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดดูใน Google Sheets</span>
                  </a>

                  <button
                    onClick={handleCreateSheet}
                    disabled={isLoading}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                    title="สร้างสเปรดชีตใหม่สำหรับแมตช์นี้"
                  >
                    {isLoading ? 'กำลังสร้าง...' : 'สร้างชีตใหม่'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col items-center text-center gap-2.5">
                <p className="text-xs text-slate-300">
                  กดปุ่มด้านล่างเพื่อสร้างไฟล์ Google Spreadsheet สำหรับแมตช์{' '}
                  <strong className="text-white">
                    {match.team1.name} vs {match.team2.name}
                  </strong>
                </p>

                <button
                  onClick={handleCreateSheet}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isLoading ? 'กำลังสร้างชีต...' : 'สร้าง Google Sheet สำหรับแมตช์นี้'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feature summary bullet list */}
        <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
          <p className="font-semibold text-slate-300">ข้อมูลที่จะบันทึกลงในชีต:</p>
          <p>• แท็บ 1: สรุปภาพรวมแมตช์และสกอร์เซตสด</p>
          <p>• แท็บ 2: บันทึกแต้มต่อแต้ม (Point-by-point log) พร้อมสาเหตุการได้/เสียแต้ม</p>
          <p>• แท็บ 3: ตารางสถิติผู้เล่น (1st Serve %, เอซ, วินเนอร์, อันฟอร์ซเออเร่อร์, เบรกพอยต์)</p>
          <p>• ทำงานออฟไลน์ได้อัตโนมัติ โดยคิวจะซิงค์ขึ้นชีตทันทีที่เน็ตกลับมา</p>
        </div>
      </div>
    </div>
  );
};

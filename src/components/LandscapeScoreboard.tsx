import React, { useState, useEffect } from 'react';
import { MatchState, ShotCategory, StrokeType, ErrorDetail } from '../types/tennis';
import { detectPointContext } from '../utils/tennisEngine';
import { InteractiveCourt } from './InteractiveCourt';
import { PWAInstallButton } from './PWAInstallButton';
import {
  RotateCcw,
  AlertTriangle,
  BarChart2,
  FileSpreadsheet,
  Settings,
  Flame,
  Zap,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Edit3,
  UserCheck,
  AlertOctagon,
  History,
  Timer,
} from 'lucide-react';

interface LandscapeScoreboardProps {
  match: MatchState;
  onAwardPoint: (
    winner: 'team1' | 'team2',
    category?: ShotCategory,
    details?: {
      stroke?: StrokeType;
      errorTeam?: 'team1' | 'team2';
      errorPlayerName?: string;
      errorStroke?: StrokeType;
      errorDetail?: ErrorDetail;
    }
  ) => void;
  onOpenDetailModal: (mode: 'winner' | 'error', team: 'team1' | 'team2') => void;
  onOpenEditPlayers: () => void;
  onUndo: () => void;
  onFirstServeFault: () => void;
  onSecondServeFault: () => void;
  onResetServeFault: () => void;
  onToggleServer: () => void;
  onOpenAnalytics: () => void;
  onOpenInfographic: () => void;
  onOpenSheetsSync: () => void;
  onOpenSettings: () => void;
  onOpenPointHistory?: () => void;
  isOnline: boolean;
  activeSheetUrl: string | null;
  pendingSyncCount: number;
}

export const LandscapeScoreboard: React.FC<LandscapeScoreboardProps> = ({
  match,
  onAwardPoint,
  onOpenDetailModal,
  onOpenEditPlayers,
  onUndo,
  onFirstServeFault,
  onSecondServeFault,
  onResetServeFault,
  onToggleServer,
  onOpenAnalytics,
  onOpenInfographic,
  onOpenSheetsSync,
  onOpenSettings,
  onOpenPointHistory,
  isOnline,
  activeSheetUrl,
  pendingSyncCount,
}) => {
  const { team1, team2, sets, currentSetIndex, currentGame, currentServerTeam, isFirstServeFault } =
    match;

  const currentSet = sets[currentSetIndex] || { team1Games: 0, team2Games: 0 };
  const pointContext = detectPointContext(match);

  const isServerT1 = currentServerTeam === 'team1';
  const isServerT2 = currentServerTeam === 'team2';

  // 25-second Serve Shot Clock
  const [serveClock, setServeClock] = useState<number>(25);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  useEffect(() => {
    let timerId: any = null;
    if (isClockRunning && serveClock > 0) {
      timerId = setInterval(() => {
        setServeClock((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (serveClock === 0) {
      setIsClockRunning(false);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isClockRunning, serveClock]);

  const handleResetClock = () => {
    setServeClock(25);
    setIsClockRunning(true);
  };

  // Total games played in set
  const totalGamesInSet = currentSet.team1Games + currentSet.team2Games;
  const isChangeEndsNow =
    totalGamesInSet > 0 &&
    totalGamesInSet % 2 === 1 &&
    currentGame.team1Points === 0 &&
    currentGame.team2Points === 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. TOP STATUS BAR */}
      <header className="h-10 shrink-0 bg-slate-900/95 border-b border-slate-800 px-3 flex items-center justify-between text-xs backdrop-blur-xs z-30">
        {/* Left: App Logo & Mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-black text-emerald-400 tracking-wide text-xs">
            <span className="text-base leading-none">🎾</span>
            <span className="hidden sm:inline">TennisPro</span>
          </div>

          <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-semibold">
            {match.settings.type === 'doubles' ? 'คู่ (Doubles)' : 'เดี่ยว (Singles)'} • Set {currentSetIndex + 1}
          </span>

          {/* Change Ends Alert */}
          {isChangeEndsNow && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>เปลี่ยนแดน</span>
            </span>
          )}

          {/* Point Context Alert */}
          {pointContext.isMatchPoint && (
            <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider animate-bounce">
              🏆 MATCH POINT
            </span>
          )}
          {pointContext.isSetPoint && !pointContext.isMatchPoint && (
            <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider animate-pulse">
              🎯 SET POINT
            </span>
          )}
          {pointContext.isBreakPoint && !pointContext.isSetPoint && !pointContext.isMatchPoint && (
            <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider">
              ⚡ BREAK POINT
            </span>
          )}
        </div>

        {/* Center: Live Set Scores Table */}
        <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">SETS:</span>
          {sets.map((s, idx) => {
            const isCurrent = idx === currentSetIndex;
            return (
              <div
                key={idx}
                className={`px-1.5 py-0.5 rounded text-[11px] font-black flex items-center gap-0.5 ${
                  isCurrent
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400'
                }`}
              >
                <span>{s.team1Games}</span>
                <span className="text-slate-600">-</span>
                <span>{s.team2Games}</span>
                {s.team1TiebreakPoints !== undefined && (
                  <sup className="text-[8px] text-amber-300">
                    ({Math.min(s.team1TiebreakPoints, s.team2TiebreakPoints || 0)})
                  </sup>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Actions, Edit Players, Sheets Sync */}
        <div className="flex items-center gap-1.5">
          {/* Edit Players / Server Selector */}
          <button
            onClick={onOpenEditPlayers}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition"
            title="แก้ไขชื่อผู้เข้าแข่งขัน & กำหนดผู้เสิร์ฟ"
          >
            <Edit3 className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">ชื่อ/คนเสิร์ฟ</span>
          </button>

          {/* Sheets Live Sync Badge */}
          <button
            onClick={onOpenSheetsSync}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
              activeSheetUrl
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Google Sheets Live Sync"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Google Sheets</span>
            {pendingSyncCount > 0 ? (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center animate-pulse">
                {pendingSyncCount}
              </span>
            ) : isOnline ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Infographic Button */}
          <button
            onClick={onOpenInfographic}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold transition"
            title="สร้างภาพประกอบสรุปสถิติ (Infographic)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">ภาพสรุป</span>
          </button>

          {/* Analytics Modal Button */}
          <button
            onClick={onOpenAnalytics}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition"
            title="ดูกราฟวิเคราะห์"
          >
            <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">กราฟ</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="ตั้งค่าแมตช์ใหม่"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN HORIZONTAL SCORING ARENA */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-1.5 p-1.5 relative overflow-hidden">
        {/* ================= LEFT SIDE: TEAM 1 CARD (Col 1-4) ================= */}
        <div className="col-span-4 h-full flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border border-emerald-800/60 p-2.5 relative shadow-xl overflow-hidden">
          {/* Header & Server Toggle */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <div
              onClick={onOpenEditPlayers}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition truncate"
              title="คลิกเพื่อแก้ไขชื่อผู้เล่น"
            >
              <h2 className="text-sm font-black text-emerald-400 truncate leading-tight">
                {team1.name}
              </h2>
              <Edit3 className="w-3 h-3 text-slate-500 hover:text-emerald-300 shrink-0" />
            </div>

            <div className="flex items-center gap-1">
              {/* Server indicator / toggle button */}
              <button
                onClick={onToggleServer}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black transition ${
                  isServerT1
                    ? 'bg-yellow-400 text-slate-950 shadow animate-pulse'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="คลิกเพื่อกำหนดให้คนนี้เสิร์ฟ"
              >
                <span>🎾 {isServerT1 ? (isFirstServeFault ? 'เสิร์ฟ 2' : 'เสิร์ฟ 1') : 'รับ'}</span>
              </button>

              <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {currentSet.team1Games} เกม
              </span>
            </div>
          </div>

          {/* Giant Score Display */}
          <div className="my-auto py-1 text-center flex flex-col items-center justify-center">
            <div
              className={`font-mono text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md ${
                currentGame.team1Display === 'AD' ? 'text-amber-300 scale-105' : 'text-white'
              }`}
            >
              {currentGame.team1Display}
            </div>
            {currentGame.isTiebreak && (
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                TIE-BREAK
              </span>
            )}
          </div>

          {/* MAIN BUTTONS (Big, touch-friendly, with popup trigger for detailed breakdown) */}
          <div className="space-y-1.5 shrink-0">
            {/* Primary Big Point Button */}
            <button
              onClick={() => onAwardPoint('team1', 'regular_point')}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ แต้มปกติ ({team1.name.slice(0, 8)})</span>
            </button>

            {/* Popup Detail Buttons: Winner vs Error */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onOpenDetailModal('winner', 'team1')}
                className="py-2 px-2 rounded-xl bg-emerald-950/70 border border-emerald-700/60 hover:bg-emerald-900 active:scale-95 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 shadow transition"
                title="ระบุรายละเอียดลูกวินเนอร์ (โฟร์แฮนด์, แบ็คแฮนด์, วอลเลย์, สแมช)"
              >
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>🏆 วินเนอร์...</span>
              </button>

              <button
                onClick={() => onOpenDetailModal('error', 'team2')}
                className="py-2 px-2 rounded-xl bg-rose-950/70 border border-rose-700/60 hover:bg-rose-900 active:scale-95 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 shadow transition"
                title="ระบุรายละเอียดคนตีเสีย (ใครตีเสีย, ตีลูกอะไร, ติดเน็ตหรือออก)"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>❌ คู่แข่งตีเสีย...</span>
              </button>
            </div>

            {/* Quick 1-Tap: Ace (if server) or Opponent Double Fault (if receiver) */}
            <div>
              {isServerT1 ? (
                <button
                  onClick={() => onAwardPoint('team1', 'ace', { stroke: 'serve' })}
                  className="w-full py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold active:scale-95 flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                  title="เสิร์ฟเอซ 1 แตะ"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ เสิร์ฟเอซ (Ace - 1 แตะ)</span>
                </button>
              ) : (
                <button
                  onClick={onSecondServeFault}
                  className="w-full py-1.5 px-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-bold active:scale-95 flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                  title="คู่แข่งเสิร์ฟเสีย 2 ลูก (ดับเบิ้ลฟอลต์)"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>🚨 คู่แข่งเสีย 2 ลูก (Double Fault)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= CENTER: COURT & REFEREE SERVE DOCK (Col 5-8) ================= */}
        <div className="col-span-4 h-full flex flex-col justify-between rounded-2xl bg-slate-900/70 border border-slate-800 p-1.5 overflow-hidden">
          {/* Interactive Court Component */}
          <div className="flex-1 flex flex-col justify-center min-h-0">
            <InteractiveCourt match={match} />
          </div>

          {/* Center Referee Controls Bar */}
          <div className="shrink-0 pt-1 border-t border-slate-800 flex flex-col gap-1">
            {/* SERVE FAULT BUTTONS */}
            <div className="flex items-center gap-1">
              {!isFirstServeFault ? (
                /* 1st Serve Fault */
                <button
                  onClick={onFirstServeFault}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/60 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow transition"
                  title="เสิร์ฟแรกเสีย จะเปลี่ยนเป็นสถานะเสิร์ฟสอง"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚠️ เสิร์ฟเสียลูกแรก (1st Fault)</span>
                </button>
              ) : (
                /* 2nd Serve Fault -> DOUBLE FAULT */
                <div className="flex-1 flex items-center gap-1">
                  <button
                    onClick={onSecondServeFault}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 shadow-lg shadow-red-950 animate-pulse transition"
                    title="เสิร์ฟเสียลูกสอง -> เป็นดับเบิ้ลฟอลต์ ฝ่ายตรงข้ามได้แต้มทันที"
                  >
                    <AlertOctagon className="w-4 h-4 text-white" />
                    <span>🚨 เสิร์ฟเสียลูกที่ 2 (ดับเบิ้ลฟอลต์!)</span>
                  </button>

                  <button
                    onClick={onResetServeFault}
                    className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-semibold active:scale-95 transition"
                    title="ยกเลิกฟอลต์เสิร์ฟแรก (เสิร์ฟใหม่ / Let)"
                  >
                    เสิร์ฟใหม่
                  </button>
                </div>
              )}

              {/* Point History Log */}
              {onOpenPointHistory && (
                <button
                  onClick={onOpenPointHistory}
                  className="py-1.5 px-2 rounded-xl bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 active:scale-95 text-indigo-200 text-xs font-bold flex items-center justify-center gap-1 transition"
                  title="ดูประวัติแต้มย้อนหลัง"
                >
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ประวัติ ({match.pointsHistory.length})</span>
                </button>
              )}

              {/* Undo Last Point */}
              <button
                onClick={onUndo}
                disabled={match.pointsHistory.length === 0}
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 text-xs font-bold flex items-center justify-center gap-1 border border-slate-700 transition"
                title="ย้อนกลับแต้มล่าสุด (Undo Point)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>ถอยแต้ม</span>
              </button>

              {/* 25s Serve Shot Clock */}
              <button
                onClick={() => {
                  if (isClockRunning) {
                    setIsClockRunning(false);
                  } else if (serveClock === 0) {
                    handleResetClock();
                  } else {
                    setIsClockRunning(true);
                  }
                }}
                onDoubleClick={handleResetClock}
                className={`py-1 px-2 rounded-xl border text-[11px] font-black flex items-center gap-1 transition shrink-0 ${
                  serveClock <= 5
                    ? 'bg-red-600 text-white border-red-400 animate-pulse'
                    : isClockRunning
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="นาฬิกาเสิร์ฟ 25 วินาที: แตะเริ่ม/หยุด, ดับเบิ้ลคลิกเพื่อรีเซ็ต 25 วิ"
              >
                <Timer className="w-3 h-3 text-amber-400" />
                <span>{serveClock}s</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE: TEAM 2 CARD (Col 9-12) ================= */}
        <div className="col-span-4 h-full flex flex-col justify-between rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border border-sky-800/60 p-2.5 relative shadow-xl overflow-hidden">
          {/* Header & Server Toggle */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <div
              onClick={onOpenEditPlayers}
              className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition truncate"
              title="คลิกเพื่อแก้ไขชื่อผู้เล่น"
            >
              <h2 className="text-sm font-black text-sky-400 truncate leading-tight">
                {team2.name}
              </h2>
              <Edit3 className="w-3 h-3 text-slate-500 hover:text-sky-300 shrink-0" />
            </div>

            <div className="flex items-center gap-1">
              {/* Server indicator / toggle button */}
              <button
                onClick={onToggleServer}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black transition ${
                  isServerT2
                    ? 'bg-yellow-400 text-slate-950 shadow animate-pulse'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="คลิกเพื่อกำหนดให้คนนี้เสิร์ฟ"
              >
                <span>🎾 {isServerT2 ? (isFirstServeFault ? 'เสิร์ฟ 2' : 'เสิร์ฟ 1') : 'รับ'}</span>
              </button>

              <span className="text-[10px] text-slate-400 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {currentSet.team2Games} เกม
              </span>
            </div>
          </div>

          {/* Giant Score Display */}
          <div className="my-auto py-1 text-center flex flex-col items-center justify-center">
            <div
              className={`font-mono text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md ${
                currentGame.team2Display === 'AD' ? 'text-amber-300 scale-105' : 'text-white'
              }`}
            >
              {currentGame.team2Display}
            </div>
            {currentGame.isTiebreak && (
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-0.5">
                TIE-BREAK
              </span>
            )}
          </div>

          {/* MAIN BUTTONS */}
          <div className="space-y-1.5 shrink-0">
            {/* Primary Big Point Button */}
            <button
              onClick={() => onAwardPoint('team2', 'regular_point')}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-950/60 flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ แต้มปกติ ({team2.name.slice(0, 8)})</span>
            </button>

            {/* Popup Detail Buttons: Winner vs Error */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onOpenDetailModal('winner', 'team2')}
                className="py-2 px-2 rounded-xl bg-sky-950/70 border border-sky-700/60 hover:bg-sky-900 active:scale-95 text-sky-300 text-xs font-bold flex items-center justify-center gap-1 shadow transition"
                title="ระบุรายละเอียดลูกวินเนอร์ (โฟร์แฮนด์, แบ็คแฮนด์, วอลเลย์, สแมช)"
              >
                <Flame className="w-3.5 h-3.5 text-sky-400" />
                <span>🏆 วินเนอร์...</span>
              </button>

              <button
                onClick={() => onOpenDetailModal('error', 'team1')}
                className="py-2 px-2 rounded-xl bg-rose-950/70 border border-rose-700/60 hover:bg-rose-900 active:scale-95 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 shadow transition"
                title="ระบุรายละเอียดคนตีเสีย (ใครตีเสีย, ตีลูกอะไร, ติดเน็ตหรือออก)"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>❌ คู่แข่งตีเสีย...</span>
              </button>
            </div>

            {/* Quick 1-Tap: Ace (if server) or Opponent Double Fault (if receiver) */}
            <div>
              {isServerT2 ? (
                <button
                  onClick={() => onAwardPoint('team2', 'ace', { stroke: 'serve' })}
                  className="w-full py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold active:scale-95 flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                  title="เสิร์ฟเอซ 1 แตะ"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>⚡ เสิร์ฟเอซ (Ace - 1 แตะ)</span>
                </button>
              ) : (
                <button
                  onClick={onSecondServeFault}
                  className="w-full py-1.5 px-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-bold active:scale-95 flex items-center justify-center gap-1.5 transition text-xs shadow-xs"
                  title="คู่แข่งเสิร์ฟเสีย 2 ลูก (ดับเบิ้ลฟอลต์)"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>🚨 คู่แข่งเสีย 2 ลูก (Double Fault)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

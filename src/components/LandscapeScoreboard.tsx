import React, { useState, useEffect } from 'react';
import { MatchState, ShotCategory, StrokeType, ErrorDetail } from '../types/tennis';
import { detectPointContext, getCurrentServeCourt } from '../utils/tennisEngine';
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
  Trophy,
  Target,
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
  onResetMatch: () => void;
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
  onResetMatch,
  isOnline,
  activeSheetUrl,
  pendingSyncCount,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { team1, team2, sets, currentSetIndex, currentGame, currentServerTeam, isFirstServeFault } =
    match;

  const currentSet = sets[currentSetIndex] || { team1Games: 0, team2Games: 0 };
  const pointContext = detectPointContext(match);

  const isServerT1 = currentServerTeam === 'team1';
  const isServerT2 = currentServerTeam === 'team2';



  // Total games played in set
  const totalGamesInSet = currentSet.team1Games + currentSet.team2Games;
  const isChangeEndsNow =
    totalGamesInSet > 0 &&
    totalGamesInSet % 2 === 1 &&
    currentGame.team1Points === 0 &&
    currentGame.team2Points === 0;

  const serveCourt = getCurrentServeCourt(currentGame);
  const serverPlayerName = isServerT1
    ? match.team1.players[match.currentServerPlayerIndex]?.name || match.team1.name
    : match.team2.players[match.currentServerPlayerIndex]?.name || match.team2.name;

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

        {/* Right: Actions, Sheets Sync, Infographic, Analytics, PWA, Reset, Settings */}
        <div className="flex items-center gap-1.5">
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

          {/* Reset / Start New Match Button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/60 text-rose-300 text-[11px] font-semibold transition active:scale-95"
            title="รีเซ็ตคะแนน / เริ่มเกมใหม่"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">เริ่มใหม่</span>
          </button>

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

          {/* Giant Score Display with Prominent Serving Badge on Head of Score */}
          <div className="my-auto py-1 text-center flex flex-col items-center justify-center">
            {/* Server Badge on Head of Score (โชว์บนหัวคะแนนให้เห็นชัดๆ) */}
            <div className="w-full mb-1 flex items-center justify-center">
              {isServerT1 ? (
                <button
                  type="button"
                  onClick={onToggleServer}
                  className="px-3 py-1 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/40 border border-yellow-200 transition active:scale-95 animate-pulse"
                  title="คลิกเพื่อสลับคนเสิร์ฟ"
                >
                  <span className="text-sm">🎾</span>
                  <span className="truncate">{serverPlayerName} เสิร์ฟ ({isFirstServeFault ? 'เสิร์ฟ 2' : 'เสิร์ฟ 1'})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleServer}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold border border-slate-700/80 transition active:scale-95"
                  title="คลิกเพื่อสลับให้ฝ่ายนี้เสิร์ฟ"
                >
                  <span>🛡️ ฝ่ายรับเสิร์ฟ</span>
                </button>
              )}
            </div>

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

        {/* ================= CENTER: COURT & REFEREE DOCK (Col 5-8) ================= */}
        {/* แบ่งเป็น 3 ส่วน: บน (แจ้งเฉพาะข้อความสำคัญ), กลาง (แสดงคอร์ตเต็มตา), ล่าง (ปุ่มกดง่าย 2 แถว) */}
        <div className="col-span-4 h-full flex flex-col justify-between rounded-2xl bg-slate-900/90 border border-slate-800 p-2 overflow-hidden shadow-xl gap-1.5">

          {/* 1. ส่วนบน: เอาไว้แจ้งข้อความสำคัญต่างๆ (แสดงเฉพาะเมื่อมีเหตุการณ์สำคัญ เช่น จะโดนเบรค, แมตพ้อย, เซ็ตพ้อย, จบเกม) */}
          {(pointContext.badgeType === 'match' ||
            pointContext.badgeType === 'set' ||
            pointContext.badgeType === 'break' ||
            pointContext.badgeType === 'deciding' ||
            match.isFinished ||
            isFirstServeFault ||
            (currentGame.team1Points === 0 && currentGame.team2Points === 0 && totalGamesInSet > 0)) && (
            <div className="shrink-0 h-11 sm:h-12 w-full flex items-center justify-center">
              {pointContext.badgeType === 'match' ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-between shadow-lg shadow-amber-500/30 border border-amber-300 animate-pulse">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-950/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-slate-950" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        🏆 MATCH POINT (แมตพ้อย!)
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-900 truncate">
                        {pointContext.pointHolderName} แต้มตัดสินแชมป์ มีโอกาสปิดแมตช์!
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-950 text-amber-300 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    แมตพ้อย
                  </span>
                </div>
              ) : pointContext.badgeType === 'set' ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white flex items-center justify-between shadow-lg shadow-pink-500/30 border border-pink-400 animate-pulse">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        🎯 SET POINT (เซ็ตพ้อย!)
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-medium text-pink-100 truncate">
                        {pointContext.pointHolderName} แต้มตัดสินเซตที่ {currentSetIndex + 1}!
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-950 text-pink-300 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    เซ็ตพ้อย
                  </span>
                </div>
              ) : pointContext.badgeType === 'break' ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white flex items-center justify-between shadow-lg shadow-red-600/40 border border-red-300 animate-pulse ring-2 ring-red-400/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        ⚡ BREAK POINT (จะโดนเบรค!)
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-medium text-rose-100 truncate">
                        {serverPlayerName} เสี่ยงโดนเบรก! • {pointContext.pointHolderName} มีโอกาสเบรกเกมเสิร์ฟ
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-950 text-rose-300 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    จะโดนเบรค
                  </span>
                </div>
              ) : pointContext.badgeType === 'deciding' ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white flex items-center justify-between shadow-lg border border-amber-300 animate-pulse">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-yellow-300" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        🔥 แต้มตัดสินเกม (Deciding Point No-Ad)
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-medium text-amber-100 truncate">
                        40-40 แต้มเดียวจบเกม! ฝ่ายรับเลือกคอร์ตรับเสิร์ฟได้
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-950 text-amber-300 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    แต้มตัดสิน
                  </span>
                </div>
              ) : match.isFinished ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-emerald-300 uppercase tracking-wide truncate">
                        🏆 จบการแข่งขัน (Match Finished)
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-emerald-200/90 truncate">
                        การแข่งขันสิ้นสุดลงแล้ว สามารถดูกราฟหรือสร้างภาพสรุปได้
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onOpenInfographic}
                    className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow transition"
                  >
                    ภาพสรุป
                  </button>
                </div>
              ) : isFirstServeFault ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-amber-950/80 border border-amber-500/70 text-amber-200 flex items-center justify-between shadow">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide truncate">
                        ฟอลต์เสิร์ฟแรก (1st Serve Fault)
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-amber-200/90 truncate">
                        {serverPlayerName} กำลังเสิร์ฟลูกที่สอง (2nd Serve)
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    เสิร์ฟ 2
                  </span>
                </div>
              ) : (
                /* จบเกมล่าสุด • เริ่มเกมใหม่ */
                <div className="w-full h-full py-1 px-3 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 flex items-center justify-between shadow">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <span className="text-sm">🎉</span>
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        จบเกมที่ผ่านมา • กำลังเริ่มเกมถัดไป
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-300 truncate">
                        สกอร์เซตที่ {currentSetIndex + 1}: {team1.name} {currentSet.team1Games}-{currentSet.team2Games} {team2.name}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-700 text-emerald-400 font-bold px-2 py-0.5 rounded-md shrink-0 ml-1.5">
                    เกมใหม่
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. ส่วนกลาง: แสดงคอร์ต (Tennis Court Display) */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full overflow-hidden">
            <InteractiveCourt match={match} />
          </div>

          {/* 3. ส่วนล่าง: แสดงปุ่มที่สามารถกดง่าย (Structured 2-Row Referee Dock: Never Clips or Vanishes) */}
          <div className="shrink-0 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1.5">
            {/* ROW 1: Serve Fault Management */}
            {!isFirstServeFault ? (
              /* 1st Serve Fault - Full width button, high visibility, clean single icon */
              <button
                onClick={onFirstServeFault}
                className="w-full h-10 sm:h-11 py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-950/90 to-amber-900/90 hover:from-amber-900 hover:to-amber-800 border-2 border-amber-500/70 text-amber-300 text-xs sm:text-sm font-black flex items-center justify-center gap-2 active:scale-98 shadow-md shadow-amber-950/40 transition"
                title="เสิร์ฟแรกเสีย จะเปลี่ยนสถานะเป็นเสิร์ฟสอง"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ฟอลต์เสิร์ฟแรก (1st Fault)</span>
              </button>
            ) : (
              /* 2nd Serve Fault -> DOUBLE FAULT (2/3 width) + Let button (1/3 width) */
              <div className="grid grid-cols-3 gap-1.5 w-full">
                <button
                  onClick={onSecondServeFault}
                  className="col-span-2 h-10 sm:h-11 py-1.5 px-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 active:scale-98 shadow-xl shadow-red-950 border-2 border-red-300 animate-pulse transition"
                  title="เสิร์ฟเสียลูกที่ 2 -> ดับเบิ้ลฟอลต์ ฝ่ายรับได้แต้มทันที"
                >
                  <AlertOctagon className="w-4 h-4 text-white shrink-0" />
                  <span className="truncate">ดับเบิ้ลฟอลต์! (เสียแต้ม)</span>
                </button>

                <button
                  onClick={onResetServeFault}
                  className="col-span-1 h-10 sm:h-11 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 border-2 border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center transition"
                  title="ยกเลิกฟอลต์เสิร์ฟแรก (เสิร์ฟใหม่ / Let)"
                >
                  <span>เสิร์ฟใหม่ (Let)</span>
                </button>
              </div>
            )}

            {/* ROW 2: Undo Point (Full Width, Easy to Tap) */}
            <button
              onClick={onUndo}
              disabled={match.pointsHistory.length === 0}
              className="h-10 sm:h-11 w-full rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-98 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-2 border-slate-700 hover:border-slate-600 transition shadow-sm"
              title="ย้อนกลับแต้มล่าสุด (Undo Point)"
            >
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ถอยแต้ม (Undo)</span>
            </button>
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

          {/* Giant Score Display with Prominent Serving Badge on Head of Score */}
          <div className="my-auto py-1 text-center flex flex-col items-center justify-center">
            {/* Server Badge on Head of Score (โชว์บนหัวคะแนนให้เห็นชัดๆ) */}
            <div className="w-full mb-1 flex items-center justify-center">
              {isServerT2 ? (
                <button
                  type="button"
                  onClick={onToggleServer}
                  className="px-3 py-1 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/40 border border-yellow-200 transition active:scale-95 animate-pulse"
                  title="คลิกเพื่อสลับคนเสิร์ฟ"
                >
                  <span className="text-sm">🎾</span>
                  <span className="truncate">{serverPlayerName} เสิร์ฟ ({isFirstServeFault ? 'เสิร์ฟ 2' : 'เสิร์ฟ 1'})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleServer}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold border border-slate-700/80 transition active:scale-95"
                  title="คลิกเพื่อสลับให้ฝ่ายนี้เสิร์ฟ"
                >
                  <span>🛡️ ฝ่ายรับเสิร์ฟ</span>
                </button>
              )}
            </div>

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

      {/* Reset Match Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-700/60 text-rose-400 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ต้องการเริ่มเกมใหม่หรือไม่?</h3>
              <p className="text-xs text-slate-400 mt-1">
                แต้มและสถิติในแมตช์ปัจจุบันจะถูกล้าง คุณสามารถเลือกเริ่มใหม่ด้วยผู้เล่นเดิม หรือตั้งค่าแมตช์ใหม่
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetMatch();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>รีเซ็ตแต้มเป็น 0-0 (ใช้ผู้เล่นเดิม)</span>
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  onOpenSettings();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>ตั้งค่าแมตช์ใหม่ (เปลี่ยนผู้เล่น/กติกา)</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-2 px-3 rounded-xl bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

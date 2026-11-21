import React, { useState } from 'react';
import { MatchState, ShotCategory, StrokeType, ErrorDetail } from '../types/tennis';
import {
  detectPointContext,
  getCurrentReceiver,
  getCurrentServeCourt,
  getCurrentServer,
} from '../utils/tennisEngine';
import { InteractiveCourt } from './InteractiveCourt';
import {
  RotateCcw,
  AlertTriangle,
  BarChart2,
  FileSpreadsheet,
  Settings,
  Flame,
  Zap,
  Plus,
  Image as ImageIcon,
  Edit3,
  AlertOctagon,
  Trophy,
  Target,
  History,
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
  onOpenDetailModal: (mode: 'winner' | 'error', team: 'team1' | 'team2', playerName?: string) => void;
  onOpenEditPlayers: () => void;
  onUndo: () => void;
  onFirstServeFault: () => void;
  onSecondServeFault: () => void;
  onResetServeFault: () => void;
  onSelectDecidingReceiver: (options: { playerIndex?: number; serveCourt?: 'deuce' | 'ad' }) => void;
  onOpenHistory: () => void;
  onOpenAnalytics: () => void;
  onOpenInfographic: () => void;
  onOpenSheetsSync: () => void;
  onOpenSettings: () => void;
  onResetMatch: () => void;
  isOnline: boolean;
  isSheetConnected: boolean;
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
  onSelectDecidingReceiver,
  onOpenHistory,
  onOpenAnalytics,
  onOpenInfographic,
  onOpenSheetsSync,
  onOpenSettings,
  onResetMatch,
  isOnline,
  isSheetConnected,
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

  const currentServerInfo = getCurrentServer(match);
  const serverPlayerName = currentServerInfo.playerName;
  const currentReceiverInfo = getCurrentReceiver(match);
  const currentServeCourt = getCurrentServeCourt(currentGame);
  const receivingTeamKey: 'team1' | 'team2' = currentServerTeam === 'team1' ? 'team2' : 'team1';
  const receivingTeamPlayers = match[receivingTeamKey].players;
  const isDoublesMatch = match.settings.type === 'doubles' && receivingTeamPlayers.length > 1;
  const deuceCount = currentGame.deuceCount || 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* 1. TOP STATUS BAR */}
      <header className="h-10 shrink-0 bg-slate-900/95 border-b border-slate-800 px-2.5 sm:px-3 flex items-center justify-between gap-2 text-xs backdrop-blur-xs z-30">
        {/* Left: App Logo */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <div className="flex items-center gap-1.5 font-black text-emerald-400 tracking-wide text-xs sm:text-sm">
            <span className="text-base leading-none">🎾</span>
            <span>TennisPro</span>
          </div>
        </div>

        {/* Center: Live Set Scores Table */}
        <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-slate-800 shrink-0 whitespace-nowrap">
          <span className="text-[10px] text-slate-400 font-bold uppercase mr-0.5">SETS:</span>
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

        {/* Right: Actions, Sheets Sync (hidden once saved), Infographic, Analytics, PWA, Reset, Settings */}
        <div className="flex items-center gap-1.5">
          {/* Sheets Setup Button (automatically hidden after saving Google Sheet) */}
          {!isSheetConnected && (
            <button
              onClick={onOpenSheetsSync}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              title="ตั้งค่าเชื่อมต่อ Google Sheets ครั้งเดียว (ไม่ต้องล็อกอิน)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">เชื่อม Sheet</span>
              {pendingSyncCount > 0 ? (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {pendingSyncCount}
                </span>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-amber-400' : 'bg-slate-500'}`} />
              )}
            </button>
          )}

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

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 text-[11px] font-semibold transition"
            title="ประวัติการแข่งขันทั้งหมด"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ประวัติ</span>
          </button>

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

      {/* 2. MAIN HORIZONTAL SCORING ARENA (Balanced 3 : 6 : 3 Proportions) */}
      <main className="flex-1 min-h-0 grid grid-cols-12 gap-1.5 p-1.5 relative overflow-hidden">
        {/* ================= LEFT SIDE: TEAM 1 SCORE BUTTON CARD (Col 1-3) ================= */}
        <div className="col-span-3 h-full flex flex-col rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border border-emerald-700/70 relative shadow-xl overflow-hidden">
          {/* Team Header (wraps onto new line cleanly without ellipsis truncation) */}
          <div className="flex items-start justify-between gap-1 px-2 py-1.5 border-b border-slate-800/80 shrink-0 bg-slate-900/90">
            <div
              onClick={onOpenEditPlayers}
              className="flex items-start gap-1 cursor-pointer hover:opacity-80 transition min-w-0 flex-1"
              title="คลิกเพื่อแก้ไขชื่อผู้เล่น"
            >
              <div className="min-w-0 flex-1">
                {team1.players.length > 1 ? (
                  <h2 className="text-[11px] sm:text-xs font-black text-emerald-400 leading-tight break-words">
                    {team1.players.map((p, idx) => (
                      <span key={p.id || idx} className="inline-block mr-1">
                        {p.name}
                        {idx < team1.players.length - 1 ? ' /' : ''}
                      </span>
                    ))}
                  </h2>
                ) : (
                  <h2 className="text-xs sm:text-sm font-black text-emerald-400 leading-tight break-words">
                    {team1.name}
                  </h2>
                )}
              </div>
              <Edit3 className="w-3 h-3 text-slate-500 hover:text-emerald-300 shrink-0 mt-0.5" />
            </div>

            <span className="text-[10px] sm:text-xs font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0 whitespace-nowrap">
              {currentSet.team1Games} เกม
            </span>
          </div>

          {/* Full-Area Touch-to-Score Button (ทั้งการ์ดเป็นปุ่มกด +1 แต้ม) */}
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
              onAwardPoint('team1', 'regular_point');
            }}
            className="flex-1 w-full bg-slate-900/40 hover:bg-emerald-950/50 active:bg-emerald-900/60 active:scale-[0.98] text-center flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all duration-150 cursor-pointer group relative overflow-hidden"
            title="แตะพื้นที่นี้เพื่อเพิ่มแต้มให้ทีม 1 (+1 แต้ม)"
          >
            {/* Server Badge on Head of Score (wraps cleanly without ...) */}
            {isServerT1 && (
              <div className="mb-1 px-2 py-0.5 rounded-xl bg-yellow-400 text-slate-950 font-black text-[9px] sm:text-[10.5px] flex items-center justify-center gap-1 shadow max-w-full leading-tight text-center">
                <span className="shrink-0">🎾</span>
                <span className="break-words">
                  {serverPlayerName} ({isFirstServeFault ? 'ลูก 2' : 'ลูก 1'})
                </span>
              </div>
            )}

            {/* Giant Score Display */}
            <div
              className={`font-mono text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-lg transition-transform group-hover:scale-105 leading-none ${
                currentGame.team1Display === 'AD' ? 'text-amber-300' : 'text-white'
              }`}
            >
              {currentGame.team1Display}
            </div>

            {currentGame.isTiebreak && (
              <span className="text-[9.5px] font-bold text-amber-400 uppercase tracking-widest mt-1">
                TIE-BREAK
              </span>
            )}

            {/* Clear tap affordance */}
            <div className="mt-1.5 sm:mt-2 px-2 py-0.5 sm:py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1 text-[9px] sm:text-[10px] text-emerald-300 font-bold group-hover:bg-emerald-500/25 transition whitespace-nowrap max-w-full">
              <Plus className="w-3 h-3 shrink-0" />
              <span className="truncate">แตะเพื่อ +1 แต้ม</span>
            </div>
          </button>
        </div>

        {/* ================= CENTER: COURT & UNIFIED SCORING DOCK (Col 4-9, 50% width) ================= */}
        <div className="col-span-6 h-full flex flex-col justify-between rounded-2xl bg-slate-900/90 border border-slate-800 p-2 overflow-hidden shadow-xl gap-1.5">
          {/* 1. ส่วนบน: ข้อความสถานะสำคัญของเกม & ตัวเลือกผู้รับลูกเสิร์ฟสุดท้าย */}
          {(pointContext.isDecidingPoint ||
            pointContext.badgeType === 'match' ||
            pointContext.badgeType === 'set' ||
            pointContext.badgeType === 'break' ||
            pointContext.badgeType === 'deciding' ||
            ((match.settings.adRule === '2-deuce' || match.settings.adRule === '3-deuce') && deuceCount > 0) ||
            match.isFinished ||
            isFirstServeFault ||
            (currentGame.team1Points === 0 && currentGame.team2Points === 0 && totalGamesInSet > 0)) && (
            <div className="shrink-0 min-h-9 sm:min-h-10 w-full flex items-center justify-center">
              {pointContext.isDecidingPoint ? (
                <div className="w-full py-1 px-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white flex flex-wrap items-center justify-between gap-1.5 shadow-lg border border-amber-300">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Flame className="w-4 h-4 text-yellow-200 shrink-0 animate-pulse" />
                    <div className="text-left min-w-0">
                      <div className="text-[11px] sm:text-xs font-black tracking-wide flex items-center gap-1.5 flex-wrap">
                        <span>
                          {match.settings.adRule === '2-deuce'
                            ? '🔥 ดิวซ์ 2/2 (ลูกสุดท้าย!)'
                            : match.settings.adRule === '3-deuce'
                            ? '🔥 ดิวซ์ 3/3 (ลูกสุดท้าย!)'
                            : '🔥 40-40 แต้มตัดสิน'}
                        </span>
                        {pointContext.isMatchPoint && (
                          <span className="bg-slate-950 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-black">
                            MATCH PT
                          </span>
                        )}
                        {pointContext.isSetPoint && !pointContext.isMatchPoint && (
                          <span className="bg-slate-950 text-pink-300 text-[9px] px-1.5 py-0.2 rounded font-black">
                            SET PT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selector: Choose who / which side receives the final deciding serve */}
                  <div className="flex items-center gap-1 flex-wrap ml-auto">
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-amber-100 whitespace-nowrap">
                      {isDoublesMatch ? 'ผู้รับลูกสุดท้าย:' : 'ฝั่งรับลูกสุดท้าย:'}
                    </span>
                    {isDoublesMatch ? (
                      receivingTeamPlayers.map((p, idx) => {
                        const isSelected = currentReceiverInfo.playerIndex === idx;
                        return (
                          <button
                            key={p.id || idx}
                            type="button"
                            onClick={() => onSelectDecidingReceiver({ playerIndex: idx })}
                            className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black border transition active:scale-95 ${
                              isSelected
                                ? 'bg-sky-500 text-white border-white shadow-md ring-1 ring-white/60'
                                : 'bg-slate-950/75 text-amber-100 border-amber-300/50 hover:bg-slate-900'
                            }`}
                            title={`เลือกให้ ${p.name} เป็นคนรับลูกเสิร์ฟสุดท้าย`}
                          >
                            {p.name}
                          </button>
                        );
                      })
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectDecidingReceiver({ serveCourt: 'deuce' })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black border transition active:scale-95 ${
                            currentServeCourt === 'deuce'
                              ? 'bg-sky-500 text-white border-white shadow-md ring-1 ring-white/60'
                              : 'bg-slate-950/75 text-amber-100 border-amber-300/50 hover:bg-slate-900'
                          }`}
                        >
                          ขวา (Deuce)
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectDecidingReceiver({ serveCourt: 'ad' })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black border transition active:scale-95 ${
                            currentServeCourt === 'ad'
                              ? 'bg-sky-500 text-white border-white shadow-md ring-1 ring-white/60'
                              : 'bg-slate-950/75 text-amber-100 border-amber-300/50 hover:bg-slate-900'
                          }`}
                        >
                          ซ้าย (Ad)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : pointContext.badgeType === 'match' ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-between shadow-lg shadow-amber-500/30 border border-amber-300 animate-pulse">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        🏆 MATCH POINT!
                      </div>
                      <div className="text-[10px] font-bold text-slate-900 truncate">
                        {pointContext.pointHolderName} มีโอกาสปิดแมตช์!
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
                    <Target className="w-4 h-4 text-white shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        🎯 SET POINT!
                      </div>
                      <div className="text-[10px] font-medium text-pink-100 truncate">
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
                    <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black uppercase tracking-wider truncate">
                        ⚡ BREAK POINT (จะโดนเบรค!)
                      </div>
                      <div className="text-[10px] font-medium text-rose-100 truncate">
                        {serverPlayerName} เสี่ยงโดนเบรก!
                        {(match.settings.adRule === '2-deuce' || match.settings.adRule === '3-deuce') && deuceCount > 0
                          ? ` • ดิวซ์ ${deuceCount}/${match.settings.adRule === '2-deuce' ? 2 : 3}`
                          : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-950 text-rose-300 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    จะโดนเบรค
                  </span>
                </div>
              ) : (match.settings.adRule === '2-deuce' || match.settings.adRule === '3-deuce') && deuceCount > 0 ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-gradient-to-r from-indigo-900/95 via-slate-800 to-indigo-900/95 border border-indigo-400/60 text-indigo-100 flex items-center justify-between shadow">
                  <div className="flex items-center gap-2 min-w-0">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        กติกา ดิวซ์ {match.settings.adRule === '2-deuce' ? 2 : 3} ลูก • ดิวซ์ครั้งที่ {deuceCount} / {match.settings.adRule === '2-deuce' ? 2 : 3}
                      </div>
                      <div className="text-[10px] text-indigo-200 truncate">
                        {deuceCount === (match.settings.adRule === '2-deuce' ? 1 : 2)
                          ? 'หากกลับมา 40-40 อีกครั้ง จะเป็นแต้มตัดสินเกมทันที!'
                          : 'เล่นได้เปรียบ (Ad) ตามปกติ'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-950 border border-indigo-400/50 text-amber-300 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5">
                    ดิวซ์ {deuceCount}/{match.settings.adRule === '2-deuce' ? 2 : 3}
                  </span>
                </div>
              ) : match.isFinished ? (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-emerald-300 uppercase tracking-wide truncate">
                        🏆 จบการแข่งขัน
                      </div>
                      <div className="text-[10px] text-emerald-200/90 truncate">
                        การแข่งขันสิ้นสุดลงแล้ว
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
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide truncate">
                        ฟอลต์เสิร์ฟแรก (1st Fault)
                      </div>
                      <div className="text-[10px] text-amber-200/90 truncate">
                        {serverPlayerName} กำลังเสิร์ฟลูกที่สอง (2nd Serve)
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md shrink-0 ml-1.5 shadow">
                    เสิร์ฟ 2
                  </span>
                </div>
              ) : (
                <div className="w-full h-full py-1 px-3 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 flex items-center justify-between shadow">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">🎾</span>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-white truncate">
                        กำลังแข่งขัน • เซตที่ {currentSetIndex + 1}
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {team1.name} {currentSet.team1Games}-{currentSet.team2Games} {team2.name}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-900 border border-slate-700 text-emerald-400 font-bold px-2 py-0.5 rounded-md shrink-0 ml-1.5">
                    เซต {currentSetIndex + 1}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. ส่วนกลาง: คอร์ตเทนนิสแสดงนักกีฬาและวิถีลูกเทนนิสเต็มพื้นที่ */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 w-full overflow-hidden">
            <InteractiveCourt
              match={match}
              onSelectDecidingCourt={(serveCourt) => onSelectDecidingReceiver({ serveCourt })}
              onSelectPlayerError={(team, playerName) => onOpenDetailModal('error', team, playerName)}
            />
          </div>
        </div>

        {/* ================= RIGHT SIDE: TEAM 2 SCORE BUTTON CARD (Col 10-12) ================= */}
        <div className="col-span-3 h-full flex flex-col rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border border-sky-700/70 relative shadow-xl overflow-hidden">
          {/* Team Header (wraps onto new line cleanly without ellipsis truncation) */}
          <div className="flex items-start justify-between gap-1 px-2 py-1.5 border-b border-slate-800/80 shrink-0 bg-slate-900/90">
            <div
              onClick={onOpenEditPlayers}
              className="flex items-start gap-1 cursor-pointer hover:opacity-80 transition min-w-0 flex-1"
              title="คลิกเพื่อแก้ไขชื่อผู้เล่น"
            >
              <div className="min-w-0 flex-1">
                {team2.players.length > 1 ? (
                  <h2 className="text-[11px] sm:text-xs font-black text-sky-400 leading-tight break-words">
                    {team2.players.map((p, idx) => (
                      <span key={p.id || idx} className="inline-block mr-1">
                        {p.name}
                        {idx < team2.players.length - 1 ? ' /' : ''}
                      </span>
                    ))}
                  </h2>
                ) : (
                  <h2 className="text-xs sm:text-sm font-black text-sky-400 leading-tight break-words">
                    {team2.name}
                  </h2>
                )}
              </div>
              <Edit3 className="w-3 h-3 text-slate-500 hover:text-sky-300 shrink-0 mt-0.5" />
            </div>

            <span className="text-[10px] sm:text-xs font-bold text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0 whitespace-nowrap">
              {currentSet.team2Games} เกม
            </span>
          </div>

          {/* Full-Area Touch-to-Score Button (ทั้งการ์ดเป็นปุ่มกด +1 แต้ม) */}
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
              onAwardPoint('team2', 'regular_point');
            }}
            className="flex-1 w-full bg-slate-900/40 hover:bg-sky-950/50 active:bg-sky-900/60 active:scale-[0.98] text-center flex flex-col items-center justify-center p-1.5 sm:p-2 transition-all duration-150 cursor-pointer group relative overflow-hidden"
            title="แตะพื้นที่นี้เพื่อเพิ่มแต้มให้ทีม 2 (+1 แต้ม)"
          >
            {/* Server Badge on Head of Score (wraps cleanly without ...) */}
            {isServerT2 && (
              <div className="mb-1 px-2 py-0.5 rounded-xl bg-yellow-400 text-slate-950 font-black text-[9px] sm:text-[10.5px] flex items-center justify-center gap-1 shadow max-w-full leading-tight text-center">
                <span className="shrink-0">🎾</span>
                <span className="break-words">
                  {serverPlayerName} ({isFirstServeFault ? 'ลูก 2' : 'ลูก 1'})
                </span>
              </div>
            )}

            {/* Giant Score Display */}
            <div
              className={`font-mono text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-lg transition-transform group-hover:scale-105 leading-none ${
                currentGame.team2Display === 'AD' ? 'text-amber-300' : 'text-white'
              }`}
            >
              {currentGame.team2Display}
            </div>

            {currentGame.isTiebreak && (
              <span className="text-[9.5px] font-bold text-amber-400 uppercase tracking-widest mt-1">
                TIE-BREAK
              </span>
            )}

            {/* Clear tap affordance */}
            <div className="mt-1.5 sm:mt-2 px-2 py-0.5 sm:py-1 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center gap-1 text-[9px] sm:text-[10px] text-sky-300 font-bold group-hover:bg-sky-500/25 transition whitespace-nowrap max-w-full">
              <Plus className="w-3 h-3 shrink-0" />
              <span className="truncate">แตะเพื่อ +1 แต้ม</span>
            </div>
          </button>
        </div>
      </main>

      {/* 3. BOTTOM SCORING CONTROL DOCK (ส่วนล่างสุด: 1 แถวเต็มจอสำหรับปุ่มกดคะแนน) */}
      <footer className="shrink-0 w-full px-1.5 pb-1.5 pt-0.5 z-20">
        <div
          className={`grid gap-1 sm:gap-1.5 w-full rounded-2xl bg-slate-900/95 border border-slate-800 p-1 sm:p-1.5 shadow-xl ${
            isFirstServeFault ? 'grid-cols-6' : 'grid-cols-5'
          }`}
        >
          {/* 1. Serve Ace */}
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
              onAwardPoint(currentServerTeam, 'ace', { stroke: 'serve' });
            }}
            className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-500/60 text-amber-300 font-bold text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 transition shadow-xs min-w-0"
            title={`เสิร์ฟเอซ (+1 แต้มให้ ${serverPlayerName})`}
          >
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="truncate">เสิร์ฟเอซ</span>
          </button>

          {/* 2. 1st Fault or Double Fault */}
          {!isFirstServeFault ? (
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
                onFirstServeFault();
              }}
              className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 border border-amber-500/50 text-amber-300 font-bold text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 transition shadow-xs min-w-0"
              title="เสิร์ฟแรกติดเน็ต/ออก -> เปลี่ยนเป็นเสิร์ฟลูกสอง"
            >
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="truncate">ฟอลต์แรก</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
                onSecondServeFault();
              }}
              className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 border border-red-300 shadow-md animate-pulse transition min-w-0"
              title="ดับเบิ้ลฟอลต์ -> เสียแต้มให้อีกฝ่ายทันที"
            >
              <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
              <span className="truncate">ดับเบิ้ลฟอลต์</span>
            </button>
          )}

          {/* 3. Winner Detail */}
          <button
            type="button"
            onClick={() => onOpenDetailModal('winner', currentServerTeam)}
            className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 active:scale-95 border border-emerald-600/70 text-emerald-300 font-bold text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 transition shadow-sm min-w-0"
            title="บันทึกแต้มวินเนอร์ (เลือกคนตี และสโตรก: สแมช, โฟร์แฮนด์, แบ็คแฮนด์, วอลเลย์)"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="truncate">วินเนอร์</span>
          </button>

          {/* 4. Error Detail */}
          <button
            type="button"
            onClick={() => onOpenDetailModal('error', currentServerTeam === 'team1' ? 'team2' : 'team1')}
            className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-rose-950/80 hover:bg-rose-900/90 active:scale-95 border border-rose-600/70 text-rose-300 font-bold text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 transition shadow-sm min-w-0"
            title="บันทึกแต้มตีเสีย (เลือกคนตีเสีย และลักษณะการเสีย: ติดเน็ต, ออกหลัง, ออกข้าง)"
          >
            <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
            <span className="truncate">ตีเสีย</span>
          </button>

          {/* 5. Let (Only shown during 1st-serve fault) */}
          {isFirstServeFault && (
            <button
              type="button"
              onClick={onResetServeFault}
              className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 border border-slate-700 text-slate-200 font-bold text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 transition min-w-0"
              title="ยกเลิกฟอลต์ (เสิร์ฟใหม่ / Let)"
            >
              <span className="truncate">เสิร์ฟใหม่ (Let)</span>
            </button>
          )}

          {/* 6. Undo Point */}
          <button
            type="button"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
              onUndo();
            }}
            disabled={match.pointsHistory.length === 0}
            className="h-9 sm:h-11 px-1 sm:px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 text-slate-200 font-bold text-[10.5px] sm:text-xs md:text-sm flex items-center justify-center gap-1 transition shadow-sm min-w-0"
            title="ย้อนกลับแต้มล่าสุด (Undo Point)"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span className="truncate">ถอย</span>
          </button>
        </div>
      </footer>

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

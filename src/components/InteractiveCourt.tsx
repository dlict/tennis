import React, { useState } from 'react';
import { MatchState } from '../types/tennis';
import { getCurrentServeCourt, detectPointContext } from '../utils/tennisEngine';
import { Zap, Trophy, Target, ArrowLeftRight, Flame } from 'lucide-react';

interface InteractiveCourtProps {
  match: MatchState;
  onZoneSelect?: (zone: string) => void;
  selectedZone?: string | null;
}

export const InteractiveCourt: React.FC<InteractiveCourtProps> = ({
  match,
  onZoneSelect,
  selectedZone,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const { currentGame, currentServerTeam, sets, currentSetIndex } = match;
  const currentSet = sets[currentSetIndex];
  const serveCourt = getCurrentServeCourt(currentGame);
  const pointContext = detectPointContext(match);

  // Total games played in current set determines side change (after odd games sum: 1, 3, 5...)
  const totalGamesInSet = currentSet ? currentSet.team1Games + currentSet.team2Games : 0;
  const isOddGamesSum = totalGamesInSet % 2 === 1;

  const isServerT1 = currentServerTeam === 'team1';

  // Court perspective: Team 1 usually left, Team 2 usually right, unless flipped by umpire
  const effectiveServerLeft = (!isFlipped && isServerT1) || (isFlipped && !isServerT1);

  // Highlight service box
  const targetBox = effectiveServerLeft
    ? serveCourt === 'deuce'
      ? 'box-t2-top'
      : 'box-t2-bottom'
    : serveCourt === 'deuce'
    ? 'box-t1-bottom'
    : 'box-t1-top';

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-1 select-none">
      {/* 1. CRITICAL POINT ANNOUNCEMENT BANNER (Break Point, Set Point, Match Point, Deciding Point) */}
      {pointContext.badgeLabel && (
        <div
          className={`w-full mb-1 py-1 px-2 rounded-lg border text-center font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-xl animate-pulse transition-all ${
            pointContext.badgeType === 'match'
              ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-amber-500/50'
              : pointContext.badgeType === 'set'
              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white border-pink-300 shadow-pink-500/40'
              : pointContext.badgeType === 'break' || pointContext.badgeType === 'deciding'
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white border-red-300 shadow-red-600/60 ring-2 ring-red-400/40'
              : 'bg-emerald-600 text-white border-emerald-400'
          }`}
        >
          {pointContext.badgeType === 'match' && <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />}
          {pointContext.badgeType === 'set' && <Target className="w-3.5 h-3.5 text-white shrink-0" />}
          {(pointContext.badgeType === 'break' || pointContext.badgeType === 'deciding') && (
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 shrink-0" />
          )}
          {pointContext.badgeType === 'game' && <Flame className="w-3.5 h-3.5 text-white shrink-0" />}
          <span className="tracking-wide uppercase drop-shadow-xs">{pointContext.badgeLabel}</span>
        </div>
      )}

      {/* 2. Court Header & Quick Tools */}
      <div className="flex items-center justify-between w-full px-2 mb-1 text-[11px] font-semibold text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {match.settings.type === 'doubles' ? 'คอร์ตคู่ (Doubles)' : 'คอร์ตเดี่ยว (Singles)'}
          </span>
          {isOddGamesSum && (
            <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.2 rounded font-medium">
              สลับแดน
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded text-[10px]">
            {serveCourt === 'deuce' ? 'เสิร์ฟคอร์ตขวา (Deuce)' : 'เสิร์ฟคอร์ตซ้าย (Ad)'}
          </span>
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] flex items-center gap-1"
            title="สลับฝั่งมุมมองคอร์ต ซ้าย-ขวา"
          >
            <ArrowLeftRight className="w-3 h-3 text-cyan-400" />
            <span>สลับฝั่ง</span>
          </button>
        </div>
      </div>

      {/* 2D Landscape Court Canvas */}
      <div className="relative w-full aspect-[2.1/1] max-h-[170px] bg-emerald-900/90 rounded-lg border-2 border-slate-300/80 shadow-inner overflow-hidden">
        {/* Clay/Hard/Grass subtle background texture */}
        <div
          className={`absolute inset-0 opacity-25 pointer-events-none ${
            match.settings.courtSurface === 'clay'
              ? 'bg-amber-900'
              : match.settings.courtSurface === 'grass'
              ? 'bg-emerald-950'
              : 'bg-blue-950'
          }`}
        />

        {/* Doubles Alleys (outer boundaries) */}
        {/* Top Alley Line (Singles sideline) */}
        <div className="absolute top-[16%] left-0 right-0 h-[1.5px] bg-white/70" />
        {/* Bottom Alley Line (Singles sideline) */}
        <div className="absolute bottom-[16%] left-0 right-0 h-[1.5px] bg-white/70" />

        {/* Service Lines (perpendicular to sidelines, halfway between net and baseline) */}
        <div className="absolute top-[16%] bottom-[16%] left-[28%] w-[1.5px] bg-white/70" />
        <div className="absolute top-[16%] bottom-[16%] right-[28%] w-[1.5px] bg-white/70" />

        {/* Center Service Line (parallel to sidelines, dividing service boxes) */}
        <div className="absolute top-[50%] left-[28%] right-[28%] h-[1.5px] bg-white/70" />

        {/* Center marks on baselines */}
        <div className="absolute top-[46%] bottom-[46%] left-0 w-[4px] bg-white" />
        <div className="absolute top-[46%] bottom-[46%] right-0 w-[4px] bg-white" />

        {/* Center Net (White net tape with vertical bar & net posts) */}
        <div className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 w-[3px] bg-white shadow-lg z-10">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-200" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-200" />
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 text-[9px] font-bold text-white/50 tracking-widest rotate-90 pointer-events-none">
            NET
          </div>
        </div>

        {/* Active Target Service Box Highlight */}
        {/* Box T1 Top (Ad box) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t1_service_ad')}
          className={`absolute top-[16%] bottom-[50%] left-[28%] right-[50%] transition-colors duration-300 cursor-pointer ${
            targetBox === 'box-t1-top'
              ? 'bg-amber-400/35 border-2 border-amber-300 animate-pulse'
              : selectedZone === 't1_service_ad'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
        />
        {/* Box T1 Bottom (Deuce box) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t1_service_deuce')}
          className={`absolute top-[50%] bottom-[16%] left-[28%] right-[50%] transition-colors duration-300 cursor-pointer ${
            targetBox === 'box-t1-bottom'
              ? 'bg-amber-400/35 border-2 border-amber-300 animate-pulse'
              : selectedZone === 't1_service_deuce'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
        />
        {/* Box T2 Top (Deuce box target from left) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t2_service_deuce')}
          className={`absolute top-[16%] bottom-[50%] left-[50%] right-[28%] transition-colors duration-300 cursor-pointer ${
            targetBox === 'box-t2-top'
              ? 'bg-amber-400/35 border-2 border-amber-300 animate-pulse'
              : selectedZone === 't2_service_deuce'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
        />
        {/* Box T2 Bottom (Ad box target from left) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t2_service_ad')}
          className={`absolute top-[50%] bottom-[16%] left-[50%] right-[28%] transition-colors duration-300 cursor-pointer ${
            targetBox === 'box-t2-bottom'
              ? 'bg-amber-400/35 border-2 border-amber-300 animate-pulse'
              : selectedZone === 't2_service_ad'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
        />

        {/* T1 Baseline Zone */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t1_baseline')}
          className="absolute top-[16%] bottom-[16%] left-0 right-[72%] hover:bg-white/10 cursor-pointer"
        />
        {/* T2 Baseline Zone */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t2_baseline')}
          className="absolute top-[16%] bottom-[16%] left-[72%] right-0 hover:bg-white/10 cursor-pointer"
        />

        {/* Player Position Badges on Court */}
        {/* Server Marker */}
        {isServerT1 ? (
          <div
            className={`absolute left-[4%] transition-all duration-300 ${
              serveCourt === 'deuce' ? 'bottom-[20%]' : 'top-[20%]'
            } flex items-center gap-1 z-20`}
          >
            <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-200 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-lg animate-bounce">
              🎾
            </div>
            <span className="bg-slate-950/80 text-yellow-300 px-1 py-0.5 rounded text-[9px] font-bold">
              {match.team1.players[match.currentServerPlayerIndex]?.name || 'Server'}
            </span>
          </div>
        ) : (
          <div
            className={`absolute right-[4%] transition-all duration-300 ${
              serveCourt === 'deuce' ? 'top-[20%]' : 'bottom-[20%]'
            } flex items-center gap-1 flex-row-reverse z-20`}
          >
            <div className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-200 text-slate-900 font-black text-[10px] flex items-center justify-center shadow-lg animate-bounce">
              🎾
            </div>
            <span className="bg-slate-950/80 text-yellow-300 px-1 py-0.5 rounded text-[9px] font-bold">
              {match.team2.players[match.currentServerPlayerIndex]?.name || 'Server'}
            </span>
          </div>
        )}

        {/* Receiver Marker */}
        {isServerT1 ? (
          <div
            className={`absolute right-[6%] transition-all duration-300 ${
              serveCourt === 'deuce' ? 'top-[22%]' : 'bottom-[22%]'
            } flex items-center gap-1 z-20`}
          >
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-white text-white font-bold text-[9px] flex items-center justify-center">
              R
            </div>
          </div>
        ) : (
          <div
            className={`absolute left-[6%] transition-all duration-300 ${
              serveCourt === 'deuce' ? 'bottom-[22%]' : 'top-[22%]'
            } flex items-center gap-1 z-20`}
          >
            <div className="w-4 h-4 rounded-full bg-blue-500 border border-white text-white font-bold text-[9px] flex items-center justify-center">
              R
            </div>
          </div>
        )}

        {/* Team Labels on Baseline */}
        <div className="absolute bottom-1 left-2 text-[9px] font-extrabold text-white/70 tracking-wide pointer-events-none">
          {match.team1.name.toUpperCase()}
        </div>
        <div className="absolute bottom-1 right-2 text-[9px] font-extrabold text-white/70 tracking-wide pointer-events-none">
          {match.team2.name.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

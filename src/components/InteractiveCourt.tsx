import React from 'react';
import { MatchState } from '../types/tennis';
import { getCurrentServeCourt, getCurrentServer, getCurrentReceiver } from '../utils/tennisEngine';

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
  const { currentGame, currentServerTeam, sets, currentSetIndex, settings } = match;
  const currentSet = sets[currentSetIndex];
  const serveCourt = getCurrentServeCourt(currentGame);
  const isDoubles = settings.type === 'doubles';

  const currentServer = getCurrentServer(match);
  const currentReceiver = getCurrentReceiver(match);

  // Total games played in current set determines side change (after odd games sum: 1, 3, 5...)
  const totalGamesInSet = currentSet ? currentSet.team1Games + currentSet.team2Games : 0;
  const isOddGamesSum = totalGamesInSet % 2 === 1;

  // Ends swap automatically when games sum in current set is odd,
  // and in tiebreak, ends additionally swap every 6 points (6, 12, 18...)
  let isSwapped = isOddGamesSum;
  let isTiebreakChangeEnds = false;
  if (currentGame.isTiebreak) {
    const tbPoints = currentGame.team1Points + currentGame.team2Points;
    const tbSwaps = Math.floor(tbPoints / 6);
    if (tbSwaps % 2 === 1) {
      isSwapped = !isSwapped;
    }
    // Flag if exactly on change ends point (6, 12, 18...)
    if (tbPoints > 0 && tbPoints % 6 === 0) {
      isTiebreakChangeEnds = true;
    }
  }

  // Which team is physically on the left side of the screen
  const isTeam1Left = !isSwapped;
  const isServerT1 = currentServerTeam === 'team1';
  const isServerOnLeft = isServerT1 ? isTeam1Left : !isTeam1Left;

  // Doubles partners
  const serverTeam = currentServer.team;
  const serverPartnerIdx = isDoubles ? (currentServer.playerIndex + 1) % 2 : null;
  const serverPartner =
    serverPartnerIdx !== null ? match[serverTeam].players[serverPartnerIdx] : null;

  const receiverTeam = currentReceiver.team;
  const receiverPartnerIdx = isDoubles ? (currentReceiver.playerIndex + 1) % 2 : null;
  const receiverPartner =
    receiverPartnerIdx !== null ? match[receiverTeam].players[receiverPartnerIdx] : null;

  // Tennis Geometry Perspective:
  // For player standing on LEFT baseline facing net (looking East/Right):
  // - Right hand is DOWN (South) -> Deuce Court is BOTTOM-LEFT
  // - Left hand is UP (North) -> Ad Court is TOP-LEFT
  // For player standing on RIGHT baseline facing net (looking West/Left):
  // - Right hand is UP (North) -> Deuce Court is TOP-RIGHT
  // - Left hand is DOWN (South) -> Ad Court is BOTTOM-RIGHT
  //
  // Cross-court serve rule (เสิร์ฟทแยงมุม):
  // - Deuce serve: Server from Deuce court -> Receiver's Deuce service box
  //   - If server on LEFT: from Bottom-Left -> Top-Right box ('box-t2-top')
  //   - If server on RIGHT: from Top-Right -> Bottom-Left box ('box-t1-bottom')
  // - Ad serve: Server from Ad court -> Receiver's Ad service box
  //   - If server on LEFT: from Top-Left -> Bottom-Right box ('box-t2-bottom')
  //   - If server on RIGHT: from Bottom-Right -> Top-Left box ('box-t1-top')
  const targetBox = isServerOnLeft
    ? serveCourt === 'deuce'
      ? 'box-t2-top'
      : 'box-t2-bottom'
    : serveCourt === 'deuce'
    ? 'box-t1-bottom'
    : 'box-t1-top';

  // SVG Trajectory coordinates (0-100 scale)
  const serverSvgX = isServerOnLeft ? 6 : 94;
  const serverSvgY = isServerOnLeft
    ? serveCourt === 'deuce'
      ? 74
      : 26
    : serveCourt === 'deuce'
    ? 26
    : 74;

  const targetSvgX = isServerOnLeft ? 61 : 39;
  const targetSvgY = isServerOnLeft
    ? serveCourt === 'deuce'
      ? 33
      : 67
    : serveCourt === 'deuce'
    ? 67
    : 33;

  // Tiebreak status description
  const isTiebreak = currentGame.isTiebreak;
  const tbPoints = currentGame.team1Points + currentGame.team2Points;
  const tbPtInPair = tbPoints === 0 ? 1 : ((tbPoints + 1) % 2 === 1 ? 1 : 2);

  return (
    <div className="relative w-full h-full flex flex-col justify-center p-0.5 select-none">
      {/* Court Header & Serving Rule Guide */}
      <div className="flex items-center justify-between w-full px-2 mb-1 text-[11px] font-semibold text-slate-300">
        <div className="flex items-center gap-1.5 truncate">
          <span className="flex items-center gap-1 shrink-0">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">
              {isDoubles ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'}
            </span>
          </span>

          {isTiebreak ? (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 px-1.5 py-0.2 rounded text-[10px] font-extrabold flex items-center gap-1">
              <span>🔥 ไทเบรก แต้มที่ {tbPoints + 1}</span>
              <span className="text-[9px] opacity-80">
                {tbPoints === 0
                  ? '(ลูกแรก: เสิร์ฟ 1 แต้มจากขวา)'
                  : `(ลูกที่ ${tbPtInPair}/2)`}
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
              เสิร์ฟทแยงมุม (Cross-court)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isTiebreakChangeEnds && (
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">
              🔄 เปลี่ยนแดน!
            </span>
          )}
          <span className="text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded text-[10px] font-bold shadow-xs">
            {serveCourt === 'deuce'
              ? '🎾 เสิร์ฟคอร์ตขวา (Deuce Court)'
              : '🎾 เสิร์ฟคอร์ตซ้าย (Ad Court)'}
          </span>
        </div>
      </div>

      {/* 2D Landscape Court Canvas */}
      <div className="relative w-full aspect-[2.1/1] max-h-[220px] bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 rounded-xl border-2 border-slate-300/80 shadow-2xl overflow-hidden my-auto">
        {/* Court Surface Texture */}
        <div
          className={`absolute inset-0 opacity-20 pointer-events-none ${
            settings.courtSurface === 'clay'
              ? 'bg-amber-900'
              : settings.courtSurface === 'grass'
              ? 'bg-emerald-950'
              : 'bg-blue-950'
          }`}
        />

        {/* ================= COURT WHITE LINES ================= */}
        {/* Singles Sidelines (Top & Bottom) */}
        <div className="absolute top-[16%] left-0 right-0 h-[1.5px] bg-white/80" />
        <div className="absolute bottom-[16%] left-0 right-0 h-[1.5px] bg-white/80" />

        {/* Service Lines (Perpendicular to sidelines) */}
        <div className="absolute top-[16%] bottom-[16%] left-[28%] w-[1.5px] bg-white/80" />
        <div className="absolute top-[16%] bottom-[16%] right-[28%] w-[1.5px] bg-white/80" />

        {/* Center Service Line (Dividing Deuce & Ad service boxes) */}
        <div className="absolute top-[50%] left-[28%] right-[28%] h-[1.5px] bg-white/90 z-5" />

        {/* Center marks on baselines */}
        <div className="absolute top-[46%] bottom-[46%] left-0 w-[4px] bg-white" />
        <div className="absolute top-[46%] bottom-[46%] right-0 w-[4px] bg-white" />

        {/* Center Net (White net tape with shadow and net posts) */}
        <div className="absolute top-0 bottom-0 left-[50%] -translate-x-1/2 w-[3px] bg-white shadow-xl z-20">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-100 shadow" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-100 shadow" />
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 text-[8px] font-black text-white/40 tracking-widest rotate-90 pointer-events-none select-none">
            NET
          </div>
        </div>

        {/* ================= COURT WATERMARK LABELS ================= */}
        {/* Left Court (Side A) */}
        <div className="absolute top-[28%] left-[10%] text-[8px] font-black text-white/20 uppercase tracking-widest pointer-events-none select-none">
          Ad Court (ซ้าย)
        </div>
        <div className="absolute bottom-[28%] left-[10%] text-[8px] font-black text-white/20 uppercase tracking-widest pointer-events-none select-none">
          Deuce Court (ขวา)
        </div>

        {/* Right Court (Side B) */}
        <div className="absolute top-[28%] right-[10%] text-[8px] font-black text-white/20 uppercase tracking-widest pointer-events-none select-none text-right">
          Deuce Court (ขวา)
        </div>
        <div className="absolute bottom-[28%] right-[10%] text-[8px] font-black text-white/20 uppercase tracking-widest pointer-events-none select-none text-right">
          Ad Court (ซ้าย)
        </div>

        {/* ================= INTERACTIVE SERVICE BOXES ================= */}
        {/* Box T1 Top (Left Ad Box) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t1_service_ad')}
          className={`absolute top-[16%] bottom-[50%] left-[28%] right-[50%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t1-top'
              ? 'bg-amber-400/40 border-2 border-amber-300 ring-2 ring-amber-400/50'
              : selectedZone === 't1_service_ad'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งซ้าย (T1 Ad Box)"
        >
          {targetBox === 'box-t1-top' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-slate-950/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                🎯 เป้าหมายรับเสิร์ฟ
              </span>
            </div>
          )}
        </div>

        {/* Box T1 Bottom (Left Deuce Box) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t1_service_deuce')}
          className={`absolute top-[50%] bottom-[16%] left-[28%] right-[50%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t1-bottom'
              ? 'bg-amber-400/40 border-2 border-amber-300 ring-2 ring-amber-400/50'
              : selectedZone === 't1_service_deuce'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งขวา (T1 Deuce Box)"
        >
          {targetBox === 'box-t1-bottom' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-slate-950/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                🎯 เป้าหมายรับเสิร์ฟ
              </span>
            </div>
          )}
        </div>

        {/* Box T2 Top (Right Deuce Box) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t2_service_deuce')}
          className={`absolute top-[16%] bottom-[50%] left-[50%] right-[28%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t2-top'
              ? 'bg-amber-400/40 border-2 border-amber-300 ring-2 ring-amber-400/50'
              : selectedZone === 't2_service_deuce'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งขวา (T2 Deuce Box)"
        >
          {targetBox === 'box-t2-top' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-slate-950/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                🎯 เป้าหมายรับเสิร์ฟ
              </span>
            </div>
          )}
        </div>

        {/* Box T2 Bottom (Right Ad Box) */}
        <div
          onClick={() => onZoneSelect && onZoneSelect('t2_service_ad')}
          className={`absolute top-[50%] bottom-[16%] left-[50%] right-[28%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t2-bottom'
              ? 'bg-amber-400/40 border-2 border-amber-300 ring-2 ring-amber-400/50'
              : selectedZone === 't2_service_ad'
              ? 'bg-blue-400/30'
              : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งซ้าย (T2 Ad Box)"
        >
          {targetBox === 'box-t2-bottom' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-slate-950/80 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                🎯 เป้าหมายรับเสิร์ฟ
              </span>
            </div>
          )}
        </div>

        {/* ================= BALL SERVE TRAJECTORY (SVG ARROW) ================= */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="serveLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="1" />
            </linearGradient>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="4"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" />
            </marker>
          </defs>
          {/* Diagonal Cross-court Serve Line */}
          <line
            x1={serverSvgX}
            y1={serverSvgY}
            x2={targetSvgX}
            y2={targetSvgY}
            stroke="url(#serveLineGrad)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            markerEnd="url(#arrowhead)"
            className="animate-pulse"
          />
        </svg>

        {/* ================= PLAYER BADGES ON COURT ================= */}
        {/* 1. SERVER (ผู้เสิร์ฟ) */}
        <div
          className={`absolute transition-all duration-300 z-30 flex items-center gap-1 ${
            isServerOnLeft
              ? `left-[3%] ${serveCourt === 'deuce' ? 'bottom-[18%]' : 'top-[18%]'}`
              : `right-[3%] flex-row-reverse ${serveCourt === 'deuce' ? 'top-[18%]' : 'bottom-[18%]'}`
          }`}
        >
          <div className="flex items-center gap-1 bg-yellow-400 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-xl border-2 border-white text-[10px] animate-pulse">
            <span className="text-xs">🎾</span>
            <span className="truncate max-w-[85px]">{currentServer.playerName}</span>
            <span className="bg-slate-950 text-yellow-300 text-[8px] px-1 py-0.2 rounded font-extrabold uppercase">
              เสิร์ฟ
            </span>
          </div>
        </div>

        {/* 2. SERVER'S PARTNER (คู่หูผู้เสิร์ฟ ยืนคุมหน้าเน็ตฝั่งตรงข้ามของ Server) */}
        {isDoubles && serverPartner && (
          <div
            className={`absolute transition-all duration-300 z-25 flex items-center gap-1 ${
              isServerOnLeft
                ? `left-[38%] ${serveCourt === 'deuce' ? 'top-[20%]' : 'bottom-[20%]'}`
                : `right-[38%] flex-row-reverse ${serveCourt === 'deuce' ? 'bottom-[20%]' : 'top-[20%]'}`
            }`}
          >
            <div className="flex items-center gap-1 bg-slate-900/90 text-yellow-200 font-bold px-1.5 py-0.5 rounded-full shadow border border-yellow-500/50 text-[9px] backdrop-blur-xs">
              <span className="text-[10px]">🛡️</span>
              <span className="truncate max-w-[70px]">{serverPartner.name}</span>
              <span className="text-[7.5px] text-yellow-400/80">(เน็ต)</span>
            </div>
          </div>
        )}

        {/* 3. RECEIVER (ผู้รับเสิร์ฟ ยืนหลังคอร์ตตรงกับ Service Box) */}
        <div
          className={`absolute transition-all duration-300 z-30 flex items-center gap-1 ${
            isServerOnLeft
              ? `right-[3%] flex-row-reverse ${serveCourt === 'deuce' ? 'top-[18%]' : 'bottom-[18%]'}`
              : `left-[3%] ${serveCourt === 'deuce' ? 'bottom-[18%]' : 'top-[18%]'}`
          }`}
        >
          <div className="flex items-center gap-1 bg-sky-500 text-white font-black px-2 py-0.5 rounded-full shadow-xl border-2 border-white text-[10px]">
            <span className="text-xs">🎯</span>
            <span className="truncate max-w-[85px]">{currentReceiver.playerName}</span>
            <span className="bg-slate-950 text-sky-200 text-[8px] px-1 py-0.2 rounded font-extrabold uppercase">
              รับเสิร์ฟ
            </span>
          </div>
        </div>

        {/* 4. RECEIVER'S PARTNER (คู่หูผู้รับ ยืนคุมหน้าเน็ตฝั่งตรงข้ามของ Receiver) */}
        {isDoubles && receiverPartner && (
          <div
            className={`absolute transition-all duration-300 z-25 flex items-center gap-1 ${
              isServerOnLeft
                ? `right-[38%] flex-row-reverse ${serveCourt === 'deuce' ? 'bottom-[20%]' : 'top-[20%]'}`
                : `left-[38%] ${serveCourt === 'deuce' ? 'top-[20%]' : 'bottom-[20%]'}`
            }`}
          >
            <div className="flex items-center gap-1 bg-slate-900/90 text-sky-200 font-bold px-1.5 py-0.5 rounded-full shadow border border-sky-400/50 text-[9px] backdrop-blur-xs">
              <span className="text-[10px]">🛡️</span>
              <span className="truncate max-w-[70px]">{receiverPartner.name}</span>
              <span className="text-[7.5px] text-sky-300/80">(เน็ต)</span>
            </div>
          </div>
        )}

        {/* Team Headers on Court Sides */}
        <div className="absolute top-1 left-2 text-[9px] font-extrabold text-white/50 tracking-wider pointer-events-none select-none">
          ฝั่ง: {isTeam1Left ? match.team1.name : match.team2.name}
        </div>
        <div className="absolute top-1 right-2 text-[9px] font-extrabold text-white/50 tracking-wider pointer-events-none select-none text-right">
          ฝั่ง: {isTeam1Left ? match.team2.name : match.team1.name}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { MatchState } from '../types/tennis';
import {
  getCurrentServeCourt,
  getCurrentServer,
  getCurrentReceiver,
  isDecidingPointState,
} from '../utils/tennisEngine';

interface InteractiveCourtProps {
  match: MatchState;
  onZoneSelect?: (zone: string) => void;
  selectedZone?: string | null;
  onSelectDecidingCourt?: (court: 'deuce' | 'ad') => void;
  onSelectPlayerError?: (team: 'team1' | 'team2', playerName: string) => void;
}

interface PlayerPosition {
  x: number;
  y: number;
  facing: 'right' | 'left';
  team: 'team1' | 'team2';
  role: 'server' | 'receiver' | 'net';
  name: string;
}

/**
 * Approximate quadratic Bezier curve length for accurate ball-to-bounce timing
 */
function approxQuadLength(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps = 20
): number {
  let len = 0;
  let prevX = x0;
  let prevY = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x1;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y1;
    len += Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
  }
  return len;
}

/**
 * Standing tennis player SVG figure with racket, team kit, cap, and ground halo
 */
const StandingPlayer: React.FC<{
  player: PlayerPosition;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ player, onClick }) => {
  const { x, y, facing, team, role, name } = player;
  const flipX = facing === 'left' ? -1 : 1;

  const isTeam1 = team === 'team1';
  const jerseyMain = isTeam1 ? '#10b981' : '#0ea5e9';
  const jerseyDark = isTeam1 ? '#047857' : '#0369a1';
  const jerseyAccent = isTeam1 ? '#6ee7b7' : '#7dd3fc';
  const capColor = isTeam1 ? '#065f46' : '#0c4a6e';
  const shortsColor = '#0f172a';

  const isServer = role === 'server';
  const isReceiver = role === 'receiver';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className={onClick ? 'pointer-events-auto cursor-pointer group' : undefined}
    >
      {onClick && <title>{`แตะที่ ${name} เพื่อบันทึกตีเสีย`}</title>}
      {/* Generous invisible hit area for effortless mobile tapping */}
      {onClick && (
        <rect x={-12} y={-17} width={24} height={28} rx={4} fill="transparent" />
      )}
      {/* Ground Highlight Halo for Server / Receiver */}
      {isServer && (
        <ellipse
          cx={0}
          cy={6.5}
          rx={9.5}
          ry={4}
          fill="rgba(250, 204, 21, 0.18)"
          stroke="#facc15"
          strokeWidth={0.8}
          strokeDasharray="2 1.5"
        >
          <animate attributeName="rx" values="8.5;10.5;8.5" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.45;0.9" dur="1.8s" repeatCount="indefinite" />
        </ellipse>
      )}
      {isReceiver && (
        <ellipse
          cx={0}
          cy={6.5}
          rx={8.5}
          ry={3.6}
          fill="rgba(56, 189, 248, 0.15)"
          stroke="#38bdf8"
          strokeWidth={0.7}
        />
      )}

      {/* Ground Contact Shadow */}
      <ellipse cx={0} cy={6.8} rx={5.8} ry={2.2} fill="rgba(0, 0, 0, 0.42)" />

      {/* Player Body (flips horizontally depending on facing left/right) */}
      <g
        transform={`scale(${flipX}, 1)`}
        className={isServer ? '' : 'animate-player-ready'}
      >
        {/* Back Leg & Shoe */}
        <path
          d="M -1.8,1.5 L -3.2,5.6"
          stroke="#e2e8f0"
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <ellipse cx={-3.5} cy={6.2} rx={1.7} ry={0.9} fill="#f8fafc" />

        {/* Front Leg & Shoe */}
        <path
          d="M 1.6,1.5 L 3.0,5.8"
          stroke="#f1f5f9"
          strokeWidth={1.7}
          strokeLinecap="round"
        />
        <ellipse cx={3.4} cy={6.4} rx={1.8} ry={0.9} fill="#ffffff" />

        {/* Athletic Shorts */}
        <path d="M -3.0,-0.2 L 3.0,-0.2 L 3.2,2.6 L 0.4,2.6 L 0,1.4 L -0.4,2.6 L -3.2,2.6 Z" fill={shortsColor} />

        {/* Torso / Jersey */}
        <path
          d="M -3.4,-6.2 C -3.4,-7.0 3.4,-7.0 3.4,-6.2 L 3.0,-0.1 L -3.0,-0.1 Z"
          fill={jerseyMain}
          stroke={jerseyDark}
          strokeWidth={0.45}
        />
        {/* Jersey Shoulder Stripe */}
        <path d="M -2.5,-6.4 L 2.5,-6.4 L 2.2,-4.6 L -2.2,-4.6 Z" fill={jerseyAccent} opacity={0.35} />

        {/* Non-racket Arm (balanced forward) */}
        <path
          d={isServer ? 'M 2.5,-5.5 L 5.2,-8.2' : 'M -2.4,-5.4 L -4.2,-2.5'}
          stroke="#fde68a"
          strokeWidth={1.35}
          strokeLinecap="round"
        />

        {/* Racket Arm + Tennis Racket */}
        <g className={isServer ? 'animate-serve-swing' : ''}>
          {/* Arm */}
          <path
            d={
              isServer
                ? 'M -2.4,-5.6 L -0.5,-10.2'
                : 'M 2.4,-5.4 L 5.0,-3.2'
            }
            stroke="#fde68a"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          {/* Racket Shaft & Grip */}
          <line
            x1={isServer ? -0.5 : 5.0}
            y1={isServer ? -10.2 : -3.2}
            x2={isServer ? 2.4 : 7.6}
            y2={isServer ? -12.8 : -5.8}
            stroke="#334155"
            strokeWidth={0.95}
            strokeLinecap="round"
          />
          {/* Racket Head */}
          <g
            transform={
              isServer
                ? 'translate(3.8, -14.2) rotate(35)'
                : 'translate(9.2, -7.2) rotate(38)'
            }
          >
            <ellipse
              cx={0}
              cy={0}
              rx={2.3}
              ry={3.1}
              fill="rgba(255,255,255,0.16)"
              stroke={isServer ? '#facc15' : '#e2e8f0'}
              strokeWidth={0.8}
            />
            {/* Racket Strings */}
            <line x1={-1.2} y1={-2.2} x2={-1.2} y2={2.2} stroke="rgba(255,255,255,0.45)" strokeWidth={0.25} />
            <line x1={0} y1={-2.9} x2={0} y2={2.9} stroke="rgba(255,255,255,0.45)" strokeWidth={0.25} />
            <line x1={1.2} y1={-2.2} x2={1.2} y2={2.2} stroke="rgba(255,255,255,0.45)" strokeWidth={0.25} />
            <line x1={-2.0} y1={0} x2={2.0} y2={0} stroke="rgba(255,255,255,0.45)" strokeWidth={0.25} />
          </g>
        </g>

        {/* Head */}
        <circle cx={0} cy={-9.1} r={2.35} fill="#fde68a" stroke="#d97706" strokeWidth={0.35} />
        {/* Sport Cap & Visor */}
        <path d="M -2.3,-9.5 C -2.3,-11.7 2.3,-11.7 2.3,-9.5 Z" fill={capColor} />
        <path d="M 0.5,-9.6 L 3.8,-9.0 L 1.8,-8.7 Z" fill={jerseyAccent} />
      </g>
    </g>
  );
};

export const InteractiveCourt: React.FC<InteractiveCourtProps> = ({
  match,
  onZoneSelect,
  selectedZone,
  onSelectDecidingCourt,
  onSelectPlayerError,
}) => {
  const { currentGame, currentServerTeam, sets, currentSetIndex, settings } = match;
  const currentSet = sets[currentSetIndex];
  const serveCourt = getCurrentServeCourt(currentGame);
  const isDoubles = settings.type === 'doubles';
  const isDecidingPoint = isDecidingPointState(currentGame, settings.adRule);

  const currentServer = getCurrentServer(match);
  const currentReceiver = getCurrentReceiver(match);

  // Total games played in current set determines side change (only when settings.changeEnds is true)
  const shouldChangeEnds = Boolean(settings.changeEnds);
  const totalGamesInSet = currentSet ? currentSet.team1Games + currentSet.team2Games : 0;
  const isOddGamesSum = totalGamesInSet % 2 === 1;

  // Ends swap automatically only if shouldChangeEnds is enabled
  let isSwapped = shouldChangeEnds ? isOddGamesSum : false;
  let isTiebreakChangeEnds = false;
  if (shouldChangeEnds && currentGame.isTiebreak) {
    const tbPoints = currentGame.team1Points + currentGame.team2Points;
    const tbSwaps = Math.floor(tbPoints / 6);
    if (tbSwaps % 2 === 1) {
      isSwapped = !isSwapped;
    }
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

  // Target service box highlight
  const targetBox = isServerOnLeft
    ? serveCourt === 'deuce'
      ? 'box-t2-top'
      : 'box-t2-bottom'
    : serveCourt === 'deuce'
    ? 'box-t1-bottom'
    : 'box-t1-top';

  // ================= 210 x 100 COORDINATE SYSTEM =================
  // Standing player coordinates
  const serverPos: PlayerPosition = isServerOnLeft
    ? {
        x: 15,
        y: serveCourt === 'deuce' ? 67 : 33,
        facing: 'right',
        team: serverTeam,
        role: 'server',
        name: currentServer.playerName,
      }
    : {
        x: 195,
        y: serveCourt === 'deuce' ? 33 : 67,
        facing: 'left',
        team: serverTeam,
        role: 'server',
        name: currentServer.playerName,
      };

  const receiverPos: PlayerPosition = isServerOnLeft
    ? {
        x: 192,
        y: serveCourt === 'deuce' ? 28 : 72,
        facing: 'left',
        team: receiverTeam,
        role: 'receiver',
        name: currentReceiver.playerName,
      }
    : {
        x: 18,
        y: serveCourt === 'deuce' ? 72 : 28,
        facing: 'right',
        team: receiverTeam,
        role: 'receiver',
        name: currentReceiver.playerName,
      };

  const serverPartnerPos: PlayerPosition | null =
    isDoubles && serverPartner
      ? isServerOnLeft
        ? {
            x: 84,
            y: serveCourt === 'deuce' ? 31 : 69,
            facing: 'right',
            team: serverTeam,
            role: 'net',
            name: serverPartner.name,
          }
        : {
            x: 126,
            y: serveCourt === 'deuce' ? 69 : 31,
            facing: 'left',
            team: serverTeam,
            role: 'net',
            name: serverPartner.name,
          }
      : null;

  const receiverPartnerPos: PlayerPosition | null =
    isDoubles && receiverPartner
      ? isServerOnLeft
        ? {
            x: 128,
            y: serveCourt === 'deuce' ? 69 : 31,
            facing: 'left',
            team: receiverTeam,
            role: 'net',
            name: receiverPartner.name,
          }
        : {
            x: 82,
            y: serveCourt === 'deuce' ? 31 : 69,
            facing: 'right',
            team: receiverTeam,
            role: 'net',
            name: receiverPartner.name,
          }
      : null;

  const playersList: PlayerPosition[] = [
    serverPos,
    receiverPos,
    ...(serverPartnerPos ? [serverPartnerPos] : []),
    ...(receiverPartnerPos ? [receiverPartnerPos] : []),
  ];

  // ================= TENNIS BALL SERVE TRAJECTORY =================
  // Launch from Server's overhead racket contact point
  const launchX = isServerOnLeft ? serverPos.x + 3.8 : serverPos.x - 3.8;
  const launchY = serverPos.y - 13.5;

  // Bounce inside target service box
  const bounceX = isServerOnLeft ? 132 : 78;
  const bounceY = isServerOnLeft
    ? serveCourt === 'deuce'
      ? 33
      : 67
    : serveCourt === 'deuce'
    ? 67
    : 33;

  // Continue post-bounce toward Receiver's hitting zone
  const recvContactX = isServerOnLeft ? receiverPos.x - 8 : receiverPos.x + 8;
  const recvContactY = receiverPos.y - 4;

  // Parabolic control points (lifted in -Y to represent 3D arc height over the net)
  const ctrl1X = (launchX + bounceX) / 2;
  const ctrl1Y = Math.min(launchY, bounceY) - 15;

  const ctrl2X = (bounceX + recvContactX) / 2;
  const ctrl2Y = Math.min(bounceY, recvContactY) - 8;

  const ballFlightPath = `M ${launchX},${launchY} Q ${ctrl1X},${ctrl1Y} ${bounceX},${bounceY} Q ${ctrl2X},${ctrl2Y} ${recvContactX},${recvContactY}`;
  const serveArcPath = `M ${launchX},${launchY} Q ${ctrl1X},${ctrl1Y} ${bounceX},${bounceY}`;
  const reboundArcPath = `M ${bounceX},${bounceY} Q ${ctrl2X},${ctrl2Y} ${recvContactX},${recvContactY}`;

  // Ground shadow flat projection path
  const shadowStartX = serverPos.x + (isServerOnLeft ? 2 : -2);
  const shadowStartY = serverPos.y + 5.5;
  const shadowRecvX = recvContactX;
  const shadowRecvY = receiverPos.y + 5.5;
  const shadowPath = `M ${shadowStartX},${shadowStartY} L ${bounceX},${bounceY} L ${shadowRecvX},${shadowRecvY}`;

  // Exact bounce ratio along flight & shadow paths for synchronized timing
  const seg1Len = approxQuadLength(launchX, launchY, ctrl1X, ctrl1Y, bounceX, bounceY);
  const seg2Len = approxQuadLength(bounceX, bounceY, ctrl2X, ctrl2Y, recvContactX, recvContactY);
  const flightBounceRatio = (seg1Len / (seg1Len + seg2Len)).toFixed(4);

  const shadow1Len = Math.hypot(bounceX - shadowStartX, bounceY - shadowStartY);
  const shadow2Len = Math.hypot(shadowRecvX - bounceX, shadowRecvY - bounceY);
  const shadowBounceRatio = (shadow1Len / (shadow1Len + shadow2Len)).toFixed(4);

  // Tiebreak status description
  const isTiebreak = currentGame.isTiebreak;
  const tbPoints = currentGame.team1Points + currentGame.team2Points;
  const tbPtInPair = tbPoints === 0 ? 1 : (tbPoints + 1) % 2 === 1 ? 1 : 2;
  const animKey = `${isServerOnLeft}-${serveCourt}-${currentReceiver.playerId}-${tbPoints}-${currentSetIndex}`;

  // Court surface color palette (inner play area + outer apron)
  const surfacePalette =
    settings.courtSurface === 'clay'
      ? { apron: '#7c2d12', court: '#b45309', boxTint: 'rgba(251, 191, 36, 0.22)' }
      : settings.courtSurface === 'grass'
      ? { apron: '#022c22', court: '#065f46', boxTint: 'rgba(190, 242, 100, 0.22)' }
      : { apron: '#0f2942', court: '#1e40af', boxTint: 'rgba(250, 204, 21, 0.22)' };

  return (
    <div className="relative w-full h-full flex flex-col justify-center p-0.5 select-none">
      {/* Court Header & Serving Rule Guide */}
      <div className="flex items-center justify-between w-full px-1.5 mb-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-300 gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold text-white">
              {isDoubles ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'}
            </span>
          </span>

          {isTiebreak && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold flex items-center gap-1 whitespace-nowrap">
              <span>🔥 ไทเบรก แต้มที่ {tbPoints + 1}</span>
              <span className="text-[8.5px] opacity-80 hidden sm:inline">
                {tbPoints === 0
                  ? '(ลูกแรก: เสิร์ฟ 1 แต้ม)'
                  : `(ลูกที่ ${tbPtInPair}/2)`}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
              shouldChangeEnds
                ? 'bg-sky-950/70 text-sky-300 border-sky-700/60'
                : 'bg-slate-800/90 text-slate-300 border-slate-700'
            }`}
          >
            {shouldChangeEnds ? '🔄 สลับฝั่งอัตโนมัติ' : '📌 ไม่สลับฝั่ง'}
          </span>
          {isTiebreakChangeEnds && (
            <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">
              🔄 เปลี่ยนแดน!
            </span>
          )}
          <span className="text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold shadow-xs">
            {serveCourt === 'deuce' ? '🎾 เสิร์ฟ Deuce' : '🎾 เสิร์ฟ Ad'}
          </span>
        </div>
      </div>

      {/* 2D Broadcast Tennis Court Canvas (auto-fits width & height cleanly) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center [container-type:size]">
        <div
          className="relative aspect-[2.1/1] rounded-xl border-2 border-slate-300/80 shadow-2xl overflow-hidden"
          style={{
            width: 'min(100cqw, calc(100cqh * 2.1))',
            backgroundColor: surfacePalette.apron,
          }}
        >
        {/* Inner Court Play Surface (within Doubles Outer Lines) */}
        <div
          className="absolute inset-x-[3.5%] inset-y-[9%] shadow-inner transition-colors duration-300"
          style={{ backgroundColor: surfacePalette.court }}
        />

        {/* ================= COURT WHITE LINES ================= */}
        {/* Outer Doubles Boundary */}
        <div className="absolute inset-x-[3.5%] inset-y-[9%] border-[1.5px] border-white/85 pointer-events-none" />

        {/* Singles Sidelines (Top & Bottom) */}
        <div className="absolute top-[18.5%] left-[3.5%] right-[3.5%] h-[1.5px] bg-white/85 pointer-events-none" />
        <div className="absolute bottom-[18.5%] left-[3.5%] right-[3.5%] h-[1.5px] bg-white/85 pointer-events-none" />

        {/* Service Lines */}
        <div className="absolute top-[18.5%] bottom-[18.5%] left-[28%] w-[1.5px] bg-white/85 pointer-events-none" />
        <div className="absolute top-[18.5%] bottom-[18.5%] right-[28%] w-[1.5px] bg-white/85 pointer-events-none" />

        {/* Center Service Line */}
        <div className="absolute top-[50%] left-[28%] right-[28%] h-[1.5px] bg-white/90 pointer-events-none" />

        {/* Center marks on baselines */}
        <div className="absolute top-[47%] bottom-[47%] left-[3.5%] w-[4px] bg-white pointer-events-none" />
        <div className="absolute top-[47%] bottom-[47%] right-[3.5%] w-[4px] bg-white pointer-events-none" />

        {/* Subtle Court Watermarks (Deuce / Ad labels tucked cleanly inside baselines) */}
        <div className="absolute top-[20.5%] left-[10%] text-[6px] sm:text-[7.5px] font-black text-white/25 uppercase tracking-wider pointer-events-none select-none">
          Ad
        </div>
        <div className="absolute bottom-[20.5%] left-[10%] text-[6px] sm:text-[7.5px] font-black text-white/25 uppercase tracking-wider pointer-events-none select-none">
          Deuce
        </div>
        <div className="absolute top-[20.5%] right-[10%] text-[6px] sm:text-[7.5px] font-black text-white/25 uppercase tracking-wider pointer-events-none select-none text-right">
          Deuce
        </div>
        <div className="absolute bottom-[20.5%] right-[10%] text-[6px] sm:text-[7.5px] font-black text-white/25 uppercase tracking-wider pointer-events-none select-none text-right">
          Ad
        </div>

        {/* ================= INTERACTIVE SERVICE BOXES ================= */}
        {/* Box T1 Top (Left Ad Box) */}
        <div
          onClick={() => {
            if (isDecidingPoint && onSelectDecidingCourt && isServerOnLeft === false) {
              onSelectDecidingCourt('ad');
            }
            if (onZoneSelect) onZoneSelect('t1_service_ad');
          }}
          style={{
            backgroundColor:
              targetBox === 'box-t1-top'
                ? surfacePalette.boxTint
                : selectedZone === 't1_service_ad'
                ? 'rgba(56, 189, 248, 0.25)'
                : undefined,
          }}
          className={`absolute top-[18.5%] bottom-[50%] left-[28%] right-[50%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t1-top' ? 'ring-1 ring-inset ring-lime-300/70' : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งซ้าย (Ad Box)"
        />
        {/* Box T1 Bottom (Left Deuce Box) */}
        <div
          onClick={() => {
            if (isDecidingPoint && onSelectDecidingCourt && isServerOnLeft === false) {
              onSelectDecidingCourt('deuce');
            }
            if (onZoneSelect) onZoneSelect('t1_service_deuce');
          }}
          style={{
            backgroundColor:
              targetBox === 'box-t1-bottom'
                ? surfacePalette.boxTint
                : selectedZone === 't1_service_deuce'
                ? 'rgba(56, 189, 248, 0.25)'
                : undefined,
          }}
          className={`absolute top-[50%] bottom-[18.5%] left-[28%] right-[50%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t1-bottom' ? 'ring-1 ring-inset ring-lime-300/70' : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งขวา (Deuce Box)"
        />
        {/* Box T2 Top (Right Deuce Box) */}
        <div
          onClick={() => {
            if (isDecidingPoint && onSelectDecidingCourt && isServerOnLeft === true) {
              onSelectDecidingCourt('deuce');
            }
            if (onZoneSelect) onZoneSelect('t2_service_deuce');
          }}
          style={{
            backgroundColor:
              targetBox === 'box-t2-top'
                ? surfacePalette.boxTint
                : selectedZone === 't2_service_deuce'
                ? 'rgba(56, 189, 248, 0.25)'
                : undefined,
          }}
          className={`absolute top-[18.5%] bottom-[50%] left-[50%] right-[28%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t2-top' ? 'ring-1 ring-inset ring-lime-300/70' : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งขวา (Deuce Box)"
        />
        {/* Box T2 Bottom (Right Ad Box) */}
        <div
          onClick={() => {
            if (isDecidingPoint && onSelectDecidingCourt && isServerOnLeft === true) {
              onSelectDecidingCourt('ad');
            }
            if (onZoneSelect) onZoneSelect('t2_service_ad');
          }}
          style={{
            backgroundColor:
              targetBox === 'box-t2-bottom'
                ? surfacePalette.boxTint
                : selectedZone === 't2_service_ad'
                ? 'rgba(56, 189, 248, 0.25)'
                : undefined,
          }}
          className={`absolute top-[50%] bottom-[18.5%] left-[50%] right-[28%] transition-colors duration-200 cursor-pointer z-10 ${
            targetBox === 'box-t2-bottom' ? 'ring-1 ring-inset ring-lime-300/70' : 'hover:bg-white/10'
          }`}
          title="กล่องรับเสิร์ฟฝั่งซ้าย (Ad Box)"
        />

        {/* Center Net with mesh texture & net posts */}
        <div className="absolute top-[3%] bottom-[3%] left-[50%] -translate-x-1/2 w-[5px] z-15 pointer-events-none flex justify-center">
          <div className="w-[2.5px] h-full bg-gradient-to-b from-slate-100 via-white to-slate-100 shadow-[0_0_8px_rgba(0,0,0,0.6)]" />
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-600 shadow" />
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-600 shadow" />
        </div>

        {/* ================= SVG PLAYERS & ANIMATED TENNIS BALL ================= */}
        <svg
          key={animKey}
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          viewBox="0 0 210 100"
        >
          <defs>
            {/* 3D Optic Yellow Tennis Ball Gradient */}
            <radialGradient id="tennisBallGrad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f7fee7" />
              <stop offset="35%" stopColor="#d9f99d" />
              <stop offset="75%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#65a30d" />
            </radialGradient>

            {/* Glowing Flight Trail Gradient */}
            <linearGradient id="flightGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#bef264" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#facc15" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#bef264" stopOpacity="0.4" />
            </linearGradient>

            <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Serve Trajectory Arc (NO Arrowhead - pure tennis arc!) */}
          <path
            d={serveArcPath}
            fill="none"
            stroke="url(#flightGlowGrad)"
            strokeWidth={1.3}
            strokeDasharray="3 2.5"
            strokeLinecap="round"
          />
          <path
            d={reboundArcPath}
            fill="none"
            stroke="rgba(190, 242, 100, 0.35)"
            strokeWidth={1.0}
            strokeDasharray="2 2.5"
            strokeLinecap="round"
          />

          {/* 2. Standing Tennis Players (2 in Singles, 4 in Doubles - Tap to record Error!) */}
          {playersList.map((p, idx) => (
            <StandingPlayer
              key={`${p.role}-${idx}-${p.name}`}
              player={p}
              onClick={
                onSelectPlayerError
                  ? (e) => {
                      e.stopPropagation();
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
                      onSelectPlayerError(p.team, p.name);
                    }
                  : undefined
              }
            />
          ))}

          {/* 3. Bounce Impact Ripple inside Target Service Box (timed at 60% of 2.6s loop) */}
          <circle
            cx={bounceX}
            cy={bounceY}
            r={2}
            fill="rgba(190, 242, 100, 0.25)"
            stroke="#bef264"
            strokeWidth={1.1}
          >
            <animate
              attributeName="r"
              values="1;1;2.2;9.5;11;1"
              keyTimes="0;0.58;0.60;0.78;0.88;1"
              dur="2.6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0;0.95;0.25;0;0"
              keyTimes="0;0.58;0.60;0.78;0.88;1"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Subtle bounce landing dot */}
          <circle cx={bounceX} cy={bounceY} r={1.3} fill="#bef264" opacity={0.65} />

          {/* 4. Ball Ground Shadow (travels flat along court floor to give true 3D height) */}
          <ellipse cx={0} cy={0} rx={2.2} ry={1.0} fill="rgba(0, 0, 0, 0.38)">
            <animateMotion
              path={shadowPath}
              dur="2.6s"
              repeatCount="indefinite"
              calcMode="linear"
              keyPoints={`0;${shadowBounceRatio};1;1`}
              keyTimes="0;0.60;0.88;1"
            />
            <animate
              attributeName="opacity"
              values="0.2;0.25;0.55;0.3;0;0"
              keyTimes="0;0.30;0.60;0.85;0.92;1"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* 5. Animated Tennis Ball Comet Trail (2 subtle trailing glow orbs) */}
          <circle r={1.8} fill="#d9f99d" opacity={0.35}>
            <animateMotion
              path={ballFlightPath}
              dur="2.6s"
              begin="-0.08s"
              repeatCount="indefinite"
              calcMode="linear"
              keyPoints={`0;${flightBounceRatio};1;1`}
              keyTimes="0;0.60;0.88;1"
            />
            <animate
              attributeName="opacity"
              values="0;0.38;0.38;0;0"
              keyTimes="0;0.06;0.80;0.88;1"
              dur="2.6s"
              begin="-0.08s"
              repeatCount="indefinite"
            />
          </circle>

          {/* 6. Main Optic-Yellow Tennis Ball with Seam */}
          <g filter="url(#ballGlow)">
            <animateMotion
              path={ballFlightPath}
              dur="2.6s"
              repeatCount="indefinite"
              calcMode="linear"
              keyPoints={`0;${flightBounceRatio};1;1`}
              keyTimes="0;0.60;0.88;1"
            />
            <g>
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.9;1.28;0.9;1.08;0.95;0.95"
                keyTimes="0;0.30;0.60;0.74;0.88;1"
                dur="2.6s"
                repeatCount="indefinite"
              />
              <circle cx={0} cy={0} r={2.8} fill="url(#tennisBallGrad)" stroke="#4d7c0f" strokeWidth={0.3} />
              {/* Classic tennis ball curved seam */}
              <path
                d="M -1.8,-1.8 C -0.3,-0.6 -0.3,0.6 -1.8,1.8 M 1.8,-1.8 C 0.3,-0.6 0.3,0.6 1.8,1.8"
                fill="none"
                stroke="#ffffff"
                strokeWidth={0.55}
                strokeLinecap="round"
                opacity={0.9}
              />
            </g>
            <animate
              attributeName="opacity"
              values="0.2;1;1;1;0;0"
              keyTimes="0;0.05;0.60;0.84;0.92;1"
              dur="2.6s"
              repeatCount="indefinite"
            />
          </g>
        </svg>

        {/* ================= CRISP THAI NAME-ONLY BADGES FOR STANDING PLAYERS ================= */}
        {playersList.map((p, idx) => {
          const leftPct = (p.x / 210) * 100;
          const topPct = Math.min(p.y + 7.2, 80);
          const translateX = p.x < 35 ? '-15%' : p.x > 175 ? '-85%' : '-50%';

          const isServer = p.role === 'server';
          const isReceiver = p.role === 'receiver';

          return (
            <button
              key={`label-${p.role}-${idx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
                onSelectPlayerError?.(p.team, p.name);
              }}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: `translate(${translateX}, 0)`,
              }}
              className={`absolute z-30 transition-all duration-200 ${
                onSelectPlayerError
                  ? 'pointer-events-auto cursor-pointer hover:scale-110 active:scale-95'
                  : 'pointer-events-none'
              }`}
              title={`แตะที่ ${p.name} เพื่อบันทึกตีเสีย`}
            >
              <div
                className={`flex items-center justify-center px-1.5 py-[1px] rounded-full shadow-md border text-[7.5px] sm:text-[8.5px] leading-tight font-bold text-center whitespace-normal break-words max-w-[76px] backdrop-blur-xs ${
                  isServer
                    ? 'bg-amber-400 text-slate-950 border-white font-black'
                    : isReceiver
                    ? 'bg-sky-500 text-white border-white font-black'
                    : p.team === 'team1'
                    ? 'bg-slate-950/85 text-emerald-300 border-emerald-500/60'
                    : 'bg-slate-950/85 text-sky-300 border-sky-500/60'
                }`}
              >
                <span>{p.name}</span>
              </div>
            </button>
          );
        })}

        {/* Team Side Headers tucked cleanly inside outer top apron */}
        <div className="absolute top-[1.5%] left-[3.5%] max-w-[44%] text-[7px] sm:text-[8.5px] leading-tight font-extrabold text-white/80 tracking-wide pointer-events-none select-none break-words">
          ฝั่ง: {isTeam1Left ? match.team1.name : match.team2.name}
        </div>
        <div className="absolute top-[1.5%] right-[3.5%] max-w-[44%] text-[7px] sm:text-[8.5px] leading-tight font-extrabold text-white/80 tracking-wide pointer-events-none select-none text-right break-words">
          ฝั่ง: {isTeam1Left ? match.team2.name : match.team1.name}
        </div>
        </div>
      </div>
    </div>
  );
};

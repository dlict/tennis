import React, { useState } from 'react';
import { MatchState, TeamStats, PointRecord } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';
import {
  Trophy,
  Award,
  ExternalLink,
  RefreshCw,
  BarChart2,
  TrendingUp,
  Zap,
  Target,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  XCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface PostMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: MatchState;
  activeSheetUrl: string | null;
  onOpenAnalytics: () => void;
  onOpenInfographic: () => void;
  onNewMatch: () => void;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  activeSheetUrl,
  onOpenAnalytics,
  onOpenInfographic,
  onNewMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'momentum' | 'insights'>('stats');

  if (!isOpen || !match.isFinished) return null;

  const winnerTeam = match.matchWinner || 'team1';
  const winnerName = match[winnerTeam].name;
  const runnerUpTeam = winnerTeam === 'team1' ? 'team2' : 'team1';
  const runnerUpName = match[runnerUpTeam].name;

  const stats = calculateMatchStats(match.pointsHistory, match.sets);
  const t1Stats = stats.team1;
  const t2Stats = stats.team2;

  // Set score summary
  const completedSets = match.sets.filter((s) => s.winner);

  // Compute momentum and cumulative points for the SVG chart
  let runningT1 = 0;
  let runningT2 = 0;
  const momentumPoints = match.pointsHistory.map((pt, i) => {
    if (pt.winnerTeam === 'team1') runningT1 += 1;
    else runningT2 += 1;
    return {
      index: i + 1,
      t1: runningT1,
      t2: runningT2,
      diff: runningT1 - runningT2,
      setIndex: pt.setIndex,
      isBreakPoint: pt.isBreakPoint,
      winnerTeam: pt.winnerTeam,
    };
  });

  const totalPoints = match.pointsHistory.length || 1;
  const maxPts = Math.max(runningT1, runningT2, 1);

  // Generate dynamic tactical analysis
  const winnerTotalStats = winnerTeam === 'team1' ? t1Stats : t2Stats;
  const runnerUpTotalStats = runnerUpTeam === 'team1' ? t1Stats : t2Stats;

  const winnerServe1InPct = winnerTotalStats.firstServesAttempted > 0
    ? Math.round((winnerTotalStats.firstServesIn / winnerTotalStats.firstServesAttempted) * 100)
    : 0;
  const runnerServe1InPct = runnerUpTotalStats.firstServesAttempted > 0
    ? Math.round((runnerUpTotalStats.firstServesIn / runnerUpTotalStats.firstServesAttempted) * 100)
    : 0;

  const winnerBpPct = winnerTotalStats.breakPointsOpportunities > 0
    ? Math.round((winnerTotalStats.breakPointsWon / winnerTotalStats.breakPointsOpportunities) * 100)
    : 0;
  const runnerBpPct = runnerUpTotalStats.breakPointsOpportunities > 0
    ? Math.round((runnerUpTotalStats.breakPointsWon / runnerUpTotalStats.breakPointsOpportunities) * 100)
    : 0;

  // Determine key decisive edge
  const insights: { title: string; desc: string; type: 'edge' | 'vuln' | 'turning' }[] = [];

  if (winnerTotalStats.winners > runnerUpTotalStats.winners) {
    insights.push({
      title: 'ความเฉียบคมในการทำแต้มวินเนอร์ (Aggressive Edge)',
      desc: `${winnerName} ยิงวินเนอร์ได้ถึง ${winnerTotalStats.winners} ลูก (เทียบกับ ${runnerUpName} ที่ทำได้ ${runnerUpTotalStats.winners} ลูก) แสดงถึงการเล่นเกมบุกที่มีประสิทธิภาพและกล้ากำหนดแต้มเอง`,
      type: 'edge',
    });
  }

  if (winnerBpPct >= 50 && winnerTotalStats.breakPointsOpportunities > 0) {
    insights.push({
      title: 'ความเฉียบขาดในแต้มสำคัญ (Clutch Break Points)',
      desc: `${winnerName} เปลี่ยนโอกาสเบรกพอยต์ได้ถึง ${winnerTotalStats.breakPointsWon}/${winnerTotalStats.breakPointsOpportunities} ครั้ง (${winnerBpPct}%) ซึ่งเป็นปัจจัยตัดสินเกมในการชิงความได้เปรียบ`,
      type: 'edge',
    });
  } else if (winnerTotalStats.breakPointsWon > runnerUpTotalStats.breakPointsWon) {
    insights.push({
      title: 'การชิงเบรกเกมเสิร์ฟ',
      desc: `${winnerName} สามารถเบรกเกมเสิร์ฟของคู่แข่งได้ ${winnerTotalStats.breakPointsWon} เกม ทำให้กุมความได้เปรียบตลอดการแข่งขัน`,
      type: 'edge',
    });
  }

  if (winnerServe1InPct >= 65) {
    insights.push({
      title: 'เปอร์เซ็นต์เสิร์ฟแรกที่มั่นคง',
      desc: `${winnerName} ลงเสิร์ฟแรกได้สูงถึง ${winnerServe1InPct}% ช่วยลดความกดดันและเปิดโอกาสให้คุมจังหวะแรลลี่ได้ตั้งแต่ลูกแรก`,
      type: 'edge',
    });
  }

  if (runnerUpTotalStats.unforcedErrors > winnerTotalStats.unforcedErrors) {
    insights.push({
      title: 'ข้อผิดพลาดที่สร้างความแตกต่าง',
      desc: `${runnerUpName} ตีเสียเอง (Unforced Errors) รวม ${runnerUpTotalStats.unforcedErrors} ครั้ง มากกว่า ${winnerName} (${winnerTotalStats.unforcedErrors} ครั้ง) โดยเฉพาะในจังหวะแรลลี่ยาว`,
      type: 'vuln',
    });
  }

  if (runnerUpTotalStats.unforcedErrorsBreakdown.net >= 3) {
    insights.push({
      title: 'ลูกติดเน็ตเป็นจุดตัดคะแนนสำคัญ',
      desc: `มีลูกติดเน็ตจาก ${runnerUpName} ถึง ${runnerUpTotalStats.unforcedErrorsBreakdown.net} ครั้ง ควรเพิ่มมิติวิถีลูกท็อปสปินให้ข้ามเน็ตสูงขึ้นอีกเล็กน้อย`,
      type: 'vuln',
    });
  }

  // Helper for comparison bar
  const renderStatBar = (
    label: string,
    val1: number | string,
    val2: number | string,
    num1: number,
    num2: number,
    higherIsBetter: boolean = true
  ) => {
    const sum = num1 + num2;
    const pct1 = sum > 0 ? (num1 / sum) * 100 : 50;
    const isT1Winner = higherIsBetter ? num1 > num2 : num1 < num2;
    const isT2Winner = higherIsBetter ? num2 > num1 : num2 < num1;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={`font-mono ${isT1Winner ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
            {val1}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">{label}</span>
          <span className={`font-mono ${isT2Winner ? 'text-sky-400 font-bold' : 'text-slate-300'}`}>
            {val2}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 flex overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isT1Winner ? 'bg-emerald-500' : 'bg-emerald-600/60'
            }`}
            style={{ width: `${pct1}%` }}
          />
          <div
            className={`h-full transition-all duration-500 ${
              isT2Winner ? 'bg-sky-500' : 'bg-sky-600/60'
            }`}
            style={{ width: `${100 - pct1}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[95vh] bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 1. Modal Header: Champion celebration & Final Set Scores */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 border-b border-slate-800 shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="ปิดหน้าสรุป"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-600/50">
                    MATCH RESULT
                  </span>
                  <span className="text-xs text-slate-400">
                    {match.settings.type === 'doubles' ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'} • คอร์ต {match.settings.courtSurface}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  🏆 {winnerName} คว้าชัยชนะ!
                </h2>
              </div>
            </div>

            {/* Set Score Pill Box */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              {completedSets.map((s, idx) => (
                <div
                  key={idx}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-center"
                >
                  <span className="text-[9px] text-slate-400 block font-semibold">S{idx + 1}</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {s.team1Games}-{s.team2Games}
                    {s.team1TiebreakPoints !== undefined && (
                      <sup className="text-[9px] text-amber-300 ml-0.5">
                        ({Math.min(s.team1TiebreakPoints, s.team2TiebreakPoints || 0)})
                      </sup>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2.5 bg-slate-950/50 border-b border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 px-3 rounded-t-xl font-bold flex items-center gap-1.5 transition border-b-2 ${
              activeTab === 'stats'
                ? 'bg-slate-900 text-emerald-400 border-emerald-400 shadow'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>สถิติเปรียบเทียบ (Head-to-Head)</span>
          </button>

          <button
            onClick={() => setActiveTab('momentum')}
            className={`py-2 px-3 rounded-t-xl font-bold flex items-center gap-1.5 transition border-b-2 ${
              activeTab === 'momentum'
                ? 'bg-slate-900 text-sky-400 border-sky-400 shadow'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>กราฟโมเมนตัมแต้ม (Flow Graph)</span>
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`py-2 px-3 rounded-t-xl font-bold flex items-center gap-1.5 transition border-b-2 ${
              activeTab === 'insights'
                ? 'bg-slate-900 text-amber-400 border-amber-400 shadow'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>บทวิเคราะห์ฟอร์มการเล่น (Tactical Insights)</span>
          </button>
        </div>

        {/* 3. Tab Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: HEAD-TO-HEAD STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* Teams Header Legend */}
              <div className="grid grid-cols-2 gap-2 text-center pb-2 border-b border-slate-800">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-emerald-400 truncate">{match.team1.name}</span>
                  {winnerTeam === 'team1' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                      ผู้ชนะ
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-sm font-bold text-sky-400 truncate">{match.team2.name}</span>
                  {winnerTeam === 'team2' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                      ผู้ชนะ
                    </span>
                  )}
                </div>
              </div>

              {/* Stat Comparison Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
                {renderStatBar(
                  'แต้มรวมทั้งหมด (Total Points Won)',
                  t1Stats.totalPointsWon,
                  t2Stats.totalPointsWon,
                  t1Stats.totalPointsWon,
                  t2Stats.totalPointsWon
                )}

                {renderStatBar(
                  'เสิร์ฟแรกติด % (1st Serve In)',
                  `${t1Stats.firstServesAttempted > 0 ? Math.round((t1Stats.firstServesIn / t1Stats.firstServesAttempted) * 100) : 0}%`,
                  `${t2Stats.firstServesAttempted > 0 ? Math.round((t2Stats.firstServesIn / t2Stats.firstServesAttempted) * 100) : 0}%`,
                  t1Stats.firstServesIn,
                  t2Stats.firstServesIn
                )}

                {renderStatBar(
                  'ชนะแต้มเสิร์ฟแรก (1st Serve Win Rate)',
                  `${t1Stats.firstServesIn > 0 ? Math.round((t1Stats.firstServePointsWon / t1Stats.firstServesIn) * 100) : 0}%`,
                  `${t2Stats.firstServesIn > 0 ? Math.round((t2Stats.firstServePointsWon / t2Stats.firstServesIn) * 100) : 0}%`,
                  t1Stats.firstServePointsWon,
                  t2Stats.firstServePointsWon
                )}

                {renderStatBar(
                  'ชนะแต้มเสิร์ฟสอง (2nd Serve Win Rate)',
                  `${t1Stats.secondServesIn > 0 ? Math.round((t1Stats.secondServePointsWon / t1Stats.secondServesIn) * 100) : 0}%`,
                  `${t2Stats.secondServesIn > 0 ? Math.round((t2Stats.secondServePointsWon / t2Stats.secondServesIn) * 100) : 0}%`,
                  t1Stats.secondServePointsWon,
                  t2Stats.secondServePointsWon
                )}

                {renderStatBar(
                  'เอซ (Aces)',
                  t1Stats.aces,
                  t2Stats.aces,
                  t1Stats.aces,
                  t2Stats.aces
                )}

                {renderStatBar(
                  'ดับเบิ้ลฟอลต์ (Double Faults)',
                  t1Stats.doubleFaults,
                  t2Stats.doubleFaults,
                  t1Stats.doubleFaults,
                  t2Stats.doubleFaults,
                  false // Lower is better!
                )}

                {renderStatBar(
                  'วินเนอร์ (Winners)',
                  t1Stats.winners,
                  t2Stats.winners,
                  t1Stats.winners,
                  t2Stats.winners
                )}

                {renderStatBar(
                  'ตีเสียเอง (Unforced Errors)',
                  t1Stats.unforcedErrors,
                  t2Stats.unforcedErrors,
                  t1Stats.unforcedErrors,
                  t2Stats.unforcedErrors,
                  false // Lower is better!
                )}

                {renderStatBar(
                  'เบรกพอยต์ (Break Points Converted)',
                  `${t1Stats.breakPointsWon}/${t1Stats.breakPointsOpportunities}`,
                  `${t2Stats.breakPointsWon}/${t2Stats.breakPointsOpportunities}`,
                  t1Stats.breakPointsWon,
                  t2Stats.breakPointsWon
                )}

                {renderStatBar(
                  'แต้มหน้าเน็ต (Net Points Won)',
                  t1Stats.netPointsWon,
                  t2Stats.netPointsWon,
                  t1Stats.netPointsWon,
                  t2Stats.netPointsWon
                )}
              </div>

              {/* Shot Distribution Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ช็อตทำวินเนอร์แยกตามประเภท</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">{match.team1.name}</div>
                      <div className="text-[11px] text-slate-200 mt-1 space-y-0.5">
                        <div>FH: {t1Stats.winnersBreakdown.forehand} • BH: {t1Stats.winnersBreakdown.backhand}</div>
                        <div>วอลเลย์: {t1Stats.winnersBreakdown.volley} • สแมช: {t1Stats.winnersBreakdown.smash}</div>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">{match.team2.name}</div>
                      <div className="text-[11px] text-slate-200 mt-1 space-y-0.5">
                        <div>FH: {t2Stats.winnersBreakdown.forehand} • BH: {t2Stats.winnersBreakdown.backhand}</div>
                        <div>วอลเลย์: {t2Stats.winnersBreakdown.volley} • สแมช: {t2Stats.winnersBreakdown.smash}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className="text-xs font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>ข้อผิดพลาด (Unforced Error Breakdown)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">{match.team1.name}</div>
                      <div className="text-[11px] text-slate-200 mt-1 space-y-0.5">
                        <div>ติดเน็ต: {t1Stats.unforcedErrorsBreakdown.net}</div>
                        <div>ออกข้าง: {t1Stats.unforcedErrorsBreakdown.wide} • ออกหลัง: {t1Stats.unforcedErrorsBreakdown.long}</div>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-[10px] text-slate-400">{match.team2.name}</div>
                      <div className="text-[11px] text-slate-200 mt-1 space-y-0.5">
                        <div>ติดเน็ต: {t2Stats.unforcedErrorsBreakdown.net}</div>
                        <div>ออกข้าง: {t2Stats.unforcedErrorsBreakdown.wide} • ออกหลัง: {t2Stats.unforcedErrorsBreakdown.long}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOMENTUM & FLOW GRAPH */}
          {activeTab === 'momentum' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold text-white">กราฟแต้มสะสมตลอดการแข่งขัน (Cumulative Points Curve)</h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">{match.team1.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                      <span className="text-slate-300">{match.team2.name}</span>
                    </span>
                  </div>
                </div>

                {/* SVG Momentum Chart */}
                {momentumPoints.length > 0 ? (
                  <div className="w-full h-44 relative bg-slate-900/80 rounded-xl p-2 border border-slate-800">
                    <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${momentumPoints.length} 100`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="t1Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="t2Grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1="0" y1="25" x2={momentumPoints.length} y2="25" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                      <line x1="0" y1="50" x2={momentumPoints.length} y2="50" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                      <line x1="0" y1="75" x2={momentumPoints.length} y2="75" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />

                      {/* Team 1 Polyline */}
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        points={momentumPoints.map((p, i) => `${i},${100 - (p.t1 / maxPts) * 90}`).join(' ')}
                      />

                      {/* Team 2 Polyline */}
                      <polyline
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.5"
                        points={momentumPoints.map((p, i) => `${i},${100 - (p.t2 / maxPts) * 90}`).join(' ')}
                      />
                    </svg>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1 px-1">
                      <span>เริ่มแข่ง</span>
                      <span>แต้มที่ {Math.floor(momentumPoints.length / 2)}</span>
                      <span>จบแมตช์ ({momentumPoints.length} แต้ม)</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-slate-500 text-xs">
                    ไม่มีข้อมูลแต้มสะสม
                  </div>
                )}

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  💡 เส้นกราฟแสดงอัตราการสะสมแต้มของแต่ละฝ่าย จุดที่เส้นฉีกออกจากกันคือช่วงเวลาที่ฝ่ายหนึ่งสร้างโมเมนตัมต่อเนื่องหรือทำเบรกเกมเสิร์ฟ
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TACTICAL INSIGHTS & GAME DYNAMICS */}
          {activeTab === 'insights' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-400">
                บทวิเคราะห์เกมและฟอร์มการเล่น (Game Dynamics & Player Performance)
              </div>

              {insights.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    item.type === 'edge'
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-100'
                      : item.type === 'vuln'
                      ? 'bg-amber-950/40 border-amber-700/60 text-amber-100'
                      : 'bg-indigo-950/40 border-indigo-700/60 text-indigo-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-sm">
                    {item.type === 'edge' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {item.type === 'vuln' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    {item.desc}
                  </p>
                </div>
              ))}

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>สรุปความสม่ำเสมอในการเล่น (Consistency Score)</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {winnerName} มีอัตราส่วนการทำแต้มบุกสูงกว่าข้อผิดพลาด (Winner/UE Ratio) ส่งผลให้การสะสมแต้มในเกมยาวเป็นไปอย่างราบรื่น ในขณะที่ {runnerUpName} สามารถกดดันในเกมเสิร์ฟได้เป็นระยะ แต่ยังขาดความแน่นอนในแต้มสำคัญ
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer Actions */}
        <div className="bg-slate-950/90 border-t border-slate-800 p-3 sm:p-4 shrink-0 flex flex-col gap-2">
          {activeSheetUrl && (
            <a
              href={activeSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>เปิดดูสถิติและแต้มทั้งหมดใน Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-emerald-400" />
            </a>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenInfographic();
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 transition"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>สร้างภาพสรุปสถิติ (Infographic)</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenAnalytics();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <BarChart2 className="w-4 h-4 text-sky-400" />
              <span>ดูกราฟและแผนผังช็อต</span>
            </button>

            <button
              onClick={onNewMatch}
              className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>เริ่มแมตช์ใหม่</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

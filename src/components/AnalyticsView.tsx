import React, { useState } from 'react';
import { MatchState } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';
import {
  BarChart2,
  TrendingUp,
  Flame,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  Award,
} from 'lucide-react';

interface AnalyticsViewProps {
  match: MatchState;
  onClose?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ match, onClose }) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'court_diagram' | 'momentum' | 'ai_insights'>('comparison');
  const [diagramFilter, setDiagramFilter] = useState<'all' | 'winner' | 'error' | 'ace'>('all');

  const stats = calculateMatchStats(match.pointsHistory, match.sets);

  const t1 = stats.team1;
  const t2 = stats.team2;

  const t1FirstInPct = t1.firstServesAttempted > 0
    ? Math.round((t1.firstServesIn / t1.firstServesAttempted) * 100)
    : 0;
  const t2FirstInPct = t2.firstServesAttempted > 0
    ? Math.round((t2.firstServesIn / t2.firstServesAttempted) * 100)
    : 0;

  const t1FirstWonPct = t1.firstServesIn > 0
    ? Math.round((t1.firstServePointsWon / t1.firstServesIn) * 100)
    : 0;
  const t2FirstWonPct = t2.firstServesIn > 0
    ? Math.round((t2.firstServePointsWon / t2.firstServesIn) * 100)
    : 0;

  const t1SecondWonPct = t1.secondServesIn > 0
    ? Math.round((t1.secondServePointsWon / t1.secondServesIn) * 100)
    : 0;
  const t2SecondWonPct = t2.secondServesIn > 0
    ? Math.round((t2.secondServePointsWon / t2.secondServesIn) * 100)
    : 0;

  const t1BpPct = t1.breakPointsOpportunities > 0
    ? Math.round((t1.breakPointsWon / t1.breakPointsOpportunities) * 100)
    : 0;
  const t2BpPct = t2.breakPointsOpportunities > 0
    ? Math.round((t2.breakPointsWon / t2.breakPointsOpportunities) * 100)
    : 0;

  const t1NetPct = t1.netPointsApproaches > 0
    ? Math.round((t1.netPointsWon / t1.netPointsApproaches) * 100)
    : 0;
  const t2NetPct = t2.netPointsApproaches > 0
    ? Math.round((t2.netPointsWon / t2.netPointsApproaches) * 100)
    : 0;

  // Comparison metrics definition
  const metrics = [
    { label: 'แต้มรวมที่ได้ (Total Points)', val1: t1.totalPointsWon, val2: t2.totalPointsWon, isHigherBetter: true },
    { label: 'เสิร์ฟแรกเข้า (1st Serve In %)', val1: `${t1FirstInPct}%`, val2: `${t2FirstInPct}%`, raw1: t1FirstInPct, raw2: t2FirstInPct, isHigherBetter: true },
    { label: 'ได้แต้มจากเสิร์ฟแรก (1st Serve Won %)', val1: `${t1FirstWonPct}%`, val2: `${t2FirstWonPct}%`, raw1: t1FirstWonPct, raw2: t2FirstWonPct, isHigherBetter: true },
    { label: 'ได้แต้มจากเสิร์ฟสอง (2nd Serve Won %)', val1: `${t1SecondWonPct}%`, val2: `${t2SecondWonPct}%`, raw1: t1SecondWonPct, raw2: t2SecondWonPct, isHigherBetter: true },
    { label: 'เอซเสิร์ฟ (Aces)', val1: t1.aces, val2: t2.aces, isHigherBetter: true },
    { label: 'ดับเบิ้ลฟอลต์ (Double Faults)', val1: t1.doubleFaults, val2: t2.doubleFaults, isHigherBetter: false },
    { label: 'วินเนอร์รวม (Total Winners)', val1: t1.winners, val2: t2.winners, isHigherBetter: true },
    { label: 'อันฟอร์ซเออเร่อร์ (Unforced Errors)', val1: t1.unforcedErrors, val2: t2.unforcedErrors, isHigherBetter: false },
    { label: 'เบรกพอยต์สำเร็จ (Break Points)', val1: `${t1.breakPointsWon}/${t1.breakPointsOpportunities} (${t1BpPct}%)`, val2: `${t2.breakPointsWon}/${t2.breakPointsOpportunities} (${t2BpPct}%)`, raw1: t1.breakPointsWon, raw2: t2.breakPointsWon, isHigherBetter: true },
    { label: 'แต้มหน้าเน็ต (Net Points Won)', val1: `${t1.netPointsWon}/${t1.netPointsApproaches} (${t1NetPct}%)`, val2: `${t2.netPointsWon}/${t2.netPointsApproaches} (${t2NetPct}%)`, raw1: t1.netPointsWon, raw2: t2.netPointsWon, isHigherBetter: true },
  ];

  // Dynamic tactical coaching insights
  const generateInsights = () => {
    const list: string[] = [];

    // Serve insight
    if (t1FirstInPct > t2FirstInPct + 10) {
      list.push(`🎾 ${match.team1.name} เสิร์ฟแรกแม่นยำสูงกว่าชัดเจน (${t1FirstInPct}% vs ${t2FirstInPct}%) ทำให้คุมเกมเสิร์ฟของตัวเองได้เหนือกว่า`);
    } else if (t2FirstInPct > t1FirstInPct + 10) {
      list.push(`🎾 ${match.team2.name} มีเปอร์เซ็นต์เสิร์ฟแรกเข้าสูงถึง ${t2FirstInPct}% ซึ่งสร้างความกดดันให้ผู้รับเสิร์ฟได้ดีมาก`);
    }

    // Winners vs Errors
    const t1Ratio = t1.unforcedErrors > 0 ? (t1.winners / t1.unforcedErrors).toFixed(1) : t1.winners;
    const t2Ratio = t2.unforcedErrors > 0 ? (t2.winners / t2.unforcedErrors).toFixed(1) : t2.winners;

    if (t1.winners > t2.winners) {
      list.push(`🔥 ${match.team1.name} เล่นเชิงรุกดุดัน ทำไป ${t1.winners} วินเนอร์ (อัตราส่วน Winner/UE: ${t1Ratio})`);
    } else if (t2.winners > t1.winners) {
      list.push(`🔥 ${match.team2.name} ทำเกมบุกได้เฉียบคมด้วย ${t2.winners} วินเนอร์ (อัตราส่วน Winner/UE: ${t2Ratio})`);
    }

    // Critical error analysis
    if (t1.unforcedErrorsBreakdown.net > t1.unforcedErrorsBreakdown.long) {
      list.push(`⚠️ ${match.team1.name} เสียแต้มจากการตีติดเน็ตเป็นหลัก (${t1.unforcedErrorsBreakdown.net} ครั้ง) ควรเพิ่มความสูงของลูกข้ามเน็ต (Net clearance)`);
    }
    if (t2.unforcedErrorsBreakdown.long > t2.unforcedErrorsBreakdown.net) {
      list.push(`⚠️ ${match.team2.name} มักตีลูกลึกออกหลัง (${t2.unforcedErrorsBreakdown.long} ครั้ง) ควรปรับมุมหน้าไม้หรือเพิ่ม Topspin`);
    }

    // Break point conversion
    if (t1.breakPointsWon > 0) {
      list.push(`⚡ ${match.team1.name} เปลี่ยนโอกาสเบรกพอยต์ได้ ${t1.breakPointsWon} ครั้ง จากทั้งหมด ${t1.breakPointsOpportunities} ครั้ง (${t1BpPct}%)`);
    }
    if (t2.breakPointsWon > 0) {
      list.push(`⚡ ${match.team2.name} เปลี่ยนโอกาสเบรกพอยต์ได้ ${t2.breakPointsWon} ครั้ง จากทั้งหมด ${t2.breakPointsOpportunities} ครั้ง (${t2BpPct}%)`);
    }

    if (list.length === 0) {
      list.push('ยังไม่มีข้อมูลแต้มเพียงพอสำหรับการวิเคราะห์เชิงลึก กรุณาเล่นแต้มเพิ่มเติมเพื่อแสดงแนวโน้มฟอร์ม');
    }

    return list;
  };

  // Filtered points for court diagram
  const filteredPoints = match.pointsHistory.filter((pt) => {
    if (diagramFilter === 'winner') return pt.category === 'winner';
    if (diagramFilter === 'error') return pt.category === 'unforced_error' || pt.category === 'double_fault';
    if (diagramFilter === 'ace') return pt.category === 'ace';
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100">
      {/* Top Header / Tab Selector */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-white tracking-wide">
            การวิเคราะห์ฟอร์มการเล่น (Match Analytics)
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'comparison'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            สถิติเปรียบเทียบ
          </button>
          <button
            onClick={() => setActiveTab('court_diagram')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              activeTab === 'court_diagram'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            แผนผังคอร์ต & ช็อต
          </button>
          <button
            onClick={() => setActiveTab('ai_insights')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              activeTab === 'ai_insights'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>บทวิเคราะห์ฟอร์ม</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
            >
              ปิด
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* TAB 1: Comparison Stats */}
        {activeTab === 'comparison' && (
          <div className="space-y-3">
            {/* Player Head-to-Head Header */}
            <div className="grid grid-cols-3 items-center text-center py-2 px-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="text-left font-bold text-emerald-400 truncate text-xs sm:text-sm">
                {match.team1.name}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                VS
              </div>
              <div className="text-right font-bold text-sky-400 truncate text-xs sm:text-sm">
                {match.team2.name}
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-1.5">
              {metrics.map((m, idx) => {
                const num1 = typeof m.raw1 === 'number' ? m.raw1 : typeof m.val1 === 'number' ? m.val1 : 0;
                const num2 = typeof m.raw2 === 'number' ? m.raw2 : typeof m.val2 === 'number' ? m.val2 : 0;
                const total = num1 + num2 || 1;
                const p1Width = Math.round((num1 / total) * 100);
                const p2Width = 100 - p1Width;

                return (
                  <div key={idx} className="bg-slate-800/40 rounded-xl p-2 border border-slate-800/80">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-emerald-300 w-16 text-left">{m.val1}</span>
                      <span className="text-[11px] font-medium text-slate-300 text-center flex-1 truncate px-2">
                        {m.label}
                      </span>
                      <span className="font-bold text-sky-300 w-16 text-right">{m.val2}</span>
                    </div>

                    {/* Progress Bar Split */}
                    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-700/50">
                      <div
                        className="bg-emerald-500 transition-all duration-300"
                        style={{ width: `${p1Width}%` }}
                      />
                      <div
                        className="bg-sky-500 transition-all duration-300"
                        style={{ width: `${p2Width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Winners & Errors Breakdown Grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Winners breakdown */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-900/40">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2">
                  <Flame className="w-3.5 h-3.5" />
                  <span>ประเภทลูกวินเนอร์ (Winners Breakdown)</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Forehand:</span>
                    <span>{t1.winnersBreakdown.forehand} | {t2.winnersBreakdown.forehand}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Backhand:</span>
                    <span>{t1.winnersBreakdown.backhand} | {t2.winnersBreakdown.backhand}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Volley / หน้าเน็ต:</span>
                    <span>{t1.winnersBreakdown.volley} | {t2.winnersBreakdown.volley}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Smash / ตบ:</span>
                    <span>{t1.winnersBreakdown.smash} | {t2.winnersBreakdown.smash}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Drop Shot:</span>
                    <span>{t1.winnersBreakdown.dropShot} | {t2.winnersBreakdown.dropShot}</span>
                  </div>
                </div>
              </div>

              {/* Unforced Errors breakdown */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-rose-900/40">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ประเภทการตีเสียเอง (Unforced Errors)</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>ติดเน็ต (Net):</span>
                    <span>{t1.unforcedErrorsBreakdown.net} | {t2.unforcedErrorsBreakdown.net}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ออกข้าง (Wide):</span>
                    <span>{t1.unforcedErrorsBreakdown.wide} | {t2.unforcedErrorsBreakdown.wide}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ออกหลัง (Long):</span>
                    <span>{t1.unforcedErrorsBreakdown.long} | {t2.unforcedErrorsBreakdown.long}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ดับเบิ้ลฟอลต์ (Double Fault):</span>
                    <span>{t1.doubleFaults} | {t2.doubleFaults}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span>• โฟร์แฮนด์เสีย:</span>
                      <span>{t1.unforcedErrorsByStroke.forehand} | {t2.unforcedErrorsByStroke.forehand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• แบ็คแฮนด์เสีย:</span>
                      <span>{t1.unforcedErrorsByStroke.backhand} | {t2.unforcedErrorsByStroke.backhand}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• วอลเลย์เสีย:</span>
                      <span>{t1.unforcedErrorsByStroke.volley} | {t2.unforcedErrorsByStroke.volley}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• สแมชเสีย:</span>
                      <span>{t1.unforcedErrorsByStroke.smash} | {t2.unforcedErrorsByStroke.smash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• รับเสิร์ฟเสีย:</span>
                      <span>{t1.unforcedErrorsByStroke.return} | {t2.unforcedErrorsByStroke.return}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Court Diagram with Shot Distribution */}
        {activeTab === 'court_diagram' && (
          <div className="space-y-3">
            {/* Filter buttons */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                แสดงผลจุดช็อตสำคัญ ({filteredPoints.length} แต้ม)
              </span>
              <div className="flex gap-1">
                {(['all', 'winner', 'error', 'ace'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDiagramFilter(filter)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition ${
                      diagramFilter === filter
                        ? 'bg-slate-100 text-slate-900 border-white'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {filter === 'all'
                      ? 'ทั้งหมด'
                      : filter === 'winner'
                      ? 'วินเนอร์'
                      : filter === 'error'
                      ? 'ตีเสีย'
                      : 'เอซ'}
                  </button>
                ))}
              </div>
            </div>

            {/* High-Fidelity 2D Court Diagram */}
            <div className="relative w-full aspect-[2.1/1] bg-emerald-950 rounded-xl border-2 border-slate-400/90 shadow-2xl overflow-hidden p-2">
              {/* Lines */}
              <div className="absolute top-[16%] left-0 right-0 h-[1.5px] bg-white/70" />
              <div className="absolute bottom-[16%] left-0 right-0 h-[1.5px] bg-white/70" />
              <div className="absolute top-[16%] bottom-[16%] left-[28%] w-[1.5px] bg-white/70" />
              <div className="absolute top-[16%] bottom-[16%] right-[28%] w-[1.5px] bg-white/70" />
              <div className="absolute top-[50%] left-[28%] right-[28%] h-[1.5px] bg-white/70" />
              <div className="absolute top-0 bottom-0 left-[50%] w-[3px] bg-white z-10 shadow" />

              {/* Point Plots Distributed Across Court */}
              {filteredPoints.map((pt, index) => {
                const isT1 = pt.winnerTeam === 'team1';
                // Deterministic placement on court based on point number and category
                const seedX = ((pt.pointNumberInMatch * 37) % 80) / 100;
                const seedY = ((pt.pointNumberInMatch * 53) % 70 + 15) / 100;

                let posX = 0;
                if (pt.category === 'ace') {
                  // Inside service box
                  posX = isT1 ? 0.35 + (seedX % 0.12) : 0.53 + (seedX % 0.12);
                } else if (pt.stroke === 'volley' || pt.stroke === 'smash') {
                  // Near net
                  posX = isT1 ? 0.42 + (seedX % 0.06) : 0.52 + (seedX % 0.06);
                } else if (pt.category === 'unforced_error' && pt.errorDetail === 'net') {
                  // Net line
                  posX = 0.5;
                } else {
                  // Baseline or deep
                  posX = isT1 ? 0.72 + (seedX % 0.22) : 0.06 + (seedX % 0.22);
                }

                const posY = seedY;

                let icon = '•';
                let colorClass = 'bg-emerald-400 text-slate-950';
                if (pt.category === 'ace') {
                  colorClass = 'bg-amber-400 text-slate-950';
                  icon = '⚡';
                } else if (pt.category === 'winner') {
                  colorClass = isT1 ? 'bg-emerald-500 text-white' : 'bg-sky-400 text-slate-950';
                  icon = '★';
                } else if (pt.category === 'unforced_error' || pt.category === 'double_fault') {
                  colorClass = 'bg-rose-500 text-white';
                  icon = '✕';
                }

                return (
                  <div
                    key={pt.id || index}
                    style={{ left: `${posX * 100}%`, top: `${posY * 100}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-md ${colorClass} hover:scale-150 transition-transform cursor-pointer`}
                    title={`แต้มที่ ${pt.pointNumberInMatch}: ${pt.category} (${match[pt.winnerTeam].name})`}
                  >
                    {icon}
                  </div>
                );
              })}

              {/* Court Labels */}
              <div className="absolute bottom-2 left-3 text-[10px] font-bold text-white/60">
                ฝั่ง {match.team1.name}
              </div>
              <div className="absolute bottom-2 right-3 text-[10px] font-bold text-white/60">
                ฝั่ง {match.team2.name}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 bg-slate-950/40 p-2 rounded-xl">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">★</span>
                <span>วินเนอร์ ({match.team1.name})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center text-[9px] font-bold">★</span>
                <span>วินเนอร์ ({match.team2.name})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] font-bold">⚡</span>
                <span>เอซ (Ace)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold">✕</span>
                <span>อันฟอร์ซเออเร่อร์</span>
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: Tactical AI & Performance Insights */}
        {activeTab === 'ai_insights' && (
          <div className="space-y-3">
            <div className="p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-emerald-300 font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>สรุปวิเคราะห์ฟอร์มและแท็กติกการเล่น (Tactical Insights)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                ระบบคำนวณจากทุกช็อตที่บันทึก เพื่อสรุปจุดแข็ง จุดที่ต้องระวัง
                และโอกาสในการปรับแก้ฟอร์มระหว่างแมตช์หรือหลังแข่ง
              </p>
            </div>

            <div className="space-y-2">
              {generateInsights().map((insight, i) => (
                <div
                  key={i}
                  className="p-2.5 bg-slate-800/60 border border-slate-700/80 rounded-xl text-xs text-slate-200 flex items-start gap-2 shadow-xs"
                >
                  <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

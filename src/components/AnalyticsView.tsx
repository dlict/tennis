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
  const [activeTab, setActiveTab] = useState<'comparison' | 'ai_insights'>('comparison');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');

  // List of all individual players across both teams
  const allPlayers = [
    ...match.team1.players.map((p, idx) => ({
      id: p.id || `t1_${idx}`,
      name: p.name,
      team: 'team1' as const,
      teamName: match.team1.name,
      color: 'emerald',
    })),
    ...match.team2.players.map((p, idx) => ({
      id: p.id || `t2_${idx}`,
      name: p.name,
      team: 'team2' as const,
      teamName: match.team2.name,
      color: 'sky',
    })),
  ];

  const selectedPlayer = allPlayers.find((p) => p.id === selectedPlayerId);

  // Calculate individual player statistics
  const calculatePlayerStats = (player: typeof allPlayers[0]) => {
    const isDoubles = match.settings.type === 'doubles';
    const points = match.pointsHistory;

    // Winners by this player
    const winners = points.filter((pt) => {
      if (pt.category !== 'winner' && pt.category !== 'ace') return false;
      if (pt.winnerTeam !== player.team) return false;
      if (!isDoubles) return true;
      // In doubles: check if explicitly assigned or if error was by opponent
      return pt.errorPlayerName !== player.name;
    });

    // Unforced Errors by this player
    const errors = points.filter((pt) => {
      if (pt.category !== 'unforced_error' && pt.category !== 'double_fault') return false;
      if (!isDoubles) return pt.errorTeam === player.team;
      return pt.errorPlayerName === player.name || (pt.errorTeam === player.team && !pt.errorPlayerName);
    });

    // Serves by this player
    const serves = points.filter((pt) => {
      if (!isDoubles) return pt.servingTeam === player.team;
      return pt.servingPlayerId === player.id;
    });

    const firstServesIn = serves.filter((pt) => !pt.isSecondServe);
    const firstServesWon = firstServesIn.filter((pt) => pt.winnerTeam === player.team);
    const secondServes = serves.filter((pt) => pt.isSecondServe);
    const secondServesWon = secondServes.filter((pt) => pt.winnerTeam === player.team);
    const aces = serves.filter((pt) => pt.category === 'ace');
    const doubleFaults = serves.filter((pt) => pt.category === 'double_fault');

    // Strokes breakdown for winners
    const winnerStrokes = {
      forehand: winners.filter((p) => p.stroke === 'forehand').length,
      backhand: winners.filter((p) => p.stroke === 'backhand').length,
      volley: winners.filter((p) => p.stroke === 'volley').length,
      smash: winners.filter((p) => p.stroke === 'smash').length,
      dropShot: winners.filter((p) => p.stroke === 'drop_shot').length,
      serve: aces.length,
    };

    // Error details breakdown
    const errorDetails = {
      net: errors.filter((p) => p.errorDetail === 'net').length,
      long: errors.filter((p) => p.errorDetail === 'long').length,
      wide: errors.filter((p) => p.errorDetail === 'wide').length,
      forehand: errors.filter((p) => p.errorStroke === 'forehand').length,
      backhand: errors.filter((p) => p.errorStroke === 'backhand').length,
      doubleFault: doubleFaults.length,
    };

    const firstServeInPct = serves.length > 0 ? Math.round((firstServesIn.length / serves.length) * 100) : 0;
    const firstServeWonPct = firstServesIn.length > 0 ? Math.round((firstServesWon.length / firstServesIn.length) * 100) : 0;

    return {
      totalWinners: winners.length,
      totalErrors: errors.length,
      totalServes: serves.length,
      firstServeInPct,
      firstServeWonPct,
      aces: aces.length,
      doubleFaults: doubleFaults.length,
      winnerStrokes,
      errorDetails,
      ratio: errors.length > 0 ? (winners.length / errors.length).toFixed(1) : winners.length.toString(),
    };
  };

  const playerStats = selectedPlayer ? calculatePlayerStats(selectedPlayer) : null;

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
            onClick={() => {
              setActiveTab('comparison');
              setSelectedPlayerId('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              selectedPlayerId === 'all' && activeTab === 'comparison'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            สถิติเปรียบเทียบ
          </button>
          <button
            onClick={() => {
              setActiveTab('ai_insights');
              setSelectedPlayerId('all');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              selectedPlayerId === 'all' && activeTab === 'ai_insights'
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
              className="ml-2 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              ✕ ปิด
            </button>
          )}
        </div>
      </div>

      {/* Player Selector Bar (เลือกดูเป็นรายบุคคล หรือ ดูแบบร่วมทั้งหมด) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 shrink-0 overflow-x-auto text-xs">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">เลือกดูข้อมูล:</span>
        <button
          onClick={() => setSelectedPlayerId('all')}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
            selectedPlayerId === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>ดูแบบร่วมทั้งหมด (Overall)</span>
        </button>

        {allPlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayerId(player.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              selectedPlayerId === player.id
                ? player.team === 'team1'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/70'
            }`}
          >
            <span>👤</span>
            <span>{player.name}</span>
            <span className="text-[10px] opacity-75">({player.teamName})</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* ================= INDIVIDUAL PLAYER DASHBOARD ================= */}
        {selectedPlayerId !== 'all' && selectedPlayer && playerStats && (
          <div className="space-y-3">
            {/* Player Banner */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              selectedPlayer.team === 'team1'
                ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-700/60'
                : 'bg-gradient-to-r from-sky-950/80 via-slate-900 to-slate-950 border-sky-700/60'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black shadow-lg ${
                  selectedPlayer.team === 'team1' ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
                }`}>
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">{selectedPlayer.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                      selectedPlayer.team === 'team1'
                        ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                        : 'bg-sky-950 border-sky-500/50 text-sky-300'
                    }`}>
                      {selectedPlayer.teamName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    สถิติการเล่นเฉพาะบุคคล • อัตราส่วนบุกได้แต้ม (Winner/UE): <strong className="text-white">{playerStats.ratio}x</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="bg-slate-900/90 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-xl text-xs font-bold">
                  {playerStats.totalWinners} วินเนอร์
                </span>
                <span className="bg-slate-900/90 border border-slate-700 text-rose-300 px-2.5 py-1 rounded-xl text-xs font-bold">
                  {playerStats.totalErrors} ตีเสีย
                </span>
              </div>
            </div>

            {/* 4 Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Card 1: Winners */}
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-emerald-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> วินเนอร์ที่ทำได้
                  </span>
                  <span className="text-base font-black text-emerald-300">{playerStats.totalWinners}</span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Forehand:</span> <span className="font-bold text-slate-200">{playerStats.winnerStrokes.forehand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Backhand:</span> <span className="font-bold text-slate-200">{playerStats.winnerStrokes.backhand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Volley/หน้าเน็ต:</span> <span className="font-bold text-slate-200">{playerStats.winnerStrokes.volley}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Smash/ตบ:</span> <span className="font-bold text-slate-200">{playerStats.winnerStrokes.smash}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Errors */}
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-rose-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> ตีเสียเอง (UE)
                  </span>
                  <span className="text-base font-black text-rose-300">{playerStats.totalErrors}</span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>ติดเน็ต:</span> <span className="font-bold text-slate-200">{playerStats.errorDetails.net}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ออกยาว (Long):</span> <span className="font-bold text-slate-200">{playerStats.errorDetails.long}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ออกข้าง (Wide):</span> <span className="font-bold text-slate-200">{playerStats.errorDetails.wide}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FH/BH เสีย:</span> <span className="font-bold text-slate-200">{playerStats.errorDetails.forehand + playerStats.errorDetails.backhand}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Serve Stats */}
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-amber-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> สถิติเกมเสิร์ฟ
                  </span>
                  <span className="text-base font-black text-amber-300">{playerStats.firstServeInPct}%</span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>เสิร์ฟแรกเข้า:</span> <span className="font-bold text-slate-200">{playerStats.firstServeInPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>แต้มจากเสิร์ฟแรก:</span> <span className="font-bold text-slate-200">{playerStats.firstServeWonPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>เสิร์ฟเอซ:</span> <span className="font-bold text-amber-300">{playerStats.aces}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ดับเบิ้ลฟอลต์:</span> <span className="font-bold text-rose-300">{playerStats.doubleFaults}</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Aggression & Rating */}
              <div className="p-2.5 bg-slate-950/60 rounded-xl border border-indigo-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-indigo-400 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> อัตราบุกสำเร็จ
                  </span>
                  <span className="text-base font-black text-indigo-300">{playerStats.ratio}x</span>
                </div>
                <div className="text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>แต้มบุกรวม:</span> <span className="font-bold text-slate-200">{playerStats.totalWinners + playerStats.aces}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ความสม่ำเสมอ:</span> <span className="font-bold text-emerald-300">{playerStats.totalErrors <= 3 ? 'สูงมาก' : playerStats.totalErrors <= 8 ? 'ปานกลาง' : 'ควรลดลูกเสีย'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>สไตล์การเล่น:</span> <span className="font-bold text-slate-200">{playerStats.totalWinners > playerStats.totalErrors ? 'เกมบุกดุดัน' : 'เน้นความเหนียวแน่น'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Shot Distribution Chart for this Player */}
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
                <span>การกระจายช็อตของ {selectedPlayer.name} (Shot Breakdown & Comparison)</span>
              </h4>

              <div className="space-y-2 text-xs">
                {/* Forehand Comparison */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">โฟร์แฮนด์ (Forehand):</span>
                    <span>
                      <strong className="text-emerald-400">{playerStats.winnerStrokes.forehand} วินเนอร์</strong> vs{' '}
                      <strong className="text-rose-400">{playerStats.errorDetails.forehand} เออเร่อร์</strong>
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${
                          (playerStats.winnerStrokes.forehand + playerStats.errorDetails.forehand) > 0
                            ? (playerStats.winnerStrokes.forehand / (playerStats.winnerStrokes.forehand + playerStats.errorDetails.forehand)) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div
                      className="bg-rose-500"
                      style={{
                        width: `${
                          (playerStats.winnerStrokes.forehand + playerStats.errorDetails.forehand) > 0
                            ? (playerStats.errorDetails.forehand / (playerStats.winnerStrokes.forehand + playerStats.errorDetails.forehand)) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Backhand Comparison */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">แบ็คแฮนด์ (Backhand):</span>
                    <span>
                      <strong className="text-emerald-400">{playerStats.winnerStrokes.backhand} วินเนอร์</strong> vs{' '}
                      <strong className="text-rose-400">{playerStats.errorDetails.backhand} เออเร่อร์</strong>
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${
                          (playerStats.winnerStrokes.backhand + playerStats.errorDetails.backhand) > 0
                            ? (playerStats.winnerStrokes.backhand / (playerStats.winnerStrokes.backhand + playerStats.errorDetails.backhand)) * 100
                            : 50
                        }%`,
                      }}
                    />
                    <div
                      className="bg-rose-500"
                      style={{
                        width: `${
                          (playerStats.winnerStrokes.backhand + playerStats.errorDetails.backhand) > 0
                            ? (playerStats.errorDetails.backhand / (playerStats.winnerStrokes.backhand + playerStats.errorDetails.backhand)) * 100
                            : 50
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Net play */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300">การเล่นหน้าเน็ต (Volley / Smash):</span>
                    <span>
                      <strong className="text-emerald-400">{playerStats.winnerStrokes.volley + playerStats.winnerStrokes.smash} วินเนอร์</strong>
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div
                      className="bg-emerald-400"
                      style={{
                        width: `${Math.min(100, (playerStats.winnerStrokes.volley + playerStats.winnerStrokes.smash) * 20)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Coaching Insight */}
            <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>คำแนะนำการเล่นเฉพาะตัวสำหรับ {selectedPlayer.name}</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                {playerStats.winnerStrokes.forehand > playerStats.winnerStrokes.backhand && (
                  <li>อาวุธหลักคือ <strong>โฟร์แฮนด์</strong> ที่ทำวินเนอร์ได้ถึง {playerStats.winnerStrokes.forehand} แต้ม ควรหาจังหวะวิ่งอ้อมตี Inside-out บ่อยขึ้น</li>
                )}
                {playerStats.errorDetails.net > playerStats.errorDetails.long && (
                  <li>ลูกเสียส่วนใหญ่มัก <strong>ติดเน็ต ({playerStats.errorDetails.net} ครั้ง)</strong> แนะนำให้เพิ่มความสูงของวงสวิงผ่านเหนือเน็ต 1-2 ฟุต</li>
                )}
                {playerStats.errorDetails.long > playerStats.errorDetails.net && (
                  <li>ลูกเสียส่วนใหญ่มัก <strong>ออกหลัง ({playerStats.errorDetails.long} ครั้ง)</strong> ควรปั่น Topspin ให้ลูกฮุกลงท้ายคอร์ตมากขึ้น</li>
                )}
                {playerStats.firstServeInPct > 65 && (
                  <li>เปอร์เซ็นต์เสิร์ฟแรกเข้ายอดเยี่ยม ({playerStats.firstServeInPct}%) รักษาจังหวะการโยนบอลนี้ไว้เพื่อกดดันคู่ต่อสู้</li>
                )}
                {playerStats.firstServeInPct <= 50 && playerStats.totalServes > 0 && (
                  <li>เสิร์ฟแรกเข้า {playerStats.firstServeInPct}% ควรเน้นความแน่นอนมากกว่าความเร็ว เพื่อหลีกเลี่ยงการเปิดโอกาสให้คู่แข่งบุกเสิร์ฟสอง</li>
                )}
                <li>สถิติรวม: ช่วยทีมเก็บ {playerStats.totalWinners} วินเนอร์ และ {playerStats.aces} เอซ</li>
              </ul>
            </div>
          </div>
        )}

        {/* ================= OVERALL TEAM STATS (ดูแบบร่วมทั้งหมด) ================= */}
        {selectedPlayerId === 'all' && activeTab === 'comparison' && (
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

        {/* TAB 2: Tactical AI & Performance Insights */}
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

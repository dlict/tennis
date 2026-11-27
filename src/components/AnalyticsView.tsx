import React, { useState } from 'react';
import { MatchState } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';
import {
  exportOverallAnalyticsImage,
  exportPlayerAnalyticsImage,
  exportFourPlayersComparisonImage,
} from '../utils/exportAnalyticsImage';
import {
  BarChart2,
  Flame,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  Download,
  CheckCircle2,
  Trophy,
  Crosshair,
  Activity,
  Award,
  ShieldAlert,
  TrendingUp,
  Swords,
  Users,
  X,
} from 'lucide-react';

interface AnalyticsViewProps {
  match: MatchState;
  onClose?: () => void;
}

/** Custom SVG Tennis Player Character Avatar for Individual & 4-Player Comparison Cards */
const PlayerCharacterAvatar: React.FC<{
  team: 'team1' | 'team2';
  variant?: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ team, variant = 0, size = 'md' }) => {
  const isT1 = team === 'team1';
  const jerseyColor = isT1 ? '#10b981' : '#0ea5e9';
  const jerseyDark = isT1 ? '#047857' : '#0369a1';
  const capColor = variant % 2 === 0 ? jerseyColor : '#f59e0b';
  const ringClass = isT1
    ? 'bg-emerald-500/15 border-emerald-400/50 shadow-emerald-500/20'
    : 'bg-sky-500/15 border-sky-400/50 shadow-sky-500/20';

  const dimClass =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div
      className={`${dimClass} rounded-2xl border flex items-center justify-center shadow-lg shrink-0 overflow-hidden ${ringClass}`}
    >
      <svg viewBox="0 0 80 80" className="w-full h-full">
        {/* Subtle court glow circle */}
        <circle cx="40" cy="42" r="32" fill={isT1 ? '#064e3b' : '#0c4a6e'} opacity="0.45" />

        {/* Tennis Racket held on right */}
        <line x1="53" y1="48" x2="64" y2="29" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
        <ellipse
          cx="66"
          cy="22"
          rx="7"
          ry="9.5"
          transform="rotate(24 66 22)"
          fill="rgba(163,230,53,0.16)"
          stroke="#a3e635"
          strokeWidth="2.4"
        />
        <line x1="63" y1="15" x2="69" y2="29" stroke="#a3e635" strokeWidth="0.9" opacity="0.7" />
        <line x1="60" y1="22" x2="72" y2="22" stroke="#a3e635" strokeWidth="0.9" opacity="0.7" />

        {/* Shorts / Legs */}
        <rect x="30" y="61" width="8" height="12" rx="3" fill="#1e293b" />
        <rect x="42" y="61" width="8" height="12" rx="3" fill="#1e293b" />

        {/* Jersey Torso */}
        <path
          d="M23 64 C23 47 28 41 40 41 C52 41 57 47 57 64 Z"
          fill={jerseyColor}
        />
        {/* Jersey Stripe */}
        <path d="M36 41 L44 41 L43 64 L37 64 Z" fill={jerseyDark} opacity="0.75" />

        {/* Arms */}
        <path
          d="M25 46 Q18 53 22 60"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M55 46 Q59 49 54 50"
          fill="none"
          stroke="#fcd34d"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Head */}
        <circle cx="40" cy="27" r="11.5" fill="#fde68a" />
        {/* Eyes */}
        <circle cx="36" cy="28" r="1.4" fill="#0f172a" />
        <circle cx="44" cy="28" r="1.4" fill="#0f172a" />
        {/* Confident smile */}
        <path d="M36.5 32 Q40 35 43.5 32" fill="none" stroke="#92400e" strokeWidth="1.4" strokeLinecap="round" />

        {/* Tennis Cap / Visor */}
        <path d="M28.5 23 A11.5 11.5 0 0 1 51.5 23 Z" fill={capColor} />
        <rect x="36" y="21.5" width="18" height="3.2" rx="1.6" fill={capColor} />

        {/* Tennis Ball */}
        <circle cx="17" cy="24" r="4.5" fill="#bef264" stroke="#65a30d" strokeWidth="1" />
      </svg>
    </div>
  );
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ match, onClose }) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'players_grid' | 'ai_insights'>('comparison');
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // List of all individual players across both teams
  const allPlayers = [
    ...match.team1.players.map((p, idx) => ({
      id: p.id || `t1_${idx}`,
      name: p.name,
      team: 'team1' as const,
      teamName: match.team1.name,
      color: 'emerald',
      playerIndex: idx,
    })),
    ...match.team2.players.map((p, idx) => ({
      id: p.id || `t2_${idx}`,
      name: p.name,
      team: 'team2' as const,
      teamName: match.team2.name,
      color: 'sky',
      playerIndex: idx,
    })),
  ];

  // Calculate individual player statistics (accurate doubles + singles attribution)
  const calculatePlayerStats = (player: typeof allPlayers[0]) => {
    const isDoubles = match.settings.type === 'doubles';
    const points = match.pointsHistory;

    const winners = points.filter((pt) => {
      if (pt.category !== 'winner' && pt.category !== 'ace') return false;
      if (pt.winnerTeam !== player.team) return false;
      if (!isDoubles) return true;
      if (pt.category === 'ace') return pt.servingPlayerId === player.id;
      if (pt.winnerPlayerId) return pt.winnerPlayerId === player.id;
      if (pt.winnerPlayerName) return pt.winnerPlayerName === player.name;
      return false;
    });

    const errors = points.filter((pt) => {
      if (pt.category !== 'unforced_error' && pt.category !== 'double_fault') return false;
      if (!isDoubles) return pt.errorTeam === player.team;
      if (pt.category === 'double_fault') return pt.servingPlayerId === player.id;
      if (pt.errorPlayerId) return pt.errorPlayerId === player.id;
      return pt.errorPlayerName === player.name;
    });

    const serves = points.filter((pt) => {
      if (!isDoubles) return pt.servingTeam === player.team;
      return pt.servingPlayerId === player.id;
    });

    const firstServesIn = serves.filter((pt) => !pt.isSecondServe && pt.category !== 'double_fault');
    const firstServesWon = firstServesIn.filter((pt) => pt.winnerTeam === player.team);
    const secondServes = serves.filter((pt) => Boolean(pt.isSecondServe || pt.category === 'double_fault'));
    const secondServesIn = secondServes.filter((pt) => pt.category !== 'double_fault');
    const secondServesWon = secondServes.filter((pt) => pt.winnerTeam === player.team);
    const aces = serves.filter((pt) => pt.category === 'ace');
    const doubleFaults = serves.filter((pt) => pt.category === 'double_fault');

    const winnerStrokes = {
      forehand: winners.filter((p) => p.stroke === 'forehand').length,
      backhand: winners.filter((p) => p.stroke === 'backhand').length,
      volley: winners.filter((p) => p.stroke === 'volley').length,
      driveVolley: winners.filter((p) => p.stroke === 'drive_volley').length,
      smash: winners.filter((p) => p.stroke === 'smash').length,
      dropShot: winners.filter((p) => p.stroke === 'drop_shot').length,
      serve: aces.length,
    };

    const errorDetails = {
      net: errors.filter((p) => p.errorDetail === 'net').length,
      long: errors.filter((p) => p.errorDetail === 'long').length,
      wide: errors.filter((p) => p.errorDetail === 'wide').length,
      frame: errors.filter((p) => p.errorDetail === 'frame').length,
      forehand: errors.filter((p) => p.errorStroke === 'forehand').length,
      backhand: errors.filter((p) => p.errorStroke === 'backhand').length,
      smash: errors.filter((p) => p.errorStroke === 'smash').length,
      volley: errors.filter((p) => p.errorStroke === 'volley').length,
      driveVolley: errors.filter((p) => p.errorStroke === 'drive_volley').length,
      dropShot: errors.filter((p) => p.errorStroke === 'drop_shot').length,
      lob: errors.filter((p) => p.errorStroke === 'lob').length,
      return: errors.filter((p) => p.errorStroke === 'return_winner' || p.errorDetail === 'unforced_return').length,
      doubleFault: doubleFaults.length,
    };

    const firstServeInPct = serves.length > 0 ? Math.round((firstServesIn.length / serves.length) * 100) : 0;
    const firstServeWonPct = firstServesIn.length > 0 ? Math.round((firstServesWon.length / firstServesIn.length) * 100) : 0;
    const secondServeInPct = secondServes.length > 0 ? Math.round((secondServesIn.length / secondServes.length) * 100) : 0;
    const secondServeWonPct = secondServes.length > 0 ? Math.round((secondServesWon.length / secondServes.length) * 100) : 0;

    return {
      totalWinners: winners.length,
      totalErrors: errors.length,
      totalServes: serves.length,
      firstServeInCount: firstServesIn.length,
      firstServeWonCount: firstServesWon.length,
      firstServeInPct,
      firstServeWonPct,
      secondServesAttempted: secondServes.length,
      secondServeInCount: secondServesIn.length,
      secondServeWonCount: secondServesWon.length,
      secondServeInPct,
      secondServeWonPct,
      aces: aces.length,
      doubleFaults: doubleFaults.length,
      winnerStrokes,
      errorDetails,
      ratio: errors.length > 0 ? (winners.length / errors.length).toFixed(1) : winners.length.toString(),
    };
  };

  const allPlayerStats = allPlayers.map((p) => ({
    player: p,
    stats: calculatePlayerStats(p),
  }));

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

  const t1SecondInPct = t1.secondServesAttempted > 0
    ? Math.round((t1.secondServesIn / t1.secondServesAttempted) * 100)
    : 0;
  const t2SecondInPct = t2.secondServesAttempted > 0
    ? Math.round((t2.secondServesIn / t2.secondServesAttempted) * 100)
    : 0;

  const t1SecondWonPct = t1.secondServesAttempted > 0
    ? Math.round((t1.secondServePointsWon / t1.secondServesAttempted) * 100)
    : 0;
  const t2SecondWonPct = t2.secondServesAttempted > 0
    ? Math.round((t2.secondServePointsWon / t2.secondServesAttempted) * 100)
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

  // Comparison metrics definition with fitting visual icons (for Image 2 requirement)
  const metrics: Array<{
    label: string;
    iconEmoji: string;
    iconBg: string;
    icon: React.ReactNode;
    val1: string | number;
    val2: string | number;
    raw1?: number;
    raw2?: number;
    isHigherBetter: boolean;
  }> = [
    {
      label: 'แต้มรวมที่ได้ (Total Points)',
      iconEmoji: '🏆',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: <Trophy className="w-3.5 h-3.5" />,
      val1: t1.totalPointsWon,
      val2: t2.totalPointsWon,
      isHigherBetter: true,
    },
    {
      label: 'เสิร์ฟแรกเข้า (1st Serve In %)',
      iconEmoji: '🎾',
      iconBg: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
      icon: <Target className="w-3.5 h-3.5" />,
      val1: `${t1FirstInPct}% (${t1.firstServesIn}/${t1.firstServesAttempted})`,
      val2: `${t2FirstInPct}% (${t2.firstServesIn}/${t2.firstServesAttempted})`,
      raw1: t1FirstInPct,
      raw2: t2FirstInPct,
      isHigherBetter: true,
    },
    {
      label: 'ได้แต้มจากเสิร์ฟแรก (1st Serve Won %)',
      iconEmoji: '⚡',
      iconBg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
      icon: <Zap className="w-3.5 h-3.5" />,
      val1: `${t1FirstWonPct}% (${t1.firstServePointsWon}/${t1.firstServesIn})`,
      val2: `${t2FirstWonPct}% (${t2.firstServePointsWon}/${t2.firstServesIn})`,
      raw1: t1FirstWonPct,
      raw2: t2FirstWonPct,
      isHigherBetter: true,
    },
    {
      label: 'เสิร์ฟสองเข้า (2nd Serve In %)',
      iconEmoji: '🛡️',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: <Target className="w-3.5 h-3.5" />,
      val1: `${t1SecondInPct}% (${t1.secondServesIn}/${t1.secondServesAttempted})`,
      val2: `${t2SecondInPct}% (${t2.secondServesIn}/${t2.secondServesAttempted})`,
      raw1: t1SecondInPct,
      raw2: t2SecondInPct,
      isHigherBetter: true,
    },
    {
      label: 'ได้แต้มจากเสิร์ฟสอง (2nd Serve Won %)',
      iconEmoji: '📈',
      iconBg: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      val1: `${t1SecondWonPct}% (${t1.secondServePointsWon}/${t1.secondServesAttempted})`,
      val2: `${t2SecondWonPct}% (${t2.secondServePointsWon}/${t2.secondServesAttempted})`,
      raw1: t1SecondWonPct,
      raw2: t2SecondWonPct,
      isHigherBetter: true,
    },
    {
      label: 'เอซเสิร์ฟ (Aces)',
      iconEmoji: '🚀',
      iconBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: <Award className="w-3.5 h-3.5" />,
      val1: t1.aces,
      val2: t2.aces,
      isHigherBetter: true,
    },
    {
      label: 'ดับเบิ้ลฟอลต์ (Double Faults)',
      iconEmoji: '❌',
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      val1: t1.doubleFaults,
      val2: t2.doubleFaults,
      isHigherBetter: false,
    },
    {
      label: 'วินเนอร์รวม (Total Winners)',
      iconEmoji: '🔥',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      icon: <Flame className="w-3.5 h-3.5" />,
      val1: t1.winners,
      val2: t2.winners,
      isHigherBetter: true,
    },
    {
      label: 'สแมช / ลูกตบวินเนอร์ (Smash Winners)',
      iconEmoji: '💥',
      iconBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      icon: <Swords className="w-3.5 h-3.5" />,
      val1: t1.winnersBreakdown.smash,
      val2: t2.winnersBreakdown.smash,
      isHigherBetter: true,
    },
    {
      label: 'วอลเลย์วินเนอร์ (Volley Winners)',
      iconEmoji: '⚔️',
      iconBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      icon: <Activity className="w-3.5 h-3.5" />,
      val1: t1.winnersBreakdown.volley,
      val2: t2.winnersBreakdown.volley,
      isHigherBetter: true,
    },
    {
      label: 'ไดรฟ์วอลเลย์วินเนอร์ (Drive Volley)',
      iconEmoji: '💨',
      iconBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      icon: <Crosshair className="w-3.5 h-3.5" />,
      val1: t1.winnersBreakdown.driveVolley,
      val2: t2.winnersBreakdown.driveVolley,
      isHigherBetter: true,
    },
    {
      label: 'อันฟอร์ซเออเร่อร์ (Unforced Errors)',
      iconEmoji: '⚠️',
      iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      val1: t1.unforcedErrors,
      val2: t2.unforcedErrors,
      isHigherBetter: false,
    },
    {
      label: 'เบรกพอยต์สำเร็จ (Break Points)',
      iconEmoji: '🎯',
      iconBg: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      val1: `${t1.breakPointsWon}/${t1.breakPointsOpportunities} (${t1BpPct}%)`,
      val2: `${t2.breakPointsWon}/${t2.breakPointsOpportunities} (${t2BpPct}%)`,
      raw1: t1.breakPointsWon,
      raw2: t2.breakPointsWon,
      isHigherBetter: true,
    },
    {
      label: 'แต้มหน้าเน็ต (Net Points Won)',
      iconEmoji: '🥅',
      iconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      val1: `${t1.netPointsWon}/${t1.netPointsApproaches} (${t1NetPct}%)`,
      val2: `${t2.netPointsWon}/${t2.netPointsApproaches} (${t2NetPct}%)`,
      raw1: t1.netPointsWon,
      raw2: t2.netPointsWon,
      isHigherBetter: true,
    },
  ];

  // Dynamic tactical coaching insights
  const generateInsights = () => {
    const list: string[] = [];

    if (t1FirstInPct > t2FirstInPct + 10) {
      list.push(`🎾 ${match.team1.name} เสิร์ฟแรกแม่นยำสูงกว่าชัดเจน (${t1FirstInPct}% vs ${t2FirstInPct}%) ทำให้คุมเกมเสิร์ฟของตัวเองได้เหนือกว่า`);
    } else if (t2FirstInPct > t1FirstInPct + 10) {
      list.push(`🎾 ${match.team2.name} มีเปอร์เซ็นต์เสิร์ฟแรกเข้าสูงถึง ${t2FirstInPct}% ซึ่งสร้างความกดดันให้ผู้รับเสิร์ฟได้ดีมาก`);
    }

    // 2nd Serve tactical insights
    if (t1.secondServesAttempted > 0 || t2.secondServesAttempted > 0) {
      if (t1.secondServesAttempted > 0 && t2.secondServesAttempted > 0) {
        if (t1SecondWonPct > t2SecondWonPct + 10) {
          list.push(`🛡️ ${match.team1.name} เอาตัวรอดในจังหวะเสิร์ฟสองได้ดีกว่า (${t1SecondWonPct}% vs ${t2SecondWonPct}% | เข้าเป้า ${t1SecondInPct}%)`);
        } else if (t2SecondWonPct > t1SecondWonPct + 10) {
          list.push(`🛡️ ${match.team2.name} ทำแต้มจากเสิร์ฟสองได้โดดเด่น (${t2SecondWonPct}% vs ${t1SecondWonPct}% | เข้าเป้า ${t2SecondInPct}%)`);
        }
      }
      if (t1.secondServesAttempted >= 2 && (t1SecondWonPct < 45 || t1.doubleFaults >= 2)) {
        list.push(`⚠️ ${match.team1.name} มีโอกาสเสียแต้มจากเสิร์ฟสองสูง (ได้แต้ม ${t1SecondWonPct}%, DF ${t1.doubleFaults} ครั้ง จาก ${t1.secondServesAttempted} ลูก) แนะนำให้เน้นสปินและวางเข้ากลางตัวมากขึ้น`);
      }
      if (t2.secondServesAttempted >= 2 && (t2SecondWonPct < 45 || t2.doubleFaults >= 2)) {
        list.push(`⚠️ ${match.team2.name} เสิร์ฟสองยังเปิดโอกาสให้คู่แข่งบุกคืนได้ง่าย (ได้แต้ม ${t2SecondWonPct}%, DF ${t2.doubleFaults} ครั้ง จาก ${t2.secondServesAttempted} ลูก) ควรเพิ่มความแน่นอนในการโยนและปั่น Topspin`);
      }
    }

    const t1Ratio = t1.unforcedErrors > 0 ? (t1.winners / t1.unforcedErrors).toFixed(1) : t1.winners;
    const t2Ratio = t2.unforcedErrors > 0 ? (t2.winners / t2.unforcedErrors).toFixed(1) : t2.winners;

    if (t1.winners > t2.winners) {
      list.push(`🔥 ${match.team1.name} เล่นเชิงรุกดุดัน ทำไป ${t1.winners} วินเนอร์ (อัตราส่วน Winner/UE: ${t1Ratio})`);
    } else if (t2.winners > t1.winners) {
      list.push(`🔥 ${match.team2.name} ทำเกมบุกได้เฉียบคมด้วย ${t2.winners} วินเนอร์ (อัตราส่วน Winner/UE: ${t2Ratio})`);
    }

    if (t1.winnersBreakdown.driveVolley > 0 || t2.winnersBreakdown.driveVolley > 0) {
      if (t1.winnersBreakdown.driveVolley >= t2.winnersBreakdown.driveVolley) {
        list.push(`🚀 ${match.team1.name} โจมตีกลางคอร์ตด้วยลูก Drive Volley ได้เฉียบขาด (${t1.winnersBreakdown.driveVolley} วินเนอร์)`);
      } else {
        list.push(`🚀 ${match.team2.name} เด่นเรื่องการตัดจังหวะด้วยลูก Drive Volley (${t2.winnersBreakdown.driveVolley} วินเนอร์)`);
      }
    }

    if (t1.winnersBreakdown.smash > 0 || t2.winnersBreakdown.smash > 0) {
      if (t1.winnersBreakdown.smash > t2.winnersBreakdown.smash) {
        list.push(`💥 ${match.team1.name} มีลูกสแมช (Overhead Smash) ที่เด็ดขาดมาก (${t1.winnersBreakdown.smash} ครั้ง)`);
      } else if (t2.winnersBreakdown.smash > t1.winnersBreakdown.smash) {
        list.push(`💥 ${match.team2.name} มีลูกสแมช (Overhead Smash) ที่ทรงพลัง (${t2.winnersBreakdown.smash} ครั้ง)`);
      }
    }

    if (t1.unforcedErrorsBreakdown.frame >= 2) {
      list.push(`🪵 ${match.team1.name} ตีโดนขอบไม้ (Frame) ${t1.unforcedErrorsBreakdown.frame} ครั้ง ควรโฟกัสสายตาที่ลูกบอลจนกระทบกลางหน้าไม้`);
    }
    if (t2.unforcedErrorsBreakdown.frame >= 2) {
      list.push(`🪵 ${match.team2.name} ตีโดนขอบไม้ (Frame) ${t2.unforcedErrorsBreakdown.frame} ครั้ง ควรโฟกัสสายตาที่ลูกบอลจนกระทบกลางหน้าไม้`);
    }

    if (t1.unforcedErrorsBreakdown.net > t1.unforcedErrorsBreakdown.long) {
      list.push(`⚠️ ${match.team1.name} เสียแต้มจากการตีติดเน็ตเป็นหลัก (${t1.unforcedErrorsBreakdown.net} ครั้ง) ควรเพิ่มความสูงของลูกข้ามเน็ต (Net clearance)`);
    }
    if (t2.unforcedErrorsBreakdown.long > t2.unforcedErrorsBreakdown.net) {
      list.push(`⚠️ ${match.team2.name} มักตีลูกลึกออกหลัง (${t2.unforcedErrorsBreakdown.long} ครั้ง) ควรปรับมุมหน้าไม้หรือเพิ่ม Topspin`);
    }

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

  const handleSaveChartImage = async () => {
    if (isSavingImage) return;
    setIsSavingImage(true);
    try {
      if (activeTab === 'players_grid') {
        await exportFourPlayersComparisonImage({
          match,
          players: allPlayerStats.map(({ player, stats: pStats }) => ({
            id: player.id,
            name: player.name,
            team: player.team,
            teamName: player.teamName,
            playerIndex: player.playerIndex,
            ...pStats,
          })),
        });
      } else {
        await exportOverallAnalyticsImage({
          match,
          stats,
          metrics: metrics.map((m) => ({
            label: m.label,
            iconEmoji: m.iconEmoji,
            val1: m.val1,
            val2: m.val2,
            raw1: m.raw1,
            raw2: m.raw2,
          })),
          insights: generateInsights(),
          activeTab: activeTab === 'ai_insights' ? 'ai_insights' : 'comparison',
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleSaveSinglePlayerImage = async (
    player: typeof allPlayers[0],
    pStats: ReturnType<typeof calculatePlayerStats>
  ) => {
    if (isSavingImage) return;
    setIsSavingImage(true);
    try {
      await exportPlayerAnalyticsImage({
        match,
        player: {
          id: player.id,
          name: player.name,
          team: player.team,
          teamName: player.teamName,
          playerIndex: player.playerIndex,
          ...pStats,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSavingImage(false);
    }
  };

  // Breakdown rows for true 2-sided display (Image 1 requirement)
  const winnerBreakdownRows = [
    { icon: '💪', label: 'Forehand', v1: t1.winnersBreakdown.forehand, v2: t2.winnersBreakdown.forehand },
    { icon: '🎯', label: 'Backhand', v1: t1.winnersBreakdown.backhand, v2: t2.winnersBreakdown.backhand },
    { icon: '⚡', label: 'Volley / หน้าเน็ต', v1: t1.winnersBreakdown.volley, v2: t2.winnersBreakdown.volley },
    { icon: '🚀', label: 'ไดรฟ์วอลเลย์ (Drive Volley)', v1: t1.winnersBreakdown.driveVolley, v2: t2.winnersBreakdown.driveVolley },
    { icon: '💥', label: 'Smash / ตบ', v1: t1.winnersBreakdown.smash, v2: t2.winnersBreakdown.smash },
    { icon: '🪶', label: 'Drop Shot', v1: t1.winnersBreakdown.dropShot, v2: t2.winnersBreakdown.dropShot },
  ];

  const errorPlacementRows = [
    { icon: '🕸️', label: 'ติดเน็ต (Net)', v1: t1.unforcedErrorsBreakdown.net, v2: t2.unforcedErrorsBreakdown.net },
    { icon: '↔️', label: 'ออกข้าง (Wide)', v1: t1.unforcedErrorsBreakdown.wide, v2: t2.unforcedErrorsBreakdown.wide },
    { icon: '📏', label: 'ออกหลัง (Long)', v1: t1.unforcedErrorsBreakdown.long, v2: t2.unforcedErrorsBreakdown.long },
    { icon: '🪵', label: 'ขอบไม้ (Frame)', v1: t1.unforcedErrorsBreakdown.frame, v2: t2.unforcedErrorsBreakdown.frame },
    { icon: '❌', label: 'ดับเบิ้ลฟอลต์ (DF)', v1: t1.doubleFaults, v2: t2.doubleFaults },
  ];

  const errorStrokeRows = [
    { icon: '💪', label: 'โฟร์แฮนด์เสีย', v1: t1.unforcedErrorsByStroke.forehand, v2: t2.unforcedErrorsByStroke.forehand },
    { icon: '🎯', label: 'แบ็คแฮนด์เสีย', v1: t1.unforcedErrorsByStroke.backhand, v2: t2.unforcedErrorsByStroke.backhand },
    { icon: '⚡', label: 'วอลเลย์เสีย', v1: t1.unforcedErrorsByStroke.volley, v2: t2.unforcedErrorsByStroke.volley },
    { icon: '🚀', label: 'ไดรฟ์วอลเลย์เสีย', v1: t1.unforcedErrorsByStroke.driveVolley, v2: t2.unforcedErrorsByStroke.driveVolley },
    { icon: '💥', label: 'สแมชเสีย', v1: t1.unforcedErrorsByStroke.smash, v2: t2.unforcedErrorsByStroke.smash },
    { icon: '🪶', label: 'หยอดเสีย', v1: t1.unforcedErrorsByStroke.dropShot, v2: t2.unforcedErrorsByStroke.dropShot },
    { icon: '🎈', label: 'ลูกโด่งเสีย', v1: t1.unforcedErrorsByStroke.lob, v2: t2.unforcedErrorsByStroke.lob },
    { icon: '↩️', label: 'รับเสิร์ฟเสีย', v1: t1.unforcedErrorsByStroke.return, v2: t2.unforcedErrorsByStroke.return },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Full-Screen Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
              การวิเคราะห์ฟอร์มการเล่น (Match Analytics)
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {match.team1.name} vs {match.team2.name} • {match.settings.type === 'doubles' ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            ภาพรวมแมตช์ & วิเคราะห์ทุกคน
          </button>

          <button
            onClick={() => setActiveTab('players_grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'players_grid'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>วิเคราะห์รายบุคคล ({allPlayers.length} คอลัมน์)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai_insights')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ai_insights'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>บทวิเคราะห์ฟอร์ม</span>
          </button>

          <button
            type="button"
            onClick={handleSaveChartImage}
            disabled={isSavingImage}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition whitespace-nowrap"
            title="บันทึกกราฟสถิติเป็นไฟล์ภาพ PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isSavingImage ? 'กำลังบันทึก...' : 'เซฟภาพกราฟ'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-bold text-rose-200 flex items-center gap-1 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>กลับหน้าหลัก</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="mx-4 sm:mx-6 mt-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>บันทึกภาพกราฟสถิติเป็นไฟล์ PNG เรียบร้อยแล้ว!</span>
        </div>
      )}

      {/* Main Scrollable Full-Screen Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* ================= OVERALL TEAM STATS (1 COLUMN) + COMBINED PLAYERS ================= */}
          {activeTab === 'comparison' && (
            <div className="space-y-5">
              {/* Team Head-to-Head Banner */}
              <div className="grid grid-cols-3 items-center text-center py-3 px-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-sm">
                <div className="text-left font-black text-emerald-400 text-sm sm:text-base">
                  {match.team1.name}
                </div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-black">
                  VS
                </div>
                <div className="text-right font-black text-sky-400 text-sm sm:text-base">
                  {match.team2.name}
                </div>
              </div>

              {/* Metrics List — Single Column (1 คอลัมน์เต็มความกว้าง ดูง่ายชัดเจน) */}
              <div className="grid grid-cols-1 gap-2">
                {metrics.map((m, idx) => {
                  const num1 = typeof m.raw1 === 'number' ? m.raw1 : typeof m.val1 === 'number' ? m.val1 : 0;
                  const num2 = typeof m.raw2 === 'number' ? m.raw2 : typeof m.val2 === 'number' ? m.val2 : 0;
                  const total = num1 + num2 || 1;
                  const p1Width = num1 === 0 && num2 === 0 ? 50 : Math.round((num1 / total) * 100);
                  const p2Width = 100 - p1Width;

                  return (
                    <div key={idx} className="bg-slate-900/75 rounded-2xl p-3 border border-slate-800/90">
                      <div className="flex justify-between items-center text-xs mb-2 gap-2">
                        <span className="font-black text-emerald-300 w-24 text-left text-sm">{m.val1}</span>

                        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
                          <span className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${m.iconBg}`}>
                            {m.icon}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                            {m.label}
                          </span>
                        </div>

                        <span className="font-black text-sky-300 w-24 text-right text-sm">{m.val2}</span>
                      </div>

                      {/* Progress Bar Split */}
                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-800">
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

              {/* Winners & Errors Breakdown — True 2-Sided Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                {/* Winners 2-Sided Breakdown */}
                <div className="p-4 bg-slate-900/80 rounded-2xl border border-emerald-800/50">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 text-sm font-black text-emerald-400">
                      <Flame className="w-4 h-4" />
                      <span>ประเภทลูกวินเนอร์ (Winners Breakdown)</span>
                    </div>
                  </div>

                  {/* 2-Sided Column Header */}
                  <div className="grid grid-cols-[60px_1fr_60px] items-center text-[11px] font-bold uppercase tracking-wider pb-2 px-2">
                    <span className="text-left text-emerald-400 truncate">{match.team1.name}</span>
                    <span className="text-center text-slate-400">ประเภทลูก</span>
                    <span className="text-right text-sky-400 truncate">{match.team2.name}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {winnerBreakdownRows.map((row, idx) => {
                      const sum = row.v1 + row.v2;
                      const w1 = sum > 0 ? Math.round((row.v1 / sum) * 100) : 50;
                      const w2 = 100 - w1;
                      return (
                        <div key={idx} className="bg-slate-950/70 rounded-xl px-3 py-2 border border-slate-800/80">
                          <div className="grid grid-cols-[48px_1fr_48px] items-center">
                            <span className="text-left text-sm font-black text-emerald-300">{row.v1}</span>
                            <span className="text-center text-slate-200 font-semibold flex items-center justify-center gap-1.5">
                              <span>{row.icon}</span>
                              <span>{row.label}</span>
                            </span>
                            <span className="text-right text-sm font-black text-sky-300">{row.v2}</span>
                          </div>
                          <div className="flex h-1 w-full rounded-full overflow-hidden bg-slate-800 mt-1.5">
                            <div className="bg-emerald-500/80" style={{ width: `${w1}%` }} />
                            <div className="bg-sky-500/80" style={{ width: `${w2}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unforced Errors 2-Sided Breakdown */}
                <div className="p-4 bg-slate-900/80 rounded-2xl border border-rose-800/50">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 text-sm font-black text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>ประเภทการตีเสียเอง (Unforced Errors)</span>
                    </div>
                  </div>

                  {/* 2-Sided Column Header */}
                  <div className="grid grid-cols-[60px_1fr_60px] items-center text-[11px] font-bold uppercase tracking-wider pb-2 px-2">
                    <span className="text-left text-emerald-400 truncate">{match.team1.name}</span>
                    <span className="text-center text-slate-400">ลักษณะ / ช็อตเสีย</span>
                    <span className="text-right text-sky-400 truncate">{match.team2.name}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {errorPlacementRows.map((row, idx) => {
                      const sum = row.v1 + row.v2;
                      const w1 = sum > 0 ? Math.round((row.v1 / sum) * 100) : 50;
                      const w2 = 100 - w1;
                      return (
                        <div key={`err-p-${idx}`} className="bg-slate-950/70 rounded-xl px-3 py-2 border border-slate-800/80">
                          <div className="grid grid-cols-[48px_1fr_48px] items-center">
                            <span className="text-left text-sm font-black text-emerald-300">{row.v1}</span>
                            <span className="text-center text-slate-200 font-semibold flex items-center justify-center gap-1.5">
                              <span>{row.icon}</span>
                              <span>{row.label}</span>
                            </span>
                            <span className="text-right text-sm font-black text-sky-300">{row.v2}</span>
                          </div>
                          <div className="flex h-1 w-full rounded-full overflow-hidden bg-slate-800 mt-1.5">
                            <div className="bg-emerald-500/80" style={{ width: `${w1}%` }} />
                            <div className="bg-sky-500/80" style={{ width: `${w2}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 mt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {errorStrokeRows.map((row, idx) => (
                        <div
                          key={`err-s-${idx}`}
                          className="grid grid-cols-[36px_1fr_36px] items-center bg-slate-950/50 rounded-lg px-2.5 py-1.5 border border-slate-800/70"
                        >
                          <span className="text-left font-black text-emerald-300">{row.v1}</span>
                          <span className="text-center text-[11px] text-slate-300 flex items-center justify-center gap-1">
                            <span>{row.icon}</span>
                            <span>{row.label}</span>
                          </span>
                          <span className="text-right font-black text-sky-300">{row.v2}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= COMBINED PER-PLAYER ANALYSIS (2 or 4 COLUMNS) ================= */}
          {(activeTab === 'comparison' || activeTab === 'players_grid') && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      วิเคราะห์ภาพรวมแต่ละคน ({allPlayers.length} คอลัมน์)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      แสดงสถิติเกมเสิร์ฟ ลูกวินเนอร์ ลูกตีเสีย กราฟกระจายช็อต และสรุปฟอร์มของนักกีฬาทุกคนพร้อมกัน
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    {match.team1.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    {match.team2.name}
                  </span>
                </div>
              </div>

              <div
                className={`grid gap-4 ${
                  allPlayers.length >= 3
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                    : 'grid-cols-1 md:grid-cols-2'
                }`}
              >
                {allPlayerStats.map(({ player, stats: pStats }) => {
                  const isT1 = player.team === 'team1';
                  const personalInsights: string[] = [];
                  if (pStats.totalServes > 0) {
                    personalInsights.push(
                      `🎾 เสิร์ฟแรกเข้า ${pStats.firstServeInPct}% (ได้แต้ม ${pStats.firstServeWonPct}%)`
                    );
                  }
                  if (pStats.secondServesAttempted > 0) {
                    if (pStats.secondServeWonPct >= 60 && pStats.doubleFaults === 0) {
                      personalInsights.push(
                        `🛡️ เสิร์ฟสองแข็งแกร่ง เข้า ${pStats.secondServeInPct}% และเก็บแต้มได้ถึง ${pStats.secondServeWonPct}% (${pStats.secondServeWonCount}/${pStats.secondServesAttempted})`
                      );
                    } else if (pStats.secondServeWonPct < 45 || pStats.doubleFaults >= 2) {
                      personalInsights.push(
                        `⚠️ เสิร์ฟสองได้แต้ม ${pStats.secondServeWonPct}% (DF ${pStats.doubleFaults} ครั้ง/${pStats.secondServesAttempted} ลูก) ควรเพิ่มสปินและลดความเสี่ยง`
                      );
                    } else {
                      personalInsights.push(
                        `📈 เสิร์ฟสองเข้า ${pStats.secondServeInPct}% ได้แต้ม ${pStats.secondServeWonPct}% (${pStats.secondServeWonCount}/${pStats.secondServesAttempted})`
                      );
                    }
                  }
                  if (pStats.winnerStrokes.smash > 0) {
                    personalInsights.push(`💥 สแมชทำแต้มได้ ${pStats.winnerStrokes.smash} วินเนอร์`);
                  }
                  if (pStats.winnerStrokes.driveVolley > 0) {
                    personalInsights.push(`🚀 ไดรฟ์วอลเลย์ทำแต้ม ${pStats.winnerStrokes.driveVolley} วินเนอร์`);
                  }
                  if (pStats.errorDetails.frame > 0) {
                    personalInsights.push(`🪵 ตีโดนขอบไม้ ${pStats.errorDetails.frame} ครั้ง`);
                  }
                  if (pStats.errorDetails.net > pStats.errorDetails.long && pStats.errorDetails.net > 0) {
                    personalInsights.push(`🕸️ เสียติดเน็ตเป็นหลัก (${pStats.errorDetails.net} ครั้ง) ควรยกข้ามเน็ตสูงขึ้น`);
                  } else if (pStats.errorDetails.long > pStats.errorDetails.net && pStats.errorDetails.long > 0) {
                    personalInsights.push(`📏 เสียออกหลังเป็นหลัก (${pStats.errorDetails.long} ครั้ง) ควรปั่น Topspin เพิ่ม`);
                  }
                  if (personalInsights.length === 0) {
                    personalInsights.push(`📊 สะสมแต้มบุก ${pStats.totalWinners + pStats.aces} แต้ม | ตีเสีย ${pStats.totalErrors} ครั้ง`);
                  }

                  const shotRows = [
                    { icon: '💪', label: 'Forehand', w: pStats.winnerStrokes.forehand, e: pStats.errorDetails.forehand },
                    { icon: '🎯', label: 'Backhand', w: pStats.winnerStrokes.backhand, e: pStats.errorDetails.backhand },
                    { icon: '💥', label: 'Smash', w: pStats.winnerStrokes.smash, e: pStats.errorDetails.smash },
                    { icon: '⚡', label: 'Volley', w: pStats.winnerStrokes.volley, e: pStats.errorDetails.volley },
                    { icon: '🚀', label: 'Drive Volley', w: pStats.winnerStrokes.driveVolley, e: pStats.errorDetails.driveVolley },
                    { icon: '🪶', label: 'หยอด / 🎈 ลูกโด่ง', w: pStats.winnerStrokes.dropShot, e: pStats.errorDetails.dropShot + pStats.errorDetails.lob },
                  ];

                  return (
                    <div
                      key={player.id}
                      className={`rounded-2xl border p-4 bg-slate-900/80 flex flex-col gap-3 shadow-lg ${
                        isT1
                          ? 'border-emerald-700/50'
                          : 'border-sky-700/50'
                      }`}
                    >
                      {/* Player Character Header + Individual Save PNG */}
                      <div className="relative flex flex-col items-center text-center pb-3 border-b border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleSaveSinglePlayerImage(player, pStats)}
                          disabled={isSavingImage}
                          className="absolute right-0 top-0 p-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white transition"
                          title={`เซฟภาพกราฟเฉพาะ ${player.name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <PlayerCharacterAvatar
                          team={player.team}
                          variant={player.playerIndex}
                          size="lg"
                        />
                        <h4 className="mt-2.5 text-base font-black text-white">
                          {player.name}
                        </h4>
                        <span
                          className={`mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isT1
                              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                              : 'bg-sky-950/80 border-sky-500/40 text-sky-300'
                          }`}
                        >
                          {player.teamName}
                        </span>
                      </div>

                      {/* Quick Highlight KPIs */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl py-2 px-1">
                          <div className="text-[10px] text-emerald-400 font-bold">วินเนอร์</div>
                          <div className="text-lg font-black text-emerald-300">{pStats.totalWinners}</div>
                        </div>
                        <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl py-2 px-1">
                          <div className="text-[10px] text-rose-400 font-bold">ตีเสีย (UE)</div>
                          <div className="text-lg font-black text-rose-300">{pStats.totalErrors}</div>
                        </div>
                        <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-xl py-2 px-1">
                          <div className="text-[10px] text-indigo-300 font-bold">Ratio</div>
                          <div className="text-lg font-black text-indigo-200">{pStats.ratio}x</div>
                        </div>
                      </div>

                      {/* Serve & Aces (1st + 2nd Serve) */}
                      <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1 text-xs">
                        <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" /> เกมเสิร์ฟ (1st & 2nd)
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">เสิร์ฟแรกเข้า:</span>
                          <span className="font-bold text-slate-100">
                            {pStats.firstServeInPct}% <span className="text-[10px] text-slate-400">({pStats.firstServeInCount}/{pStats.totalServes})</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ได้แต้มเสิร์ฟ 1:</span>
                          <span className="font-bold text-slate-100">
                            {pStats.firstServeWonPct}% <span className="text-[10px] text-slate-400">({pStats.firstServeWonCount}/{pStats.firstServeInCount})</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">เสิร์ฟสองเข้า:</span>
                          <span className="font-bold text-emerald-300">
                            {pStats.secondServeInPct}% <span className="text-[10px] text-slate-400">({pStats.secondServeInCount}/{pStats.secondServesAttempted})</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ได้แต้มเสิร์ฟ 2:</span>
                          <span className="font-bold text-teal-300">
                            {pStats.secondServeWonPct}% <span className="text-[10px] text-slate-400">({pStats.secondServeWonCount}/{pStats.secondServesAttempted})</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">เอซ / ดับเบิ้ลฟอลต์:</span>
                          <span className="font-bold text-amber-300">{pStats.aces} / <span className="text-rose-400">{pStats.doubleFaults}</span></span>
                        </div>
                      </div>

                      {/* Winners Breakdown */}
                      <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1 text-xs">
                        <div className="text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" /> ลูกวินเนอร์
                        </div>
                        <div className="flex justify-between"><span className="text-slate-400">💪 Forehand:</span><span className="font-bold text-slate-200">{pStats.winnerStrokes.forehand}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">🎯 Backhand:</span><span className="font-bold text-slate-200">{pStats.winnerStrokes.backhand}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">⚡ Volley:</span><span className="font-bold text-slate-200">{pStats.winnerStrokes.volley}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">🚀 ไดรฟ์วอลเลย์:</span><span className="font-bold text-emerald-300">{pStats.winnerStrokes.driveVolley}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">💥 Smash / Drop:</span><span className="font-bold text-slate-200">{pStats.winnerStrokes.smash} / {pStats.winnerStrokes.dropShot}</span></div>
                      </div>

                      {/* Errors Breakdown */}
                      <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1 text-xs">
                        <div className="text-[11px] font-bold text-rose-400 mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> ลูกตีเสียเอง
                        </div>
                        <div className="flex justify-between"><span className="text-slate-400">🕸️ ติดเน็ต (Net):</span><span className="font-bold text-slate-200">{pStats.errorDetails.net}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">↔️ ออกข้าง / ออกหลัง:</span><span className="font-bold text-slate-200">{pStats.errorDetails.wide} / {pStats.errorDetails.long}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">🪵 ขอบไม้ (Frame):</span><span className="font-bold text-amber-300">{pStats.errorDetails.frame}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">🚀 ไดรฟ์วอลเลย์เสีย:</span><span className="font-bold text-rose-300">{pStats.errorDetails.driveVolley}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">🪶 หยอด / 🎈 ลูกโด่งเสีย:</span><span className="font-bold text-rose-300">{pStats.errorDetails.dropShot} / {pStats.errorDetails.lob}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">💪 FH / 🎯 BH เสีย:</span><span className="font-bold text-slate-200">{pStats.errorDetails.forehand} / {pStats.errorDetails.backhand}</span></div>
                      </div>

                      {/* Shot Distribution Bars inside each column */}
                      <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-2 text-[11px]">
                        <div className="font-bold text-sky-400 flex items-center gap-1">
                          <BarChart2 className="w-3.5 h-3.5" /> กราฟสัดส่วนช็อต (W vs UE)
                        </div>
                        {shotRows.map((sr, sIdx) => {
                          const tot = sr.w + sr.e;
                          const wPct = tot > 0 ? (sr.w / tot) * 100 : 50;
                          const ePct = tot > 0 ? (sr.e / tot) * 100 : 50;
                          return (
                            <div key={sIdx}>
                              <div className="flex justify-between mb-0.5 text-[10px]">
                                <span className="text-slate-300">{sr.icon} {sr.label}</span>
                                <span>
                                  <strong className="text-emerald-400">{sr.w}W</strong> / <strong className="text-rose-400">{sr.e}E</strong>
                                </span>
                              </div>
                              <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                                <div className="bg-emerald-500" style={{ width: `${wPct}%` }} />
                                <div className="bg-rose-500" style={{ width: `${ePct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Personal Tactical Summary */}
                      <div className="bg-slate-950/60 rounded-xl p-2.5 border border-amber-900/40 space-y-1 text-[11px] mt-auto">
                        <div className="font-bold text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> สรุปฟอร์ม {player.name}
                        </div>
                        {personalInsights.map((ins, iIdx) => (
                          <div key={iIdx} className="text-slate-300 leading-snug">
                            {ins}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TACTICAL AI INSIGHTS TAB ================= */}
          {activeTab === 'ai_insights' && (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-700/50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-emerald-300 font-bold text-sm sm:text-base">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>สรุปวิเคราะห์ฟอร์มและแท็กติกการเล่น (Tactical Insights)</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ระบบคำนวณจากทุกช็อตที่บันทึก ทั้งเสิร์ฟแรก เสิร์ฟสอง ลูกวินเนอร์ และความผิดพลาด เพื่อสรุปจุดแข็ง-จุดที่ต้องปรับแก้ทั้งระดับทีมและรายบุคคล
                </p>
              </div>

              <div className="space-y-2.5">
                {generateInsights().map((insight, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-200 flex items-start gap-2.5 shadow-sm"
                  >
                    <Target className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>

              {/* Per-Player Serve & Form Insights Summary inside Tactical Insights Tab */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>บทวิเคราะห์เกมเสิร์ฟ (ลูก 1 / ลูก 2) และฟอร์มรายบุคคล</span>
                </h4>

                <div
                  className={`grid gap-3 ${
                    allPlayers.length >= 3
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                      : 'grid-cols-1 md:grid-cols-2'
                  }`}
                >
                  {allPlayerStats.map(({ player, stats: pStats }) => {
                    const isT1 = player.team === 'team1';
                    return (
                      <div
                        key={`insight-player-${player.id}`}
                        className={`rounded-2xl border p-3.5 bg-slate-900/80 space-y-2 text-xs ${
                          isT1 ? 'border-emerald-800/50' : 'border-sky-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
                          <PlayerCharacterAvatar team={player.team} variant={player.playerIndex} size="sm" />
                          <div className="min-w-0">
                            <div className="font-black text-white truncate">{player.name}</div>
                            <div className={`text-[10px] font-bold ${isT1 ? 'text-emerald-400' : 'text-sky-400'}`}>
                              {player.teamName}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span>🎾 เสิร์ฟแรกเข้า / ได้แต้ม:</span>
                            <strong className="text-white">{pStats.firstServeInPct}% / {pStats.firstServeWonPct}%</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>🛡️ เสิร์ฟสองเข้า / ได้แต้ม:</span>
                            <strong className="text-emerald-300">{pStats.secondServeInPct}% / {pStats.secondServeWonPct}%</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>⚡ เอซ / ดับเบิ้ลฟอลต์:</span>
                            <strong className="text-amber-300">{pStats.aces} / <span className="text-rose-400">{pStats.doubleFaults}</span></strong>
                          </div>
                          <div className="flex justify-between">
                            <span>🔥 วินเนอร์ / ตีเสีย (UE):</span>
                            <strong><span className="text-emerald-300">{pStats.totalWinners}</span> / <span className="text-rose-400">{pStats.totalErrors}</span></strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

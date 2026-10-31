import React, { useRef, useState } from 'react';
import { MatchState } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';
import {
  Download,
  Share2,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Zap,
  Flame,
  Shield,
  BarChart3,
  Calendar,
  X,
} from 'lucide-react';

interface MatchInfographicCardProps {
  match: MatchState;
  onClose?: () => void;
}

export const MatchInfographicCard: React.FC<MatchInfographicCardProps> = ({
  match,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const stats = calculateMatchStats(match.pointsHistory, match.sets);
  const winnerTeam = match.matchWinner || 'team1';
  const runnerUpTeam = winnerTeam === 'team1' ? 'team2' : 'team1';

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

  const t1BpPct = t1.breakPointsOpportunities > 0
    ? Math.round((t1.breakPointsWon / t1.breakPointsOpportunities) * 100)
    : 0;
  const t2BpPct = t2.breakPointsOpportunities > 0
    ? Math.round((t2.breakPointsWon / t2.breakPointsOpportunities) * 100)
    : 0;

  // Derive Strengths and Weaknesses for Team 1
  const getStrengthsAndWeaknesses = (teamKey: 'team1' | 'team2') => {
    const s = teamKey === 'team1' ? t1 : t2;
    const opp = teamKey === 'team1' ? t2 : t1;
    const firstIn = teamKey === 'team1' ? t1FirstInPct : t2FirstInPct;
    const firstWon = teamKey === 'team1' ? t1FirstWonPct : t2FirstWonPct;
    const bpPct = teamKey === 'team1' ? t1BpPct : t2BpPct;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Evaluate Strengths
    if (s.aces >= 3) strengths.push(`เสิร์ฟเอซเฉียบคม (${s.aces} Aces)`);
    if (firstIn >= 60) strengths.push(`เสิร์ฟแรกเข้าเป้าสูง (${firstIn}%)`);
    if (firstWon >= 65) strengths.push(`คุมแต้มเสิร์ฟแรกเด็ดขาด (${firstWon}% Won)`);
    if (s.winners >= 8 || s.winners > opp.winners) strengths.push(`เกมรุกทรงพลัง (${s.winners} วินเนอร์)`);
    if (s.winnersBreakdown.forehand >= 4) strengths.push(`โฟร์แฮนด์สั่งตาย (${s.winnersBreakdown.forehand} FH Winners)`);
    if (s.winnersBreakdown.volley + s.winnersBreakdown.smash >= 3) strengths.push(`เล่นหน้าเน็ตเหนียวแน่น (${s.netPointsWon} แต้มเน็ต)`);
    if (bpPct >= 50 && s.breakPointsOpportunities > 0) strengths.push(`ฉวยโอกาสเบรกพอยต์แม่นยำ (${bpPct}%)`);

    if (strengths.length === 0) {
      strengths.push('เล่นเกมเหนียวแน่นต่อเนื่อง', 'รักษาสมาธิในจังหวะสำคัญ');
    }

    // Evaluate Weaknesses
    if (s.unforcedErrorsBreakdown.net >= 4) weaknesses.push(`ตีติดเน็ตบ่อย (${s.unforcedErrorsBreakdown.net} ครั้ง)`);
    if (s.unforcedErrorsBreakdown.wide + s.unforcedErrorsBreakdown.long >= 5) weaknesses.push(`ตีลูกลึก/ออกข้างบ่อย (${s.unforcedErrorsBreakdown.wide + s.unforcedErrorsBreakdown.long} ครั้ง)`);
    if (s.doubleFaults >= 3) weaknesses.push(`ดับเบิ้ลฟอลต์มากเกินไป (${s.doubleFaults} DFs)`);
    if (firstIn < 50 && s.firstServesAttempted > 4) weaknesses.push(`เปอร์เซ็นต์เสิร์ฟแรกต่ำ (${firstIn}%)`);
    if (s.breakPointsOpportunities >= 3 && bpPct < 30) weaknesses.push(`พลาดโอกาสเบรกพอยต์สำคัญ (${s.breakPointsWon}/${s.breakPointsOpportunities})`);

    if (weaknesses.length === 0) {
      weaknesses.push('การควบคุมจังหวะลูกสอง', 'เพิ่มความดุดันในลูกรีเทิร์น');
    }

    return { strengths: strengths.slice(0, 3), weaknesses: weaknesses.slice(0, 3) };
  };

  const t1Profile = getStrengthsAndWeaknesses('team1');
  const t2Profile = getStrengthsAndWeaknesses('team2');

  // Formulate Set Score string
  const setScoreDisplay = match.sets
    .filter((s) => s.winner || s.team1Games > 0 || s.team2Games > 0)
    .map((s) => {
      let txt = `${s.team1Games}-${s.team2Games}`;
      if (s.team1TiebreakPoints !== undefined && s.team2TiebreakPoints !== undefined) {
        txt += `(${Math.min(s.team1TiebreakPoints, s.team2TiebreakPoints)})`;
      }
      return txt;
    })
    .join('  ');

  // Function to draw high-res image to Canvas and download
  const generateAndDownloadImage = () => {
    setIsGenerating(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient: Deep Wimbledon Forest Green to Night
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGrad.addColorStop(0, '#061611');
    bgGrad.addColorStop(0.5, '#0a231b');
    bgGrad.addColorStop(1, '#020b08');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 700);

    // Subtle Tennis Court decorative lines in background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, 1080, 580);
    ctx.beginPath();
    ctx.moveTo(600, 60);
    ctx.lineTo(600, 640);
    ctx.moveTo(60, 350);
    ctx.lineTo(1140, 350);
    ctx.stroke();

    // Top Header Banner
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('🎾 TENNISPRO PERFORMANCE REPORT', 80, 85);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `${new Date(match.createdAt).toLocaleDateString('th-TH')} • ${match.settings.courtSurface.toUpperCase()} COURT • ${match.settings.type === 'doubles' ? 'DOUBLES' : 'SINGLES'}`,
      80,
      110
    );

    // Score Board Card Header
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, 135, 1040, 110, 16);
    ctx.fill();
    ctx.stroke();

    // Player 1 Name & Winner Crown
    ctx.fillStyle = match.matchWinner === 'team1' ? '#34d399' : '#f8fafc';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(match.team1.name + (match.matchWinner === 'team1' ? ' 🏆' : ''), 110, 185);

    // Player 2 Name
    ctx.fillStyle = match.matchWinner === 'team2' ? '#38bdf8' : '#f8fafc';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(match.team2.name + (match.matchWinner === 'team2' ? ' 🏆' : ''), 110, 225);

    // Final Sets Score on Right
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(setScoreDisplay || '0-0', 1090, 205);
    ctx.textAlign = 'left';

    // Two Columns for Strengths & Weaknesses
    // Team 1 Card (Left Column)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.beginPath();
    ctx.roundRect(80, 265, 505, 360, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${match.team1.name} — บทวิเคราะห์ฟอร์ม`, 105, 298);

    // Strengths P1
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✓ จุดแข็งสำคัญ (Key Strengths):', 105, 335);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    t1Profile.strengths.forEach((st, i) => {
      ctx.fillText(`• ${st}`, 115, 362 + i * 24);
    });

    // Weaknesses P1
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('⚠ จุดที่ต้องระวัง (Focus Areas):', 105, 455);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px sans-serif';
    t1Profile.weaknesses.forEach((wk, i) => {
      ctx.fillText(`• ${wk}`, 115, 482 + i * 24);
    });

    // Stats Pill P1
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(100, 560, 465, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `แต้มรวม: ${t1.totalPointsWon}  |  1st In: ${t1FirstInPct}%  |  Aces: ${t1.aces}  |  Winners: ${t1.winners}  |  UE: ${t1.unforcedErrors}`,
      115,
      590
    );

    // Team 2 Card (Right Column)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.beginPath();
    ctx.roundRect(615, 265, 505, 360, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${match.team2.name} — บทวิเคราะห์ฟอร์ม`, 640, 298);

    // Strengths P2
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('✓ จุดแข็งสำคัญ (Key Strengths):', 640, 335);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    t2Profile.strengths.forEach((st, i) => {
      ctx.fillText(`• ${st}`, 650, 362 + i * 24);
    });

    // Weaknesses P2
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('⚠ จุดที่ต้องระวัง (Focus Areas):', 640, 455);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px sans-serif';
    t2Profile.weaknesses.forEach((wk, i) => {
      ctx.fillText(`• ${wk}`, 650, 482 + i * 24);
    });

    // Stats Pill P2
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(635, 560, 465, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `แต้มรวม: ${t2.totalPointsWon}  |  1st In: ${t2FirstInPct}%  |  Aces: ${t2.aces}  |  Winners: ${t2.winners}  |  UE: ${t2.unforcedErrors}`,
      650,
      590
    );

    // Export Canvas to Blob & Trigger Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tennispro_stats_${match.team1.name}_vs_${match.team2.name}_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setIsGenerating(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }, 'image/png');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `สรุปผลการแข่งขันเทนนิส: ${match.team1.name} vs ${match.team2.name}`,
          text: `ผลการแข่งขัน: ${setScoreDisplay} • ดูรายงานสรุปสถิติสำคัญและการวิเคราะห์ฟอร์มผ่าน TennisPro`,
        });
      } catch (e) {
        console.log('Share canceled or not supported');
      }
    } else {
      generateAndDownloadImage();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-wide">
            ภาพประกอบสรุปสถิติ & ฟอร์มการเล่น (Match Infographic)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateAndDownloadImage}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'กำลังสร้างภาพ...' : 'ดาวน์โหลดภาพ PNG'}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 border border-slate-700 active:scale-95 transition"
            title="แชร์ภาพสรุป"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">แชร์</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Infographic Preview Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {downloadSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>ดาวน์โหลดภาพสรุปผลสถิติการแข่งขันสำเร็จแล้ว! (ไฟล์ PNG คมชัดสูง)</span>
          </div>
        )}

        {/* Visual Infographic Card Preview */}
        <div className="relative rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-slate-700/80 p-4 sm:p-6 shadow-2xl">
          {/* Header Metadata */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🎾</span>
              <span>TENNISPRO PERFORMANCE REPORT</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {new Date(match.createdAt).toLocaleDateString('th-TH')} • คอร์ต {match.settings.courtSurface}
            </span>
          </div>

          {/* Big Scorecard Banner */}
          <div className="my-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <span className={`text-base sm:text-lg font-black ${match.matchWinner === 'team1' ? 'text-emerald-400' : 'text-white'}`}>
                  {match.team1.name}
                </span>
                {match.matchWinner === 'team1' && (
                  <span className="text-xs bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full">
                    ผู้ชนะ 🏆
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-base sm:text-lg font-black ${match.matchWinner === 'team2' ? 'text-sky-400' : 'text-white'}`}>
                  {match.team2.name}
                </span>
                {match.matchWinner === 'team2' && (
                  <span className="text-xs bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full">
                    ผู้ชนะ 🏆
                  </span>
                )}
              </div>
            </div>

            <div className="text-center sm:text-right">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">สกอร์สุดท้าย</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-wide">
                {setScoreDisplay || '0-0'}
              </div>
            </div>
          </div>

          {/* Key Strengths & Weaknesses 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Player 1 Profile Card */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-emerald-400 text-sm">
                  {match.team1.name}
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  แต้มรวม: {t1.totalPointsWon}
                </span>
              </div>

              {/* Strengths */}
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>จุดแข็งสำคัญ (Key Strengths)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  {t1Profile.strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>จุดที่ต้องระวัง / ปรับปรุง (Focus Areas)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  {t1Profile.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stat Pill */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 text-center text-[10px] text-slate-400">
                <div>1st In: <strong className="text-white">{t1FirstInPct}%</strong></div>
                <div>Aces: <strong className="text-amber-300">{t1.aces}</strong></div>
                <div>Winners: <strong className="text-emerald-400">{t1.winners}</strong></div>
              </div>
            </div>

            {/* Player 2 Profile Card */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-sky-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sky-400 text-sm">
                  {match.team2.name}
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  แต้มรวม: {t2.totalPointsWon}
                </span>
              </div>

              {/* Strengths */}
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>จุดแข็งสำคัญ (Key Strengths)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  {t2Profile.strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>จุดที่ต้องระวัง / ปรับปรุง (Focus Areas)</span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  {t2Profile.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stat Pill */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 text-center text-[10px] text-slate-400">
                <div>1st In: <strong className="text-white">{t2FirstInPct}%</strong></div>
                <div>Aces: <strong className="text-amber-300">{t2.aces}</strong></div>
                <div>Winners: <strong className="text-sky-400">{t2.winners}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

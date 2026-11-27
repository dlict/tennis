import { MatchState, TeamStats } from '../types/tennis';

export interface PlayerChartExportData {
  id?: string;
  name: string;
  team: 'team1' | 'team2';
  teamName: string;
  playerIndex?: number;
  totalWinners: number;
  totalErrors: number;
  totalServes: number;
  firstServeInPct: number;
  firstServeWonPct: number;
  secondServesAttempted: number;
  secondServeInPct: number;
  secondServeWonPct: number;
  aces: number;
  doubleFaults: number;
  ratio: string;
  winnerStrokes: {
    forehand: number;
    backhand: number;
    volley: number;
    driveVolley: number;
    smash: number;
    dropShot: number;
    serve: number;
  };
  errorDetails: {
    net: number;
    long: number;
    wide: number;
    frame: number;
    forehand: number;
    backhand: number;
    smash: number;
    volley: number;
    driveVolley: number;
    dropShot: number;
    lob: number;
    return: number;
    doubleFault: number;
  };
}

export interface ComparisonMetricRow {
  label: string;
  iconEmoji?: string;
  val1: string | number;
  val2: string | number;
  raw1?: number;
  raw2?: number;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width <= maxWidth) {
            chunk += ch;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#020617');
  bg.addColorStop(0.5, '#0b1526');
  bg.addColorStop(1, '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, width - 48, height - 48);
}

function drawFooter(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'TennisPro Personal Edition • Match Analytics Chart',
    width / 2,
    height - 24
  );
  ctx.textAlign = 'left';
}

function drawCanvasPlayerAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  team: 'team1' | 'team2',
  variant: number = 0
) {
  const isT1 = team === 'team1';
  const primary = isT1 ? '#10b981' : '#0ea5e9';
  const secondary = isT1 ? '#047857' : '#0369a1';
  const ringBg = isT1 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(14, 165, 233, 0.14)';

  // Outer badge circle
  ctx.save();
  ctx.fillStyle = ringBg;
  ctx.strokeStyle = primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Jersey torso
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.moveTo(cx - 17, cy + 28);
  ctx.quadraticCurveTo(cx - 17, cy + 6, cx, cy + 6);
  ctx.quadraticCurveTo(cx + 17, cy + 6, cx + 17, cy + 28);
  ctx.closePath();
  ctx.fill();

  // Collar / stripe
  ctx.fillStyle = secondary;
  ctx.fillRect(cx - 5, cy + 8, 10, 12);

  // Head
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(cx, cy - 8, 11, 0, Math.PI * 2);
  ctx.fill();

  // Cap / Headband variant
  ctx.fillStyle = variant % 2 === 0 ? primary : '#f59e0b';
  ctx.beginPath();
  ctx.arc(cx, cy - 11, 11.2, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(cx - 2, cy - 13, 14, 3.5);

  // Mini tennis racket on side
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy + 16);
  ctx.lineTo(cx + 22, cy + 2);
  ctx.stroke();

  ctx.strokeStyle = '#a3e635';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx + 24, cy - 3, 5, 7, 0.4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function triggerCanvasDownload(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}

export async function exportOverallAnalyticsImage(options: {
  match: MatchState;
  stats: { team1: TeamStats; team2: TeamStats };
  metrics: ComparisonMetricRow[];
  insights: string[];
  activeTab: 'comparison' | 'ai_insights';
}): Promise<void> {
  const { match, stats, metrics, insights, activeTab } = options;
  const width = 1200;
  const isInsights = activeTab === 'ai_insights';
  const height = isInsights
    ? Math.max(760, 320 + insights.length * 76)
    : Math.max(1420, 200 + metrics.length * 58 + 345 + 75);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawBackground(ctx, width, height);

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

  // Header
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('🎾 TENNISPRO • MATCH ANALYTICS', 56, 72);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    `${new Date(match.createdAt).toLocaleDateString('th-TH')} • ${
      match.settings.type === 'doubles' ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'
    } • คอร์ต ${match.settings.courtSurface.toUpperCase()}`,
    56,
    98
  );

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(setScoreDisplay || '0-0', width - 56, 84);
  ctx.textAlign = 'left';

  // Head-to-Head VS Banner
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(56, 120, width - 112, 64, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(match.team1.name, 84, 160);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VS', width / 2, 158);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(match.team2.name, width - 84, 160);
  ctx.textAlign = 'left';

  if (isInsights) {
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('✨ สรุปวิเคราะห์ฟอร์มและแท็กติกการเล่น (Tactical Insights)', 56, 224);

    let y = 248;
    for (const item of insights) {
      const lines = wrapCanvasText(ctx, item, width - 172);
      const boxH = Math.max(54, lines.length * 24 + 26);

      ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.85)';
      ctx.beginPath();
      ctx.roundRect(56, y, width - 112, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f1f5f9';
      ctx.font = '16px sans-serif';
      lines.forEach((ln, idx) => {
        ctx.fillText(ln, 82, y + 32 + idx * 24);
      });

      y += boxH + 14;
    }

    drawFooter(ctx, width, height);
    await triggerCanvasDownload(
      canvas,
      `tennispro_insights_${match.team1.name}_vs_${match.team2.name}_${Date.now()}.png`
    );
    return;
  }

  // Comparison Bar Charts with fitting icons
  let y = 200;
  const barCardWidth = width - 112;
  const rowH = 52;

  metrics.forEach((m) => {
    const num1 = typeof m.raw1 === 'number' ? m.raw1 : typeof m.val1 === 'number' ? m.val1 : 0;
    const num2 = typeof m.raw2 === 'number' ? m.raw2 : typeof m.val2 === 'number' ? m.val2 : 0;
    const total = num1 + num2 || 1;
    const p1Ratio = num1 / total;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.65)';
    ctx.beginPath();
    ctx.roundRect(56, y, barCardWidth, rowH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(m.val1), 78, y + 23);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const displayLabel = m.iconEmoji ? `${m.iconEmoji}  ${m.label}` : m.label;
    ctx.fillText(displayLabel, width / 2, y + 23);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(m.val2), width - 78, y + 23);
    ctx.textAlign = 'left';

    const barX = 78;
    const barY = y + 34;
    const barW = barCardWidth - 44;
    const barH = 8;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const w1 = Math.max(0, Math.round(barW * p1Ratio));
    if (w1 > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(barX, barY, w1, barH, [4, w1 >= barW ? 4 : 0, w1 >= barW ? 4 : 0, 4]);
      ctx.fill();
    }
    const w2 = barW - w1;
    if (w2 > 0) {
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.roundRect(barX + w1, barY, w2, barH, [w1 === 0 ? 4 : 0, 4, 4, w1 === 0 ? 4 : 0]);
      ctx.fill();
    }

    y += rowH + 6;
  });

  // Bottom 2 Breakdown Panels — True 2-Sided Layout (Team 1 Left | Label Center | Team 2 Right)
  const panelY = y + 10;
  const panelW = (barCardWidth - 20) / 2;
  const panelH = 345;
  const t1 = stats.team1;
  const t2 = stats.team2;

  // Left Card: Winners
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
  ctx.beginPath();
  ctx.roundRect(56, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('🔥 ประเภทลูกวินเนอร์ (Winners)', 78, panelY + 30);

  // 2-sided column header
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(match.team1.name.slice(0, 14), 78, panelY + 54);
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText('ช็อต / ประเภท', 56 + panelW / 2, panelY + 54);
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText(match.team2.name.slice(0, 14), 56 + panelW - 22, panelY + 54);
  ctx.textAlign = 'left';

  const winRows: Array<[string, number, number]> = [
    ['💪 Forehand', t1.winnersBreakdown.forehand, t2.winnersBreakdown.forehand],
    ['🎯 Backhand', t1.winnersBreakdown.backhand, t2.winnersBreakdown.backhand],
    ['⚡ Volley / หน้าเน็ต', t1.winnersBreakdown.volley, t2.winnersBreakdown.volley],
    ['🚀 Drive Volley', t1.winnersBreakdown.driveVolley, t2.winnersBreakdown.driveVolley],
    ['💥 Smash / ตบ', t1.winnersBreakdown.smash, t2.winnersBreakdown.smash],
    ['🪶 Drop Shot', t1.winnersBreakdown.dropShot, t2.winnersBreakdown.dropShot],
  ];

  winRows.forEach(([label, v1, v2], idx) => {
    const ry = panelY + 84 + idx * 34;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.beginPath();
    ctx.roundRect(72, ry - 18, panelW - 32, 26, 7);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(String(v1), 88, ry);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 56 + panelW / 2, ry);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(v2), 56 + panelW - 32, ry);
    ctx.textAlign = 'left';
  });

  // Right Card: Unforced Errors
  const rightX = 56 + panelW + 20;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
  ctx.beginPath();
  ctx.roundRect(rightX, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fb7185';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('⚠️ การตีเสียเอง (Unforced Errors)', rightX + 22, panelY + 30);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(match.team1.name.slice(0, 14), rightX + 22, panelY + 54);
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  ctx.fillText('ลักษณะ / ช็อตเสีย', rightX + panelW / 2, panelY + 54);
  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'right';
  ctx.fillText(match.team2.name.slice(0, 14), rightX + panelW - 22, panelY + 54);
  ctx.textAlign = 'left';

  const errRows: Array<[string, number, number]> = [
    ['🕸️ ติดเน็ต (Net)', t1.unforcedErrorsBreakdown.net, t2.unforcedErrorsBreakdown.net],
    ['↔️ ออกข้าง (Wide)', t1.unforcedErrorsBreakdown.wide, t2.unforcedErrorsBreakdown.wide],
    ['📏 ออกหลัง (Long)', t1.unforcedErrorsBreakdown.long, t2.unforcedErrorsBreakdown.long],
    ['🪵 ขอบไม้ (Frame)', t1.unforcedErrorsBreakdown.frame, t2.unforcedErrorsBreakdown.frame],
    ['❌ ดับเบิ้ลฟอลต์ (DF)', t1.doubleFaults, t2.doubleFaults],
    ['💪 FH เสีย / 🎯 BH เสีย', t1.unforcedErrorsByStroke.forehand + t1.unforcedErrorsByStroke.backhand, t2.unforcedErrorsByStroke.forehand + t2.unforcedErrorsByStroke.backhand],
    ['🚀 ไดรฟ์วอลเลย์เสีย / ⚡ วอลเลย์เสีย', t1.unforcedErrorsByStroke.driveVolley + t1.unforcedErrorsByStroke.volley, t2.unforcedErrorsByStroke.driveVolley + t2.unforcedErrorsByStroke.volley],
    ['🪶 หยอดเสีย / 🎈 ลูกโด่งเสีย', t1.unforcedErrorsByStroke.dropShot + t1.unforcedErrorsByStroke.lob, t2.unforcedErrorsByStroke.dropShot + t2.unforcedErrorsByStroke.lob],
  ];

  errRows.forEach(([label, v1, v2], idx) => {
    const ry = panelY + 80 + idx * 32;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.beginPath();
    ctx.roundRect(rightX + 16, ry - 17, panelW - 32, 24, 7);
    ctx.fill();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(String(v1), rightX + 32, ry);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, rightX + panelW / 2, ry);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(v2), rightX + panelW - 32, ry);
    ctx.textAlign = 'left';
  });

  drawFooter(ctx, width, height);
  await triggerCanvasDownload(
    canvas,
    `tennispro_analytics_${match.team1.name}_vs_${match.team2.name}_${Date.now()}.png`
  );
}

export async function exportFourPlayersComparisonImage(options: {
  match: MatchState;
  players: PlayerChartExportData[];
}): Promise<void> {
  const { match, players } = options;
  const count = Math.max(2, players.length);
  const width = count >= 3 ? 1360 : 1120;
  const height = 925;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawBackground(ctx, width, height);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`🎾 TENNISPRO • PLAYER COMPARISON (${count} PLAYERS)`, 56, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    `${match.team1.name} vs ${match.team2.name} • ${new Date(match.createdAt).toLocaleDateString('th-TH')}`,
    56,
    96
  );

  const colGap = 18;
  const totalW = width - 112;
  const colW = (totalW - colGap * (count - 1)) / count;
  const cardY = 122;
  const cardH = 742;

  players.forEach((p, idx) => {
    const cx = 56 + idx * (colW + colGap);
    const isT1 = p.team === 'team1';
    const accent = isT1 ? '#34d399' : '#38bdf8';
    const borderCol = isT1 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(14, 165, 233, 0.45)';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cardY, colW, cardH, 16);
    ctx.fill();
    ctx.stroke();

    // Draw tennis character avatar at top center of column
    drawCanvasPlayerAvatar(ctx, cx + colW / 2, cardY + 58, p.team, p.playerIndex ?? idx);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, cx + colW / 2, cardY + 114);

    ctx.fillStyle = accent;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(p.teamName, cx + colW / 2, cardY + 135);
    ctx.textAlign = 'left';

    const rows: Array<[string, string | number, string]> = [
      ['🔥 วินเนอร์รวม', p.totalWinners, '#34d399'],
      ['⚠️ ตีเสียเอง (UE)', p.totalErrors, '#fb7185'],
      ['🎯 Ratio W/UE', `${p.ratio}x`, '#c084fc'],
      ['⚡ เสิร์ฟแรกเข้า', `${p.firstServeInPct}%`, '#fbbf24'],
      ['🎾 ได้แต้มเสิร์ฟ 1', `${p.firstServeWonPct}%`, '#fbbf24'],
      ['🛡️ เสิร์ฟสองเข้า', `${p.secondServeInPct}%`, '#fde68a'],
      ['📈 ได้แต้มเสิร์ฟ 2', `${p.secondServeWonPct}%`, '#fde68a'],
      ['🏅 เอซ / DF', `${p.aces} / ${p.doubleFaults}`, '#e2e8f0'],
      ['💪 FH วินเนอร์', p.winnerStrokes.forehand, '#6ee7b7'],
      ['🎯 BH วินเนอร์', p.winnerStrokes.backhand, '#6ee7b7'],
      ['⚡ Volley วินเนอร์', p.winnerStrokes.volley, '#6ee7b7'],
      ['🚀 ไดรฟ์วอลเลย์ W', p.winnerStrokes.driveVolley, '#6ee7b7'],
      ['💥 Smash วินเนอร์', p.winnerStrokes.smash, '#6ee7b7'],
      ['🪵 ขอบไม้ (Frame)', p.errorDetails.frame, '#fda4af'],
      ['🕸️ ติดเน็ต / ออก', `${p.errorDetails.net} / ${p.errorDetails.wide + p.errorDetails.long}`, '#fda4af'],
      ['🚀 ไดรฟ์วอลเลย์เสีย', p.errorDetails.driveVolley, '#fda4af'],
      ['🪶 หยอด / 🎈 โด่งเสีย', `${p.errorDetails.dropShot} / ${p.errorDetails.lob}`, '#fda4af'],
    ];

    rows.forEach(([label, val, col], ri) => {
      const ry = cardY + 168 + ri * 32;
      ctx.fillStyle = ri % 2 === 0 ? 'rgba(30, 41, 59, 0.5)' : 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.roundRect(cx + 14, ry - 18, colW - 28, 26, 6);
      ctx.fill();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px sans-serif';
      ctx.fillText(label, cx + 24, ry);

      ctx.fillStyle = col;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), cx + colW - 24, ry);
      ctx.textAlign = 'left';
    });
  });

  drawFooter(ctx, width, height);
  await triggerCanvasDownload(
    canvas,
    `tennispro_players_comparison_${Date.now()}.png`
  );
}

export async function exportPlayerAnalyticsImage(options: {
  match: MatchState;
  player: PlayerChartExportData;
}): Promise<void> {
  const { match, player } = options;
  const width = 1200;
  const height = 940;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawBackground(ctx, width, height);

  const isT1 = player.team === 'team1';
  const accent = isT1 ? '#34d399' : '#38bdf8';

  // Draw character avatar next to header
  drawCanvasPlayerAvatar(ctx, 90, 74, player.team, player.playerIndex ?? 0);

  // Header
  ctx.fillStyle = accent;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`TENNISPRO • PLAYER ANALYTICS (${player.name})`, 144, 70);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    `${player.teamName} • ${new Date(match.createdAt).toLocaleDateString('th-TH')} • Winner/UE Ratio: ${player.ratio}x`,
    144,
    98
  );

  // 4 Summary Cards
  const cardGap = 16;
  const cardW = (width - 112 - cardGap * 3) / 4;
  const cardY = 128;
  const cardH = 168;

  const cards = [
    {
      title: '🔥 วินเนอร์ที่ทำได้',
      big: String(player.totalWinners),
      color: '#34d399',
      lines: [
        `Forehand: ${player.winnerStrokes.forehand}  |  Backhand: ${player.winnerStrokes.backhand}`,
        `Volley: ${player.winnerStrokes.volley}  |  Smash: ${player.winnerStrokes.smash}`,
        `Drive Volley: ${player.winnerStrokes.driveVolley}  |  Drop: ${player.winnerStrokes.dropShot}`,
      ],
    },
    {
      title: '⚠️ ตีเสียเอง (UE)',
      big: String(player.totalErrors),
      color: '#fb7185',
      lines: [
        `ติดเน็ต: ${player.errorDetails.net}  |  ออกข้าง: ${player.errorDetails.wide}`,
        `ออกยาว: ${player.errorDetails.long}  |  ขอบไม้: ${player.errorDetails.frame}`,
        `FH/BH เสีย: ${player.errorDetails.forehand + player.errorDetails.backhand} | DV เสีย: ${player.errorDetails.driveVolley}`,
      ],
    },
    {
      title: '⚡ สถิติเกมเสิร์ฟ',
      big: `${player.firstServeInPct}%`,
      color: '#fbbf24',
      lines: [
        `แต้มเสิร์ฟแรก: ${player.firstServeWonPct}%  |  เสิร์ฟ 2 เข้า: ${player.secondServeInPct}%`,
        `ได้แต้มเสิร์ฟ 2: ${player.secondServeWonPct}% (${player.secondServesAttempted} ลูก)`,
        `เอซ: ${player.aces}  |  ดับเบิ้ลฟอลต์: ${player.doubleFaults}`,
      ],
    },
    {
      title: '🎯 อัตราบุกสำเร็จ',
      big: `${player.ratio}x`,
      color: '#818cf8',
      lines: [
        `แต้มบุกรวม: ${player.totalWinners + player.aces}`,
        `ความสม่ำเสมอ: ${player.totalErrors <= 3 ? 'สูงมาก' : player.totalErrors <= 8 ? 'ปานกลาง' : 'ควรลดลูกเสีย'}`,
        `สไตล์: ${player.totalWinners > player.totalErrors ? 'เกมบุกดุดัน' : 'เน้นเหนียวแน่น'}`,
      ],
    },
  ];

  cards.forEach((c, idx) => {
    const cx = 56 + idx * (cardW + cardGap);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = c.color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(c.title, cx + 16, cardY + 28);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(c.big, cx + cardW - 16, cardY + 34);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12.5px sans-serif';
    c.lines.forEach((ln, li) => {
      ctx.fillText(ln, cx + 16, cardY + 72 + li * 28);
    });
  });

  // Shot Distribution Chart Box
  const chartY = 316;
  const chartH = 424;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
  ctx.beginPath();
  ctx.roundRect(56, chartY, width - 112, chartH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(
    `📊 กราฟการกระจายช็อตของ ${player.name} (Winners vs Unforced Errors)`,
    82,
    chartY + 36
  );

  const strokeRows = [
    {
      label: '💪 โฟร์แฮนด์ (Forehand)',
      win: player.winnerStrokes.forehand,
      err: player.errorDetails.forehand,
    },
    {
      label: '🎯 แบ็คแฮนด์ (Backhand)',
      win: player.winnerStrokes.backhand,
      err: player.errorDetails.backhand,
    },
    {
      label: '💥 สแมช / ลูกตบ (Overhead Smash)',
      win: player.winnerStrokes.smash,
      err: player.errorDetails.smash,
    },
    {
      label: '⚡ วอลเลย์หน้าเน็ต (Volley)',
      win: player.winnerStrokes.volley,
      err: player.errorDetails.volley,
    },
    {
      label: '🚀 ไดรฟ์วอลเลย์ (Drive Volley)',
      win: player.winnerStrokes.driveVolley,
      err: player.errorDetails.driveVolley,
    },
    {
      label: '🪶 หยอด / 🎈 ลูกโด่ง (Drop / Lob)',
      win: player.winnerStrokes.dropShot,
      err: player.errorDetails.dropShot + player.errorDetails.lob,
    },
  ];

  strokeRows.forEach((row, idx) => {
    const ry = chartY + 68 + idx * 56;
    const total = row.win + row.err;
    const winRatio = total > 0 ? row.win / total : 0.5;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(row.label, 82, ry + 14);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`${row.win} วินเนอร์`, width - 210, ry + 14);
    ctx.fillStyle = '#64748b';
    ctx.fillText('vs', width - 178, ry + 14);
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`${row.err} เออเร่อร์`, width - 82, ry + 14);
    ctx.textAlign = 'left';

    const bx = 82;
    const by = ry + 24;
    const bw = width - 164;
    const bh = 12;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();

    const wWin = Math.round(bw * winRatio);
    if (wWin > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(bx, by, wWin, bh, [6, wWin >= bw ? 6 : 0, wWin >= bw ? 6 : 0, 6]);
      ctx.fill();
    }
    const wErr = bw - wWin;
    if (wErr > 0) {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(bx + wWin, by, wErr, bh, [wWin === 0 ? 6 : 0, 6, 6, wWin === 0 ? 6 : 0]);
      ctx.fill();
    }
  });

  // Coaching Summary Box
  ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.beginPath();
  ctx.roundRect(56, 760, width - 112, 118, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`✨ สรุปฟอร์มเฉพาะตัวของ ${player.name}`, 82, 792);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    `• ทำคะแนนบุกรวม ${player.totalWinners + player.aces} แต้ม (วินเนอร์ ${player.totalWinners}, เอซ ${player.aces}) | ตีเสียเอง ${player.totalErrors} ครั้ง (ขอบไม้ ${player.errorDetails.frame})`,
    82,
    824
  );
  ctx.fillText(
    `• เสิร์ฟแรกเข้า ${player.firstServeInPct}% (ได้แต้ม ${player.firstServeWonPct}%) | เสิร์ฟสองเข้า ${player.secondServeInPct}% (ได้แต้ม ${player.secondServeWonPct}%) | Ratio: ${player.ratio}x`,
    82,
    854
  );

  drawFooter(ctx, width, height);
  await triggerCanvasDownload(
    canvas,
    `tennispro_player_${player.name}_${Date.now()}.png`
  );
}

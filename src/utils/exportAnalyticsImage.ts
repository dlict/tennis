import { MatchState, TeamStats } from '../types/tennis';

export interface PlayerChartExportData {
  name: string;
  team: 'team1' | 'team2';
  teamName: string;
  totalWinners: number;
  totalErrors: number;
  totalServes: number;
  firstServeInPct: number;
  firstServeWonPct: number;
  aces: number;
  doubleFaults: number;
  ratio: string;
  winnerStrokes: {
    forehand: number;
    backhand: number;
    volley: number;
    smash: number;
    dropShot: number;
    serve: number;
  };
  errorDetails: {
    net: number;
    long: number;
    wide: number;
    forehand: number;
    backhand: number;
    smash: number;
    volley: number;
    return: number;
    doubleFault: number;
  };
}

export interface ComparisonMetricRow {
  label: string;
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
      // Fallback character split for long Thai tokens without spaces
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

  // Subtle decorative court border
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
    height - 28
  );
  ctx.textAlign = 'left';
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
  const height = isInsights ? Math.max(760, 320 + insights.length * 76) : 1140;

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

  // Comparison Bar Charts
  let y = 204;
  const barCardWidth = width - 112;
  const rowH = 54;

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

    // Values & metric label
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(String(m.val1), 78, y + 24);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, width / 2, y + 24);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(m.val2), width - 78, y + 24);
    ctx.textAlign = 'left';

    // Split Progress Bar
    const barX = 78;
    const barY = y + 35;
    const barW = barCardWidth - 44;
    const barH = 9;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 5);
    ctx.fill();

    const w1 = Math.max(0, Math.round(barW * p1Ratio));
    if (w1 > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(barX, barY, w1, barH, [5, w1 >= barW ? 5 : 0, w1 >= barW ? 5 : 0, 5]);
      ctx.fill();
    }
    const w2 = barW - w1;
    if (w2 > 0) {
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.roundRect(barX + w1, barY, w2, barH, [w1 === 0 ? 5 : 0, 5, 5, w1 === 0 ? 5 : 0]);
      ctx.fill();
    }

    y += rowH + 8;
  });

  // Bottom 2 Breakdown Panels (Winners & Unforced Errors)
  const panelY = y + 10;
  const panelW = (barCardWidth - 20) / 2;
  const panelH = 195;

  // Left: Winners
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.beginPath();
  ctx.roundRect(56, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('🔥 ประเภทลูกวินเนอร์ (Winners)', 78, panelY + 32);

  const t1 = stats.team1;
  const t2 = stats.team2;
  const winRows = [
    ['Forehand', `${t1.winnersBreakdown.forehand}  |  ${t2.winnersBreakdown.forehand}`],
    ['Backhand', `${t1.winnersBreakdown.backhand}  |  ${t2.winnersBreakdown.backhand}`],
    ['Volley / หน้าเน็ต', `${t1.winnersBreakdown.volley}  |  ${t2.winnersBreakdown.volley}`],
    ['Smash / ตบ', `${t1.winnersBreakdown.smash}  |  ${t2.winnersBreakdown.smash}`],
    ['Drop Shot', `${t1.winnersBreakdown.dropShot}  |  ${t2.winnersBreakdown.dropShot}`],
  ];
  winRows.forEach(([label, val], idx) => {
    const ry = panelY + 64 + idx * 25;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, 78, ry);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, 56 + panelW - 24, ry);
    ctx.textAlign = 'left';
  });

  // Right: Unforced Errors
  const rightX = 56 + panelW + 20;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.roundRect(rightX, panelY, panelW, panelH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fb7185';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('⚠️ การตีเสียเอง (Unforced Errors)', rightX + 22, panelY + 32);

  const errRows = [
    ['ติดเน็ต (Net)', `${t1.unforcedErrorsBreakdown.net}  |  ${t2.unforcedErrorsBreakdown.net}`],
    ['ออกข้าง (Wide)', `${t1.unforcedErrorsBreakdown.wide}  |  ${t2.unforcedErrorsBreakdown.wide}`],
    ['ออกหลัง (Long)', `${t1.unforcedErrorsBreakdown.long}  |  ${t2.unforcedErrorsBreakdown.long}`],
    ['ดับเบิ้ลฟอลต์ (DF)', `${t1.doubleFaults}  |  ${t2.doubleFaults}`],
    [
      'FH / BH / Smash เสีย',
      `${t1.unforcedErrorsByStroke.forehand}/${t1.unforcedErrorsByStroke.backhand}/${t1.unforcedErrorsByStroke.smash}  |  ${t2.unforcedErrorsByStroke.forehand}/${t2.unforcedErrorsByStroke.backhand}/${t2.unforcedErrorsByStroke.smash}`,
    ],
  ];
  errRows.forEach(([label, val], idx) => {
    const ry = panelY + 64 + idx * 25;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, rightX + 22, ry);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(val, rightX + panelW - 24, ry);
    ctx.textAlign = 'left';
  });

  drawFooter(ctx, width, height);
  await triggerCanvasDownload(
    canvas,
    `tennispro_analytics_${match.team1.name}_vs_${match.team2.name}_${Date.now()}.png`
  );
}

export async function exportPlayerAnalyticsImage(options: {
  match: MatchState;
  player: PlayerChartExportData;
}): Promise<void> {
  const { match, player } = options;
  const width = 1200;
  const height = 880;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawBackground(ctx, width, height);

  const isT1 = player.team === 'team1';
  const accent = isT1 ? '#34d399' : '#38bdf8';

  // Header
  ctx.fillStyle = accent;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`🎾 TENNISPRO • PLAYER ANALYTICS (${player.name})`, 56, 70);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    `${player.teamName} • ${new Date(match.createdAt).toLocaleDateString('th-TH')} • Winner/UE Ratio: ${player.ratio}x`,
    56,
    98
  );

  // 4 Summary Cards
  const cardGap = 16;
  const cardW = (width - 112 - cardGap * 3) / 4;
  const cardY = 124;
  const cardH = 148;

  const cards = [
    {
      title: '🔥 วินเนอร์ที่ทำได้',
      big: String(player.totalWinners),
      color: '#34d399',
      lines: [
        `Forehand: ${player.winnerStrokes.forehand}`,
        `Backhand: ${player.winnerStrokes.backhand}`,
        `Volley: ${player.winnerStrokes.volley}  |  Smash: ${player.winnerStrokes.smash}`,
      ],
    },
    {
      title: '⚠️ ตีเสียเอง (UE)',
      big: String(player.totalErrors),
      color: '#fb7185',
      lines: [
        `ติดเน็ต: ${player.errorDetails.net}  |  ออกข้าง: ${player.errorDetails.wide}`,
        `ออกยาว: ${player.errorDetails.long}`,
        `FH/BH เสีย: ${player.errorDetails.forehand + player.errorDetails.backhand}`,
      ],
    },
    {
      title: '⚡ สถิติเกมเสิร์ฟ',
      big: `${player.firstServeInPct}%`,
      color: '#fbbf24',
      lines: [
        `แต้มเสิร์ฟแรก: ${player.firstServeWonPct}%`,
        `เสิร์ฟเอซ (Aces): ${player.aces}`,
        `ดับเบิ้ลฟอลต์: ${player.doubleFaults}`,
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
    ctx.font = '13px sans-serif';
    c.lines.forEach((ln, li) => {
      ctx.fillText(ln, cx + 16, cardY + 68 + li * 26);
    });
  });

  // Shot Distribution Chart Box
  const chartY = 296;
  const chartH = 380;
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
    chartY + 38
  );

  const strokeRows = [
    {
      label: 'โฟร์แฮนด์ (Forehand)',
      win: player.winnerStrokes.forehand,
      err: player.errorDetails.forehand,
    },
    {
      label: 'แบ็คแฮนด์ (Backhand)',
      win: player.winnerStrokes.backhand,
      err: player.errorDetails.backhand,
    },
    {
      label: 'สแมช / ลูกตบ (Overhead Smash)',
      win: player.winnerStrokes.smash,
      err: player.errorDetails.smash,
    },
    {
      label: 'วอลเลย์หน้าเน็ต (Volley)',
      win: player.winnerStrokes.volley,
      err: player.errorDetails.volley,
    },
    {
      label: 'ดรอปช็อต / เสิร์ฟเอซ (Drop Shot / Ace)',
      win: player.winnerStrokes.dropShot + player.aces,
      err: player.doubleFaults,
    },
  ];

  strokeRows.forEach((row, idx) => {
    const ry = chartY + 74 + idx * 58;
    const total = row.win + row.err;
    const winRatio = total > 0 ? row.win / total : 0.5;

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 15px sans-serif';
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
    const bh = 14;

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 7);
    ctx.fill();

    const wWin = Math.round(bw * winRatio);
    if (wWin > 0) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect(bx, by, wWin, bh, [7, wWin >= bw ? 7 : 0, wWin >= bw ? 7 : 0, 7]);
      ctx.fill();
    }
    const wErr = bw - wWin;
    if (wErr > 0) {
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(bx + wWin, by, wErr, bh, [wWin === 0 ? 7 : 0, 7, 7, wWin === 0 ? 7 : 0]);
      ctx.fill();
    }
  });

  // Coaching Summary Box
  ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.beginPath();
  ctx.roundRect(56, 700, width - 112, 118, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`✨ สรุปฟอร์มเฉพาะตัวของ ${player.name}`, 82, 732);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '15px sans-serif';
  ctx.fillText(
    `• ทำคะแนนบุกรวม ${player.totalWinners + player.aces} แต้ม (วินเนอร์ ${player.totalWinners}, เอซ ${player.aces}) | ตีเสียเอง ${player.totalErrors} ครั้ง`,
    82,
    764
  );
  ctx.fillText(
    `• ความแม่นยำเสิร์ฟแรก ${player.firstServeInPct}% (ได้แต้มจากเสิร์ฟแรก ${player.firstServeWonPct}%) | อัตราส่วน Winner/UE: ${player.ratio}x`,
    82,
    794
  );

  drawFooter(ctx, width, height);
  await triggerCanvasDownload(
    canvas,
    `tennispro_player_${player.name}_${Date.now()}.png`
  );
}

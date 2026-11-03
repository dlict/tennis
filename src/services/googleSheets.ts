import { MatchState, PointRecord } from '../types/tennis';
import { calculateMatchStats } from '../utils/tennisEngine';
import { getAccessToken } from './firebaseAuth';

export interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  ace: 'เอซ (Ace)',
  winner: 'วินเนอร์ (Winner)',
  unforced_error: 'ตีเสียเอง (Unforced Error)',
  double_fault: 'เสิร์ฟเสีย 2 ลูก (Double Fault)',
  regular_point: 'แต้มทั่วไป',
};

const STROKE_TRANSLATIONS: Record<string, string> = {
  forehand: 'โฟร์แฮนด์',
  backhand: 'แบ็คแฮนด์',
  volley: 'วอลเลย์หน้าเน็ต',
  smash: 'สแมช',
  drop_shot: 'ดรอปช็อต',
  return_winner: 'รีเทิร์น',
  serve: 'ลูกเสิร์ฟ',
};

const ERROR_DETAIL_TRANSLATIONS: Record<string, string> = {
  net: 'ติดเน็ต',
  wide: 'ออกข้าง',
  long: 'ออกหลัง',
  unforced_return: 'รับเสิร์ฟเสีย',
  foot_fault: 'ฟุตฟอลต์',
};

export function formatPointRow(point: PointRecord, match: MatchState): any[] {
  const winnerName = match[point.winnerTeam]?.name || point.winnerTeam;
  const serverName = match[point.servingTeam]?.name || point.servingTeam;

  let contextTag = '';
  if (point.isMatchPoint) contextTag = '🏆 Match Point';
  else if (point.isSetPoint) contextTag = '🎯 Set Point';
  else if (point.isBreakPoint) contextTag = '⚡ Break Point';
  else if (point.isGamePoint) contextTag = 'Game Point';

  let shotDescription = '-';
  if (point.category === 'winner') {
    shotDescription = `${winnerName} ตี${STROKE_TRANSLATIONS[point.stroke || ''] || point.stroke || ''}วินเนอร์`;
  } else if (point.category === 'unforced_error') {
    const errorPlayer = point.errorPlayerName || (point.errorTeam ? match[point.errorTeam]?.name : 'ผู้เล่น');
    const strokeName = STROKE_TRANSLATIONS[point.errorStroke || ''] || point.errorStroke || '';
    const errDetailName = ERROR_DETAIL_TRANSLATIONS[point.errorDetail || ''] || point.errorDetail || '';
    shotDescription = `${errorPlayer} ตี${strokeName}${errDetailName ? ' ' + errDetailName : ''}`;
  } else if (point.category === 'double_fault') {
    shotDescription = `${serverName} เสิร์ฟเสีย 2 ลูก (ดับเบิ้ลฟอลต์)`;
  } else if (point.category === 'ace') {
    shotDescription = `${winnerName} เสิร์ฟเอซ (Ace)`;
  }

  return [
    point.pointNumberInMatch,
    new Date(point.timestamp).toLocaleTimeString('th-TH'),
    `Set ${point.setIndex + 1}`,
    `Game ${point.gameIndexInSet + 1}`,
    serverName,
    point.serveCourt === 'deuce' ? 'คอร์ตขวา (Deuce)' : 'คอร์ตซ้าย (Ad)',
    point.isSecondServe ? 'เสิร์ฟสอง' : 'เสิร์ฟแรก',
    winnerName,
    CATEGORY_TRANSLATIONS[point.category] || point.category,
    shotDescription,
    point.errorDetail || '-',
    contextTag,
    `${point.scoreBefore.game.team1} - ${point.scoreBefore.game.team2}`,
    `${point.scoreAfter.game.team1} - ${point.scoreAfter.game.team2}`,
  ];
}

/**
 * Creates a brand new Tennis Match Google Spreadsheet
 */
export async function createTennisMatchSheet(match: MatchState): Promise<SheetCreationResult> {
  const token = await getAccessToken();
  if (!token) throw new Error('ไม่พบ Token การเข้าถึง กรุณาลงชื่อเข้าใช้ Google ก่อน');

  const title = `TennisPro - ${match.team1.name} vs ${match.team2.name} (${new Date().toLocaleDateString('th-TH')})`;

  const payload = {
    properties: {
      title,
      locale: 'th_TH',
      timeZone: 'Asia/Bangkok',
    },
    sheets: [
      {
        properties: {
          title: 'สรุปภาพรวมการแข่งขัน',
          gridProperties: { rowCount: 40, columnCount: 12 },
        },
      },
      {
        properties: {
          title: 'บันทึกแต้มเรียลไทม์',
          gridProperties: { rowCount: 1000, columnCount: 16 },
        },
      },
      {
        properties: {
          title: 'สถิติฟอร์มผู้เล่น',
          gridProperties: { rowCount: 60, columnCount: 10 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`ไม่สามารถสร้าง Google Sheet ได้: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl;

  // Initialize headers & overview
  await initializeSheetHeaders(spreadsheetId, token, match);

  // If match already has played points, sync all points immediately
  if (match.pointsHistory && match.pointsHistory.length > 0) {
    await syncAllPointsToSheet(spreadsheetId, match);
  } else {
    await updateMatchSummarySheet(spreadsheetId, match);
  }

  return { spreadsheetId, spreadsheetUrl };
}

async function initializeSheetHeaders(spreadsheetId: string, token: string, match: MatchState) {
  // 1. Point log headers
  const pointLogHeaders = [
    [
      'แต้มที่',
      'เวลา (Timestamp)',
      'เซต (Set)',
      'เกมที่ (Game)',
      'ผู้เสิร์ฟ (Server)',
      'คอร์ตเสิร์ฟ (Court)',
      'เสิร์ฟ 2 (2nd Serve)',
      'ผู้ได้แต้ม (Winner)',
      'ประเภทช็อต (Category)',
      'รายละเอียดการตี (Stroke)',
      'ข้อผิดพลาด (Error Detail)',
      'แต้มพิเศษ (Context)',
      'คะแนนก่อนหน้า',
      'คะแนนปัจจุบัน',
    ],
  ];

  // 2. Initial Match Overview
  const isDoubles = match.settings.type === 'doubles';
  const t1Players = match.team1.players?.map((p) => p.name).join(' & ') || match.team1.name;
  const t2Players = match.team2.players?.map((p) => p.name).join(' & ') || match.team2.name;

  const overviewData = [
    ['🎾 TENNIS MATCH REPORT & LIVE SCOREBOARD'],
    ['วันที่บันทึก:', new Date(match.createdAt).toLocaleString('th-TH')],
    ['ประเภทการแข่ง:', isDoubles ? 'ประเภทคู่ (Doubles)' : 'ประเภทเดี่ยว (Singles)'],
    ['รูปแบบแมตช์:', match.settings.format],
    ['สนาม:', match.settings.courtSurface],
    [],
    ['ทีม / ผู้เล่น 1:', match.team1.name],
    ['รายชื่อผู้เล่นทีม 1:', t1Players],
    ['ทีม / ผู้เล่น 2:', match.team2.name],
    ['รายชื่อผู้เล่นทีม 2:', t2Players],
    [],
    ['สถานะการแข่ง:', match.isFinished ? 'จบการแข่งขันแล้ว' : 'กำลังแข่งขัน (LIVE)'],
    ['ผลการแข่งขัน:', match.matchWinner ? `ผู้ชนะ: ${match[match.matchWinner].name}` : '-'],
  ];

  // 3. Player Stats Headers
  const statsHeaders = [
    ['หมวดหมู่สถิติ (Statistic)', match.team1.name, match.team2.name],
    ['แต้มรวมที่ได้ (Total Points Won)', '0', '0'],
    ['เสิร์ฟแรกเข้า % (1st Serve %)', '0%', '0%'],
    ['แต้มที่ได้จากเสิร์ฟแรก (1st Serve Won)', '0', '0'],
    ['แต้มที่ได้จากเสิร์ฟสอง (2nd Serve Won)', '0', '0'],
    ['เอซ (Aces)', '0', '0'],
    ['ดับเบิ้ลฟอลต์ (Double Faults)', '0', '0'],
    ['วินเนอร์รวม (Total Winners)', '0', '0'],
    ['อันฟอร์ซเออเร่อร์ (Unforced Errors)', '0', '0'],
    ['เบรกพอยต์สำเร็จ (Break Points Won)', '0/0', '0/0'],
    ['การขึ้นหน้าเน็ตสำเร็จ (Net Points Won)', '0/0', '0/0'],
  ];

  // Batch update initial values
  const batchData = [
    {
      range: 'บันทึกแต้มเรียลไทม์!A1:N1',
      values: pointLogHeaders,
    },
    {
      range: 'สรุปภาพรวมการแข่งขัน!A1:B13',
      values: overviewData,
    },
    {
      range: 'สถิติฟอร์มผู้เล่น!A1:C11',
      values: statsHeaders,
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: batchData,
    }),
  });
}

/**
 * Appends a single point record to Google Sheet in real-time
 */
export async function appendPointToSheet(
  spreadsheetId: string,
  point: PointRecord,
  match: MatchState
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const row = formatPointRow(point, match);

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกแต้มเรียลไทม์!A:N:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );
}

/**
 * Completely syncs ALL point records from match.pointsHistory into Google Sheets
 */
export async function syncAllPointsToSheet(
  spreadsheetId: string,
  match: MatchState
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const rows = match.pointsHistory.map((pt) => formatPointRow(pt, match));

  // 1. Clear existing point rows (from row 2 down)
  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกแต้มเรียลไทม์!A2:N1000:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e) {
    console.warn('Could not clear old points:', e);
  }

  // 2. Write all point rows in one batch
  if (rows.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/บันทึกแต้มเรียลไทม์!A2:N${rows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );
  }

  // 3. Update summary and stats tabs
  await updateMatchSummarySheet(spreadsheetId, match);
}

/**
 * Updates full statistics tab and overview in Google Sheet
 */
export async function updateMatchSummarySheet(
  spreadsheetId: string,
  match: MatchState
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const stats = calculateMatchStats(match.pointsHistory, match.sets);

  const t1FirstInPct =
    stats.team1.firstServesAttempted > 0
      ? Math.round((stats.team1.firstServesIn / stats.team1.firstServesAttempted) * 100) + '%'
      : '0%';
  const t2FirstInPct =
    stats.team2.firstServesAttempted > 0
      ? Math.round((stats.team2.firstServesIn / stats.team2.firstServesAttempted) * 100) + '%'
      : '0%';

  const statsValues = [
    ['หมวดหมู่สถิติ (Statistic)', match.team1.name, match.team2.name],
    ['แต้มรวมที่ได้ (Total Points Won)', stats.team1.totalPointsWon, stats.team2.totalPointsWon],
    ['เสิร์ฟแรกเข้า % (1st Serve %)', t1FirstInPct, t2FirstInPct],
    [
      'แต้มที่ได้จากเสิร์ฟแรก (1st Serve Won)',
      stats.team1.firstServePointsWon,
      stats.team2.firstServePointsWon,
    ],
    [
      'แต้มที่ได้จากเสิร์ฟสอง (2nd Serve Won)',
      stats.team1.secondServePointsWon,
      stats.team2.secondServePointsWon,
    ],
    ['เอซ (Aces)', stats.team1.aces, stats.team2.aces],
    ['ดับเบิ้ลฟอลต์ (Double Faults)', stats.team1.doubleFaults, stats.team2.doubleFaults],
    ['วินเนอร์รวม (Total Winners)', stats.team1.winners, stats.team2.winners],
    ['อันฟอร์ซเออเร่อร์ (Unforced Errors)', stats.team1.unforcedErrors, stats.team2.unforcedErrors],
    [
      'เบรกพอยต์สำเร็จ (Break Points Won)',
      `${stats.team1.breakPointsWon}/${stats.team1.breakPointsOpportunities}`,
      `${stats.team2.breakPointsWon}/${stats.team2.breakPointsOpportunities}`,
    ],
    [
      'การขึ้นหน้าเน็ตสำเร็จ (Net Points Won)',
      `${stats.team1.netPointsWon}/${stats.team1.netPointsApproaches}`,
      `${stats.team2.netPointsWon}/${stats.team2.netPointsApproaches}`,
    ],
  ];

  // Set scores summary string
  const scoreLine = match.sets
    .map((s, i) => {
      let str = `Set ${i + 1}: ${s.team1Games}-${s.team2Games}`;
      if (s.team1TiebreakPoints !== undefined && s.team2TiebreakPoints !== undefined) {
        str += ` (${Math.min(s.team1TiebreakPoints, s.team2TiebreakPoints)})`;
      }
      return str;
    })
    .join(' | ');

  const isDoubles = match.settings.type === 'doubles';
  const t1Players = match.team1.players?.map((p) => p.name).join(' & ') || match.team1.name;
  const t2Players = match.team2.players?.map((p) => p.name).join(' & ') || match.team2.name;

  const overviewUpdates = [
    ['ทีม / ผู้เล่น 1:', match.team1.name],
    ['รายชื่อผู้เล่นทีม 1:', t1Players],
    ['ทีม / ผู้เล่น 2:', match.team2.name],
    ['รายชื่อผู้เล่นทีม 2:', t2Players],
    ['สถานะการแข่ง:', match.isFinished ? 'จบการแข่งขันแล้ว' : 'กำลังแข่งขัน (LIVE)'],
    ['ผลการแข่งขัน:', match.matchWinner ? `🏆 ผู้ชนะ: ${match[match.matchWinner].name}` : '-'],
    ['สกอร์เซต:', scoreLine],
    ['แต้มปัจจุบัน:', `${match.currentGame.team1Display} - ${match.currentGame.team2Display}`],
    ['แต้มที่เล่นไปแล้วทั้งหมด:', match.pointsHistory.length],
    ['อัปเดตล่าสุด:', new Date().toLocaleTimeString('th-TH')],
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'สถิติฟอร์มผู้เล่น!A1:C11',
          values: statsValues,
        },
        {
          range: 'สรุปภาพรวมการแข่งขัน!A7:B16',
          values: overviewUpdates,
        },
      ],
    }),
  });
}

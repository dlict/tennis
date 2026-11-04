import {
  ErrorDetail,
  GameScore,
  MatchFormat,
  MatchSettings,
  MatchState,
  PointRecord,
  SetScore,
  ShotCategory,
  StandardPoint,
  StrokeType,
  TeamStats,
} from '../types/tennis';

export function createInitialGameScore(isTiebreak = false, pointsToWin = 7): GameScore {
  return {
    team1Points: 0,
    team2Points: 0,
    team1Display: isTiebreak ? '0' : '0',
    team2Display: isTiebreak ? '0' : '0',
    isDeuce: false,
    isTiebreak,
    tiebreakPointsToWin: pointsToWin,
  };
}

export function createInitialMatch(
  settings: MatchSettings,
  team1Name = 'ผู้เล่น 1',
  team2Name = 'ผู้เล่น 2',
  team1DoublesPartner?: string,
  team2DoublesPartner?: string
): MatchState {
  const isDoubles = settings.type === 'doubles';

  const setsCount = settings.format === '5sets' ? 5 : settings.format === '3sets' ? 3 : 1;
  const initialSets: SetScore[] = Array.from({ length: setsCount }, () => ({
    team1Games: 0,
    team2Games: 0,
  }));

  return {
    id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFinished: false,
    settings,
    team1: {
      id: 'team1',
      name: team1Name,
      players: isDoubles
        ? [
            { id: 'p1_1', name: team1Name, shortName: team1Name.slice(0, 3).toUpperCase() },
            { id: 'p1_2', name: team1DoublesPartner || 'คู่หู 1', shortName: (team1DoublesPartner || 'คู่หู 1').slice(0, 3).toUpperCase() },
          ]
        : [{ id: 'p1_1', name: team1Name, shortName: team1Name.slice(0, 4).toUpperCase() }],
    },
    team2: {
      id: 'team2',
      name: team2Name,
      players: isDoubles
        ? [
            { id: 'p2_1', name: team2Name, shortName: team2Name.slice(0, 3).toUpperCase() },
            { id: 'p2_2', name: team2DoublesPartner || 'คู่หู 2', shortName: (team2DoublesPartner || 'คู่หู 2').slice(0, 3).toUpperCase() },
          ]
        : [{ id: 'p2_1', name: team2Name, shortName: team2Name.slice(0, 4).toUpperCase() }],
    },
    currentSetIndex: 0,
    sets: initialSets,
    currentGame: createInitialGameScore(),
    currentServerTeam: 'team1',
    currentServerPlayerIndex: 0,
    currentReceiverPlayerIndex: 0,
    isFirstServeFault: false,
    pointsHistory: [],
  };
}

/**
 * Determine display score for standard tennis game
 */
export function formatStandardGameScore(
  t1Pts: number,
  t2Pts: number,
  adRule: 'advantage' | 'no-ad'
): { team1: StandardPoint; team2: StandardPoint; isDeuce: boolean } {
  if (t1Pts >= 3 && t2Pts >= 3) {
    if (t1Pts === t2Pts) {
      return { team1: '40', team2: '40', isDeuce: true };
    }
    if (adRule === 'no-ad') {
      // Sudden death at 40-40, next point wins directly
      return { team1: '40', team2: '40', isDeuce: true };
    }
    if (t1Pts > t2Pts) {
      return { team1: 'AD', team2: '40', isDeuce: false };
    } else {
      return { team1: '40', team2: 'AD', isDeuce: false };
    }
  }

  const pointMap: StandardPoint[] = ['0', '15', '30', '40'];
  return {
    team1: pointMap[Math.min(t1Pts, 3)],
    team2: pointMap[Math.min(t2Pts, 3)],
    isDeuce: false,
  };
}

/**
 * Determine if current point is on Deuce Court (Right) or Ad Court (Left)
 */
export function getCurrentServeCourt(currentGame: GameScore): 'deuce' | 'ad' {
  const totalPoints = currentGame.team1Points + currentGame.team2Points;
  // In standard game or tiebreak:
  // 0 pts = Deuce, 1 pt = Ad, 2 pts = Deuce, 3 pts = Ad...
  return totalPoints % 2 === 0 ? 'deuce' : 'ad';
}

/**
 * Check if the active server in a tiebreak should change
 */
export function getTiebreakServerTeam(
  initialServerTeam: 'team1' | 'team2',
  tiebreakPointsSum: number
): 'team1' | 'team2' {
  // Tiebreak serve order:
  // Point 1: initialServer
  // Point 2-3: otherServer
  // Point 4-5: initialServer
  // Point 6-7: otherServer
  // math: floor((pointsSum + 1) / 2) % 2 === 0 -> otherServer, else initialServer
  const cycle = Math.floor((tiebreakPointsSum + 1) / 2) % 2;
  const otherTeam: 'team1' | 'team2' = initialServerTeam === 'team1' ? 'team2' : 'team1';
  return cycle === 0 ? otherTeam : initialServerTeam;
}

/**
 * Evaluates points to win sets required
 */
export function getSetsToWin(format: MatchFormat): number {
  if (format === '5sets') return 3;
  if (format === '3sets') return 2;
  return 1;
}

/**
 * Check if current game has reached a game point, break point, set point, or match point
 */
export interface PointContextResult {
  isBreakPoint: boolean;
  isGamePoint: boolean;
  isSetPoint: boolean;
  isMatchPoint: boolean;
  isDecidingPoint: boolean;
  potentialWinnerTeam?: 'team1' | 'team2';
  pointHolderName?: string;
  badgeLabel?: string;
  badgeType?: 'match' | 'set' | 'break' | 'deciding' | 'game';
}

/**
 * Check if current game has reached a game point, break point, set point, match point, or deciding point
 */
export function detectPointContext(state: MatchState): PointContextResult {
  const { currentGame, currentServerTeam, currentSetIndex, sets, settings, team1, team2 } = state;
  const currentSet = sets[currentSetIndex];
  const server = currentServerTeam;
  const receiver: 'team1' | 'team2' = server === 'team1' ? 'team2' : 'team1';

  // Handle No-Ad 40-40 Sudden death
  const isNoAdDeciding =
    settings.adRule === 'no-ad' &&
    !currentGame.isTiebreak &&
    currentGame.team1Points === 3 &&
    currentGame.team2Points === 3;

  if (isNoAdDeciding) {
    const receiverName = receiver === 'team1' ? team1.name : team2.name;
    const serverName = server === 'team1' ? team1.name : team2.name;
    return {
      isBreakPoint: true,
      isGamePoint: true,
      isSetPoint: false,
      isMatchPoint: false,
      isDecidingPoint: true,
      potentialWinnerTeam: receiver,
      pointHolderName: receiverName,
      badgeLabel: `🔥 DECIDING POINT (แต้มตัดสินเกม 40-40) - โอกาสเบรกของ ${receiverName}`,
      badgeType: 'deciding',
    };
  }

  let potentialWinner: 'team1' | 'team2' | undefined;

  if (currentGame.isTiebreak) {
    const minPts = currentGame.tiebreakPointsToWin;
    const diff = currentGame.team1Points - currentGame.team2Points;
    if (currentGame.team1Points >= minPts - 1 && diff >= 1) {
      potentialWinner = 'team1';
    } else if (currentGame.team2Points >= minPts - 1 && diff <= -1) {
      potentialWinner = 'team2';
    }
  } else {
    // Standard game with Ad
    if (currentGame.team1Points >= 3 && currentGame.team1Points - currentGame.team2Points >= 1) {
      potentialWinner = 'team1';
    } else if (currentGame.team2Points >= 3 && currentGame.team2Points - currentGame.team1Points >= 1) {
      potentialWinner = 'team2';
    }
  }

  if (!potentialWinner) {
    return {
      isBreakPoint: false,
      isGamePoint: false,
      isSetPoint: false,
      isMatchPoint: false,
      isDecidingPoint: false,
    };
  }

  const isBreakPoint = potentialWinner === receiver;
  const isGamePoint = potentialWinner === server;

  // Check if winning this game would win the set
  const setsToWin = getSetsToWin(settings.format);
  const potentialTeam1Games = currentSet.team1Games + (potentialWinner === 'team1' ? 1 : 0);
  const potentialTeam2Games = currentSet.team2Games + (potentialWinner === 'team2' ? 1 : 0);
  const gamesNeeded = settings.format === 'pro8' ? 8 : 6;

  let wouldWinSet = false;
  if (currentGame.isTiebreak) {
    wouldWinSet = true;
  } else if (potentialWinner === 'team1') {
    if (potentialTeam1Games >= gamesNeeded && potentialTeam1Games - potentialTeam2Games >= 2) {
      wouldWinSet = true;
    }
  } else {
    if (potentialTeam2Games >= gamesNeeded && potentialTeam2Games - potentialTeam1Games >= 2) {
      wouldWinSet = true;
    }
  }

  let wouldWinMatch = false;
  if (wouldWinSet) {
    let t1SetsWon = sets.filter((s, idx) => idx < currentSetIndex && s.winner === 'team1').length;
    let t2SetsWon = sets.filter((s, idx) => idx < currentSetIndex && s.winner === 'team2').length;
    if (potentialWinner === 'team1') t1SetsWon += 1;
    else t2SetsWon += 1;

    if (t1SetsWon >= setsToWin || t2SetsWon >= setsToWin) {
      wouldWinMatch = true;
    }
  }

  const isMatchPoint = wouldWinMatch;
  const isSetPoint = wouldWinSet && !wouldWinMatch;
  const winnerName = potentialWinner === 'team1' ? team1.name : team2.name;

  let badgeLabel = '';
  let badgeType: 'match' | 'set' | 'break' | 'deciding' | 'game' = 'game';

  if (isMatchPoint) {
    badgeLabel = `🏆 MATCH POINT (แมตช์พอยต์) - ${winnerName}`;
    badgeType = 'match';
  } else if (isSetPoint) {
    badgeLabel = `🎯 SET POINT (เซ็ตพอยต์) - ${winnerName}`;
    badgeType = 'set';
  } else if (isBreakPoint) {
    badgeLabel = `⚡ BREAK POINT (เบรกพอยต์) - โอกาสเบรกของ ${winnerName}`;
    badgeType = 'break';
  } else if (isGamePoint) {
    badgeLabel = `🟢 GAME POINT (เกมพอยต์) - ${winnerName}`;
    badgeType = 'game';
  }

  return {
    isBreakPoint,
    isGamePoint,
    isSetPoint,
    isMatchPoint,
    isDecidingPoint: false,
    potentialWinnerTeam: potentialWinner,
    pointHolderName: winnerName,
    badgeLabel,
    badgeType,
  };
}

/**
 * Score a point for team1 or team2
 */
export function recordPoint(
  state: MatchState,
  pointWinner: 'team1' | 'team2',
  shotDetails: {
    category: ShotCategory;
    stroke?: StrokeType;
    errorTeam?: 'team1' | 'team2';
    errorPlayerName?: string;
    errorStroke?: StrokeType;
    errorDetail?: ErrorDetail;
    courtZone?: any;
    rallyLength?: number;
  }
): MatchState {
  if (state.isFinished) return state;

  const currentSet = { ...state.sets[state.currentSetIndex] };
  const currentGame = { ...state.currentGame };
  const setsToWin = getSetsToWin(state.settings.format);
  const gamesToWinSet = state.settings.format === 'pro8' ? 8 : 6;

  const pointContext = detectPointContext(state);
  const serveCourt = getCurrentServeCourt(currentGame);

  // Snapshot before point for point history
  const scoreBefore = {
    sets: state.sets.map((s) => ({ ...s })),
    game: { team1: String(currentGame.team1Display), team2: String(currentGame.team2Display) },
  };

  let newT1GamePts = currentGame.team1Points;
  let newT2GamePts = currentGame.team2Points;

  if (pointWinner === 'team1') {
    newT1GamePts++;
  } else {
    newT2GamePts++;
  }

  let gameWonBy: 'team1' | 'team2' | null = null;
  let newGameScore: GameScore = { ...currentGame };

  if (currentGame.isTiebreak) {
    const minPts = currentGame.tiebreakPointsToWin;
    const diff = Math.abs(newT1GamePts - newT2GamePts);

    newGameScore = {
      ...currentGame,
      team1Points: newT1GamePts,
      team2Points: newT2GamePts,
      team1Display: String(newT1GamePts),
      team2Display: String(newT2GamePts),
    };

    if ((newT1GamePts >= minPts || newT2GamePts >= minPts) && diff >= 2) {
      gameWonBy = newT1GamePts > newT2GamePts ? 'team1' : 'team2';
    }
  } else {
    // Standard game logic
    if (state.settings.adRule === 'no-ad') {
      if (newT1GamePts >= 4 && newT1GamePts > newT2GamePts) {
        gameWonBy = 'team1';
      } else if (newT2GamePts >= 4 && newT2GamePts > newT1GamePts) {
        gameWonBy = 'team2';
      } else {
        const fmt = formatStandardGameScore(newT1GamePts, newT2GamePts, 'no-ad');
        newGameScore = {
          ...currentGame,
          team1Points: newT1GamePts,
          team2Points: newT2GamePts,
          team1Display: fmt.team1,
          team2Display: fmt.team2,
          isDeuce: fmt.isDeuce,
        };
      }
    } else {
      // Advantage rule
      if (newT1GamePts >= 4 && newT1GamePts - newT2GamePts >= 2) {
        gameWonBy = 'team1';
      } else if (newT2GamePts >= 4 && newT2GamePts - newT1GamePts >= 2) {
        gameWonBy = 'team2';
      } else {
        const fmt = formatStandardGameScore(newT1GamePts, newT2GamePts, 'advantage');
        newGameScore = {
          ...currentGame,
          team1Points: newT1GamePts,
          team2Points: newT2GamePts,
          team1Display: fmt.team1,
          team2Display: fmt.team2,
          isDeuce: fmt.isDeuce,
        };
      }
    }
  }

  // Update sets and games if game is won
  let newSets = state.sets.map((s, idx) => (idx === state.currentSetIndex ? { ...s } : s));
  let newCurrentSetIndex = state.currentSetIndex;
  let nextServerTeam = state.currentServerTeam;
  let nextServerPlayerIndex = state.currentServerPlayerIndex;
  let isMatchFinished = false;
  let matchWinner: 'team1' | 'team2' | undefined;

  if (gameWonBy) {
    if (currentGame.isTiebreak) {
      if (gameWonBy === 'team1') {
        currentSet.team1Games += 1;
        currentSet.team1TiebreakPoints = newT1GamePts;
        currentSet.team2TiebreakPoints = newT2GamePts;
        currentSet.winner = 'team1';
      } else {
        currentSet.team2Games += 1;
        currentSet.team1TiebreakPoints = newT1GamePts;
        currentSet.team2TiebreakPoints = newT2GamePts;
        currentSet.winner = 'team2';
      }
    } else {
      if (gameWonBy === 'team1') {
        currentSet.team1Games += 1;
      } else {
        currentSet.team2Games += 1;
      }

      // Check if set won
      const t1G = currentSet.team1Games;
      const t2G = currentSet.team2Games;
      const diffG = Math.abs(t1G - t2G);

      if ((t1G >= gamesToWinSet || t2G >= gamesToWinSet) && diffG >= 2) {
        currentSet.winner = t1G > t2G ? 'team1' : 'team2';
      } else if (t1G === gamesToWinSet && t2G === gamesToWinSet) {
        // Tie-break reached!
        const isSuperTiebreak =
          state.settings.finalSetTiebreak === 'super' &&
          newCurrentSetIndex === (state.settings.format === '3sets' ? 2 : 4);
        newGameScore = createInitialGameScore(true, isSuperTiebreak ? 10 : 7);
      } else {
        newGameScore = createInitialGameScore(false);
      }
    }

    newSets[state.currentSetIndex] = currentSet;

    // Check if set concluded
    if (currentSet.winner) {
      const team1SetsWon = newSets.filter((s) => s.winner === 'team1').length;
      const team2SetsWon = newSets.filter((s) => s.winner === 'team2').length;

      if (team1SetsWon >= setsToWin) {
        isMatchFinished = true;
        matchWinner = 'team1';
      } else if (team2SetsWon >= setsToWin) {
        isMatchFinished = true;
        matchWinner = 'team2';
      } else {
        // Move to next set
        newCurrentSetIndex = state.currentSetIndex + 1;
        const isNextSuper =
          state.settings.finalSetTiebreak === 'super' &&
          newCurrentSetIndex === (state.settings.format === '3sets' ? 2 : 4);

        newGameScore = createInitialGameScore(isNextSuper, isNextSuper ? 10 : 7);
      }
    } else if (!newGameScore.isTiebreak) {
      newGameScore = createInitialGameScore(false);
    }

    // Rotate server for next game
    nextServerTeam = state.currentServerTeam === 'team1' ? 'team2' : 'team1';
    if (state.settings.type === 'doubles') {
      // In doubles, rotate server index
      nextServerPlayerIndex = (state.currentServerPlayerIndex + 1) % 2;
    }
  }

  // Create point record
  const pointRecord: PointRecord = {
    id: `pt_${Date.now()}_${state.pointsHistory.length + 1}`,
    timestamp: Date.now(),
    setIndex: state.currentSetIndex,
    gameIndexInSet: currentSet.team1Games + currentSet.team2Games,
    pointNumberInMatch: state.pointsHistory.length + 1,
    servingTeam: state.currentServerTeam,
    servingPlayerId:
      state[state.currentServerTeam].players[state.currentServerPlayerIndex]?.id || 'p1',
    serveCourt,
    isSecondServe: state.isFirstServeFault,
    winnerTeam: pointWinner,
    category: shotDetails.category,
    stroke: shotDetails.stroke,
    errorTeam: shotDetails.errorTeam,
    errorPlayerName: shotDetails.errorPlayerName,
    errorStroke: shotDetails.errorStroke,
    errorDetail: shotDetails.errorDetail,
    courtZone: shotDetails.courtZone,
    rallyLength: shotDetails.rallyLength || 1,
    isBreakPoint: pointContext.isBreakPoint,
    isGamePoint: pointContext.isGamePoint,
    isSetPoint: pointContext.isSetPoint,
    isMatchPoint: pointContext.isMatchPoint,
    scoreBefore,
    scoreAfter: {
      sets: newSets.map((s) => ({ ...s })),
      game: { team1: String(newGameScore.team1Display), team2: String(newGameScore.team2Display) },
    },
  };

  return {
    ...state,
    updatedAt: Date.now(),
    completedAt: isMatchFinished ? Date.now() : undefined,
    isFinished: isMatchFinished,
    matchWinner,
    currentSetIndex: newCurrentSetIndex,
    sets: newSets,
    currentGame: newGameScore,
    currentServerTeam: nextServerTeam,
    currentServerPlayerIndex: nextServerPlayerIndex,
    isFirstServeFault: false, // Reset 1st serve fault on point finish
    pointsHistory: [...state.pointsHistory, pointRecord],
  };
}

/**
 * Undo last point accurately
 */
export function undoLastPoint(state: MatchState): MatchState {
  if (state.pointsHistory.length === 0) return state;

  const history = [...state.pointsHistory];
  const lastPoint = history.pop()!;

  // Restore game and set from lastPoint.scoreBefore
  const restoredSets = lastPoint.scoreBefore.sets.map((s) => ({ ...s }));
  const restoredGame: GameScore = {
    ...state.currentGame,
    team1Display: lastPoint.scoreBefore.game.team1,
    team2Display: lastPoint.scoreBefore.game.team2,
    // Calculate raw points from display or previous state
    team1Points: parseScoreToPoints(lastPoint.scoreBefore.game.team1),
    team2Points: parseScoreToPoints(lastPoint.scoreBefore.game.team2),
  };

  return {
    ...state,
    updatedAt: Date.now(),
    isFinished: false,
    matchWinner: undefined,
    currentSetIndex: lastPoint.setIndex,
    sets: restoredSets,
    currentGame: restoredGame,
    currentServerTeam: lastPoint.servingTeam,
    isFirstServeFault: lastPoint.isSecondServe,
    pointsHistory: history,
  };
}

function parseScoreToPoints(display: string): number {
  if (display === '0') return 0;
  if (display === '15') return 1;
  if (display === '30') return 2;
  if (display === '40') return 3;
  if (display === 'AD') return 4;
  const num = parseInt(display, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Toggle 1st serve fault
 */
export function registerFirstServeFault(state: MatchState): MatchState {
  return {
    ...state,
    isFirstServeFault: true,
    updatedAt: Date.now(),
  };
}

/**
 * Register 2nd serve fault (Double Fault / เสิร์ฟเสียทั้ง 2 ลูก)
 * Immediately awards the point to the opposing team!
 */
export function registerSecondServeFault(state: MatchState): MatchState {
  const opponentTeam = state.currentServerTeam === 'team1' ? 'team2' : 'team1';
  const serverName =
    state[state.currentServerTeam].players[state.currentServerPlayerIndex]?.name ||
    state[state.currentServerTeam].name;

  return recordPoint(state, opponentTeam, {
    category: 'double_fault',
    stroke: 'serve',
    errorTeam: state.currentServerTeam,
    errorPlayerName: serverName,
    errorDetail: 'net',
  });
}

/**
 * Change who is currently serving (กำหนดผู้เสิร์ฟ)
 */
export function setServerTeam(state: MatchState, team: 'team1' | 'team2'): MatchState {
  return {
    ...state,
    currentServerTeam: team,
    isFirstServeFault: false,
    updatedAt: Date.now(),
  };
}

/**
 * Update player names in active match
 */
export function updatePlayerNames(
  state: MatchState,
  t1Name: string,
  t2Name: string,
  t1Players?: string[],
  t2Players?: string[]
): MatchState {
  const updatedT1Players = t1Players && t1Players.length > 0
    ? t1Players.map((name, i) => ({
        id: state.team1.players[i]?.id || `p1_${i}`,
        name: name.trim() || `ผู้เล่น 1-${i + 1}`,
        shortName: (name.trim() || `1-${i + 1}`).slice(0, 3).toUpperCase(),
      }))
    : state.team1.players.map((p, i) => (i === 0 ? { ...p, name: t1Name } : p));

  const updatedT2Players = t2Players && t2Players.length > 0
    ? t2Players.map((name, i) => ({
        id: state.team2.players[i]?.id || `p2_${i}`,
        name: name.trim() || `ผู้เล่น 2-${i + 1}`,
        shortName: (name.trim() || `2-${i + 1}`).slice(0, 3).toUpperCase(),
      }))
    : state.team2.players.map((p, i) => (i === 0 ? { ...p, name: t2Name } : p));

  return {
    ...state,
    team1: {
      ...state.team1,
      name: t1Name,
      players: updatedT1Players,
    },
    team2: {
      ...state.team2,
      name: t2Name,
      players: updatedT2Players,
    },
    updatedAt: Date.now(),
  };
}

/**
 * Compute detailed analytics statistics for both teams
 */
export function calculateMatchStats(pointsHistory: PointRecord[], sets: SetScore[]): {
  team1: TeamStats;
  team2: TeamStats;
} {
  const initStats = (): TeamStats => ({
    totalPointsWon: 0,
    servicePointsTotal: 0,
    servicePointsWon: 0,
    firstServesAttempted: 0,
    firstServesIn: 0,
    firstServePointsWon: 0,
    secondServesAttempted: 0,
    secondServesIn: 0,
    secondServePointsWon: 0,
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    winnersBreakdown: { forehand: 0, backhand: 0, volley: 0, smash: 0, dropShot: 0, returnWinner: 0 },
    unforcedErrors: 0,
    unforcedErrorsBreakdown: { net: 0, wide: 0, long: 0 },
    unforcedErrorsByStroke: { forehand: 0, backhand: 0, volley: 0, smash: 0, return: 0 },
    breakPointsWon: 0,
    breakPointsOpportunities: 0,
    netPointsWon: 0,
    netPointsApproaches: 0,
    gamesWon: 0,
    setsWon: 0,
  });

  const t1 = initStats();
  const t2 = initStats();

  // Games and sets won
  sets.forEach((set) => {
    t1.gamesWon += set.team1Games;
    t2.gamesWon += set.team2Games;
    if (set.winner === 'team1') t1.setsWon += 1;
    if (set.winner === 'team2') t2.setsWon += 1;
  });

  pointsHistory.forEach((pt) => {
    const isWinnerT1 = pt.winnerTeam === 'team1';
    const winnerStats = isWinnerT1 ? t1 : t2;
    const loserStats = isWinnerT1 ? t2 : t1;

    const serverStats = pt.servingTeam === 'team1' ? t1 : t2;
    const isServerWinner = pt.servingTeam === pt.winnerTeam;

    winnerStats.totalPointsWon += 1;

    // Service stats
    serverStats.servicePointsTotal += 1;
    if (isServerWinner) {
      serverStats.servicePointsWon += 1;
    }

    if (!pt.isSecondServe) {
      serverStats.firstServesAttempted += 1;
      serverStats.firstServesIn += 1;
      if (isServerWinner) {
        serverStats.firstServePointsWon += 1;
      }
    } else {
      // Second serve point
      serverStats.firstServesAttempted += 1; // Had 1st serve attempt which faulted
      serverStats.secondServesAttempted += 1;
      if (pt.category !== 'double_fault') {
        serverStats.secondServesIn += 1;
      }
      if (isServerWinner) {
        serverStats.secondServePointsWon += 1;
      }
    }

    // Shot Categories
    if (pt.category === 'ace') {
      serverStats.aces += 1;
      serverStats.winners += 1;
    } else if (pt.category === 'double_fault') {
      serverStats.doubleFaults += 1;
      serverStats.unforcedErrors += 1;
    } else if (pt.category === 'winner') {
      winnerStats.winners += 1;
      if (pt.stroke === 'forehand') winnerStats.winnersBreakdown.forehand += 1;
      else if (pt.stroke === 'backhand') winnerStats.winnersBreakdown.backhand += 1;
      else if (pt.stroke === 'volley') {
        winnerStats.winnersBreakdown.volley += 1;
        winnerStats.netPointsWon += 1;
        winnerStats.netPointsApproaches += 1;
      } else if (pt.stroke === 'smash') {
        winnerStats.winnersBreakdown.smash += 1;
        winnerStats.netPointsWon += 1;
        winnerStats.netPointsApproaches += 1;
      } else if (pt.stroke === 'drop_shot') winnerStats.winnersBreakdown.dropShot += 1;
      else if (pt.stroke === 'return_winner') winnerStats.winnersBreakdown.returnWinner += 1;
    } else if (pt.category === 'unforced_error') {
      // Attribute error to the designated error team or loser
      const errorStats = pt.errorTeam ? (pt.errorTeam === 'team1' ? t1 : t2) : loserStats;
      errorStats.unforcedErrors += 1;
      if (pt.errorDetail === 'net') errorStats.unforcedErrorsBreakdown.net += 1;
      else if (pt.errorDetail === 'wide') errorStats.unforcedErrorsBreakdown.wide += 1;
      else if (pt.errorDetail === 'long') errorStats.unforcedErrorsBreakdown.long += 1;

      // Unforced error by stroke
      if (pt.errorStroke === 'forehand') errorStats.unforcedErrorsByStroke.forehand += 1;
      else if (pt.errorStroke === 'backhand') errorStats.unforcedErrorsByStroke.backhand += 1;
      else if (pt.errorStroke === 'volley') errorStats.unforcedErrorsByStroke.volley += 1;
      else if (pt.errorStroke === 'smash') errorStats.unforcedErrorsByStroke.smash += 1;
      else if (pt.errorStroke === 'return_winner' || pt.errorDetail === 'unforced_return') {
        errorStats.unforcedErrorsByStroke.return += 1;
      }
    }

    // Break points
    if (pt.isBreakPoint) {
      const receivingTeamStats = pt.servingTeam === 'team1' ? t2 : t1;
      receivingTeamStats.breakPointsOpportunities += 1;
      if (!isServerWinner) {
        receivingTeamStats.breakPointsWon += 1;
      }
    }
  });

  return { team1: t1, team2: t2 };
}

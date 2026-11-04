/**
 * Tennis Engine Validation Suite
 * Tests scoring rules, tie-break rotations, doubles 4-player cycles, and lossless undo/redo.
 */

import {
  createInitialMatch,
  getTiebreakServerInfo,
  getCurrentServeCourt,
  getCurrentServer,
  getCurrentReceiver,
  recordPoint,
  undoLastPoint,
  redoLastPoint,
  initDoublesRotation,
} from './tennisEngine';
import { MatchSettings, MatchState } from '../types/tennis';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
  details?: any;
}

export function runTennisEngineTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  function assert(suite: string, name: string, condition: boolean, message?: string, details?: any) {
    results.push({
      suite,
      name,
      passed: Boolean(condition),
      message: condition ? undefined : message || 'Assertion failed',
      details,
    });
  }

  // ==========================================
  // Test 1: Tiebreak 1-2-2 Rotation & Court
  // ==========================================
  {
    const suite = 'Tiebreak Rules (ITF 1-2-2)';
    
    // Singles tiebreak:
    // Pt 0 (sum=0): Initial Server, Deuce court
    const pt0 = getTiebreakServerInfo('team1', 0, 0, false);
    assert(suite, 'Pt 0: Server is Team 1, Deuce court', pt0.serverTeam === 'team1' && pt0.court === 'deuce');

    // Pt 1 (sum=1): Opponent Server, Ad court
    const pt1 = getTiebreakServerInfo('team1', 0, 1, false);
    assert(suite, 'Pt 1: Server is Team 2, Ad court', pt1.serverTeam === 'team2' && pt1.court === 'ad');

    // Pt 2 (sum=2): Opponent Server, Deuce court
    const pt2 = getTiebreakServerInfo('team1', 0, 2, false);
    assert(suite, 'Pt 2: Server is Team 2, Deuce court', pt2.serverTeam === 'team2' && pt2.court === 'deuce');

    // Pt 3 (sum=3): Initial Server, Ad court
    const pt3 = getTiebreakServerInfo('team1', 0, 3, false);
    assert(suite, 'Pt 3: Server is Team 1, Ad court', pt3.serverTeam === 'team1' && pt3.court === 'ad');

    // Pt 4 (sum=4): Initial Server, Deuce court
    const pt4 = getTiebreakServerInfo('team1', 0, 4, false);
    assert(suite, 'Pt 4: Server is Team 1, Deuce court', pt4.serverTeam === 'team1' && pt4.court === 'deuce');

    // Pt 5 (sum=5): Opponent Server, Ad court
    const pt5 = getTiebreakServerInfo('team1', 0, 5, false);
    assert(suite, 'Pt 5: Server is Team 2, Ad court', pt5.serverTeam === 'team2' && pt5.court === 'ad');

    // Pt 6 (sum=6): Opponent Server, Deuce court (Change ends at 6 pts)
    const pt6 = getTiebreakServerInfo('team1', 0, 6, false);
    assert(suite, 'Pt 6: Server is Team 2, Deuce court', pt6.serverTeam === 'team2' && pt6.court === 'deuce');
  }

  // ==========================================
  // Test 2: Doubles 4-Player Tiebreak Rotation
  // ==========================================
  {
    const suite = 'Doubles Tiebreak 4-Player Cycle';
    
    // Cycle: T1P1 (1 pt) -> T2P1 (2 pts) -> T1P2 (2 pts) -> T2P2 (2 pts)
    const tb0 = getTiebreakServerInfo('team1', 0, 0, true, 0, 0);
    assert(suite, 'Pt 0: T1P1 serves Deuce', tb0.serverTeam === 'team1' && tb0.serverPlayerIndex === 0 && tb0.court === 'deuce');

    const tb1 = getTiebreakServerInfo('team1', 0, 1, true, 0, 0);
    assert(suite, 'Pt 1: T2P1 serves Ad', tb1.serverTeam === 'team2' && tb1.serverPlayerIndex === 0 && tb1.court === 'ad');

    const tb2 = getTiebreakServerInfo('team1', 0, 2, true, 0, 0);
    assert(suite, 'Pt 2: T2P1 serves Deuce', tb2.serverTeam === 'team2' && tb2.serverPlayerIndex === 0 && tb2.court === 'deuce');

    const tb3 = getTiebreakServerInfo('team1', 0, 3, true, 0, 0);
    assert(suite, 'Pt 3: T1P2 serves Ad', tb3.serverTeam === 'team1' && tb3.serverPlayerIndex === 1 && tb3.court === 'ad');

    const tb4 = getTiebreakServerInfo('team1', 0, 4, true, 0, 0);
    assert(suite, 'Pt 4: T1P2 serves Deuce', tb4.serverTeam === 'team1' && tb4.serverPlayerIndex === 1 && tb4.court === 'deuce');

    const tb5 = getTiebreakServerInfo('team1', 0, 5, true, 0, 0);
    assert(suite, 'Pt 5: T2P2 serves Ad', tb5.serverTeam === 'team2' && tb5.serverPlayerIndex === 1 && tb5.court === 'ad');

    const tb6 = getTiebreakServerInfo('team1', 0, 6, true, 0, 0);
    assert(suite, 'Pt 6: T2P2 serves Deuce', tb6.serverTeam === 'team2' && tb6.serverPlayerIndex === 1 && tb6.court === 'deuce');

    const tb7 = getTiebreakServerInfo('team1', 0, 7, true, 0, 0);
    assert(suite, 'Pt 7: Cycles back to T1P1 Ad', tb7.serverTeam === 'team1' && tb7.serverPlayerIndex === 0 && tb7.court === 'ad');
  }

  // ==========================================
  // Test 3: Doubles Game-by-Game Rotation
  // ==========================================
  {
    const suite = 'Doubles 4-Player Game Rotation';
    const settings: MatchSettings = {
      type: 'doubles',
      format: '1set',
      tiebreakFormat: 'standard7',
      adRule: 'advantage',
      finalSetTiebreak: 'standard',
      courtSurface: 'hard',
    };

    let match = createInitialMatch(settings, 'Player 1', 'Player 2', 'Partner 1', 'Partner 2');
    assert(suite, 'Initial server is Team 1 Player 0', match.currentServerTeam === 'team1' && match.currentServerPlayerIndex === 0);

    // Win 4 points to complete Game 1
    for (let i = 0; i < 4; i++) {
      match = recordPoint(match, 'team1', { category: 'winner' });
    }
    assert(suite, 'After Game 1, Server is Team 2 Player 0', match.currentServerTeam === 'team2' && match.currentServerPlayerIndex === 0);

    // Win 4 points to complete Game 2
    for (let i = 0; i < 4; i++) {
      match = recordPoint(match, 'team2', { category: 'winner' });
    }
    assert(suite, 'After Game 2, Server is Team 1 Player 1', match.currentServerTeam === 'team1' && match.currentServerPlayerIndex === 1);

    // Win 4 points to complete Game 3
    for (let i = 0; i < 4; i++) {
      match = recordPoint(match, 'team1', { category: 'winner' });
    }
    assert(suite, 'After Game 3, Server is Team 2 Player 1', match.currentServerTeam === 'team2' && match.currentServerPlayerIndex === 1);

    // Win 4 points to complete Game 4
    for (let i = 0; i < 4; i++) {
      match = recordPoint(match, 'team2', { category: 'winner' });
    }
    assert(suite, 'After Game 4, Server cycles back to Team 1 Player 0', match.currentServerTeam === 'team1' && match.currentServerPlayerIndex === 0);
  }

  // ==========================================
  // Test 4: Lossless Undo & Redo Round-trip
  // ==========================================
  {
    const suite = 'Lossless Undo & Redo Fidelity';
    const settings: MatchSettings = {
      type: 'singles',
      format: '1set',
      tiebreakFormat: 'standard7',
      adRule: 'advantage',
      finalSetTiebreak: 'standard',
      courtSurface: 'hard',
    };

    const initialMatch = createInitialMatch(settings, 'Federer', 'Nadal');
    
    // Play 5 points: 15-0, 30-0, 30-15, 40-15, Game Federer
    let m = recordPoint(initialMatch, 'team1', { category: 'ace' });
    assert(suite, 'Point 1: 15-0', m.currentGame.team1Display === '15' && m.currentGame.team2Display === '0');

    m = recordPoint(m, 'team1', { category: 'winner' });
    assert(suite, 'Point 2: 30-0', m.currentGame.team1Display === '30' && m.currentGame.team2Display === '0');

    m = recordPoint(m, 'team2', { category: 'winner' });
    assert(suite, 'Point 3: 30-15', m.currentGame.team1Display === '30' && m.currentGame.team2Display === '15');

    m = recordPoint(m, 'team1', { category: 'winner' });
    assert(suite, 'Point 4: 40-15', m.currentGame.team1Display === '40' && m.currentGame.team2Display === '15');

    // Winning game point
    m = recordPoint(m, 'team1', { category: 'winner' });
    assert(suite, 'Point 5: Game 1 won (1-0, 0-0 next game)', m.sets[0].team1Games === 1 && m.currentGame.team1Display === '0');

    // Undo the game-winning point: MUST restore 40-15 exactly!
    m = undoLastPoint(m);
    assert(suite, 'Undo Game Point: Restores 40-15 in Game 1', m.sets[0].team1Games === 0 && m.currentGame.team1Display === '40' && m.currentGame.team2Display === '15');

    // Undo again to 30-15
    m = undoLastPoint(m);
    assert(suite, 'Undo to 30-15', m.currentGame.team1Display === '30' && m.currentGame.team2Display === '15');

    // Redo back to 40-15
    m = redoLastPoint(m);
    assert(suite, 'Redo back to 40-15', m.currentGame.team1Display === '40' && m.currentGame.team2Display === '15');

    // Redo back to Game 1 Won
    m = redoLastPoint(m);
    assert(suite, 'Redo back to Game 1 Won (1-0)', m.sets[0].team1Games === 1 && m.currentGame.team1Display === '0');
  }

  // ==========================================
  // Test 5: No-Ad Sudden Death (Deciding Point)
  // ==========================================
  {
    const suite = 'No-Ad Scoring Rule';
    const settings: MatchSettings = {
      type: 'singles',
      format: '1set',
      tiebreakFormat: 'standard7',
      adRule: 'no-ad',
      finalSetTiebreak: 'standard',
      courtSurface: 'hard',
    };

    let m = createInitialMatch(settings, 'Player 1', 'Player 2');
    // Reach 40-40 (3 points each)
    m = recordPoint(m, 'team1', { category: 'winner' }); // 15-0
    m = recordPoint(m, 'team2', { category: 'winner' }); // 15-15
    m = recordPoint(m, 'team1', { category: 'winner' }); // 30-15
    m = recordPoint(m, 'team2', { category: 'winner' }); // 30-30
    m = recordPoint(m, 'team1', { category: 'winner' }); // 40-30
    m = recordPoint(m, 'team2', { category: 'winner' }); // 40-40 (Deuce / Deciding Point)

    assert(suite, 'Deuce at 40-40', m.currentGame.isDeuce && m.currentGame.team1Display === '40' && m.currentGame.team2Display === '40');

    // Next point directly wins the game in No-Ad!
    m = recordPoint(m, 'team1', { category: 'winner' });
    assert(suite, 'Sudden death point wins game directly in No-Ad', m.sets[0].team1Games === 1 && m.currentGame.team1Display === '0');
  }

  // ==========================================
  // Test 6: PointParticipant & V2 Fields Fidelity
  // ==========================================
  {
    const suite = 'V2 Player Point Attribution';
    const settings: MatchSettings = {
      type: 'doubles',
      format: '1set',
      tiebreakFormat: 'standard7',
      adRule: 'advantage',
      finalSetTiebreak: 'standard',
      courtSurface: 'hard',
    };

    let m = createInitialMatch(settings, 'Roger', 'Rafa', 'Stan', 'Carlos');
    m = recordPoint(m, 'team1', {
      category: 'winner',
      stroke: 'forehand',
      winnerPlayerName: 'Roger',
      recordingMode: 'detailed',
    });

    const lastPt = m.pointsHistory[0];
    assert(suite, 'winnerPlayerId correctly resolved to p1_1', lastPt.winnerPlayerId === 'p1_1');
    assert(suite, 'servingPlayerId correctly set', lastPt.servingPlayerId === 'p1_1');
    assert(suite, 'receivingPlayerId populated', Boolean(lastPt.receivingPlayerId));
    assert(suite, 'stateSnapshotBefore contains full snapshot', Boolean(lastPt.stateSnapshotBefore));
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

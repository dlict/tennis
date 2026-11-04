/**
 * Tennis Types and Interfaces
 */

export type MatchType = 'singles' | 'doubles';

export type MatchFormat = '1set' | '3sets' | '5sets' | 'pro8';

export type TiebreakFormat = 'standard7' | 'super10';

export interface Player {
  id: string;
  name: string;
  shortName: string;
  avatarColor?: string;
  country?: string;
}

export interface Team {
  id: 'team1' | 'team2';
  name: string;
  players: Player[]; // 1 player for singles, 2 for doubles
}

export type StandardPoint = '0' | '15' | '30' | '40' | 'AD';

export interface GameScore {
  team1Points: number; // raw point count in current game
  team2Points: number;
  team1Display: StandardPoint | string; // e.g. "15", "40", "AD" or number in tiebreak
  team2Display: StandardPoint | string;
  isDeuce: boolean;
  isTiebreak: boolean;
  tiebreakPointsToWin: number;
  tiebreakInitialServerTeam?: 'team1' | 'team2';
  tiebreakInitialServerPlayerIndex?: number;
}

export interface SetScore {
  team1Games: number;
  team2Games: number;
  team1TiebreakPoints?: number;
  team2TiebreakPoints?: number;
  winner?: 'team1' | 'team2';
}

export type ShotCategory = 
  | 'ace'
  | 'winner'
  | 'unforced_error'
  | 'double_fault'
  | 'service_winner'
  | 'regular_point';

export type StrokeType = 
  | 'serve'
  | 'forehand'
  | 'backhand'
  | 'volley'
  | 'smash'
  | 'drop_shot'
  | 'return_winner'
  | 'passing_shot'
  | 'lob';

export type ErrorDetail = 
  | 'net'
  | 'wide'
  | 'long'
  | 'foot_fault'
  | 'unforced_return';

export type CourtZone = 'baseline_left' | 'baseline_center' | 'baseline_right' | 'midcourt' | 'net';

export interface PointParticipant {
  playerId: string;
  teamId: 'team1' | 'team2';
}

export interface DoublesRotation {
  serviceOrder: string[]; // 4 player IDs in rotation order [P1, P3, P2, P4]
  nextServerIndex: number; // 0..3 index into serviceOrder
  receivingPositions: {
    team1Deuce: string; // playerId
    team1Ad: string;    // playerId
    team2Deuce: string; // playerId
    team2Ad: string;    // playerId
  };
}

export interface PointRecord {
  id: string;
  timestamp: number;
  setIndex: number;
  gameIndexInSet: number;
  pointNumberInMatch: number;
  
  servingTeam: 'team1' | 'team2';
  servingPlayerId: string;
  receivingPlayerId?: string;
  serveCourt: 'deuce' | 'ad';
  isSecondServe: boolean;

  winnerTeam: 'team1' | 'team2';
  winnerPlayerId?: string;
  winnerPlayerName?: string;
  category: ShotCategory;
  stroke?: StrokeType;
  
  // Detailed error tracking (who missed and with what stroke)
  errorTeam?: 'team1' | 'team2';
  errorPlayerId?: string;
  errorPlayerName?: string;
  errorStroke?: StrokeType;
  errorDetail?: ErrorDetail;
  courtZone?: CourtZone;

  rallyLength?: number;
  recordingMode?: 'quick' | 'detailed';
  isBreakPoint?: boolean;
  isGamePoint?: boolean;
  isSetPoint?: boolean;
  isMatchPoint?: boolean;

  scoreBefore: {
    sets: SetScore[];
    game: { team1: string; team2: string };
  };
  scoreAfter: {
    sets: SetScore[];
    game: { team1: string; team2: string };
  };

  // Full lossless snapshot before this point was recorded (for 100% accurate Undo/Redo)
  stateSnapshotBefore?: MatchStateSnapshot;
}

export interface MatchStateSnapshot {
  currentSetIndex: number;
  sets: SetScore[];
  currentGame: GameScore;
  currentServerTeam: 'team1' | 'team2';
  currentServerPlayerIndex: number;
  team1ServerPlayerIndex: number;
  team2ServerPlayerIndex: number;
  currentReceiverPlayerIndex: number;
  doublesRotation?: DoublesRotation;
  isFirstServeFault: boolean;
  isFinished: boolean;
  matchWinner?: 'team1' | 'team2';
  timestamp?: number;
  pointRecord?: PointRecord;
}

export type MatchSnapshot = MatchStateSnapshot;

export interface TeamStats {
  totalPointsWon: number;
  servicePointsTotal: number;
  servicePointsWon: number;
  firstServesAttempted: number;
  firstServesIn: number;
  firstServePointsWon: number;
  secondServesAttempted: number;
  secondServesIn: number;
  secondServePointsWon: number;
  aces: number;
  doubleFaults: number;
  
  winners: number;
  winnersBreakdown: {
    forehand: number;
    backhand: number;
    volley: number;
    smash: number;
    dropShot: number;
    returnWinner: number;
  };

  unforcedErrors: number;
  unforcedErrorsBreakdown: {
    net: number;
    wide: number;
    long: number;
  };

  unforcedErrorsByStroke: {
    forehand: number;
    backhand: number;
    volley: number;
    smash: number;
    return: number;
  };
  
  breakPointsWon: number;
  breakPointsOpportunities: number;
  
  netPointsWon: number;
  netPointsApproaches: number;

  gamesWon: number;
  setsWon: number;
}

export interface MatchSettings {
  type: MatchType;
  format: MatchFormat;
  tiebreakFormat: TiebreakFormat;
  adRule: 'advantage' | 'no-ad';
  finalSetTiebreak: 'standard' | 'super';
  courtSurface: 'hard' | 'clay' | 'grass';
  tournamentName?: string;
  roundName?: string;
}

export interface MatchState {
  id: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  isFinished: boolean;
  matchWinner?: 'team1' | 'team2';

  settings: MatchSettings;
  team1: Team;
  team2: Team;

  currentSetIndex: number;
  sets: SetScore[];
  currentGame: GameScore;

  currentServerTeam: 'team1' | 'team2';
  currentServerPlayerIndex: number; // For doubles active player (0 or 1)
  team1ServerPlayerIndex: number; // Team 1 dedicated doubles server (0 or 1)
  team2ServerPlayerIndex: number; // Team 2 dedicated doubles server (0 or 1)
  currentReceiverPlayerIndex: number;
  
  // Doubles rotation and receiver positions
  doublesRotation?: DoublesRotation;

  isFirstServeFault: boolean; // Tracking 1st serve fault
  pointsHistory: PointRecord[];

  // Undo/Redo stack for lossless state navigation
  redoStack?: MatchStateSnapshot[];

  // Architecture V2 Metadata
  schemaVersion?: number; // 2 for V2
  activeRecordingMode?: 'quick' | 'detailed';
}

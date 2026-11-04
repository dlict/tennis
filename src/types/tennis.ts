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
  category: ShotCategory;
  stroke?: StrokeType;
  winnerPlayerName?: string;
  
  // Detailed error tracking (who missed and with what stroke)
  errorTeam?: 'team1' | 'team2';
  errorPlayerName?: string;
  errorStroke?: StrokeType;
  errorDetail?: ErrorDetail;
  courtZone?: CourtZone;

  rallyLength?: number;
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
}

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
  currentServerPlayerIndex: number; // For doubles (0 or 1)
  currentReceiverPlayerIndex: number;
  
  isFirstServeFault: boolean; // Tracking 1st serve fault
  pointsHistory: PointRecord[];
}

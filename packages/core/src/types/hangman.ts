export enum HangmanEvent {
  GUESS = "hangman:guess",
  STATE_UPDATE = "hangman:state_update",
  PLAYER_SOLVED = "hangman:player_solved",
  MATCH_OVER = "hangman:match_over",
}

export type HangmanPlayerStatus = "playing" | "solved" | "failed";

export interface HangmanPlayerState {
  maskedWord: string;
  guessedLetters: string[];
  attemptsLeft: number;
  status: HangmanPlayerStatus;
  progress: number; // Percentage or fraction solved
  score: number;
}

export interface HangmanConfig {
  timeLimitSec: number;
  maxRounds: number;
}

export interface HangmanGameState {
  players: Record<string, HangmanPlayerState>;
  winners: string[]; // Order of completion (for 5-3-1 scoring)
  currentRound: number;
  maxRounds: number;
  timeLimitSec: number;
  turnEndTime: number | null; // Epoch timestamp for match timer
  isTransitioning?: boolean; // True during the 5s delay between rounds
  nextRoundStartTime?: number | null; // When the next round will start
  rematchRequests?: string[]; // Players who have requested a rematch
}

export interface HangmanGuessAction {
  letter: string;
}

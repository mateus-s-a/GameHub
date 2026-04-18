export enum HangmanEvent {
  GUESS = "hangman:guess",
  STATE_UPDATE = "hangman:state_update",
  PLAYER_SOLVED = "hangman:player_solved",
}

export type HangmanPlayerStatus = "playing" | "solved" | "failed";

export interface HangmanPlayerState {
  maskedWord: string;
  guessedLetters: string[];
  attemptsLeft: number;
  status: HangmanPlayerStatus;
  progress: number; // Percentage or fraction solved
}

export interface HangmanGameState {
  players: Record<string, HangmanPlayerState>;
  winners: string[]; // Order of completion (for 5-3-1 scoring)
}

export interface HangmanGuessAction {
  letter: string;
}

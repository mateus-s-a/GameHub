import type { GameSetupConfig } from "@gamehub/types";

// ==========================================
// CONSTANTS & ANIMATION TOKENS
// ==========================================

export const ROUND_OPTIONS = [1, 3, 5, 7] as const;
export type RoundOption = (typeof ROUND_OPTIONS)[number];

export const TIME_OPTIONS = [5, 15, 30, 0] as const;
export type TimeOption = (typeof TIME_OPTIONS)[number];

export const PLAYER_OPTIONS = [2, 3, 4] as const;
export type PlayerOption = (typeof PLAYER_OPTIONS)[number];

export const GAME_CONSTANTS = {
  TIC_TAC_TOE_GRID_SIZE: 3,
  MATCH_AUTO_RETURN_DELAY_SEC: 30,
} as const;

export const ANIMATION_TOKENS = {
  CAROUSEL_SPRING: {
    type: "spring",
    stiffness: 260,
    damping: 32,
    mass: 1,
  },
  BLUR_FIXED_AMOUNT: "blur(12px)",
} as const;

export const CAROUSEL_GESTURE_CONFIG = {
  SWIPE_THRESHOLD: 50,
  VELOCITY_THRESHOLD: 500,
  DRAG_ELASTIC: 0.2,
} as const;

export const GameEvent = {
  JOIN_ROOM: "joinRoom",
  LEAVE_ROOM: "leaveRoom",
  GAME_MOVE: "gameMove",
  STATE_UPDATE: "gameState",
  REMATCH_REQUEST: "requestRematch",
  REMATCH_STARTED: "rematchStarted",
} as const;
export type GameEvent = (typeof GameEvent)[keyof typeof GameEvent];

// ==========================================
// UTILS
// ==========================================

/**
 * Performs a shallow value comparison of two GameSetupConfig objects.
 * Efficiently determines if any match settings have changed.
 */
export function compareConfigs(
  a: GameSetupConfig,
  b: GameSetupConfig,
): boolean {
  if (!a || !b) return a === b;

  // Check shared numeric properties
  if (a.maxRounds !== b.maxRounds) return false;
  if (a.timeLimit !== b.timeLimit) return false;

  // Check game-specific optional properties
  if (a.region !== b.region) return false;
  if (a.maxPlayers !== b.maxPlayers) return false;

  return true;
}

// ==========================================
// GAME REGISTRY & THEMES
// ==========================================

export type GameId = "ttt" | "rps" | "gtf" | "hangman" | "c4";

export interface GameEntry {
  id: GameId;
  slug: string;
  title: string;
  category: string;
  description: string;
  status: "active" | "coming_soon";
  accentColor: string;
  illustration: "ttt" | "rps" | "gtf" | "hangman" | "c4";
  maxPlayers: number;
}

export const GAME_THEMES = {
  ttt: {
    id: "ttt",
    name: "Tic-Tac-Toe",
    colors: {
      background: "#0a1218",
      glow: "rgba(34, 211, 238, 0.08)",
      accent: "#22d3ee",
    },
  },
  gtf: {
    id: "gtf",
    name: "Guess The Flag",
    colors: {
      background: "#0a140e",
      glow: "rgba(16, 185, 129, 0.08)",
      accent: "#10b981",
    },
  },
  rps: {
    id: "rps",
    name: "Rock Paper Scissors",
    colors: {
      background: "#110a18",
      glow: "rgba(168, 85, 247, 0.08)",
      accent: "#a855f7",
    },
  },
  hangman: {
    id: "hangman",
    name: "Hangman",
    colors: {
      background: "#10140a",
      glow: "rgba(132, 204, 22, 0.08)",
      accent: "#84cc16",
    },
  },
  c4: {
    id: "c4",
    name: "Connect 4",
    colors: {
      background: "#180a0a",
      glow: "rgba(239, 68, 68, 0.08)",
      accent: "#ef4444",
    },
  },
} as const;

export const GAMES_REGISTRY: readonly GameEntry[] = [
  {
    id: "ttt",
    slug: "tic-tac-toe",
    title: "TIC-TAC-TOE",
    category: "CLASSIC",
    description: "The classic 3×3 grid game. Simple, elegant, and ruthless.",
    status: "active",
    accentColor: "rgba(255, 255, 255, 0.06)",
    illustration: "ttt",
    maxPlayers: 2,
  },
  {
    id: "c4",
    slug: "connect-four",
    title: "CONNECT 4",
    category: "STRATEGY",
    description: "Drop your colored discs and connect 4 in a row to win.",
    status: "active",
    accentColor: "rgba(239, 68, 68, 0.06)",
    illustration: "c4",
    maxPlayers: 2,
  },
  {
    id: "gtf",
    slug: "guess-the-flag",
    title: "GUESS THE FLAG",
    category: "GEOGRAPHY",
    description: "High-speed geographical trivia against live opponents.",
    status: "active",
    accentColor: "rgba(130, 180, 255, 0.06)",
    illustration: "gtf",
    maxPlayers: 4,
  },
  {
    id: "rps",
    slug: "rock-paper-scissors",
    title: "ROCK PAPER SCISSORS",
    category: "STRATEGY",
    description: "A mental battle of hidden choices and commitments.",
    status: "active",
    accentColor: "rgba(255, 200, 130, 0.06)",
    illustration: "rps",
    maxPlayers: 2,
  },
  {
    id: "hangman",
    slug: "hangman",
    title: "HANGMAN",
    category: "WORD",
    description:
      "A race against time and limited chances to solve the mystery word.",
    status: "active",
    accentColor: "rgba(200, 255, 130, 0.06)",
    illustration: "hangman",
    maxPlayers: 4,
  },
] as const satisfies readonly GameEntry[];

export function getGameBySlug(slug: string): GameEntry | undefined {
  return GAMES_REGISTRY.find((g) => g.slug === slug);
}

export function getGameById(id: GameId): GameEntry | undefined {
  return GAMES_REGISTRY.find((g) => g.id === id);
}

// ==========================================
// HANGMAN TYPES & EVENTS
// ==========================================

export const HangmanEvent = {
  GUESS: "hangman:guess",
  STATE_UPDATE: "hangman:state_update",
  PLAYER_SOLVED: "hangman:player_solved",
  MATCH_OVER: "hangman:match_over",
} as const;
export type HangmanEvent = (typeof HangmanEvent)[keyof typeof HangmanEvent];

export type HangmanPlayerStatus = "playing" | "solved" | "failed";

export interface HangmanPlayerState {
  maskedWord: string;
  guessedLetters: string[];
  attemptsLeft: number;
  status: HangmanPlayerStatus;
  progress: number;
  score: number;
}

export interface HangmanConfig {
  timeLimitSec: number;
  maxRounds: number;
}

export interface HangmanGameState {
  players: Record<string, HangmanPlayerState>;
  winners: string[];
  currentRound: number;
  maxRounds: number;
  timeLimitSec: number;
  turnEndTime: number | null;
  isTransitioning?: boolean;
  nextRoundStartTime?: number | null;
  rematchRequests?: string[];
}

export interface HangmanGuessAction {
  letter: string;
}

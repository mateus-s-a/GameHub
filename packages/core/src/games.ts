/**
 * Universal Game Registry — Single source of truth for all game metadata.
 * Used by both the Web (carousel rendering) and API (room validation).
 */

export type GameId = "ttt" | "rps" | "gtf" | "hangman";

export interface GameEntry {
  id: GameId;
  slug: string;
  title: string;
  category: string;
  description: string;
  status: "active" | "coming_soon";
  accentColor: string;
  illustration: "ttt" | "rps" | "gtf" | "hangman";
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

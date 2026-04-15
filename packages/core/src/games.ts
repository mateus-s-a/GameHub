/**
 * Universal Game Registry — Single source of truth for all game metadata.
 * Used by both the Web (carousel rendering) and API (room validation).
 */

export interface GameEntry {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  status: "active" | "coming_soon";
  accentColor: string;
  illustration: "ttt" | "rps" | "gtf";
  maxPlayers: number;
}

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
] as const satisfies readonly GameEntry[];

export function getGameBySlug(slug: string): GameEntry | undefined {
  return GAMES_REGISTRY.find((g) => g.slug === slug);
}

export function getGameById(id: string): GameEntry | undefined {
  return GAMES_REGISTRY.find((g) => g.id === id);
}

export interface Player {
  id: string;
  name?: string;
}

export type RoomStatus = "waiting" | "starting" | "in_progress";

export interface RoomLobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export interface GameSetupConfig {
  maxRounds: number;
  timeLimit: number;
  region?: string; // Only for GTF
  maxPlayers?: number; // For GTF, Hangman, and Memory Card
  mode?: "standard" | "custom"; // For Memory Card
  boardSize?: string; // For Memory Card (e.g. "4x4", "6x4", "6x5", "6x6", "8x5", "8x6")
}

export interface RoomInfo {
  id: string;
  gameType: string;
  hostId: string;
  hostName: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  players: RoomLobbyPlayer[];
  countdown: number | null;
  config: GameSetupConfig;
}

export interface ServerStats {
  totalRooms: number;
  totalPlayers: number;
  gameBreakdown: Record<string, number>;
}

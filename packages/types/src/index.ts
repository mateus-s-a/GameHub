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
  maxPlayers?: number; // Only for GTF currently mapped
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

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
  config?: any;
}

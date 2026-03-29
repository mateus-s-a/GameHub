export interface Player {
  id: string;
  name?: string;
}

export type RoomStatus = "waiting" | "in_progress";

export interface RoomInfo {
  id: string;
  gameType: string;
  hostId: string;
  hostName: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  config?: any;
}

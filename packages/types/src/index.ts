export interface Player {
  id: string;
  name?: string;
}

export interface Room {
  id: string;
  players: Player[];
}

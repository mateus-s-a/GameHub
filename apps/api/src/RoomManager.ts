import { RoomInfo, RoomLobbyPlayer } from "@gamehub/types";
import { randomUUID } from "crypto";

export class RoomManager {
  private rooms: Map<string, RoomInfo> = new Map();

  constructor() {}

  public createRoom(
    gameType: string,
    hostId: string,
    hostName: string,
    maxPlayers: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any,
  ): RoomInfo {
    const roomId = randomUUID();
    const hostPlayer: RoomLobbyPlayer = {
      id: hostId,
      name: hostName,
      isHost: true,
      isReady: false,
    };

    const newRoom: RoomInfo = {
      id: roomId,
      gameType,
      hostId,
      hostName,
      status: "waiting",
      playerCount: 1, // Host starts in the room
      maxPlayers,
      players: [hostPlayer],
      countdown: null,
      config,
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  public toggleReady(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
    }
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  public removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  public getAvailableRooms(gameType: string): RoomInfo[] {
    const available: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (room.gameType === gameType) {
        available.push(room);
      }
    }
    return available;
  }

  public joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
  ): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.playerCount < room.maxPlayers && room.status === "waiting") {
      room.playerCount += 1;
      room.players.push({
        id: playerId,
        name: playerName,
        isHost: false,
        isReady: false,
      });

      this.rooms.set(roomId, room);
      return room;
    }
    return null;
  }

  public leaveRoom(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.playerCount = room.players.length;

    // Se a sala ficar vazia, destruímos ela
    if (room.playerCount <= 0) {
      this.removeRoom(roomId);
      return null;
    }

    // Se o HOST saiu, migramos o cargo para o próximo jogador
    if (room.hostId === playerId) {
      const newHost = room.players[0];
      if (newHost) {
        room.hostId = newHost.id;
        room.hostName = newHost.name;
        newHost.isHost = true;
      }
    }

    // Se a saída ocorrer durante o lobby, resetamos o countdown
    if (room.status === "waiting") {
      room.countdown = null;
    }

    this.rooms.set(roomId, room);
    return room;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public updateRoomConfig(roomId: string, config: any): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Update config but ignore maxPlayers to prevent changing total slots after creation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxPlayers, ...rest } = config;
    room.config = { ...room.config, ...rest };

    this.rooms.set(roomId, room);
    return room;
  }
}

// Export a singleton instance
export const roomManager = new RoomManager();

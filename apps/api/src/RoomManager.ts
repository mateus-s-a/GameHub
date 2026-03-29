import { RoomInfo, RoomStatus } from "@gamehub/types";
import { randomUUID } from "crypto";

export class RoomManager {
  private rooms: Map<string, RoomInfo> = new Map();

  constructor() {}

  public createRoom(
    gameType: string,
    hostId: string,
    hostName: string,
    maxPlayers: number,
    config?: any
  ): RoomInfo {
    const roomId = randomUUID();
    const newRoom: RoomInfo = {
      id: roomId,
      gameType,
      hostId,
      hostName,
      status: "waiting",
      playerCount: 1, // Host starts in the room
      maxPlayers,
      config,
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
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

  public joinRoom(roomId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.playerCount < room.maxPlayers) {
      room.playerCount += 1;
      if (room.playerCount === room.maxPlayers) {
        room.status = "in_progress";
      }
      this.rooms.set(roomId, room);
      return room;
    }
    return null;
  }

  public leaveRoom(roomId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.playerCount -= 1;
    // If empty or host leaves, it's simpler to just delete the room in index.ts logic
    if (room.playerCount <= 0) {
      this.removeRoom(roomId);
      return null;
    }

    room.status = "waiting"; // if a player leaves, it reverts to waiting
    this.rooms.set(roomId, room);
    return room;
  }
}

// Export a singleton instance
export const roomManager = new RoomManager();

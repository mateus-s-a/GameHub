import {
  RoomInfo,
  RoomLobbyPlayer,
  ServerStats,
  GameSetupConfig,
} from "@gamehub/types";
import { randomUUID } from "crypto";

export class RoomManager {
  private rooms: Map<string, RoomInfo> = new Map();
  private playerToRoomMap: Map<string, string> = new Map();
  private socketToPlayerMap: Map<string, string> = new Map();

  constructor() {}

  /**
   * Fast lookup: map socketId to persistent playerId (sessionId).
   */
  public bindSocketToPlayer(socketId: string, playerId: string): void {
    this.socketToPlayerMap.set(socketId, playerId);
  }

  public getPlayerIdBySocketId(socketId: string): string | null {
    return this.socketToPlayerMap.get(socketId) ?? null;
  }

  public unbindSocket(socketId: string): string | null {
    const playerId = this.socketToPlayerMap.get(socketId) ?? null;
    this.socketToPlayerMap.delete(socketId);
    return playerId;
  }

  /**
   * O(1) reverse lookup: find which room a player (sessionId) is in.
   * Used by the disconnect handler to clean up ghost rooms or manage reconnections.
   */
  public getRoomIdByPlayerId(playerId: string): string | null {
    return this.playerToRoomMap.get(playerId) ?? null;
  }

  public createRoom(
    gameType: string,
    hostId: string,
    hostName: string,
    maxPlayers: number,
    config?: GameSetupConfig,
    socketId?: string,
    userId?: string,
  ): RoomInfo {
    const roomId = randomUUID();
    const hostPlayer: RoomLobbyPlayer = {
      id: hostId,
      name: hostName,
      isHost: true,
      isReady: false,
      socketId,
      userId,
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
      config: config || {
        maxRounds: 3,
        timeLimit: 15,
      },
    };
    this.rooms.set(roomId, newRoom);
    this.playerToRoomMap.set(hostId, roomId);
    if (socketId) {
      this.socketToPlayerMap.set(socketId, hostId);
    }
    return newRoom;
  }

  public toggleReady(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(
      (p) => p.id === playerId || p.socketId === playerId,
    );
    if (player) {
      player.isReady = !player.isReady;
    }
    this.rooms.set(roomId, room);
    return room;
  }

  public resetRoomToLobby(roomId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.status = "waiting";
    room.countdown = null;
    room.players.forEach((p) => {
      p.isReady = false;
    });

    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  public removeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      // Clean up all player entries from the indices
      for (const player of room.players) {
        this.playerToRoomMap.delete(player.id);
        if (player.socketId) {
          this.socketToPlayerMap.delete(player.socketId);
        }
      }
    }
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

  public getActivePlayerCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    if (!room) return 0;
    return room.players.filter((p) => !p.isDisconnected).length;
  }

  public markPlayerDisconnected(
    roomId: string,
    playerId: string,
  ): { room: RoomInfo; player: RoomLobbyPlayer; activeCount: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(
      (p) => p.id === playerId || p.socketId === playerId,
    );
    if (!player) return null;

    player.isDisconnected = true;
    player.disconnectedAt = Date.now();
    this.rooms.set(roomId, room);

    const activeCount = room.players.filter((p) => !p.isDisconnected).length;
    return { room, player, activeCount };
  }

  public rebindPlayer(
    roomId: string,
    playerId: string,
    newSocketId: string,
  ): { room: RoomInfo; player: RoomLobbyPlayer } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(
      (p) => p.id === playerId || p.socketId === playerId,
    );
    if (!player) return null;

    if (player.socketId && player.socketId !== newSocketId) {
      this.socketToPlayerMap.delete(player.socketId);
    }

    player.socketId = newSocketId;
    player.isDisconnected = false;
    player.disconnectedAt = undefined;

    this.socketToPlayerMap.set(newSocketId, player.id);
    this.playerToRoomMap.set(player.id, roomId);
    this.rooms.set(roomId, room);

    return { room, player };
  }

  public joinRoom(
    roomId: string,
    playerId: string,
    playerName: string,
    socketId?: string,
    userId?: string,
  ): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Reconnection check: if player (sessionId) already in room, update socket
    const existingPlayer = room.players.find(
      (p) => p.id === playerId || (socketId && p.socketId === socketId),
    );
    if (existingPlayer) {
      if (socketId) existingPlayer.socketId = socketId;
      if (userId) existingPlayer.userId = userId;
      existingPlayer.name = playerName;
      existingPlayer.isDisconnected = false;
      existingPlayer.disconnectedAt = undefined;
      this.rooms.set(roomId, room);
      this.playerToRoomMap.set(playerId, roomId);
      if (socketId) this.socketToPlayerMap.set(socketId, playerId);
      return room;
    }

    if (room.playerCount < room.maxPlayers && room.status === "waiting") {
      room.playerCount += 1;
      room.players.push({
        id: playerId,
        name: playerName,
        isHost: false,
        isReady: false,
        socketId,
        userId,
      });

      this.rooms.set(roomId, room);
      this.playerToRoomMap.set(playerId, roomId);
      if (socketId) this.socketToPlayerMap.set(socketId, playerId);
      return room;
    }
    return null;
  }

  public leaveRoom(roomId: string, playerId: string): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const targetPlayer = room.players.find(
      (p) => p.id === playerId || p.socketId === playerId,
    );
    const resolvedPlayerId = targetPlayer ? targetPlayer.id : playerId;

    room.players = room.players.filter(
      (p) => p.id !== resolvedPlayerId && p.socketId !== resolvedPlayerId,
    );
    room.playerCount = room.players.length;
    this.playerToRoomMap.delete(resolvedPlayerId);

    if (targetPlayer?.socketId) {
      this.socketToPlayerMap.delete(targetPlayer.socketId);
    }

    // Se a sala ficar vazia, destruímos ela
    if (room.playerCount <= 0) {
      this.removeRoom(roomId);
      return null;
    }

    // Se o HOST saiu, migramos o cargo para o próximo jogador
    if (room.hostId === resolvedPlayerId || room.hostId === playerId) {
      const newHost = room.players[0];
      if (newHost) {
        room.hostId = newHost.id;
        room.hostName = newHost.name;
        newHost.isHost = true;
      }
    }

    // Se a saída ocorrer durante o lobby ou início, resetamos o estado
    if (room.status === "waiting" || room.status === "starting") {
      room.status = "waiting";
      room.countdown = null;
    }

    this.rooms.set(roomId, room);
    return room;
  }

  public updateRoomConfig(
    roomId: string,
    config: GameSetupConfig,
  ): RoomInfo | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Update config but ignore maxPlayers to prevent changing total slots after creation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { maxPlayers, ...rest } = config;
    room.config = { ...room.config, ...rest };

    this.rooms.set(roomId, room);
    return room;
  }

  public getStats(): ServerStats {
    const totalRooms = this.rooms.size;
    const totalPlayers = this.playerToRoomMap.size;
    const gameBreakdown: Record<string, number> = {};

    for (const room of this.rooms.values()) {
      gameBreakdown[room.gameType] = (gameBreakdown[room.gameType] || 0) + 1;
    }

    return {
      totalRooms,
      totalPlayers,
      gameBreakdown,
    };
  }
}

// Export a singleton instance
export const roomManager = new RoomManager();

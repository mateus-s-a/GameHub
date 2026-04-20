import { Socket, Namespace } from "socket.io";
import { roomManager } from "./RoomManager.js";
import { GAME_CONSTANTS } from "@gamehub/core";
 
const matchReturnTimeouts = new Map<string, NodeJS.Timeout>();
 
/**
 * Cancels a pending auto-return to lobby timeout.
 * Used when players successfully initiate a rematch.
 */
export function cancelAutoReturnToLobby(roomId: string) {
  const timeout = matchReturnTimeouts.get(roomId);
  if (timeout) {
    clearTimeout(timeout);
    matchReturnTimeouts.delete(roomId);
  }
}

function getLogId(socket: Socket): string {
  const playerName = socket.handshake.auth.playerName;
  const socketId = socket.id.substring(0, 5);
  if (playerName && !playerName.startsWith("PLAYER-")) {
    const safeName = playerName.replace(/\n/g, " ");
    return `${socketId}(${safeName})`;
  }
  return socketId;
}

export function registerGenericLobbyEvents(
  socket: Socket,
  namespace: Namespace,
  gameType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gameMap: Map<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createGameLogic: (config: any) => any,
  onLeaveExtra?: (socketId: string) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGameStarted?: (roomId: string, game: any) => void,
) {
  socket.on("getRooms", () => {
    socket.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on("createRoom", (config?: any) => {
    const hostName =
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;
    const maxPlayers = config?.maxPlayers || 2;
    const room = roomManager.createRoom(
      gameType,
      socket.id,
      hostName,
      maxPlayers,
      config || {},
    );
    console.log(
      `[Lobby] [${gameType.toUpperCase()}] Room GH-${room.id.substring(0, 5).toUpperCase()} created by ${getLogId(socket)} (Host)`,
    );
    gameMap.set(room.id, createGameLogic(config || {}));

    socket.join(room.id);
    socket.emit("matchFound", { roomId: room.id, isHost: true });
    namespace.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  });

  socket.on("joinSpecificRoom", (roomId: string) => {
    const playerName =
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;
    const room = roomManager.joinRoom(roomId, socket.id, playerName);
    if (!room) {
      socket.emit("roomError", "Room is full or doesn't exist.");
      return;
    }

    socket.join(roomId);
    socket.emit("matchFound", { roomId, isHost: false });
    console.log(
      `[Lobby] [${gameType.toUpperCase()}] ${getLogId(socket)} joined Room GH-${roomId.substring(0, 5).toUpperCase()} (${room.playerCount}/${room.maxPlayers} players)`,
    );
    namespace.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
    namespace.to(roomId).emit("roomLobbyUpdate", room);
  });

  socket.on("toggleReady", (roomId: string) => {
    const room = roomManager.toggleReady(roomId, socket.id);
    if (room) {
      namespace.to(roomId).emit("roomLobbyUpdate", room);
    }
  });

  socket.on("startMatch", (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;

    if (room.players.length < 2) return;
    const allReady = room.players.every((p) => p.isReady);
    if (!allReady) return;

    let countdown = 5;
    room.countdown = countdown;
    room.status = "starting";
    console.log(
      `[Match] [${gameType.toUpperCase()}] Match starting in Room GH-${roomId.substring(0, 5).toUpperCase()} (Countdown: 5s)`,
    );
    namespace.to(roomId).emit("roomLobbyUpdate", room);
    namespace.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));

    const interval = setInterval(() => {
      countdown -= 1;
      const currentRoom = roomManager.getRoom(roomId);
      if (!currentRoom || currentRoom.status === "in_progress") {
        clearInterval(interval);
        return;
      }
      currentRoom.countdown = countdown;
      namespace.to(roomId).emit("roomLobbyUpdate", currentRoom);

      if (countdown <= 0) {
        clearInterval(interval);
        currentRoom.status = "in_progress";
        currentRoom.countdown = null;
        console.log(
          `[Match] [${gameType.toUpperCase()}] Game started in Room GH-${roomId.substring(0, 5).toUpperCase()} with ${currentRoom.playerCount} players`,
        );
        namespace.emit(
          "roomListUpdate",
          roomManager.getAvailableRooms(gameType),
        );
        namespace.to(roomId).emit("gameStarted");

        if (onGameStarted) {
          const game = gameMap.get(roomId);
          if (game) onGameStarted(roomId, game);
        }
      }
    }, 1000);
  });

  const handleLeaveOrDisconnect = (roomId: string) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Idempotency: skip if player already left (handles leaveRoom + disconnect race)
    if (!room.players.find((p) => p.id === socket.id)) return;

    const wasInProgress = room.status === "in_progress";
    const oldHostId = room.hostId;
    const leaverLogId = getLogId(socket);
    const leaverName =
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;

    const updatedRoom = roomManager.leaveRoom(roomId, socket.id);

    if (!updatedRoom) {
      // Room empty (already deleted by RoomManager)
      console.log(
        `[Lobby] [${gameType.toUpperCase()}] Room GH-${roomId.substring(0, 5).toUpperCase()} destroyed (Empty)`,
      );
      namespace.to(roomId).emit("roomDestroyed");
      gameMap.delete(roomId);
    } else {
      const game = gameMap.get(roomId);
      if (game && typeof game.removePlayer === "function") {
        game.removePlayer(socket.id);
      }

      // Preparation of notification message
      let message = `${leaverName} left the match`;
      if (oldHostId === socket.id) {
        message = `${leaverName} left (Host)\n${updatedRoom.hostName} is the new Host`;
      }

      if (wasInProgress) {
        if (updatedRoom.playerCount < 2) {
          // Cannot continue match with < 2 players - Match Terminated
          updatedRoom.status = "waiting";
          updatedRoom.countdown = 5; // Start backend countdown
          console.log(
            `[Match] [${gameType.toUpperCase()}] Match in Room GH-${roomId.substring(0, 5).toUpperCase()} terminated (Insufficient players)`,
          );
          namespace.to(roomId).emit("opponentDisconnected", {
            playerName: leaverName,
          });
          namespace.to(roomId).emit("playerLeft", message);
          namespace.to(roomId).emit("roomLobbyUpdate", updatedRoom);

          // Backend-managed 5-second countdown to destruction
          const terminationInterval = setInterval(() => {
            const currentRoom = roomManager.getRoom(roomId);
            if (!currentRoom || currentRoom.playerCount === 0) {
              clearInterval(terminationInterval);
              return;
            }

            currentRoom.countdown = (currentRoom.countdown || 1) - 1;
            namespace.to(roomId).emit("matchTerminationUpdate", {
              countdown: currentRoom.countdown,
            });

            if (currentRoom.countdown <= 0) {
              clearInterval(terminationInterval);
              roomManager.removeRoom(roomId);
              gameMap.delete(roomId);
              namespace.to(roomId).emit("roomDestroyed");
              namespace.to(roomId).emit("matchTerminated");
              namespace.emit(
                "roomListUpdate",
                roomManager.getAvailableRooms(gameType),
              );
            }
          }, 1000);
        } else {
          // In-progress match continues with remaining players
          namespace.to(roomId).emit("playerLeft", message);
          namespace.to(roomId).emit("roomLobbyUpdate", updatedRoom);
        }
      } else {
        // Lobby leave
        console.log(
          `[Lobby] [${gameType.toUpperCase()}] User ${leaverLogId} left Room GH-${roomId.substring(0, 5).toUpperCase()}`,
        );
        namespace.to(roomId).emit("roomLobbyUpdate", updatedRoom);
        namespace.to(roomId).emit("playerLeft", message);
      }
    }
    namespace.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  };

  socket.on("leaveRoom", (roomId: string) => {
    socket.leave(roomId);
    if (onLeaveExtra) onLeaveExtra(socket.id);
    handleLeaveOrDisconnect(roomId);
  });

  socket.on("disconnect", () => {
    const roomId = roomManager.getRoomIdByPlayerId(socket.id);
    if (roomId) {
      socket.leave(roomId);
      if (onLeaveExtra) onLeaveExtra(socket.id);
      handleLeaveOrDisconnect(roomId);
    }
  });

  socket.on("syncLobby", (roomId: string) => {
    socket.join(roomId);
    const room = roomManager.getRoom(roomId);
    if (room) {
      socket.emit("roomLobbyUpdate", room);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on("updateRoomConfig", (data: { roomId: string; config: any }) => {
    const { roomId, config } = data;
    const room = roomManager.getRoom(roomId);
    if (!room || room.hostId !== socket.id) return;

    const updatedRoom = roomManager.updateRoomConfig(roomId, config);
    if (updatedRoom) {
      // Update the game logic instance if it supports live updates
      const game = gameMap.get(roomId);
      if (game && typeof game.updateConfig === "function") {
        game.updateConfig(config);
      }
      namespace.to(roomId).emit("roomLobbyUpdate", updatedRoom);
    }
  });
}

/**
 * Project-wide utility to automatically return a room to the lobby state
 * after a match has successfully finished.
 */
export function handleAutoReturnToLobby(
  namespace: Namespace,
  roomId: string,
  gameMap: Map<string, any>,
  delayMs: number = GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC * 1000,
) {
  // Clear any existing timeout for this room first
  cancelAutoReturnToLobby(roomId);

  const timeout = setTimeout(() => {
    matchReturnTimeouts.delete(roomId);
    const room = roomManager.getRoom(roomId);
    if (room) {
      const gameType = room.gameType;
      
      // Completely remove the room instead of resetting it to make it "not visible"
      roomManager.removeRoom(roomId);
      gameMap.delete(roomId);
      
      namespace.to(roomId).emit("roomDestroyed");
      namespace.to(roomId).emit("matchTerminated");

      // Update the global room list for all users in the namespace
      namespace.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));

      console.log(
        `[Match] [${gameType.toUpperCase()}] Room GH-${roomId.substring(0, 5).toUpperCase()} destroyed after auto-return delay.`,
      );
    }
  }, delayMs);

  matchReturnTimeouts.set(roomId, timeout);
}

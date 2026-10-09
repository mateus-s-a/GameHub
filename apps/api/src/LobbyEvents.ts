import { Socket, Namespace } from "socket.io";
import { roomManager } from "./RoomManager";
import { GAME_CONSTANTS } from "@gamehub/core";
import {
  createRoomSchema,
  roomIdSchema,
  updateRoomConfigSchema,
  validateSocketPayload,
} from "./schemas/socketSchemas";
import { checkSocketRateLimit } from "./middlewares/rateLimiterMiddleware";
import { sanitizeText } from "./lib/sanitize";
import { MatchService } from "./services/matchService";
import { roomActionLock } from "./lib/roomLock";
import { roomTimerManager } from "./lib/roomTimer";

const matchReturnTimeouts = new Map<string, NodeJS.Timeout>();
const reconnectionTimeouts = new Map<
  string,
  { interval: NodeJS.Timeout; remaining: number; isPaused: boolean }
>();

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

/**
 * Cancels a pending reconnection grace timeout for a player in a room.
 */
export function cancelReconnectionGrace(
  roomId: string,
  playerId: string,
): boolean {
  const timeoutKey = `${roomId}:${playerId}`;
  const pending = reconnectionTimeouts.get(timeoutKey);
  if (pending) {
    clearInterval(pending.interval);
    reconnectionTimeouts.delete(timeoutKey);
    return true;
  }
  return false;
}

function getLogId(socket: Socket): string {
  const playerName =
    socket.data?.playerName ||
    socket.handshake.auth.playerName ||
    socket.id.substring(0, 5);
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
  onRoomDestroyed?: (roomId: string) => void,
) {
  // By default, joining sockets are lobby viewers until they enter a specific room
  socket.join("lobby_viewers");

  socket.on("getRooms", () => {
    socket.join("lobby_viewers");
    socket.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on("createRoom", (rawConfig?: any) => {
    if (!checkSocketRateLimit(socket, "createRoom", 5, 5)) return;

    const validatedConfig = validateSocketPayload(
      socket,
      createRoomSchema,
      rawConfig,
      "createRoom",
    );
    if (rawConfig && validatedConfig === null) return;

    socket.leave("lobby_viewers");
    const playerId = socket.data?.sessionId || socket.id;
    const rawHostName =
      socket.data?.playerName ||
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;
    const hostName = sanitizeText(rawHostName) || "Player";
    const maxPlayers = validatedConfig?.maxPlayers || 2;
    const userId = socket.data?.user?.userId;

    const room = roomManager.createRoom(
      gameType,
      playerId,
      hostName,
      maxPlayers,
      (validatedConfig as any) || {},
      socket.id,
      userId,
    );

    console.log(
      `[Lobby] [${gameType.toUpperCase()}] Room GH-${room.id.substring(0, 5).toUpperCase()} created by ${getLogId(socket)} (Host)`,
    );
    const gameLogic = createGameLogic(validatedConfig || {});
    if (gameLogic && typeof gameLogic.addPlayer === "function") {
      gameLogic.addPlayer(socket.id);
    }
    gameMap.set(room.id, gameLogic);

    socket.join(room.id);
    socket.emit("matchFound", { roomId: room.id, isHost: true });
    namespace
      .to("lobby_viewers")
      .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  });

  socket.on("joinSpecificRoom", (rawRoomId: string) => {
    if (!checkSocketRateLimit(socket, "joinSpecificRoom", 8, 3)) return;

    const validatedRoomId = validateSocketPayload(
      socket,
      roomIdSchema,
      rawRoomId,
      "joinSpecificRoom",
    );
    if (!validatedRoomId) return;

    const roomId = validatedRoomId;
    socket.leave("lobby_viewers");
    const playerId = socket.data?.sessionId || socket.id;
    const rawPlayerName =
      socket.data?.playerName ||
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;
    const playerName = sanitizeText(rawPlayerName) || "Player";
    const userId = socket.data?.user?.userId;

    // Check if player was in a reconnection grace period
    const hadGracePeriod = cancelReconnectionGrace(roomId, playerId);

    const room = roomManager.joinRoom(
      roomId,
      playerId,
      playerName,
      socket.id,
      userId,
    );
    if (!room) {
      socket.emit("roomError", "Room is full or doesn't exist.");
      return;
    }

    const game = gameMap.get(roomId);
    if (game && typeof game.addPlayer === "function") {
      game.addPlayer(socket.id);
    }

    socket.join(roomId);
    socket.emit("matchFound", {
      roomId,
      isHost: room.hostId === playerId || room.hostId === socket.id,
    });

    if (hadGracePeriod) {
      console.log(
        `[GracePeriod] [${gameType.toUpperCase()}] ${getLogId(socket)} successfully reconnected to Room GH-${roomId.substring(0, 5).toUpperCase()}`,
      );
      namespace.to(roomId).emit("playerReconnected", {
        playerId,
        playerName,
      });
      if (game && typeof game.getPublicState === "function") {
        socket.emit("gameState", game.getPublicState());
      }
    } else {
      console.log(
        `[Lobby] [${gameType.toUpperCase()}] ${getLogId(socket)} joined Room GH-${roomId.substring(0, 5).toUpperCase()} (${room.playerCount}/${room.maxPlayers} players)`,
      );
    }

    namespace
      .to("lobby_viewers")
      .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
    namespace.to(roomId).emit("roomLobbyUpdate", room);
  });

  socket.on("toggleReady", (rawRoomId: string) => {
    if (!checkSocketRateLimit(socket, "toggleReady", 10, 3)) return;

    const validatedRoomId = validateSocketPayload(
      socket,
      roomIdSchema,
      rawRoomId,
      "toggleReady",
    );
    if (!validatedRoomId) return;

    const playerId = socket.data?.sessionId || socket.id;
    const room = roomManager.toggleReady(validatedRoomId, playerId);
    if (room) {
      namespace.to(validatedRoomId).emit("roomLobbyUpdate", room);
    }
  });

  socket.on("startMatch", (rawRoomId: string) => {
    if (!checkSocketRateLimit(socket, "startMatch", 5, 5)) return;

    const validatedRoomId = validateSocketPayload(
      socket,
      roomIdSchema,
      rawRoomId,
      "startMatch",
    );
    if (!validatedRoomId) return;

    const roomId = validatedRoomId;
    const playerId = socket.data?.sessionId || socket.id;
    const room = roomManager.getRoom(roomId);
    if (!room || (room.hostId !== playerId && room.hostId !== socket.id))
      return;

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
    namespace
      .to("lobby_viewers")
      .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));

    const interval = setInterval(() => {
      countdown -= 1;
      const currentRoom = roomManager.getRoom(roomId);
      if (!currentRoom || currentRoom.status === "in_progress") {
        clearInterval(interval);
        return;
      }

      if (countdown > 0) {
        currentRoom.countdown = countdown;
        namespace.to(roomId).emit("roomLobbyUpdate", currentRoom);
      } else {
        clearInterval(interval);
        currentRoom.status = "in_progress";
        currentRoom.countdown = null;
        MatchService.recordMatchStart(currentRoom);
        console.log(
          `[Match] [${gameType.toUpperCase()}] Game started in Room GH-${roomId.substring(0, 5).toUpperCase()} with ${currentRoom.playerCount} players`,
        );

        // Ensure all lobby players are registered in the game logic instance before onGameStarted
        const game = gameMap.get(roomId);
        if (game && typeof game.addPlayer === "function") {
          for (const p of currentRoom.players) {
            game.addPlayer(p.socketId || p.id);
          }
        }

        namespace.to(roomId).emit("roomLobbyUpdate", currentRoom);
        namespace
          .to("lobby_viewers")
          .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
        namespace.to(roomId).emit("gameStarted");

        if (onGameStarted) {
          if (game) onGameStarted(roomId, game);
        }
      }
    }, 1000);
  });

  const handleLeaveOrDisconnect = (
    roomId: string,
    isIntentional: boolean = false,
  ) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const playerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;

    // Idempotency: skip if player already left
    if (
      !room.players.find(
        (p) =>
          p.id === playerId || p.socketId === socket.id || p.id === socket.id,
      )
    )
      return;

    const wasInProgress = room.status === "in_progress";
    const oldHostId = room.hostId;
    const leaverLogId = getLogId(socket);
    const leaverName =
      socket.data?.playerName ||
      socket.handshake.auth.playerName ||
      `PLAYER-${socket.id.substring(0, 5).toUpperCase()}`;

    // =========================================================================
    // RECONNECTION GRACE PERIOD (30s) FOR INVOLUNTARY DISCONNECTIONS IN MATCH
    // =========================================================================
    if (wasInProgress && !isIntentional) {
      const markResult = roomManager.markPlayerDisconnected(roomId, playerId);
      if (markResult) {
        const { activeCount } = markResult;
        const isPaused = activeCount < 2; // Pause only if < 2 active players remain
        let remainingSeconds = 30;
        const timeoutKey = `${roomId}:${playerId}`;

        console.log(
          `[GracePeriod] [${gameType.toUpperCase()}] ${leaverName} temporarily disconnected from Room GH-${roomId.substring(0, 5).toUpperCase()} (${activeCount} active remain, isPaused: ${isPaused})`,
        );

        // Notify room about temporary disconnection
        namespace.to(roomId).emit("playerTemporarilyDisconnected", {
          playerId,
          playerName: leaverName,
          countdown: remainingSeconds,
          isPaused,
        });

        if (!isPaused) {
          namespace
            .to(roomId)
            .emit("playerLeft", `${leaverName} desconectou (30s para voltar)`);
        }

        const graceInterval = setInterval(() => {
          remainingSeconds -= 1;

          if (remainingSeconds > 0) {
            namespace.to(roomId).emit("reconnectionCountdownUpdate", {
              playerId,
              countdown: remainingSeconds,
              isPaused,
            });
          } else {
            // 30 seconds expired without reconnection!
            clearInterval(graceInterval);
            reconnectionTimeouts.delete(timeoutKey);
            console.log(
              `[GracePeriod] [${gameType.toUpperCase()}] Grace period expired for ${leaverName} in Room GH-${roomId.substring(0, 5).toUpperCase()}`,
            );

            if (isPaused) {
              // 2-Player Match (or < 2 active): Terminate match
              handleLeaveOrDisconnect(roomId, true);
            } else {
              // 3+ Player Match: Eliminate ONLY the disconnected player; match continues!
              const updatedRoom = roomManager.leaveRoom(roomId, playerId);
              const game = gameMap.get(roomId);
              if (game && typeof game.removePlayer === "function") {
                game.removePlayer(socket.id);
                game.removePlayer(playerId);
              }

              namespace.to(roomId).emit("playerEliminated", {
                playerId,
                playerName: leaverName,
                reason: "Desconexão expirada (30s)",
              });

              if (updatedRoom) {
                namespace.to(roomId).emit("roomLobbyUpdate", updatedRoom);
              }
              namespace
                .to("lobby_viewers")
                .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
            }
          }
        }, 1000);

        reconnectionTimeouts.set(timeoutKey, {
          interval: graceInterval,
          remaining: remainingSeconds,
          isPaused,
        });

        return;
      }
    }

    // Cancel any active grace timer if leaving intentionally
    cancelReconnectionGrace(roomId, playerId);

    const updatedRoom = roomManager.leaveRoom(roomId, playerId);

    if (!updatedRoom) {
      // Room empty (already deleted by RoomManager)
      console.log(
        `[Lobby] [${gameType.toUpperCase()}] Room GH-${roomId.substring(0, 5).toUpperCase()} destroyed (Empty)`,
      );
      namespace.to(roomId).emit("roomDestroyed");
      gameMap.delete(roomId);
      roomActionLock.clearRoom(roomId);
      roomTimerManager.clearAllTimers(roomId);
      if (onRoomDestroyed) onRoomDestroyed(roomId);
      namespace.in(roomId).socketsLeave(roomId);
    } else {
      const game = gameMap.get(roomId);
      if (game && typeof game.removePlayer === "function") {
        game.removePlayer(socket.id);
        game.removePlayer(playerId);
      }

      // Preparation of notification message
      let message = `${leaverName} left the match`;
      if (oldHostId === playerId || oldHostId === socket.id) {
        message = `${leaverName} left (Host)\n${updatedRoom.hostName} is the new Host`;
      }

      if (wasInProgress) {
        if (updatedRoom.playerCount < 2) {
          // Cannot continue match with < 2 players - Match Terminated
          updatedRoom.status = "waiting";
          updatedRoom.countdown = 5; // Start backend countdown
          MatchService.recordMatchAbandon(roomId);
          roomTimerManager.clearTurnTimeout(roomId);
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
              roomActionLock.clearRoom(roomId);
              roomTimerManager.clearAllTimers(roomId);
              if (onRoomDestroyed) onRoomDestroyed(roomId);
              namespace.to(roomId).emit("roomDestroyed");
              namespace.to(roomId).emit("matchTerminated");
              namespace.in(roomId).socketsLeave(roomId);
              namespace
                .to("lobby_viewers")
                .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
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
    namespace
      .to("lobby_viewers")
      .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  };

  socket.on("leaveRoom", (rawRoomId: string) => {
    const validatedRoomId = validateSocketPayload(
      socket,
      roomIdSchema,
      rawRoomId,
      "leaveRoom",
    );
    const roomId = validatedRoomId || rawRoomId;

    socket.leave(roomId);
    socket.join("lobby_viewers");
    if (onLeaveExtra) onLeaveExtra(socket.id);
    handleLeaveOrDisconnect(roomId, true); // Intentional leave
  });

  socket.on("disconnect", () => {
    const playerId =
      roomManager.getPlayerIdBySocketId(socket.id) ||
      socket.data?.sessionId ||
      socket.id;
    const roomId =
      roomManager.getRoomIdByPlayerId(playerId) ||
      roomManager.getRoomIdByPlayerId(socket.id);
    if (roomId) {
      socket.leave(roomId);
      if (onLeaveExtra) onLeaveExtra(socket.id);
      handleLeaveOrDisconnect(roomId, false); // Involuntary disconnect (triggers 30s grace if in match)
    }
  });

  socket.on(
    "timeSync",
    (
      data: { clientSendTime: number },
      callback: (res: { clientSendTime: number; serverTime: number }) => void,
    ) => {
      if (typeof callback === "function") {
        callback({
          clientSendTime: data?.clientSendTime || Date.now(),
          serverTime: Date.now(),
        });
      }
    },
  );

  socket.on("syncLobby", (rawRoomId: string) => {
    const validatedRoomId = validateSocketPayload(
      socket,
      roomIdSchema,
      rawRoomId,
      "syncLobby",
    );
    if (!validatedRoomId) return;

    const roomId = validatedRoomId;
    const playerId = socket.data?.sessionId || socket.id;

    socket.leave("lobby_viewers");
    socket.join(roomId);

    // Cancel pending grace period if player was temporarily disconnected
    const hadGracePeriod = cancelReconnectionGrace(roomId, playerId);
    if (hadGracePeriod) {
      const rebind = roomManager.rebindPlayer(roomId, playerId, socket.id);
      if (rebind) {
        console.log(
          `[GracePeriod] [${gameType.toUpperCase()}] ${getLogId(socket)} reconnected via syncLobby to Room GH-${roomId.substring(0, 5).toUpperCase()}`,
        );
        namespace.to(roomId).emit("playerReconnected", {
          playerId,
          playerName: rebind.player.name,
        });
      }
    }

    const room = roomManager.getRoom(roomId);
    if (room) {
      socket.emit("roomLobbyUpdate", room);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on("updateRoomConfig", (rawData: any) => {
    if (!checkSocketRateLimit(socket, "updateRoomConfig", 8, 3)) return;

    const validData = validateSocketPayload(
      socket,
      updateRoomConfigSchema,
      rawData,
      "updateRoomConfig",
    );
    if (!validData) return;

    const { roomId, config } = validData;
    const playerId = socket.data?.sessionId || socket.id;
    const room = roomManager.getRoom(roomId);
    if (!room || (room.hostId !== playerId && room.hostId !== socket.id))
      return;

    const updatedRoom = roomManager.updateRoomConfig(roomId, config as any);
    if (updatedRoom) {
      // Update the game logic instance if it supports live updates
      const game = gameMap.get(roomId);
      if (game && typeof game.updateConfig === "function") {
        game.updateConfig(config as any);
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
      roomActionLock.clearRoom(roomId);
      roomTimerManager.clearAllTimers(roomId);

      namespace.to(roomId).emit("roomDestroyed");
      namespace.to(roomId).emit("matchTerminated");

      // Update the room list only for lobby viewers
      namespace
        .to("lobby_viewers")
        .emit("roomListUpdate", roomManager.getAvailableRooms(gameType));

      console.log(
        `[Match] [${gameType.toUpperCase()}] Room GH-${roomId.substring(0, 5).toUpperCase()} destroyed after auto-return delay.`,
      );
    }
  }, delayMs);

  matchReturnTimeouts.set(roomId, timeout);
}

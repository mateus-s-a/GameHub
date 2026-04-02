import { Socket, Namespace } from "socket.io";
import { roomManager } from "./RoomManager";

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
    const hostName = `player-${socket.id.substring(0, 5)}`;
    let maxPlayers = config?.maxPlayers || 2;
    const room = roomManager.createRoom(
      gameType,
      socket.id,
      hostName,
      maxPlayers,
      config || {},
    );
    gameMap.set(room.id, createGameLogic(config || {}));

    socket.join(room.id);
    socket.emit("matchFound", { roomId: room.id, isHost: true });
    namespace.emit("roomListUpdate", roomManager.getAvailableRooms(gameType));
  });

  socket.on("joinSpecificRoom", (roomId: string) => {
    const playerName = `player-${socket.id.substring(0, 5)}`;
    const room = roomManager.joinRoom(roomId, socket.id, playerName);
    if (!room) {
      socket.emit("roomError", "Room is full or doesn't exist.");
      return;
    }

    socket.join(roomId);
    socket.emit("matchFound", { roomId, isHost: false });
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

    const wasInProgress = room.status === "in_progress";
    const oldHostId = room.hostId;

    const updatedRoom = roomManager.leaveRoom(roomId, socket.id);

    if (!updatedRoom) {
      // Room empty (already deleted by RoomManager)
      namespace.to(roomId).emit("roomDestroyed");
      gameMap.delete(roomId);
    } else {
      const game = gameMap.get(roomId);
      if (game && typeof game.removePlayer === "function") {
        game.removePlayer(socket.id);
      }

      // Preparation of notification message
      let message = `player-${socket.id.substring(0, 5)} left the match`;
      if (oldHostId === socket.id) {
        message = `player-${socket.id.substring(0, 5)} left (Host)\nplayer-${updatedRoom.hostId.substring(0, 5)} is the new Host`;
      }

      if (wasInProgress) {
        if (updatedRoom.playerCount < 2) {
          // Cannot continue match with < 2 players - Match Terminated
          updatedRoom.status = "waiting";
          updatedRoom.countdown = 5; // Start backend countdown
          namespace.to(roomId).emit("opponentDisconnected");
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
    for (const [roomId, game] of gameMap.entries()) {
      if (game.players && game.players.has(socket.id)) {
        if (onLeaveExtra) onLeaveExtra(socket.id);
        handleLeaveOrDisconnect(roomId);
      }
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

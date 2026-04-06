import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getSessionId } from "@/(shared)/providers/SocketProvider";
import { RoomInfo } from "@gamehub/types";

interface UseMatchManagerOptions {
  namespace: string;
  playerName: string;
}

export function useMatchManager({ namespace, playerName }: UseMatchManagerOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localSocketId, setLocalSocketId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);
  const [matchTerminationCountdown, setMatchTerminationCountdown] = useState<number | null>(null);
  const [tempNotification, setTempNotification] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [roomLobby, setRoomLobby] = useState<RoomInfo | null>(null);

  // Core reset logic to prevent "stuck" notifications
  const resetMatchStates = useCallback(() => {
    setDisconnectMessage(null);
    setMatchTerminationCountdown(null);
    setTempNotification(null);
    setRematchRequested(false);
    setIsGameStarted(false);
  }, []);

  useEffect(() => {
    const sessionId = getSessionId();
    const s: Socket = io(`http://localhost:3001/${namespace}`, {
      auth: { playerName, sessionId },
    });
    setSocket(s);

    s.on("connect", () => {
      setLocalSocketId(s.id || null);
    });

    s.on("matchFound", ({ roomId, isHost }) => {
      resetMatchStates(); // THE GLOBAL RULE: Clear all previous session info
      setRoomId(roomId);
      setIsHost(isHost || false);
      s.emit("syncLobby", roomId); // Fetch initial lobby data immediately
    });

    s.on("roomLobbyUpdate", (room: RoomInfo) => {
      setRoomLobby(room);
    });

    s.on("roomDestroyed", () => {
      setDisconnectMessage(
        "Server destroyed the room because: The match was terminated by the system."
      );
    });

    s.on("gameStarted", () => {
      setIsGameStarted(true);
    });

    s.on("rematchStarted", () => {
      setRematchRequested(false);
    });

    s.on("opponentDisconnected", ({ playerName: leaverName }: { playerName: string }) => {
      setDisconnectMessage(`Connection Lost: ${leaverName} has left the match.`);
    });

    s.on("matchTerminationUpdate", ({ countdown }: { countdown: number }) => {
      setMatchTerminationCountdown(countdown);
    });

    s.on("matchTerminated", () => {
      setRoomId(null);
      setRoomLobby(null);
      setIsHost(false);
      resetMatchStates();
    });

    s.on("playerLeft", (message: string) => {
      setTempNotification(message);
      setTimeout(() => setTempNotification(null), 5000);
    });

    return () => {
      s.disconnect();
    };
  }, [namespace, playerName, resetMatchStates]);

  // Common Actions
  const createRoom = useCallback((config: any) => {
    socket?.emit("createRoom", config);
  }, [socket]);

  const joinRoom = useCallback((id: string) => {
    socket?.emit("joinSpecificRoom", id);
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setRoomLobby(null);
    setIsHost(false);
    resetMatchStates();
  }, [socket, roomId, resetMatchStates]);

  const toggleReady = useCallback(() => {
    if (socket && roomId) {
      socket.emit("toggleReady", roomId);
    }
  }, [socket, roomId]);

  const startMatch = useCallback(() => {
    if (socket && roomId) {
      socket.emit("startMatch", roomId);
    }
  }, [socket, roomId]);

  const requestRematch = useCallback(() => {
    if (socket && roomId) {
      setRematchRequested(true);
      socket.emit("requestRematch", roomId);
    }
  }, [socket, roomId]);

  const updateRoomConfig = useCallback((config: any) => {
    if (socket && roomId) {
      socket.emit("updateRoomConfig", { roomId, config });
    }
  }, [socket, roomId]);

  return {
    socket,
    localSocketId,
    roomId,
    setRoomId,
    isHost,
    setIsHost,
    isGameStarted,
    setIsGameStarted,
    roomLobby,
    disconnectMessage,
    setDisconnectMessage,
    matchTerminationCountdown,
    tempNotification,
    setTempNotification,
    rematchRequested,
    setRematchRequested,
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startMatch,
    requestRematch,
    updateRoomConfig,
    resetMatchStates
  };
}

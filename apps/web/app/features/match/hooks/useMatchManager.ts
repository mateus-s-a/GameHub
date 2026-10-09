import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getSessionId, useSocket } from "@/(shared)/providers/SocketProvider";
import { RoomInfo } from "@gamehub/types";

interface UseMatchManagerOptions {
  namespace: string;
  playerName: string;
}

export interface ReconnectionGraceState {
  playerId: string;
  playerName: string;
  countdown: number;
  isPaused: boolean;
}

export function useMatchManager({
  namespace,
  playerName,
}: UseMatchManagerOptions) {
  const { setIsLocked } = useSocket();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localSocketId, setLocalSocketId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );
  const [matchTerminationCountdown, setMatchTerminationCountdown] = useState<
    number | null
  >(null);
  const [returnToLobbyCountdown, setReturnToLobbyCountdown] = useState<
    number | null
  >(null);
  const [tempNotification, setTempNotification] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [roomLobby, setRoomLobby] = useState<RoomInfo | null>(null);
  const [reconnectionGrace, setReconnectionGrace] =
    useState<ReconnectionGraceState | null>(null);

  // Ref to capture current roomId for cleanup (useEffect closures can't read state reliably)
  const roomIdRef = useRef<string | null>(null);

  // Core reset logic to prevent "stuck" notifications
  const resetMatchStates = useCallback(() => {
    setDisconnectMessage(null);
    setMatchTerminationCountdown(null);
    setReturnToLobbyCountdown(null);
    setTempNotification(null);
    setRematchRequested(false);
    setIsGameStarted(false);
    setReconnectionGrace(null);
  }, []);

  useEffect(() => {
    const sessionId = getSessionId();
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("gh_auth_token")
        : null;
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const s: Socket = io(`${socketUrl}/${namespace}`, {
      auth: { playerName, sessionId, token },
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
      // Synchronize host status in case of migration (check both socket.id and sessionId)
      const currentSessionId = getSessionId();
      setIsHost(
        room.hostId === s.id || (!!currentSessionId && room.hostId === currentSessionId),
      );
    });

    s.on("roomDestroyed", () => {
      setDisconnectMessage(
        "Server destroyed the room because: The match was terminated by the system.",
      );
    });

    s.on("gameStarted", () => {
      setIsGameStarted(true);
    });

    s.on("rematchStarted", () => {
      setRematchRequested(false);
    });

    s.on(
      "opponentDisconnected",
      ({ playerName: leaverName }: { playerName: string }) => {
        setDisconnectMessage(
          `Connection Lost: ${leaverName} has left the match.`,
        );
      },
    );

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

    s.on(
      "playerTemporarilyDisconnected",
      (data: ReconnectionGraceState) => {
        setReconnectionGrace(data);
      },
    );

    s.on(
      "reconnectionCountdownUpdate",
      ({
        playerId,
        countdown,
        isPaused,
      }: {
        playerId: string;
        countdown: number;
        isPaused: boolean;
      }) => {
        setReconnectionGrace((prev) =>
          prev ? { ...prev, playerId, countdown, isPaused } : null,
        );
      },
    );

    s.on("playerReconnected", ({ playerName }: { playerName: string }) => {
      setReconnectionGrace(null);
      setTempNotification(`${playerName} reconectou à partida!`);
      setTimeout(() => setTempNotification(null), 4000);
    });

    s.on(
      "playerEliminated",
      ({
        playerName,
        reason,
      }: {
        playerName: string;
        reason: string;
      }) => {
        setReconnectionGrace(null);
        setTempNotification(`${playerName} foi eliminado (${reason})`);
        setTimeout(() => setTempNotification(null), 5000);
      },
    );

    s.on("rateLimitExceeded", ({ message }: { message: string }) => {
      setTempNotification(`⚠️ ${message}`);
      setTimeout(() => setTempNotification(null), 4000);
    });

    s.on("invalidMove", ({ message }: { message: string }) => {
      setTempNotification(`⚠️ ${message}`);
      setTimeout(() => setTempNotification(null), 3000);
    });

    return () => {
      // SPA navigation guard: attempt clean leave before disconnect
      if (roomIdRef.current) {
        s.emit("leaveRoom", roomIdRef.current);
      }
      s.disconnect();
    };
  }, [namespace, playerName, resetMatchStates]);

  // Common Actions
  const createRoom = useCallback(
    (config: any) => {
      socket?.emit("createRoom", config);
    },
    [socket],
  );

  const joinRoom = useCallback(
    (id: string) => {
      socket?.emit("joinSpecificRoom", id);
    },
    [socket],
  );

  const leaveRoom = useCallback(() => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setRoomLobby(null);
    setIsHost(false);
    resetMatchStates();
  }, [socket, roomId, resetMatchStates]);

  // Keep the ref in sync with state so cleanup can read it
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    setIsLocked(!!roomId);
    return () => setIsLocked(false);
  }, [roomId, setIsLocked]);

  // The countdown ticking is delegated to isolated components (e.g. ReturnToLobbyBadge)
  // to avoid triggering full page re-renders every 1000ms.

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

  const updateRoomConfig = useCallback(
    (config: any) => {
      if (socket && roomId) {
        socket.emit("updateRoomConfig", { roomId, config });
      }
    },
    [socket, roomId],
  );

  const makeMove = useCallback(
    (action: any) => {
      if (socket && roomId) {
        socket.emit("gameMove", { roomId, action });
      }
    },
    [socket, roomId],
  );

  const localPlayerId = getSessionId() || localSocketId;

  return {
    socket,
    localSocketId,
    localPlayerId,
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
    makeMove,
    resetMatchStates,
    returnToLobbyCountdown,
    setReturnToLobbyCountdown,
    reconnectionGrace,
    setReconnectionGrace,
  };
}

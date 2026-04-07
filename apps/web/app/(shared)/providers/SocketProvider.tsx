"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  socketId: string | null;
  playerName: string;
  updatePlayerName: (newName: string) => void;
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isConnected: boolean;
  isProfileExpanded: boolean;
  setIsProfileExpanded: (expanded: boolean) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  socketId: null,
  playerName: "GUEST",
  updatePlayerName: () => {},
  isLocked: false,
  setIsLocked: () => {},
  isConnected: false,
  isProfileExpanded: true,
  setIsProfileExpanded: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const getSessionId = () => {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem("gh_session_id");
  if (!id) {
    id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("gh_session_id", id);
  }
  return id;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isProfileExpanded, setIsProfileExpandedState] = useState(true);

  // Player state
  const [playerName, setPlayerName] = useState<string>("GUEST");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sessionId = getSessionId();

    // Initialize playerName from localStorage or sessionId
    const storedName = localStorage.getItem("gh_player_name");
    if (storedName) {
      setPlayerName(storedName);
    } else if (sessionId) {
      setPlayerName(`PLAYER-${sessionId.slice(0, 5).toUpperCase()}`);
    }

    // Initialize isProfileExpanded from localStorage
    const storedExpanded = localStorage.getItem("gh_profile_expanded");
    if (storedExpanded !== null) {
      setIsProfileExpandedState(storedExpanded === "true");
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    console.log("Connecting to Socket at:", socketUrl);
    const s = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: { sessionId },
    });

    s.on("connect", () => {
      setSocketId(s.id || null);
      setIsConnected(true);
    });

    s.on("disconnect", () => {
      setSocketId(null);
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const updatePlayerName = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem("gh_player_name", newName);
  };

  const setIsProfileExpanded = (expanded: boolean) => {
    setIsProfileExpandedState(expanded);
    localStorage.setItem("gh_profile_expanded", expanded.toString());
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        socketId,
        playerName,
        updatePlayerName,
        isLocked,
        setIsLocked,
        isConnected,
        isProfileExpanded,
        setIsProfileExpanded,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  socketId: string | null;
  playerName: string;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  socketId: null,
  playerName: "GUEST",
  isConnected: false,
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

  // Derived playerName following the player-{short-id} rule
  const playerName = socketId
    ? `PLAYER-${socketId.slice(0, 5).toUpperCase()}`
    : "GUEST";

  useEffect(() => {
    // Only connect once on the client side
    if (typeof window === "undefined") return;

    const sessionId = getSessionId();
    const s = io("http://localhost:3001", {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      auth: { sessionId },
    });

    s.on("connect", () => {
      // Use a local check for the global connection to keep it simple within the provider
      if (!(window as any)._gh_logged_global) {
        console.log("Global Socket Connected:", s.id);
        (window as any)._gh_logged_global = true;
        setTimeout(() => { (window as any)._gh_logged_global = false; }, 5000);
      }
      setSocketId(s.id || null);
      setIsConnected(true);
    });

    s.on("disconnect", () => {
      console.log("Global Socket Disconnected");
      setSocketId(null); // Reset when disconnected to trigger "GUEST" fallback
      setIsConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket, socketId, playerName, isConnected }}
    >
      {children}
    </SocketContext.Provider>
  );
};

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

    const s = io("http://localhost:3001", {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    s.on("connect", () => {
      console.log("Global Socket Connected:", s.id);
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

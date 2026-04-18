"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getGameBySlug,
  GameEvent,
  HangmanGameState,
  HangmanEvent,
} from "@gamehub/core";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";
import { useMatchManager } from "@/features/match/hooks/useMatchManager";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import AlertModal from "@/(shared)/components/ui/AlertModal";
import VirtualKeyboard from "@/features/games/components/hangman/VirtualKeyboard";
import HangmanVisual from "@/features/games/components/hangman/HangmanVisual";
import OpponentProgress from "@/features/games/components/hangman/OpponentProgress";
import TimerDisplay from "@/features/match/components/TimerDisplay";

export default function HangmanPage() {
  const { playerName } = useSocket();
  const gameMetadata = getGameBySlug("hangman");

  const {
    socket,
    localSocketId,
    roomId,
    setIsHost,
    isGameStarted,
    roomLobby,
    disconnectMessage,
    matchTerminationCountdown,
    tempNotification,
    setTempNotification,
    // Actions
    joinRoom,
    leaveRoom,
    toggleReady,
    startMatch,
    makeMove,
    updateRoomConfig,
  } = useMatchManager({
    namespace: "hangman",
    playerName,
  });

  const [gameState, setGameState] = useState<HangmanGameState | null>(null);
  const [isMatchOver, setIsMatchOver] = useState(false);
  const [returnCountdown, setReturnCountdown] = useState<number | null>(null);
  const rooms = useRoomList(socket);

  const myState = gameState?.players[localSocketId || ""];
  const isGameOver = myState?.status !== "playing" || isMatchOver;

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on(GameEvent.STATE_UPDATE, (state: HangmanGameState) => {
      setGameState(state);
    });

    socket.on(HangmanEvent.PLAYER_SOLVED, () => {
      // Internal celebration or notification
      setTempNotification("YOU SOLVED THE WORD!");
    });

    socket.on(HangmanEvent.MATCH_OVER, (state: HangmanGameState) => {
      setGameState(state);
      setIsMatchOver(true);
      setReturnCountdown(10);
    });

    return () => {
      socket.off(GameEvent.STATE_UPDATE);
      socket.off(HangmanEvent.PLAYER_SOLVED);
      socket.off(HangmanEvent.MATCH_OVER);
    };
  }, [socket, setTempNotification]);

  // Countdown for returning to lobby
  useEffect(() => {
    if (returnCountdown === null || returnCountdown <= 0) return;
    const timer = setInterval(() => {
      setReturnCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [returnCountdown]);

  // Reset states when match is terminated by server
  useEffect(() => {
    if (!roomId) {
      setIsMatchOver(false);
      setReturnCountdown(null);
    }
  }, [roomId]);

  // PHYSICAL KEYBOARD SUPPORT: Global listener with debouncing/cache
  useEffect(() => {
    if (
      !isGameStarted ||
      !socket ||
      !myState ||
      myState.status !== "playing" ||
      isGameOver
    )
      return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toUpperCase();
      if (/^[A-Z]$/.test(char) && !myState.guessedLetters.includes(char)) {
        makeMove({ letter: char });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGameStarted, socket, myState, isGameOver, makeMove]);

  const handleKeyPress = (letter: string) => {
    makeMove({ letter });
  };

  if (!roomId) {
    return (
      <GameShell playerName={playerName}>
        <RoomBrowser
          rooms={rooms}
          onCreateRoom={() => {
            setIsHost(true);
            socket?.emit("createRoom", { maxRounds: 1, timeLimit: 60 });
          }}
          onJoinRoom={(id) => joinRoom(id)}
          gameLabel="Hangman"
        />
      </GameShell>
    );
  }

  if (roomId && !isGameStarted) {
    return (
      <RoomLobby
        roomLobby={roomLobby}
        localPlayerId={localSocketId || ""}
        onToggleReady={toggleReady}
        onStartMatch={startMatch}
        onLeaveRoom={leaveRoom}
        onUpdateConfig={updateRoomConfig}
        themeColor="lime"
        tempNotification={tempNotification}
      />
    );
  }

  return (
    <GameShell playerName={playerName}>
      {matchTerminationCountdown !== null && (
        <MatchTerminationBanner
          countdown={matchTerminationCountdown}
          title="Match Terminated"
          message="Insufficient players remaining. Returning to lobby..."
        />
      )}

      <AlertModal
        isOpen={!!disconnectMessage && !isGameOver}
        title="Connection Lost"
        message={disconnectMessage || ""}
      />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 pt-8 px-4">
        {/* Main Stage */}
        <div className="flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-iosevka-bold tracking-widest text-white/90 uppercase">
              Hangman Versus
            </h1>
            <div className="flex items-center gap-4 text-[10px] font-iosevka-medium tracking-widest text-white/30">
              <span>ROOM: {roomId.substring(0, 8)}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>CATEGORY: {gameMetadata?.category}</span>
            </div>
          </div>

          <Card className="w-full p-8 md:p-12 bg-[#121212] border-white/5 flex flex-col md:flex-row items-center gap-16 relative overflow-hidden shadow-2xl">
            {/* Ambient Background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${gameMetadata?.accentColor}, transparent 70%)`,
              }}
            />

            {/* Visual Gallows */}
            <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
              <HangmanVisual
                attemptsLeft={myState?.attemptsLeft ?? 6}
                className="w-full h-full"
              />
            </div>

            {/* Masked Word Stage */}
            <div className="relative z-10 flex flex-col items-center gap-12 flex-1 w-full">
              <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                {myState?.maskedWord
                  .split("")
                  .map((char: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`
                      w-10 h-14 md:w-14 md:h-20 rounded-xl flex items-center justify-center border-b-4
                      text-2xl md:text-4xl font-iosevka-bold transition-all duration-500
                      ${char === "_" ? "bg-white/[0.02] border-white/10 text-transparent" : "bg-white/[0.05] border-white/20 text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]"}
                    `}
                    >
                      {char !== "_" && char}
                    </motion.div>
                  ))}
              </div>

              {/* Input Area */}
              <div className="w-full flex flex-col items-center gap-8">
                <VirtualKeyboard
                  onKeyPress={handleKeyPress}
                  guessedLetters={myState?.guessedLetters || []}
                  disabled={myState?.status !== "playing" || isGameOver}
                />

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-white/20 font-iosevka-bold uppercase tracking-widest">
                      Attempts
                    </span>
                    <span
                      className={`text-2xl font-iosevka-bold ${myState?.attemptsLeft && myState.attemptsLeft <= 2 ? "text-red-500 animate-pulse" : "text-white"}`}
                    >
                      {myState?.attemptsLeft || 0}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/5" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-white/20 font-iosevka-bold uppercase tracking-widest">
                      Progress
                    </span>
                    <span className="text-2xl font-iosevka-bold text-white/80">
                      {Math.round((myState?.progress || 0) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar: Opponents Progress */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xs font-iosevka-bold tracking-[0.3em] text-white/30 uppercase pl-2">
            Competitors
          </h2>
          <div className="flex flex-col gap-4">
            {roomLobby?.players.map((player) => {
              const pState = gameState?.players[player.id];
              const isLocal = player.id === localSocketId;

              return (
                <Card
                  key={player.id}
                  className={`p-5 bg-[#141414] border-white/5 transition-all duration-300 ${isLocal ? "ring-1 ring-white/10" : ""}`}
                >
                  <OpponentProgress
                    attemptsLeft={pState?.attemptsLeft ?? 6}
                    progress={pState?.progress ?? 0}
                    isLocal={isLocal}
                  />
                </Card>
              );
            })}
          </div>

          {/* Leaderboard Overlay */}
          <AnimatePresence>
            {isMatchOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 bg-lime-500/10 border border-lime-500/20 rounded-2xl flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Countdown Progress Bar */}
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="absolute top-0 left-0 h-0.5 bg-lime-500/40"
                />

                <h3 className="text-sm font-iosevka-bold text-lime-400 tracking-widest uppercase text-center">
                  Final Standings
                </h3>
                <div className="flex flex-col gap-2">
                  {gameState?.winners.map((winnerId: string, index: number) => (
                    <div
                      key={winnerId}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lime-500/40 font-iosevka-bold">
                          #{index + 1}
                        </span>
                        <span className="text-white/80">
                          {
                            roomLobby?.players.find((p) => p.id === winnerId)
                              ?.name
                          }
                        </span>
                      </div>
                      <span className="font-iosevka-bold text-lime-400">
                        +{index === 0 ? 5 : index === 1 ? 3 : 1} PTS
                      </span>
                    </div>
                  ))}
                  {/* Players who failed */}
                  {Object.entries(gameState?.players || {})
                    .filter(([, p]) => p.status === "failed")
                    .map(([id]) => (
                      <div
                        key={id}
                        className="flex items-center justify-between text-xs opacity-40"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white/40 font-iosevka-bold">
                            ELIM
                          </span>
                          <span className="text-white/80">
                            {roomLobby?.players.find((p) => p.id === id)?.name}
                          </span>
                        </div>
                        <span className="font-iosevka-bold text-red-500">
                          0 PTS
                        </span>
                      </div>
                    ))}
                </div>

                <div className="mt-4 flex flex-col items-center gap-2">
                  <span className="text-[10px] text-white/20 font-iosevka-bold uppercase tracking-widest">
                    Returning to Lobby in {returnCountdown}s
                  </span>
                  <Button
                    onClick={leaveRoom}
                    className="w-full bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-iosevka-bold uppercase tracking-widest py-2"
                  >
                    LEAVE NOW
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GameShell>
  );
}

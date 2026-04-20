"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GAME_CONSTANTS } from "@gamehub/core";
import {
  getGameBySlug,
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
import NavButton from "@/(shared)/components/ui/NavButton";
import VirtualKeyboard from "@/features/games/components/hangman/VirtualKeyboard";
import HangmanVisual from "@/features/games/components/hangman/HangmanVisual";
import OpponentProgress from "@/features/games/components/hangman/OpponentProgress";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import GameSetup from "@/features/setup/components/GameSetup";
import { GameSetupConfig } from "@gamehub/types";
import Scoreboard from "@/features/match/components/Scoreboard";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import MatchLayout from "@/features/match/components/MatchLayout";
import { X } from "lucide-react";

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
    rematchRequested,
    // Actions
    joinRoom,
    leaveRoom,
    toggleReady,
    startMatch,
    makeMove,
    requestRematch,
    updateRoomConfig,
    returnToLobbyCountdown,
    setReturnToLobbyCountdown,
  } = useMatchManager({
    namespace: "hangman",
    playerName,
  });

  const [gameState, setGameState] = useState<HangmanGameState | null>(null);
  const [isMatchOver, setIsMatchOver] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const rooms = useRoomList(socket);

  const myState = gameState?.players[localSocketId || ""];
  const isGameOver = isMatchOver || (myState != null && myState.status !== "playing");

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on(HangmanEvent.STATE_UPDATE, (state: HangmanGameState) => {
      setGameState(state);
    });

    socket.on(HangmanEvent.PLAYER_SOLVED, () => {
      // Internal celebration or notification
      setTempNotification("YOU SOLVED THE WORD!");
    });

    socket.on(HangmanEvent.MATCH_OVER, (state: HangmanGameState) => {
      setGameState(state);
      setIsMatchOver(true);
      setReturnToLobbyCountdown(GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC);
    });

    socket.on("matchTerminated", () => {
      setIsMatchOver(false);
      setReturnToLobbyCountdown(null);
    });

    socket.on("rematchStarted", () => {
      setIsMatchOver(false);
      setReturnToLobbyCountdown(null);
    });

    return () => {
      socket.off(HangmanEvent.STATE_UPDATE);
      socket.off(HangmanEvent.PLAYER_SOLVED);
      socket.off(HangmanEvent.MATCH_OVER);
    };
  }, [socket, setTempNotification]);

  // Countdown for returning to lobby


  // Reset states when match is terminated by server
  useEffect(() => {
    if (!roomId) {
      setIsMatchOver(false);
      setReturnToLobbyCountdown(null);
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

  if (setupNeeded && !roomId) {
    return (
      <GameShell playerName={playerName}>
        <div className="w-full max-w-5xl mx-auto flex flex-col items-start pt-12">
          <NavButton
            label="BACK TO LIST ROOMS"
            onClick={() => setSetupNeeded(false)}
            className="mb-12"
          />
          <div className="w-full flex justify-center">
            <GameSetup
              onStart={(config: GameSetupConfig) => {
                socket?.emit("createRoom", config);
                setSetupNeeded(false);
              }}
              onCancel={() => setSetupNeeded(false)}
              gameId="hangman"
            />
          </div>
        </div>
      </GameShell>
    );
  }

  if (!roomId && !setupNeeded) {
    return (
      <GameShell playerName={playerName}>
        <RoomBrowser
          rooms={rooms}
          onCreateRoom={() => {
            setIsHost(true);
            setSetupNeeded(true);
          }}
          onJoinRoom={(id) => joinRoom(id)}
          gameLabel="Hangman"
        />
      </GameShell>
    );
  }

  if (roomId && !isGameStarted) {
    return (
      <GameShell playerName={playerName}>
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
      </GameShell>
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

      <MatchLayout
        gameId="hangman"
        isGameOver={isMatchOver}
        onLeave={leaveRoom}
      >
        <Card className="w-full max-w-3xl p-8 md:p-12 bg-[#121212] border-white/5 flex flex-col items-center gap-8 relative overflow-hidden shadow-2xl">
          {/* Ambient Background */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_50%_50%,var(--theme-accent),transparent_70%)]" />

          <Scoreboard
            players={roomLobby?.players.map((p) => ({
              id: p.id,
              name: p.name,
              score: gameState?.players[p.id]?.score || 0,
              isConnected: true,
            })) || []}
            localPlayerId={localSocketId || ""}
            currentRound={gameState?.currentRound || 1}
            maxRounds={gameState?.maxRounds || 3}
            gameId="hangman"
          />

          {gameState?.isTransitioning && (gameState?.currentRound ?? 0) < (gameState?.maxRounds ?? 0) ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-sm font-iosevka-bold text-lime-400 uppercase tracking-[0.25em] animate-pulse">
                Prepare for Next Round
              </span>
              <TimerDisplay turnEndTime={gameState?.nextRoundStartTime || null} />
            </motion.div>
          ) : (
            <TimerDisplay turnEndTime={gameState?.turnEndTime || null} />
          )}

          <div className="w-full flex flex-col md:flex-row items-center gap-16 relative z-10">
            {/* Visual Gallows */}
            <div className="w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
              <HangmanVisual
                attemptsLeft={myState?.attemptsLeft ?? 6}
                className="w-full h-full"
              />
            </div>

            {/* Masked Word Stage */}
            <div className="flex flex-col items-center gap-12 flex-1 w-full">
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
                  disabled={
                    !myState || 
                    myState.status !== "playing" || 
                    isMatchOver || 
                    gameState?.isTransitioning
                  }
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
          </div>

          {isMatchOver && (
            <div className="w-full pt-8 border-t border-white/5 relative z-10">
              <div className="flex flex-col items-center gap-2 mb-4">
                <span className="text-[10px] text-white/20 font-iosevka-bold uppercase tracking-widest">
                  Returning to Lobby in {returnToLobbyCountdown}s
                </span>
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{
                    duration: GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC,
                    ease: "linear",
                  }}
                  className="w-full h-0.5 bg-lime-500/20"
                />
              </div>

              <EndMatchOptions
                rematchRequested={rematchRequested}
                opponentLeft={!!disconnectMessage}
                hasOpponentRequested={
                  gameState?.rematchRequests?.find((id) => id !== localSocketId) !==
                  undefined
                }
                onRequestRematch={requestRematch}
                onPlayAgain={leaveRoom}
                primaryColorGradient="from-lime-600 to-lime-900"
                primaryColorHover="hover:from-lime-500 hover:to-lime-800"
              />
            </div>
          )}
        </Card>
      </MatchLayout>
    </GameShell>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { GTFRoundState, GTFPlayer } from "@gamehub/guess-the-flag";
import { GameSetupConfig } from "@gamehub/types";
import GameSetup from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import AlertModal from "@/\(shared\)/components/ui/AlertModal";
import ConfirmModal from "@/\(shared\)/components/ui/ConfirmModal";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import ReturnToLobbyBadge from "@/features/match/components/ReturnToLobbyBadge";
import { X } from "lucide-react";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import RoundResults from "@/features/match/components/RoundResults";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import { useMatchManager } from "@/features/match/hooks/useMatchManager";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import Scoreboard from "@/features/match/components/Scoreboard";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket, getSessionId } from "@/(shared)/providers/SocketProvider";
import NavButton from "@/(shared)/components/ui/NavButton";
import { motion } from "framer-motion";
import { GAME_CONSTANTS } from "@gamehub/core";

interface GameState {
  state: GTFRoundState;
  currentRound: number;
  maxRounds: number;
  players: GTFPlayer[];
  flagUrl: string | null;
  options: string[];
  correctCountry: string | null;
  rematchRequests?: string[];
  timeLimit?: number;
  turnEndTime?: number | null;
  region?: string;
  maxPlayers?: number;
}

export default function GuessTheFlagGame() {
  const router = useRouter();
  const { socketId: globalSocketId, playerName } = useSocket();

  const {
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
    returnToLobbyCountdown,
    setReturnToLobbyCountdown,
  } = useMatchManager({
    namespace: "gtf",
    playerName,
  });

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localChoice, setLocalChoice] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isFlagLoading, setIsFlagLoading] = useState(true);

  useEffect(() => {
    if (gameState?.flagUrl) {
      setIsFlagLoading(true);
    }
  }, [gameState?.flagUrl]);

  const rooms = useRoomList(socket);

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    if (roomLobby?.status === "in_progress" && !isGameStarted) {
      setIsGameStarted(true);
    }
  }, [roomLobby?.status, isGameStarted, setIsGameStarted]);

  useEffect(() => {
    if (!socket) return;

    socket.on("gameState", (serverState: GameState) => {
      setGameState(serverState);
      if (
        serverState.state === "guessing_phase" &&
        !serverState.players.find((p) => p.id === socket.id)?.hasGuessed
      ) {
        setLocalChoice(null);
      }

      if (
        serverState.state === "game_over" &&
        returnToLobbyCountdown === null
      ) {
        setReturnToLobbyCountdown(GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC);
      }
    });

    socket.on("matchFound", () => {
      // Game-specific resets not covered by hook
      setGameState(null);
      setLocalChoice(null);
    });

    return () => {
      socket.off("gameState");
      socket.off("matchFound");
    };
  }, [socket]);

  const submitGuess = (guess: string) => {
    if (socket && roomId && gameState?.state === "guessing_phase") {
      setLocalChoice(guess);
      socket.emit("submitGuess", { roomId, guess });
    }
  };

  const playAgain = () => {
    leaveRoom();
    setGameState(null);
  };

  const handleReturnToSetup = () => {
    leaveRoom();
    setGameState(null);
    setSetupNeeded(true);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setGameState(null);
    setSetupNeeded(false);
  };

  const handleStartGame = (config: GameSetupConfig) => {
    createRoom(config);
    setSetupNeeded(false);
  };

  const handleCreateRoomClick = () => {
    setIsHost(true);
    setSetupNeeded(true);
  };

  const handleJoinRoomClick = (joinRoomId: string) => {
    setIsHost(false);
    joinRoom(joinRoomId);
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
              onStart={handleStartGame}
              onCancel={() => setSetupNeeded(false)}
              gameId="gtf"
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
          onCreateRoom={handleCreateRoomClick}
          onJoinRoom={handleJoinRoomClick}
          gameLabel="Guess the Flag"
        />
      </GameShell>
    );
  }

  const handleUpdateConfig = (config: GameSetupConfig) => {
    if (socket && roomId) {
      socket.emit("updateRoomConfig", { roomId, config });
    }
  };

  if (roomId && !isGameStarted) {
    return (
      <GameShell playerName={playerName}>
        <RoomLobby
          roomLobby={roomLobby}
          localPlayerId={localSocketId || ""}
          onToggleReady={toggleReady}
          onStartMatch={startMatch}
          onLeaveRoom={handleLeaveRoom}
          onUpdateConfig={handleUpdateConfig}
          themeColor="emerald"
          tempNotification={tempNotification}
        />
      </GameShell>
    );
  }

  if (!gameState) {
    return (
      <GameShell playerName={playerName}>
        <div className="min-h-screen bg-[#111111] flex items-center justify-center font-iosevka-bold text-xl text-orange-400 animate-pulse">
          Entering Arena...
        </div>
      </GameShell>
    );
  }

  const me = gameState.players.find((p) => p.id === localSocketId);

  return (
    <GameShell playerName={playerName}>
      {matchTerminationCountdown !== null && (
        <MatchTerminationBanner
          countdown={matchTerminationCountdown}
          title="Match Terminated"
          message="Insufficient players remaining. Returning to lobby..."
        />
      )}

      {tempNotification && matchTerminationCountdown === null && (
        <MatchTerminationBanner
          title="Notification"
          message={tempNotification}
        />
      )}

      {/* Temporary Toast Notification */}
      {tempNotification && (
        <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-[#1a1a1a] border-l-4 border-orange-500 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="font-iosevka-medium whitespace-pre-line">
              {tempNotification}
            </span>
            <button
              onClick={() => setTempNotification(null)}
              className="ml-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isExitModalOpen}
        title="Leave Match?"
        message="Are you sure you want to leave the current match? Your progress will be lost."
        onConfirm={() => {
          handleLeaveRoom();
          setIsExitModalOpen(false);
        }}
        onCancel={() => setIsExitModalOpen(false)}
        confirmText="Leave"
        cancelText="Stay"
        themeColor="red"
      />

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Responsive Grid Shell: Column on Mobile, 2-Column Split on Desktop */}
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start justify-center">
          
          {/* Left Column: HUD & Information Panel */}
          <Card className="w-full lg:w-80 p-5 md:p-6 flex flex-col items-center gap-5 bg-[#161616] border border-orange-500/20 shadow-2xl shrink-0">
            <h1 className="text-2xl md:text-3xl font-iosevka-bold text-white tracking-widest uppercase text-center drop-shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              Guess the Flag
            </h1>

            {/* Connection Status Badge */}
            <div className="flex items-center justify-between w-full text-xs font-iosevka-bold tracking-widest uppercase">
              <span
                className={`px-3 py-1.5 rounded-lg border ${localSocketId ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
              >
                {localSocketId ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>

            {/* Scoreboard */}
            <Scoreboard
              players={gameState.players.map((p) => ({
                ...p,
                name: roomLobby?.players.find((rp) => rp.id === p.id)?.name,
              }))}
              localPlayerId={localSocketId || ""}
              currentRound={gameState.currentRound}
              maxRounds={gameState.maxRounds}
              gameId="gtf"
            />

            {/* Turn Banner Status */}
            <div className="text-center text-sm md:text-base py-3 px-4 flex items-center justify-center w-full bg-[#111111] rounded-xl border border-white/5 shadow-inner">
              {gameState.state === "guessing_phase" && !me?.hasGuessed && (
                <span className="text-orange-400 animate-pulse font-iosevka-bold uppercase tracking-wider">
                  WHICH COUNTRY?
                </span>
              )}
              {gameState.state === "guessing_phase" && me?.hasGuessed && (
                <span className="text-gray-400 italic font-iosevka-medium">
                  WAITING FOR OPPONENT...
                </span>
              )}
              {gameState.state === "round_result" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  ROUND OVER!
                </span>
              )}
              {gameState.state === "game_over" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  GAME OVER!
                </span>
              )}
            </div>

            {/* Timer Display */}
            {!me?.hasGuessed && gameState.state === "guessing_phase" && (
              <div className="w-full flex justify-center py-1">
                <TimerDisplay turnEndTime={gameState.turnEndTime || null} size="lg" />
              </div>
            )}

            {/* Leave Match Button */}
            {isGameStarted && gameState.state !== "game_over" && (
              <Button
                variant="ghost"
                onClick={() => setIsExitModalOpen(true)}
                className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 mt-2"
              >
                <X className="w-4 h-4 mr-2" />
                <span>LEAVE MATCH</span>
              </Button>
            )}
          </Card>

          {/* Right Column: Flag Battle Arena */}
          <Card className="w-full max-w-xl lg:max-w-2xl p-5 md:p-8 flex flex-col items-center gap-6 bg-[#161616] border border-orange-500/20 shadow-2xl shrink-0">
            {/* Flag Display */}
            {gameState.flagUrl && (
              <div className="w-full max-w-lg aspect-video bg-[#000000] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative flex items-center justify-center p-3 sm:p-4">
                {isFlagLoading && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center rounded-2xl">
                    <span className="text-xs font-iosevka-medium text-white/30 uppercase tracking-widest">
                      Loading Flag...
                    </span>
                  </div>
                )}
                <img
                  src={gameState.flagUrl}
                  alt="Guess the Flag"
                  decoding="async"
                  fetchPriority="high"
                  onLoad={() => setIsFlagLoading(false)}
                  className={`object-contain w-full h-full drop-shadow-xl transition-opacity duration-300 ${
                    isFlagLoading ? "opacity-0" : "opacity-100"
                  }`}
                />
              </div>
            )}

            {/* Results or Choices */}
            {gameState.state === "round_result" ||
            gameState.state === "game_over" ? (
              <div className="w-full flex flex-col items-center gap-6">
                <div className="w-full bg-[#111111] rounded-2xl p-6 text-center border border-white/5 shadow-inner">
                  <p className="text-[var(--muted)] text-xs mb-2 uppercase tracking-[0.2em]">
                    The Answer Was
                  </p>
                  <p className="text-2xl sm:text-3xl font-iosevka-bold text-white tracking-widest uppercase">
                    {gameState.correctCountry}
                  </p>
                </div>

                <RoundResults
                  players={gameState.players.map((p) => ({
                    id: p.id,
                    name:
                      roomLobby?.players.find((rp) => rp.id === p.id)?.name ||
                      "Unknown",
                    choice: p.currentGuess,
                  }))}
                  localPlayerId={localSocketId || ""}
                  correctAnswer={gameState.correctCountry}
                  themeColor="orange"
                  verb="Guessed"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full mt-2">
                {gameState.options.map((option) => (
                  <button
                    key={option}
                    disabled={me?.hasGuessed}
                    onClick={() => submitGuess(option)}
                    className={`py-4 sm:py-5 px-4 text-base sm:text-lg rounded-xl transition-all font-iosevka-bold tracking-wider uppercase border ${
                      localChoice === option
                        ? "bg-[#2a2a2a] border-orange-500/60 shadow-2xl scale-[1.02] text-orange-300"
                        : "bg-[#1a1a1a] hover:bg-[#222222] border-white/5 text-[var(--muted)] hover:text-white"
                    } ${me?.hasGuessed && localChoice !== option ? "opacity-20 grayscale" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* End Game Options */}
            {gameState.state === "game_over" && (
              <div className="w-full pt-6 border-t border-white/5 relative z-10">
                <ReturnToLobbyBadge
                  initialSeconds={
                    returnToLobbyCountdown ||
                    GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC
                  }
                  barColorClass="bg-orange-500/30"
                />
                <EndMatchOptions
                  rematchRequested={rematchRequested}
                  opponentLeft={!!disconnectMessage}
                  hasOpponentRequested={
                    gameState.rematchRequests?.find(
                      (id) => id !== localSocketId,
                    ) !== undefined
                  }
                  onRequestRematch={requestRematch}
                  onPlayAgain={playAgain}
                  primaryColorGradient="from-orange-600 to-amber-900"
                  primaryColorHover="hover:from-orange-500 hover:to-amber-800"
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </GameShell>
  );
}

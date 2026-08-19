"use client";

import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import {
  RPSChoice,
  RoundState,
  PlayerState,
} from "@gamehub/rock-paper-scissors";
import { GameSetupConfig } from "@gamehub/types";
import GameSetup from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import AlertModal from "@/(shared)/components/ui/AlertModal";
import ConfirmModal from "@/(shared)/components/ui/ConfirmModal";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import Scoreboard from "@/features/match/components/Scoreboard";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import ReturnToLobbyBadge from "@/features/match/components/ReturnToLobbyBadge";
import { Mountain, FileText, Scissors, HelpCircle, X } from "lucide-react";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import { useMatchManager } from "@/features/match/hooks/useMatchManager";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket, getSessionId } from "@/(shared)/providers/SocketProvider";
import NavButton from "@/(shared)/components/ui/NavButton";
import { motion } from "framer-motion";
import { GAME_CONSTANTS } from "@gamehub/core";

interface GameState {
  state: RoundState;
  currentRound: number;
  maxRounds: number;
  players: PlayerState[];
  choices?: Record<string, RPSChoice>;
  rematchRequests?: string[];
  timeLimit?: number;
  turnEndTime?: number | null;
}

export default function RPSGame() {
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
    namespace: "rps",
    playerName,
  });

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localChoice, setLocalChoice] = useState<RPSChoice | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const rooms = useRoomList(socket);

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("gameState", (serverState: GameState) => {
      setGameState(serverState);
      if (
        serverState.state === "commit_phase" &&
        !serverState.players.find((p) => p.id === socket.id)?.hasCommitted
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
      // Game-specific resets
      setGameState(null);
      setLocalChoice(null);
    });

    return () => {
      socket.off("gameState");
      socket.off("matchFound");
    };
  }, [socket]);

  const commitChoice = (choice: RPSChoice) => {
    if (socket && roomId && gameState?.state === "commit_phase") {
      setLocalChoice(choice);
      socket.emit("commitChoice", { roomId, choice });
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

  const handleCreateRoomClick = () => {
    setIsHost(true);
    setSetupNeeded(true);
  };

  const handleJoinRoomClick = (joinRoomId: string) => {
    setIsHost(false);
    joinRoom(joinRoomId);
  };

  const handleStartGame = (config: GameSetupConfig) => {
    createRoom(config);
    setSetupNeeded(false);
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
              gameId="rps"
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
          gameLabel="Rock-Paper-Scissors"
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
          onToggleReady={() => socket?.emit("toggleReady", roomId)}
          onStartMatch={() => socket?.emit("startMatch", roomId)}
          onLeaveRoom={handleLeaveRoom}
          onUpdateConfig={handleUpdateConfig}
          themeColor="purple"
          tempNotification={tempNotification}
        />
      </GameShell>
    );
  }

  if (!gameState) {
    return (
      <GameShell playerName={playerName}>
        <div className="min-h-screen bg-[#111111] flex items-center justify-center font-iosevka-bold text-xl text-white/40 animate-pulse">
          Entering Arena...
        </div>
      </GameShell>
    );
  }

  const me = gameState.players.find((p) => p.id === localSocketId);
  const opp = gameState.players.find((p) => p.id !== localSocketId);

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

      {tempNotification && (
        <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-[#1a1a1a] border-l-4 border-white/20 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
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

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Responsive Grid Shell: Column on Mobile, 2-Column Split on Desktop */}
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start justify-center">
          
          {/* Left Column: HUD & Information Panel */}
          <Card className="w-full lg:w-80 p-5 md:p-6 flex flex-col items-center gap-5 bg-[#161616] border border-purple-500/20 shadow-2xl shrink-0">
            <h1 className="text-2xl md:text-3xl font-iosevka-bold text-white tracking-widest uppercase text-center drop-shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              Rock Paper Scissors
            </h1>

            {/* Connection Status Badge */}
            <div className="flex items-center justify-between w-full text-xs font-iosevka-bold tracking-widest uppercase">
              <span
                className={`px-3 py-1.5 rounded-lg border ${localSocketId ? "bg-purple-500/10 border-purple-500/30 text-purple-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
              >
                {localSocketId ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>

            {/* Scoreboard */}
            <Scoreboard
              players={
                (gameState?.players.map((p) => ({
                  id: p.id,
                  name: roomLobby?.players.find((rp) => rp.id === p.id)?.name,
                  score: p.score,
                  isConnected: true,
                })) as any) || []
              }
              localPlayerId={localSocketId || ""}
              currentRound={gameState?.currentRound || 1}
              maxRounds={gameState?.maxRounds || 3}
              gameId="rps"
            />

            {/* Turn Banner Status */}
            <div className="text-center text-sm md:text-base py-3 px-4 flex items-center justify-center w-full bg-[#111111] rounded-xl border border-white/5 shadow-inner">
              {gameState.state === "commit_phase" && !me?.hasCommitted && (
                <span className="text-purple-400 animate-pulse font-iosevka-bold uppercase tracking-wider">
                  MAKE YOUR CHOICE!
                </span>
              )}
              {gameState.state === "commit_phase" && me?.hasCommitted && (
                <span className="text-gray-400 italic font-iosevka-medium">
                  WAITING FOR OPPONENT...
                </span>
              )}
              {gameState.state === "reveal_phase" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  REVEALING CHOICES...
                </span>
              )}
              {gameState.state === "game_over" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  GAME OVER!
                </span>
              )}
            </div>

            {/* Timer Display */}
            {gameState.state === "commit_phase" && !me?.hasCommitted && (
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

          {/* Right Column: Rock Paper Scissors Battle Arena */}
          <Card className="w-full max-w-xl lg:max-w-2xl p-5 sm:p-8 flex flex-col items-center gap-6 bg-[#161616] border border-purple-500/20 shadow-2xl shrink-0">
            {/* Battle Arena */}
            {gameState.state === "reveal_phase" ||
            gameState.state === "game_over" ? (
              <div className="flex justify-around items-center py-8 sm:py-12 bg-[#111111] rounded-2xl border border-white/5 shadow-inner w-full">
                <div className="text-center flex flex-col items-center gap-3">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#222222] rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-2xl">
                    {getIcon(gameState.choices?.[me!.id], 40)}
                  </div>
                  <p className="text-xs font-iosevka-bold text-[var(--muted)] uppercase tracking-widest">
                    You
                  </p>
                </div>

                <div className="text-2xl sm:text-4xl font-iosevka-bold text-[#444444]">
                  VS
                </div>

                <div className="text-center flex flex-col items-center gap-3">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 bg-[#222222] rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/30 shadow-2xl">
                    {getIcon(gameState.choices?.[opp!.id], 40)}
                  </div>
                  <p className="text-xs font-iosevka-bold text-[var(--muted)] uppercase tracking-widest">
                    Opponent
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full">
                {(["rock", "paper", "scissors"] as RPSChoice[]).map((choice) => (
                  <button
                    key={choice}
                    disabled={me?.hasCommitted}
                    onClick={() => commitChoice(choice)}
                    className={`py-6 sm:py-10 aspect-square rounded-2xl transition-all flex flex-col justify-center items-center gap-2 group relative overflow-hidden ${
                      localChoice === choice
                        ? "bg-[#2a2a2a] border-2 border-purple-500/60 text-purple-300 scale-105 shadow-2xl"
                        : "bg-[#1a1a1a] hover:bg-[#222222] border border-[#333333] text-gray-400 hover:text-white grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
                    } ${me?.hasCommitted && localChoice !== choice ? "opacity-20 grayscale" : ""}`}
                  >
                    <div
                      className={`transition-transform duration-300 ${localChoice === choice ? "scale-110" : "group-hover:scale-110"}`}
                    >
                      {getIcon(choice, 36)}
                    </div>
                    <span className="text-[10px] sm:text-xs font-iosevka-bold uppercase tracking-wider">
                      {choice}
                    </span>
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
                  barColorClass="bg-purple-500/30"
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
                  primaryColorGradient="from-purple-600 to-indigo-900"
                  primaryColorHover="hover:from-purple-500 hover:to-indigo-800"
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </GameShell>
  );
}

function getIcon(choice: RPSChoice | undefined, size: number) {
  switch (choice) {
    case "rock":
      return <Mountain size={size} />;
    case "paper":
      return <FileText size={size} />;
    case "scissors":
      return <Scissors size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
}

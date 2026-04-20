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
import { Mountain, FileText, Scissors, HelpCircle, X } from "lucide-react";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import { useMatchManager } from "@/features/match/hooks/useMatchManager";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";
import NavButton from "@/(shared)/components/ui/NavButton";

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

      <div className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-4xl font-iosevka-bold mb-8 text-white tracking-widest uppercase text-center">
          Rock-Paper-Scissors
        </h1>

        {isGameStarted && gameState.state !== "game_over" && (
          <Button
            variant="ghost"
            onClick={() => setIsExitModalOpen(true)}
            className="mb-8 border-red-500/20 text-red-500 hover:bg-red-500/10"
          >
            <X size={16} /> LEAVE MATCH
          </Button>
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

        <Card className="w-full max-w-3xl p-10 flex flex-col gap-8 bg-[#161616]">
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

          {/* State Information */}
          <div className="text-center text-xl h-16 flex items-center justify-center bg-[#222222] rounded-xl border border-white/5">
            {gameState.state === "commit_phase" && !me?.hasCommitted && (
              <span className="text-white animate-pulse font-iosevka-bold">
                MAKE YOUR CHOICE!
              </span>
            )}
            {gameState.state === "commit_phase" && me?.hasCommitted && (
              <span className="text-[var(--muted)]">
                WAITING FOR OPPONENT...
              </span>
            )}
            {gameState.state === "reveal_phase" && (
              <span className="text-white font-iosevka-bold">
                REVEALING CHOICES...
              </span>
            )}
            {gameState.state === "game_over" && (
              <span className="text-white font-iosevka-bold">GAME OVER!</span>
            )}
          </div>

          {gameState.state === "commit_phase" && !me?.hasCommitted && (
            <div className="scale-150 py-4">
              <TimerDisplay turnEndTime={gameState.turnEndTime || null} />
            </div>
          )}

          {/* Battle Arena */}
          {gameState.state === "reveal_phase" ||
          gameState.state === "game_over" ? (
            <div className="flex justify-around items-center py-12 bg-[#111111] rounded-2xl border border-white/5 shadow-inner">
              <div className="text-center flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-[#222222] rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-2xl">
                  {getIcon(gameState.choices?.[me!.id], 48)}
                </div>
                <p className="text-xs font-iosevka-bold text-[var(--muted)] uppercase tracking-widest">
                  You
                </p>
              </div>

              <div className="text-4xl font-iosevka-bold text-[#333333]">
                VS
              </div>

              <div className="text-center flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-[#222222] rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-2xl">
                  {getIcon(gameState.choices?.[opp!.id], 48)}
                </div>
                <p className="text-xs font-iosevka-bold text-[var(--muted)] uppercase tracking-widest">
                  Opponent
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {(["rock", "paper", "scissors"] as RPSChoice[]).map((choice) => (
                <button
                  key={choice}
                  disabled={me?.hasCommitted}
                  onClick={() => commitChoice(choice)}
                  className={`py-12 rounded-2xl transition-all flex justify-center items-center group relative overflow-hidden ${
                    localChoice === choice
                      ? "bg-[#2a2a2a] border-2 border-white/40 scale-105 shadow-2xl"
                      : "bg-[#1a1a1a] hover:bg-[#222222] border border-[#333333] grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                  } ${me?.hasCommitted && localChoice !== choice ? "opacity-10" : ""}`}
                >
                  <div
                    className={`transition-transform duration-300 ${localChoice === choice ? "scale-110" : "group-hover:scale-110"}`}
                  >
                    {getIcon(choice, 48)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* End Game Options */}
          {gameState.state === "game_over" && (
            <div className="pt-8 border-t border-white/5">
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
                primaryColorGradient="from-[#333333] to-[#1a1a1a]"
                primaryColorHover="hover:from-[#444444] hover:to-[#222222]"
              />
            </div>
          )}
        </Card>
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

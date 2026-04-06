/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { GTFRoundState, GTFPlayer } from "@gamehub/guess-the-flag";
import GameSetup, {
  GameSetupConfig,
} from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import AlertModal from "@/\(shared\)/components/ui/AlertModal";
import ConfirmModal from "@/\(shared\)/components/ui/ConfirmModal";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
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
  } = useMatchManager({
    namespace: "gtf",
    playerName,
  });

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localChoice, setLocalChoice] = useState<string | null>(null);
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
        serverState.state === "guessing_phase" &&
        !serverState.players.find((p) => p.id === socket.id)?.hasGuessed
      ) {
        setLocalChoice(null);
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
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center font-iosevka-bold text-xl text-orange-400 animate-pulse">
        Entering Arena...
      </div>
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

      <AlertModal
        isOpen={
          !!disconnectMessage &&
          (gameState?.state !== "game_over" || rematchRequested) &&
          matchTerminationCountdown === null
        }
        title="Connection Lost"
        message={disconnectMessage || ""}
      />

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

      <div className="w-full max-w-4xl flex flex-col items-center">
        <h1 className="text-4xl font-iosevka-bold mb-8 text-white tracking-widest uppercase text-center">
          Guess the Flag
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

        <Card className="w-full max-w-3xl p-10 flex flex-col items-center gap-8 bg-[#161616]">
          <Scoreboard
            players={gameState.players}
            localPlayerId={localSocketId || ""}
            currentRound={gameState.currentRound}
            maxRounds={gameState.maxRounds}
            themeColor="orange"
          />

          {/* State Information */}
          <div className="text-center text-xl h-12 flex items-center justify-center w-full bg-[#111111] rounded-xl border border-white/5">
            {gameState.state === "guessing_phase" && !me?.hasGuessed && (
              <span className="text-white animate-pulse font-iosevka-bold">
                WHICH COUNTRY?
              </span>
            )}
            {gameState.state === "guessing_phase" && me?.hasGuessed && (
              <span className="text-[var(--muted)] italic">
                WAITING FOR OPPONENT...
              </span>
            )}
            {gameState.state === "round_result" && (
              <span className="text-white font-iosevka-bold">ROUND OVER!</span>
            )}
            {gameState.state === "game_over" && (
              <span className="text-white font-iosevka-bold">GAME OVER!</span>
            )}
          </div>

          {!me?.hasGuessed && gameState.state === "guessing_phase" && (
            <div className="scale-150 py-4">
              <TimerDisplay turnEndTime={gameState.turnEndTime || null} />
            </div>
          )}

          {/* Battle Arena */}
          <div className="flex flex-col items-center justify-center w-full gap-8">
            {/* Flag Display */}
            {gameState.flagUrl && (
              <div className="w-full max-w-md aspect-video bg-[#000000] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 relative flex items-center justify-center p-4">
                <img
                  src={gameState.flagUrl}
                  alt="Guess the Flag"
                  className="object-contain w-full h-full drop-shadow-xl"
                />
              </div>
            )}

            {/* Results or Choices */}
            {gameState.state === "round_result" ||
            gameState.state === "game_over" ? (
              <div className="w-full flex flex-col items-center gap-8">
                <div className="w-full bg-[#111111] rounded-2xl p-8 text-center border border-white/5 shadow-inner">
                  <p className="text-[var(--muted)] text-xs mb-3 uppercase tracking-[0.2em]">
                    The Answer Was
                  </p>
                  <p className="text-4xl font-iosevka-bold text-white tracking-widest uppercase">
                    {gameState.correctCountry}
                  </p>
                </div>

                <RoundResults
                  players={gameState.players.map((p) => ({
                    id: p.id,
                    name: roomLobby?.players.find((rp) => rp.id === p.id)?.name || "Unknown",
                    choice: p.currentGuess,
                  }))}
                  localPlayerId={localSocketId || ""}
                  correctAnswer={gameState.correctCountry}
                  themeColor="orange"
                  verb="Guessed"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                {gameState.options.map((option) => (
                  <button
                    key={option}
                    disabled={me?.hasGuessed}
                    onClick={() => submitGuess(option)}
                    className={`py-8 px-6 text-lg rounded-2xl transition-all font-iosevka-bold tracking-wider uppercase border ${
                      localChoice === option
                        ? "bg-[#2a2a2a] border-white/40 shadow-2xl scale-[1.02]"
                        : "bg-[#1a1a1a] hover:bg-[#222222] border-white/5 text-[var(--muted)] hover:text-white"
                    } ${me?.hasGuessed && localChoice !== option ? "opacity-20 grayscale" : ""}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* End Game Options */}
          {gameState.state === "game_over" && (
            <div className="w-full pt-8 border-t border-white/5">
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

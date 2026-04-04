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
import useRoomLobby from "@/features/lobby/hooks/useRoomLobby";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import Scoreboard from "@/features/match/components/Scoreboard";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";

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
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localSocketId, setLocalSocketId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localChoice, setLocalChoice] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );
  const [tempNotification, setTempNotification] = useState<string | null>(null);
  const [matchTerminationCountdown, setMatchTerminationCountdown] = useState<
    number | null
  >(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const rooms = useRoomList(socket);
  const roomLobby = useRoomLobby(socket, roomId);

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/gtf", {
      auth: { playerName },
    });
    setSocket(s);

    s.on("connect", () => {
      setLocalSocketId(s.id || null);
    });

    s.on("matchFound", ({ roomId, isHost }) => {
      setRoomId(roomId);
      setIsHost(isHost || false);
      setSetupNeeded(false);
    });

    s.on("roomDestroyed", () => {
      setDisconnectMessage(
        "Server destroyed the room because: The match was terminated by the system.",
      );
    });

    s.on("gameStarted", () => {
      setIsGameStarted(true);
    });

    s.on("gameState", (serverState: GameState) => {
      setGameState(serverState);
      if (
        serverState.state === "guessing_phase" &&
        !serverState.players.find((p) => p.id === s.id)?.hasGuessed
      ) {
        setLocalChoice(null);
      }
    });

    s.on("rematchStarted", () => {
      setRematchRequested(false);
    });

    s.on("opponentDisconnected", ({ playerName: leaverName }: { playerName: string }) => {
      setDisconnectMessage(`Connection Lost: ${leaverName} has left the match.`);
    });

    s.on("matchTerminationUpdate", ({ countdown }: { countdown: number }) => {
      setMatchTerminationCountdown(countdown);
    });

    s.on("matchTerminated", () => {
      handleLeaveRoom();
    });

    s.on("playerLeft", (message: string) => {
      setTempNotification(message);
      setTimeout(() => setTempNotification(null), 5000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const submitGuess = (guess: string) => {
    if (socket && roomId && gameState?.state === "guessing_phase") {
      setLocalChoice(guess);
      socket.emit("submitGuess", { roomId, guess });
    }
  };

  const requestRematch = () => {
    if (socket && roomId) {
      setRematchRequested(true);
      socket.emit("requestRematch", roomId);
    }
  };

  const playAgain = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
      setRoomId(null);
      setGameState(null);
      setIsGameStarted(false);
      setRematchRequested(false);
      setDisconnectMessage(null);
      setIsHost(false);
      setSetupNeeded(false);
    }
  };

  const handleReturnToSetup = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setGameState(null);
    setIsGameStarted(false);
    setRematchRequested(false);
    setSetupNeeded(true);
  };

  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setGameState(null);
    setIsGameStarted(false);
    setRematchRequested(false);
    setSetupNeeded(false);
    setIsHost(false);
    router.push("/");
  };

  const handleStartGame = (config: GameSetupConfig) => {
    if (socket) {
      socket.emit("createRoom", config);
      setSetupNeeded(false);
    }
  };

  const handleCreateRoomClick = () => {
    setIsHost(true);
    setSetupNeeded(true);
  };

  const handleJoinRoomClick = (joinRoomId: string) => {
    if (socket) {
      setIsHost(false);
      socket.emit("joinSpecificRoom", joinRoomId);
    }
  };

  if (setupNeeded && !roomId) {
    return (
      <GameShell playerName={playerName}>
        <div className="w-full flex justify-center">
          <GameSetup onStart={handleStartGame} gameId="gtf" />
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
        onToggleReady={() => socket?.emit("toggleReady", roomId)}
        onStartMatch={() => socket?.emit("startMatch", roomId)}
        onLeaveRoom={handleLeaveRoom}
        onUpdateConfig={handleUpdateConfig}
        themeColor="orange"
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
        <MatchTerminationBanner countdown={matchTerminationCountdown} />
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

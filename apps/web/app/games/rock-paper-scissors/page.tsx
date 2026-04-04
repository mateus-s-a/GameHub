"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  RPSChoice,
  RoundState,
  PlayerState,
} from "@gamehub/rock-paper-scissors";
import GameSetup, { GameSetupConfig } from "../../components/GameSetup";
import TimerDisplay from "../../components/TimerDisplay";
import BackButton from "../../components/BackButton";
import AlertModal from "../../components/AlertModal";
import ConfirmModal from "../../components/ConfirmModal";
import MatchTerminationBanner from "../../components/MatchTerminationBanner";
import Scoreboard from "../../components/Scoreboard";
import EndMatchOptions from "../../components/EndMatchOptions";
import {
  Wifi,
  WifiOff,
  Mountain,
  FileText,
  Scissors,
  HelpCircle,
  X,
} from "lucide-react";
import { useRoomList } from "../../hooks/useRoomList";
import RoomBrowser from "../../components/RoomBrowser";
import RoomLobby from "../../components/RoomLobby";
import useRoomLobby from "../../hooks/useRoomLobby";

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localChoice, setLocalChoice] = useState<RPSChoice | null>(null);
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
    const s: Socket = io("http://localhost:3001/rps");
    setSocket(s);

    s.on("connect", () => {
      setSocketId(s.id || null);
    });

    s.on("matchFound", ({ roomId, isHost }) => {
      setRoomId(roomId);
      setIsHost(isHost || false);
      setSetupNeeded(false);
    });

    s.on("roomDestroyed", () => {
      setDisconnectMessage(
        "Server destroyed the room because: A player disconnected or an error occurred.",
      );
    });

    s.on("gameStarted", () => {
      setIsGameStarted(true);
    });

    s.on("gameState", (state: GameState) => {
      setGameState(state);
      if (
        state.state === "commit_phase" &&
        !state.players.find((p) => p.id === s.id)?.hasCommitted
      ) {
        setLocalChoice(null);
      }
    });

    s.on("rematchStarted", () => {
      setRematchRequested(false);
    });

    s.on("opponentDisconnected", () => {
      setDisconnectMessage("Connection Lost Opponent left the room.");
    });

    s.on("matchTerminationUpdate", ({ countdown }: { countdown: number }) => {
      setMatchTerminationCountdown(countdown);
    });

    s.on("matchTerminated", () => {
      handleLeaveRoom();
    });

    s.on("playerLeft", (message: string) => {
      setTempNotification(message);
      // Automatically clear after 5 seconds
      setTimeout(() => setTempNotification(null), 5000);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const commitChoice = (choice: RPSChoice) => {
    if (socket && roomId && gameState?.state === "commit_phase") {
      setLocalChoice(choice);
      socket.emit("commitChoice", { roomId, choice });
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

  const handleDisconnectAcknowledge = () => {
    setDisconnectMessage(null);
    handleLeaveRoom();
  };

  if (setupNeeded && !roomId) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-gray-900 border-8 border-gray-800">
        <BackButton
          isHost={isHost}
          isInSetup={true}
          isGameOver={false}
          onLeaveRoom={handleLeaveRoom}
        />
        <GameSetup onStart={handleStartGame} gameId="rps" />
      </div>
    );
  }

  if (!roomId && !setupNeeded) {
    return (
      <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center pt-24 p-8 font-iosevka-regular">
        <BackButton
          isHost={false}
          isInSetup={false}
          isGameOver={false}
          isInLobby={true}
          onLeaveRoom={() => (window.location.href = "/")}
        />
        <RoomBrowser
          rooms={rooms}
          onCreateRoom={handleCreateRoomClick}
          onJoinRoom={handleJoinRoomClick}
          gameLabel="Rock-Paper-Scissors"
        />
      </div>
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
        localPlayerId={socketId || ""}
        onToggleReady={() => socket?.emit("toggleReady", roomId)}
        onStartMatch={() => socket?.emit("startMatch", roomId)}
        onLeaveRoom={handleLeaveRoom}
        onUpdateConfig={handleUpdateConfig}
        themeColor="purple"
      />
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center font-iosevka-bold text-xl text-purple-400 animate-pulse">
        Entering Arena...
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === socketId);
  const opp = gameState.players.find((p) => p.id !== socketId);

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-iosevka-regular">
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
          <div className="bg-gray-800 border-l-4 border-purple-500 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
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

      <BackButton
        isHost={isHost}
        isInSetup={false}
        isGameOver={gameState.state === "game_over"}
        onReturnToSetup={handleReturnToSetup}
        onLeaveRoom={handleLeaveRoom}
      />
      <h1 className="text-4xl font-iosevka-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
        GameHub Rock-Paper-Scissors
      </h1>

      {isGameStarted && gameState.state !== "game_over" && (
        <button
          onClick={() => setIsExitModalOpen(true)}
          className="mb-8 px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-iosevka-bold rounded-xl border border-red-500/20 transition-all active:scale-95 mx-auto block backdrop-blur-sm"
        >
          Leave Match
        </button>
      )}

      <ConfirmModal
        isOpen={isExitModalOpen}
        title="Leave Match?"
        message="Are you sure you want to leave the current match? You will lose all your progress."
        onConfirm={() => {
          setIsExitModalOpen(false);
          handleLeaveRoom();
        }}
        onCancel={() => setIsExitModalOpen(false)}
        themeColor="purple"
      />

      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl space-y-8">
        <Scoreboard
          players={gameState.players}
          localPlayerId={socketId || ""}
          currentRound={gameState.currentRound}
          maxRounds={gameState.maxRounds}
          themeColor="purple"
        />

        {/* State Information */}
        <div className="text-center text-xl h-12 flex items-center justify-center">
          {gameState.state === "commit_phase" && !me?.hasCommitted && (
            <span className="text-blue-400 animate-pulse">
              Make your choice!
            </span>
          )}
          {gameState.state === "commit_phase" && me?.hasCommitted && (
            <span className="text-gray-400">Waiting for opponent...</span>
          )}
          {gameState.state === "reveal_phase" && (
            <span className="text-yellow-400 font-iosevka-bold">
              Revealing Choices...
            </span>
          )}
          {gameState.state === "game_over" && (
            <span className="text-emerald-400 font-iosevka-bold">
              Game Over!
            </span>
          )}
        </div>

        {gameState.state === "commit_phase" && !me?.hasCommitted && (
          <TimerDisplay turnEndTime={gameState.turnEndTime || null} />
        )}

        {/* Battle Arena */}
        {gameState.state === "reveal_phase" ||
        gameState.state === "game_over" ? (
          <div className="flex justify-around items-center py-8">
            <div className="text-center flex flex-col items-center">
              <div className="mb-4">
                {getIcon(gameState.choices?.[me!.id], 64)}
              </div>
              <p className="text-emerald-400">Your Choice</p>
            </div>
            <div className="text-4xl font-iosevka-bold text-gray-600">VS</div>
            <div className="text-center flex flex-col items-center">
              <div className="mb-4">
                {getIcon(gameState.choices?.[opp!.id], 64)}
              </div>
              <p className="text-red-400">Opponent</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(["rock", "paper", "scissors"] as RPSChoice[]).map((choice) => (
              <button
                key={choice}
                disabled={me?.hasCommitted}
                onClick={() => commitChoice(choice)}
                className={`py-8 rounded-xl transition-all flex justify-center items-center ${
                  localChoice === choice
                    ? "bg-purple-600 border-2 border-purple-400 scale-105"
                    : "bg-gray-700 hover:bg-gray-600 border border-transparent"
                } ${me?.hasCommitted && localChoice !== choice ? "opacity-20" : ""}`}
              >
                {getIcon(choice, 48)}
              </button>
            ))}
          </div>
        )}

        {/* End Game Options */}
        {gameState.state === "game_over" && (
          <EndMatchOptions
            rematchRequested={rematchRequested}
            opponentLeft={!!disconnectMessage}
            hasOpponentRequested={
              gameState.rematchRequests?.find((id) => id !== socketId) !==
              undefined
            }
            onRequestRematch={requestRematch}
            onPlayAgain={playAgain}
            primaryColorGradient="from-purple-600 to-pink-600"
            primaryColorHover="hover:from-purple-500 hover:to-pink-500"
          />
        )}
      </div>
    </div>
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

// Utility to check if second player is fully connected
function waitingOpponent(gameState: GameState) {
  return gameState.players.length < 2 || gameState.state === "waiting_players";
}

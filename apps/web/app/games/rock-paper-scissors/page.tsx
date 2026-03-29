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
import EndMatchOptions from "../../components/EndMatchOptions";
import {
  Wifi,
  WifiOff,
  Mountain,
  FileText,
  Scissors,
  HelpCircle,
} from "lucide-react";
import { useRoomList } from "../../hooks/useRoomList";
import RoomBrowser from "../../components/RoomBrowser";

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
  const [waiting, setWaiting] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );
  
  const rooms = useRoomList(socket);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/rps");
    setSocket(s);

    s.on("connect", () => {
      setSocketId(s.id || null);
    });

    s.on("matchFound", ({ roomId }) => {
      setRoomId(roomId);
      s.emit("joinRoom", roomId);
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
      setDisconnectMessage("Opponent disconnected!");
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
      setRematchRequested(false);
      setDisconnectMessage(null);
      setIsHost(false);
      setSetupNeeded(false);
      setWaiting(false);
    }
  };

  const handleReturnToSetup = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setGameState(null);
    setRematchRequested(false);
    setSetupNeeded(true);
  };

  const handleLeaveRoom = () => {
    if (socket) {
      if (roomId) socket.emit("leaveRoom", roomId);
      socket.disconnect();
    }
  };

  const handleStartGame = (config: GameSetupConfig) => {
    if (socket) {
      socket.emit("createRoom", config);
      setSetupNeeded(false);
      setWaiting(true);
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
      setWaiting(true);
    }
  };

  const handleDisconnectAcknowledge = () => {
    setDisconnectMessage(null);
    setRoomId(null);
    setGameState(null);
    setRematchRequested(false);
    setIsHost(false);
    setSetupNeeded(false);
    setWaiting(false);
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

  if (!roomId && !waiting && !setupNeeded) {
    return (
      <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center pt-24 p-8 font-iosevka-regular">
        <BackButton isHost={false} isInSetup={false} isGameOver={false} isInLobby={true} onLeaveRoom={() => window.location.href = "/"} />
        <RoomBrowser
          rooms={rooms}
          onCreateRoom={handleCreateRoomClick}
          onJoinRoom={handleJoinRoomClick}
          gameLabel="Rock-Paper-Scissors"
        />
      </div>
    );
  }

  if (!roomId || !gameState) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center bg-gray-900 text-white font-iosevka-regular text-xl">
        <BackButton isHost={isHost} isInSetup={false} isGameOver={false} onLeaveRoom={handleLeaveRoom} />
        <div className="animate-pulse flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-300 font-iosevka-bold tracking-wide">
            {!socketId
              ? "Connecting to Socket Hub..."
              : waiting
                ? (isHost ? "Waiting for opposing player to join room..." : "Joining Room...")
                : "Initializing..."}
          </p>
        </div>
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === socketId);
  const opp = gameState.players.find((p) => p.id !== socketId);

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-iosevka-regular">
      <AlertModal
        isOpen={
          !!disconnectMessage &&
          (gameState?.state !== "game_over" || rematchRequested)
        }
        title="Match Terminated"
        message={disconnectMessage || ""}
        onConfirm={handleDisconnectAcknowledge}
      />
      <BackButton
        isHost={isHost}
        isInSetup={false}
        isGameOver={gameState.state === "game_over"}
        onReturnToSetup={handleReturnToSetup}
        onLeaveRoom={handleLeaveRoom}
      />
      <h1 className="text-4xl font-iosevka-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
        GameHub Rock-Paper-Scissors
      </h1>

      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl space-y-8">
        {/* Scoreboard */}
        <div className="flex justify-between items-center bg-gray-900 rounded-xl p-4">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-2">
              You{" "}
              {socketId ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </p>
            <p className="text-3xl font-iosevka-bold text-emerald-400">
              {me?.score || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 uppercase tracking-widest text-xs">
              Round
            </p>
            <p className="text-xl">
              {gameState.currentRound} / {gameState.maxRounds}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1 flex items-center justify-center gap-2">
              Opponent{" "}
              {roomId && !waitingOpponent(gameState) ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </p>
            <p className="text-3xl font-iosevka-bold text-red-400">
              {opp?.score || 0}
            </p>
          </div>
        </div>

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

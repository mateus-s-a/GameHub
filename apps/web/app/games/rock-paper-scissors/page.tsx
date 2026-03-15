"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  RPSChoice,
  RoundState,
  PlayerState,
} from "@gameshub/rock-paper-scissors";
import GameSetup, { GameSetupConfig } from "../../components/GameSetup";
import TimerDisplay from "../../components/TimerDisplay";
import BackButton from "../../components/BackButton";

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

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/rps");
    setSocket(s);

    s.on("connect", () => {
      setSocketId(s.id || null);
      s.emit("checkQueue", (hasPending: boolean) => {
        if (hasPending) {
          setIsHost(false);
          s.emit("joinMatchmaking");
        } else {
          setIsHost(true);
          setSetupNeeded(true);
        }
      });
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
      alert("Opponent disconnected!");
      setRoomId(null);
      setGameState(null);
      setRematchRequested(false);
      s.emit("checkQueue", (hasPending: boolean) => {
        if (hasPending) {
          setIsHost(false);
          s.emit("joinMatchmaking");
        } else {
          setIsHost(true);
          setSetupNeeded(true);
        }
      });
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
      socket.emit("checkQueue", (hasPending: boolean) => {
        if (hasPending) {
          setIsHost(false);
          socket.emit("joinMatchmaking");
        } else {
          setIsHost(true);
          setSetupNeeded(true);
        }
      });
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
      socket.emit("joinMatchmaking", config);
      setSetupNeeded(false);
    }
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

  if (!roomId || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-iosevka-regular text-2xl">
        {socketId
          ? "Searching for an opponent in Matchmaking..."
          : "Connecting to Socket Hub..."}
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === socketId);
  const opp = gameState.players.find((p) => p.id !== socketId);

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-iosevka-regular">
      <BackButton
        isHost={isHost}
        isInSetup={false}
        isGameOver={gameState.state === "game_over"}
        onReturnToSetup={handleReturnToSetup}
        onLeaveRoom={handleLeaveRoom}
      />
      <h1 className="text-4xl font-iosevka-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
        Rock-Paper-Scissors
      </h1>

      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl space-y-8">
        {/* Scoreboard */}
        <div className="flex justify-between items-center bg-gray-900 rounded-xl p-4">
          <div className="text-center">
            <p className="text-sm text-gray-400">You</p>
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
            <p className="text-sm text-gray-400">Opponent</p>
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
            <div className="text-center">
              <div className="text-6xl mb-4">
                {getEmoji(gameState.choices?.[me!.id] || "rock")}
              </div>
              <p className="text-emerald-400">Your Choice</p>
            </div>
            <div className="text-4xl font-iosevka-bold text-gray-600">VS</div>
            <div className="text-center">
              <div className="text-6xl mb-4">
                {getEmoji(gameState.choices?.[opp!.id] || "rock")}
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
                className={`py-8 text-5xl rounded-xl transition-all ${
                  localChoice === choice
                    ? "bg-purple-600 border-2 border-purple-400 scale-105"
                    : "bg-gray-700 hover:bg-gray-600 border border-transparent"
                } ${me?.hasCommitted && localChoice !== choice ? "opacity-20" : ""}`}
              >
                {getEmoji(choice)}
              </button>
            ))}
          </div>
        )}

        {/* End Game Options */}
        {gameState.state === "game_over" && (
          <div className="w-full flex flex-col gap-3 mt-6">
            <button
              onClick={requestRematch}
              disabled={rematchRequested}
              className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg transition-all
                ${
                  rematchRequested
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed border outline-none border-gray-600"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:shadow-xl active:scale-95 text-white"
                }`}
            >
              {rematchRequested
                ? "Waiting for Opponent..."
                : gameState.rematchRequests?.find((id) => id !== socketId)
                  ? "Accept Rematch"
                  : "Request Rematch"}
            </button>
            <button
              onClick={playAgain}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              Play New Opponent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getEmoji(choice: RPSChoice) {
  switch (choice) {
    case "rock":
      return "🪨";
    case "paper":
      return "📄";
    case "scissors":
      return "✂️";
    default:
      return "❓";
  }
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { GTFRoundState, GTFPlayer } from "@gamehub/guess-the-flag";
import GameSetup, { GameSetupConfig } from "../../components/GameSetup";
import TimerDisplay from "../../components/TimerDisplay";
import BackButton from "../../components/BackButton";
import AlertModal from "../../components/AlertModal";
import EndMatchOptions from "../../components/EndMatchOptions";
import { Wifi, WifiOff } from "lucide-react";
import { useRoomList } from "../../hooks/useRoomList";
import RoomBrowser from "../../components/RoomBrowser";
import WaitingScreen from "../../components/WaitingScreen";

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
}

export default function GuessTheFlagGame() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localChoice, setLocalChoice] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );

  const rooms = useRoomList(socket);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/gtf");
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
        state.state === "guessing_phase" &&
        !state.players.find((p) => p.id === s.id)?.hasGuessed
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

  const handleCancelWaiting = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setWaiting(false);
    setIsHost(true);
    setSetupNeeded(true);
    setGameState(null);
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
        <GameSetup onStart={handleStartGame} gameId="gtf" />
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
          gameLabel="Guess the Flag"
        />
      </div>
    );
  }

  if (!roomId || !gameState || gameState.players.length < 2) {
    return (
      <WaitingScreen
        isHost={isHost}
        onCancel={handleCancelWaiting}
        onLeaveRoom={handleLeaveRoom}
        themeColor="orange"
      />
    );
  }

  const me = gameState.players.find((p) => p.id === socketId);
  const opp = gameState.players.find((p) => p.id !== socketId);

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center py-12 px-8 font-iosevka-regular overflow-y-auto">
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
      <h1 className="text-4xl font-iosevka-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
        GameHub Guess the Flag
      </h1>

      <div className="w-full max-w-4xl bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl space-y-8 flex flex-col items-center">
        {/* Scoreboard */}
        <div className="w-full flex justify-between items-center bg-gray-900 rounded-xl p-4">
          <div className="text-center w-1/3">
            <p className="text-sm text-gray-400 border-b border-gray-700 pb-1 mb-2 flex items-center justify-center gap-2">
              You{" "}
              {socketId ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </p>
            <p className="text-4xl font-iosevka-bold text-emerald-400">
              {me?.score || 0}
            </p>
          </div>
          <div className="text-center w-1/3">
            <p className="text-gray-500 uppercase tracking-widest text-xs border-b border-gray-700 pb-1 mb-2">
              Round
            </p>
            <p className="text-2xl">
              {gameState.currentRound} / {gameState.maxRounds}
            </p>
          </div>
          <div className="text-center w-1/3">
            <p className="text-sm text-gray-400 border-b border-gray-700 pb-1 mb-2 flex items-center justify-center gap-2">
              Opponent{" "}
              {roomId && !waitingOpponent(gameState) ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </p>
            <p className="text-4xl font-iosevka-bold text-red-400">
              {opp?.score || 0}
            </p>
          </div>
        </div>

        {/* State Information */}
        <div className="text-center text-xl h-12 flex items-center justify-center w-full bg-gray-900/50 rounded-lg">
          {gameState.state === "guessing_phase" && !me?.hasGuessed && (
            <span className="text-blue-400 animate-pulse font-iosevka-medium">
              Who does this flag belong to?
            </span>
          )}
          {gameState.state === "guessing_phase" && me?.hasGuessed && (
            <span className="text-gray-400 italic">
              Waiting for opponent to guess...
            </span>
          )}
          {gameState.state === "round_result" && (
            <span className="text-yellow-400 font-iosevka-bold text-2xl drop-shadow-md">
              Round Over!
            </span>
          )}
          {gameState.state === "game_over" && (
            <span className="text-emerald-400 font-iosevka-bold text-2xl drop-shadow-md">
              Game Over!
            </span>
          )}
        </div>

        {gameState.state === "guessing_phase" && !me?.hasGuessed && (
          <TimerDisplay turnEndTime={gameState.turnEndTime || null} />
        )}

        {/* Battle Arena */}
        <div className="flex flex-col items-center justify-center w-full max-w-2xl gap-8">
          {/* Default state flag (waiting or guessing) */}
          {(gameState.state === "guessing_phase" ||
            gameState.state === "waiting_players") &&
            gameState.flagUrl && (
              <div className="w-full max-w-sm aspect-video bg-gray-950 rounded-xl overflow-hidden shadow-xl ring-2 ring-gray-700 relative flex items-center justify-center p-4">
                <img
                  src={gameState.flagUrl}
                  alt="Guess the Flag"
                  className="object-contain w-full h-full drop-shadow-lg"
                />
              </div>
            )}

          {/* Results phase flag and choices */}
          {gameState.state === "round_result" ||
          gameState.state === "game_over" ? (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="w-full max-w-sm aspect-video bg-gray-950 rounded-xl overflow-hidden shadow-xl ring-4 ring-emerald-500/50 relative flex items-center justify-center p-4 mb-4">
                <img
                  src={gameState.flagUrl || ""}
                  alt="Correct Flag"
                  className="object-contain w-full h-full drop-shadow-lg"
                />
              </div>

              <div className="w-full bg-gray-900 rounded-xl p-6 text-center border border-gray-700 shadow-inner">
                <p className="text-gray-400 text-sm mb-2 uppercase tracking-wide">
                  The correct answer was
                </p>
                <p className="text-4xl font-iosevka-bold text-emerald-400 drop-shadow-md">
                  {gameState.correctCountry}
                </p>
              </div>

              <div className="flex w-full justify-between items-center gap-4 mt-4">
                <div className="w-1/2 bg-gray-900 p-4 rounded-xl border border-gray-700 text-center">
                  <p className="text-gray-500 text-xs uppercase mb-2">
                    You Guessed
                  </p>
                  <p
                    className={`text-xl font-iosevka-medium ${me?.currentGuess === gameState.correctCountry ? "text-emerald-400" : "text-red-400 line-through decoration-2"}`}
                  >
                    {me?.currentGuess || "Nothing"}
                  </p>
                </div>
                <div className="w-1/2 bg-gray-900 p-4 rounded-xl border border-gray-700 text-center">
                  <p className="text-gray-500 text-xs uppercase mb-2">
                    Opponent Guessed
                  </p>
                  <p
                    className={`text-xl font-iosevka-medium ${opp?.currentGuess === gameState.correctCountry ? "text-emerald-400" : "text-red-400 line-through decoration-2"}`}
                  >
                    {opp?.currentGuess || "Nothing"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              {gameState.options.map((option) => (
                <button
                  key={option}
                  disabled={me?.hasGuessed}
                  onClick={() => submitGuess(option)}
                  className={`py-6 px-4 text-xl rounded-xl transition-all font-iosevka-medium ${
                    localChoice === option
                      ? "bg-orange-600 border-2 border-orange-400 scale-[1.02] shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      : "bg-gray-700 hover:bg-gray-600 border border-transparent hover:border-gray-500"
                  } ${me?.hasGuessed && localChoice !== option ? "opacity-30" : ""}`}
                >
                  <span className="truncate block w-full text-center">
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

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
            primaryColorGradient="from-orange-500 to-red-600"
            primaryColorHover="hover:from-orange-400 hover:to-red-500"
          />
        )}
      </div>
    </div>
  );
}

// Utility to check if second player is fully connected
function waitingOpponent(gameState: GameState) {
  return gameState.players.length < 2 || gameState.state === "waiting_players";
}

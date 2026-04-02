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
import { Wifi, WifiOff, X } from "lucide-react";
import { useRoomList } from "../../hooks/useRoomList";
import RoomBrowser from "../../components/RoomBrowser";
import RoomLobby from "../../components/RoomLobby";
import useRoomLobby from "../../hooks/useRoomLobby";
import MatchTerminationBanner from "../../components/MatchTerminationBanner";
import Scoreboard from "../../components/Scoreboard";

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
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
  const [matchTerminationCountdown, setMatchTerminationCountdown] = useState<number | null>(null);

  const rooms = useRoomList(socket);
  const roomLobby = useRoomLobby(socket, roomId);

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/gtf");
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
      alert("The Host has destroyed the room.");
      window.location.href = "/games/guess-the-flag";
    });

    s.on("gameStarted", () => {
      setIsGameStarted(true);
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
    setRematchRequested(false);
    setSetupNeeded(true);
    setIsGameStarted(false);
  };

  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setGameState(null);
    setRematchRequested(false);
    setSetupNeeded(false);
    setIsGameStarted(false);
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
        <GameSetup onStart={handleStartGame} gameId="gtf" />
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
          gameLabel="Guess the Flag"
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
        themeColor="orange"
      />
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center font-iosevka-bold text-xl text-orange-400 animate-pulse">
        Entering Arena...
      </div>
    );
  }

  const me = gameState.players.find((p) => p.id === socketId);
  const opp = gameState.players.find((p) => p.id !== socketId);

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center py-12 px-8 font-iosevka-regular overflow-y-auto">
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
          <div className="bg-gray-800 border-l-4 border-orange-500 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
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
        <Scoreboard
          players={gameState.players}
          localPlayerId={socketId || ""}
          currentRound={gameState.currentRound}
          maxRounds={gameState.maxRounds}
          themeColor="orange"
        />

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

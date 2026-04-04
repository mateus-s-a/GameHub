"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import GameSetup, {
  GameSetupConfig,
} from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import BackButton from "@/\(shared\)/components/ui/BackButton";
import AlertModal from "@/\(shared\)/components/ui/AlertModal";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import { Wifi, WifiOff } from "lucide-react";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import useRoomLobby from "@/features/lobby/hooks/useRoomLobby";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import Scoreboard from "@/features/match/components/Scoreboard";
import ConfirmModal from "@/\(shared\)/components/ui/ConfirmModal";
import { X } from "lucide-react";

type PlayerMark = "X" | "O" | null;

interface GameState {
  board: PlayerMark[];
  currentPlayer: PlayerMark;
  winner: PlayerMark | "Draw";
  players: { id: string; mark: PlayerMark }[];
  rematchRequests?: string[];
  maxRounds?: number;
  currentRound?: number;
  timeLimit?: number;
  turnEndTime?: number | null;
  scores?: Record<"X" | "O", number>;
  yourMark?: PlayerMark;
  state?: string;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );
  const [tempNotification, setTempNotification] = useState<string | null>(null);
  const [matchTerminationCountdown, setMatchTerminationCountdown] = useState<
    number | null
  >(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const [board, setBoard] = useState<PlayerMark[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerMark>("X");
  const [winner, setWinner] = useState<PlayerMark | "Draw">(null);
  const [yourMark, setYourMark] = useState<PlayerMark>(null);

  const [rematchRequests, setRematchRequests] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(1);

  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [roundState, setRoundState] = useState<string>("waiting_players");
  const [gameStateData, setGameStateData] = useState<GameState | null>(null);

  const rooms = useRoomList(socket);
  const roomLobby = useRoomLobby(socket, roomId);

  useEffect(() => {
    if (isGameStarted && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [isGameStarted, socket, roomId]);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/ttt");
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
        "Server destroyed the room because: The match was terminated by the system.",
      );
    });

    s.on("gameStarted", () => {
      setIsGameStarted(true);
    });

    s.on("gameState", (serverState: GameState) => {
      setSetupNeeded(false);
      setGameStateData(serverState);
      setBoard(serverState.board);
      setCurrentPlayer(serverState.currentPlayer);
      setWinner(serverState.winner);

      setRematchRequests(serverState.rematchRequests || []);
      setCurrentRound(serverState.currentRound || 1);
      setMaxRounds(serverState.maxRounds || 1);

      setScores(serverState.scores || { X: 0, O: 0 });
      setRoundState(serverState.state || "waiting_players");
      if (serverState.yourMark !== undefined) setYourMark(serverState.yourMark);
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

    s.on("disconnect", () => {
      setSocketId(null);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleMove = (index: number) => {
    if (
      socket &&
      roomId &&
      !board[index] &&
      !winner &&
      currentPlayer === yourMark
    ) {
      const newBoard = [...board];
      newBoard[index] = yourMark;
      setBoard(newBoard);

      socket.emit("makeMove", { roomId, index });
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
      setIsGameStarted(false);
      setBoard(Array(9).fill(null));
      setWinner(null);
      setYourMark(null);
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
    setIsGameStarted(false);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setYourMark(null);
    setRematchRequested(false);
    setSetupNeeded(true);
  };

  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit("leaveRoom", roomId);
    }
    setRoomId(null);
    setIsGameStarted(false);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setYourMark(null);
    setRematchRequested(false);
    setSetupNeeded(false);
    setIsHost(false);
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

  const handleStartGame = (config: GameSetupConfig) => {
    if (socket) {
      socket.emit("createRoom", config);
      setSetupNeeded(false);
    }
  };

  const handleDisconnectAcknowledge = () => {
    setDisconnectMessage(null);
    setRoomId(null);
    setIsGameStarted(false);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setYourMark(null);
    setRematchRequested(false);

    setIsHost(false);
    setSetupNeeded(false);
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
        <GameSetup onStart={handleStartGame} gameId="ttt" />
      </div>
    );
  }

  if (!roomId && !setupNeeded) {
    return (
      <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center pt-24 p-8 font-sans">
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
          gameLabel="Tic-Tac-Toe"
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
        themeColor="cyan"
      />
    );
  }

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-sans">
      {matchTerminationCountdown !== null && (
        <MatchTerminationBanner countdown={matchTerminationCountdown} />
      )}

      <AlertModal
        isOpen={
          !!disconnectMessage &&
          (roundState !== "game_over" || rematchRequested) &&
          matchTerminationCountdown === null
        }
        title="Connection Lost"
        message={disconnectMessage || ""}
      />

      {/* Temporary Toast Notification */}
      {tempNotification && (
        <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-gray-800 border-l-4 border-cyan-500 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
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
        isGameOver={roundState === "game_over"}
        onReturnToSetup={handleReturnToSetup}
        onLeaveRoom={handleLeaveRoom}
      />
      <h1 className="text-5xl border-b pb-4 mb-4 font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-center">
        GameHub Tic-Tac-Toe
      </h1>

      {isGameStarted && !winner && (
        <button
          onClick={() => setIsExitModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 transition-all font-iosevka-medium text-xs mb-8 mx-auto active:scale-95"
        >
          <X className="w-3 h-3" />
          <span>Leave Match</span>
        </button>
      )}

      <ConfirmModal
        isOpen={isExitModalOpen}
        title="Leave Match?"
        message="Are you sure you want to leave the current match? Your progress will be lost."
        onConfirm={() => {
          handleLeaveRoom();
          setIsExitModalOpen(false);
          window.location.href = "/";
        }}
        onCancel={() => setIsExitModalOpen(false)}
        confirmText="Leave"
        cancelText="Stay"
        themeColor="red"
      />

      <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-gray-700 w-full max-w-md">
        <div className="flex justify-between w-full mb-6 text-sm font-semibold tracking-wide">
          <span
            className={`px-3 py-1 flex items-center gap-2 rounded-full border ${socketId ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}
          >
            {socketId ? (
              <>
                <Wifi className="w-4 h-4" /> Connected
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" /> Disconnected
              </>
            )}
          </span>
          {yourMark && (
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">
              You are: {yourMark}
            </span>
          )}
        </div>

        <Scoreboard
          players={
            gameStateData?.players.map((p) => ({
              id: p.id,
              name: p.mark === "X" ? "Player X" : "Player O",
              score: scores[p.mark as "X" | "O"] || 0,
              isConnected: true, // Simplified for TTT as it already handles disconnections via Alerts
            })) || []
          }
          localPlayerId={socketId || ""}
          currentRound={currentRound}
          maxRounds={maxRounds}
          themeColor="cyan"
        />

        {/* State Information */}
        <div className="text-center text-xl h-8 flex items-center justify-center mb-4">
          {winner && winner !== "Draw" && roundState !== "round_result" && (
            <span className="text-emerald-400 font-bold drop-shadow-md">
              Player {winner} Wins the Match!
            </span>
          )}
          {winner === "Draw" && roundState !== "round_result" && (
            <span className="text-gray-400 font-bold drop-shadow-md">
              It&apos;s a Draw!
            </span>
          )}
          {roundState === "round_result" && (
            <span className="text-yellow-400 font-iosevka-bold text-2xl drop-shadow-md animate-pulse">
              Round Over! Get Ready...
            </span>
          )}
          {!winner && currentPlayer === yourMark && (
            <span className="text-blue-400 animate-pulse font-bold">
              Your Turn
            </span>
          )}
          {!winner && currentPlayer !== yourMark && (
            <span className="text-gray-400 italic">
              Opponent&apos;s Turn...
            </span>
          )}
        </div>

        {!winner && (
          <TimerDisplay turnEndTime={gameStateData?.turnEndTime || null} />
        )}

        {/* Board */}
        <div className="grid grid-cols-3 gap-3 bg-gray-700 p-3 rounded-2xl mb-8">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleMove(i)}
              disabled={!!cell || !!winner || currentPlayer !== yourMark}
              className={`w-24 h-24 bg-gray-800 rounded-xl shadow-inner transition-all duration-300 flex items-center justify-center text-5xl font-bold
                ${!cell && !winner && currentPlayer === yourMark ? "hover:bg-gray-600 cursor-pointer hover:shadow-cyan-500/20" : "cursor-default"}
                ${cell === "X" ? "text-cyan-400" : "text-rose-400"}`}
            >
              {cell && (
                <span className="animate-in zoom-in-50 duration-200">
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* End Game Options */}
        {roundState === "game_over" && (
          <EndMatchOptions
            rematchRequested={rematchRequested}
            opponentLeft={!!disconnectMessage}
            hasOpponentRequested={
              rematchRequests.find((id) => id !== socketId) !== undefined
            }
            onRequestRematch={requestRematch}
            onPlayAgain={playAgain}
            primaryColorGradient="from-blue-600 to-indigo-600"
            primaryColorHover="hover:from-blue-500 hover:to-indigo-500"
          />
        )}
      </div>
    </div>
  );
}

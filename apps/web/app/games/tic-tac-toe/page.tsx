"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import GameSetup, { GameSetupConfig } from "../../components/GameSetup";
import TimerDisplay from "../../components/TimerDisplay";
import BackButton from "../../components/BackButton";
import AlertModal from "../../components/AlertModal";
import EndMatchOptions from "../../components/EndMatchOptions";
import { Wifi, WifiOff } from "lucide-react";

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
  const [waiting, setWaiting] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null,
  );

  const [board, setBoard] = useState<PlayerMark[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerMark>("X");
  const [winner, setWinner] = useState<PlayerMark | "Draw">(null);
  const [yourMark, setYourMark] = useState<PlayerMark>(null);
  const [players, setPlayers] = useState<{ id: string; mark: PlayerMark }[]>(
    [],
  );
  const [rematchRequests, setRematchRequests] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(1);
  const [turnEndTime, setTurnEndTime] = useState<number | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [roundState, setRoundState] = useState<string>("waiting_players");
  const [gameStateData, setGameStateData] = useState<GameState | null>(null);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/ttt");
    setSocket(s);

    s.on("connect", () => {
      setSocketId(s.id || null);
      s.emit("checkQueue", (hasPending: boolean) => {
        if (hasPending) {
          setIsHost(false);
          s.emit("joinMatchmaking");
          setWaiting(true);
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

    s.on("waitingForOpponent", () => {
      setWaiting(true);
    });

    s.on("gameState", (serverState: GameState) => {
      setWaiting(false);
      setSetupNeeded(false);
      setGameStateData(serverState);
      setBoard(serverState.board);
      setCurrentPlayer(serverState.currentPlayer);
      setWinner(serverState.winner);
      setPlayers(serverState.players || []);
      setRematchRequests(serverState.rematchRequests || []);
      setCurrentRound(serverState.currentRound || 1);
      setMaxRounds(serverState.maxRounds || 1);
      setTurnEndTime(serverState.turnEndTime || null);
      setScores(serverState.scores || { X: 0, O: 0 });
      setRoundState(serverState.state || "waiting_players");
      if (serverState.yourMark !== undefined) setYourMark(serverState.yourMark);
    });

    s.on("rematchStarted", () => {
      setRematchRequested(false);
    });

    s.on("opponentDisconnected", () => {
      setDisconnectMessage("Opponent left the room.");
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
      setWaiting(false);
      setBoard(Array(9).fill(null));
      setWinner(null);
      setYourMark(null);
      setRematchRequested(false);
      setDisconnectMessage(null);
      socket.emit("checkQueue", (hasPending: boolean) => {
        if (hasPending) {
          setIsHost(false);
          socket.emit("joinMatchmaking");
          setWaiting(true);
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
    setWaiting(false);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setYourMark(null);
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
      setWaiting(true);
    }
  };

  const handleDisconnectAcknowledge = () => {
    setDisconnectMessage(null);
    setRoomId(null);
    setWaiting(false);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setYourMark(null);
    setRematchRequested(false);

    if (socket) {
      socket.emit("checkQueue", (hasPending: boolean) => {
        if (hasPending) {
          setIsHost(false);
          socket.emit("joinMatchmaking");
          setWaiting(true);
        } else {
          setIsHost(true);
          setSetupNeeded(true);
        }
      });
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
        <GameSetup onStart={handleStartGame} gameId="ttt" />
      </div>
    );
  }

  if (!roomId || waiting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-sans text-2xl">
        {!socketId
          ? "Connecting to Socket Hub..."
          : waiting
            ? "Waiting for opposing player to join room..."
            : "Searching for an opponent in Matchmaking..."}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-sans">
      <AlertModal
        isOpen={
          !!disconnectMessage &&
          (roundState !== "game_over" || rematchRequested)
        }
        title="Connection Lost"
        message={disconnectMessage || ""}
        onConfirm={handleDisconnectAcknowledge}
      />
      <BackButton
        isHost={isHost}
        isInSetup={false}
        isGameOver={roundState === "game_over"}
        onReturnToSetup={handleReturnToSetup}
        onLeaveRoom={handleLeaveRoom}
      />
      <h1 className="text-5xl border-b pb-4 mb-8 font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
        GameHub Tic-Tac-Toe
      </h1>

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

        {/* Score & Turn System */}
        <div className="flex justify-between items-center w-full mb-8 font-iosevka-bold">
          <div
            className={`flex flex-col items-center bg-gray-800 px-6 py-4 rounded-xl border-b-4 ${currentPlayer === "X" ? "border-blue-500 shadow-[0_4px_15px_rgba(59,130,246,0.3)]" : "border-gray-600"} transition-all`}
          >
            <span className="text-blue-500 text-3xl mb-1">X</span>
            {yourMark === "X" && (
              <span className="text-gray-400 text-xs uppercase tracking-widest">
                (You)
              </span>
            )}
            <span className="text-white text-xl mt-1">Wins: {scores["X"]}</span>
          </div>

          <div className="flex flex-col items-center flex-1 mx-4">
            <span className="text-4xl text-gray-500 italic mb-2">VS</span>
            {maxRounds > 1 && (
              <div className="text-gray-400 text-sm">
                Round {currentRound} / {maxRounds}
              </div>
            )}
          </div>

          <div
            className={`flex flex-col items-center bg-gray-800 px-6 py-4 rounded-xl border-b-4 ${currentPlayer === "O" ? "border-red-500 shadow-[0_4px_15px_rgba(239,68,68,0.3)]" : "border-gray-600"} transition-all`}
          >
            {/* Player O Label */}
            <span className="text-red-500 text-3xl mb-1">O</span>
            {yourMark === "O" && (
              <span className="text-gray-400 text-xs uppercase tracking-widest">
                (You)
              </span>
            )}
            <span className="text-white text-xl mt-1">Wins: {scores["O"]}</span>
          </div>
        </div>

        {/* State Information */}
        <div className="text-center text-xl h-8 flex items-center justify-center mb-4">
          {winner && winner !== "Draw" && roundState !== "round_result" && (
            <span className="text-emerald-400 font-bold drop-shadow-md">
              Player {winner} Wins the Match!
            </span>
          )}
          {winner === "Draw" && roundState !== "round_result" && (
            <span className="text-gray-400 font-bold drop-shadow-md">
              It's a Draw!
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
            <span className="text-gray-400 italic">Opponent's Turn...</span>
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

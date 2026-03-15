"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type PlayerMark = 'X' | 'O' | null;

interface GameState {
  board: PlayerMark[];
  currentPlayer: PlayerMark;
  winner: PlayerMark | 'Draw';
  yourMark?: PlayerMark;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  
  const [board, setBoard] = useState<PlayerMark[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerMark>('X');
  const [winner, setWinner] = useState<PlayerMark | 'Draw'>(null);
  const [yourMark, setYourMark] = useState<PlayerMark>(null);

  useEffect(() => {
    const s: Socket = io("http://localhost:3001/ttt");
    setSocket(s);

    s.on("connect", () => {
      setSocketId(s.id || null);
      s.emit("joinMatchmaking");
    });

    s.on("matchFound", ({ roomId }) => {
      setRoomId(roomId);
      s.emit("joinRoom", roomId);
    });

    s.on("waitingForOpponent", () => {
      setWaiting(true);
    });

    s.on("gameState", (state: GameState) => {
      setWaiting(false);
      setBoard(state.board);
      setCurrentPlayer(state.currentPlayer);
      setWinner(state.winner);
      if (state.yourMark) setYourMark(state.yourMark);
    });

    s.on("opponentDisconnected", () => {
      alert("Opponent disconnected!");
      setRoomId(null);
      setWaiting(false);
      setBoard(Array(9).fill(null));
      setWinner(null);
      setYourMark(null);
      s.emit("joinMatchmaking");
    });

    s.on("disconnect", () => {
      setSocketId(null);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleMove = (index: number) => {
    if (socket && roomId && !board[index] && !winner && currentPlayer === yourMark) {
      // Optimistic update
      const newBoard = [...board];
      newBoard[index] = yourMark;
      setBoard(newBoard);
      
      socket.emit('makeMove', { roomId, index });
    }
  };

  const resetGame = () => {
    if (socket) {
      setRoomId(null);
      setWaiting(false);
      setBoard(Array(9).fill(null));
      setWinner(null);
      setYourMark(null);
      socket.emit('joinMatchmaking');
    }
  };

  if (!roomId || waiting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-sans text-2xl">
        {!socketId ? "Connecting to Socket Hub..." : (waiting ? "Waiting for opposing player to join room..." : "Searching for an opponent in Matchmaking...")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-sans">
      <h1 className="text-5xl border-b pb-4 mb-8 font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
        GamesHub Tic-Tac-Toe
      </h1>
      
      <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center border border-gray-700 w-full max-w-md">
        
        {/* Status Indicators */}
        <div className="flex justify-between w-full mb-6 text-sm font-semibold tracking-wide">
          <span className={`px-3 py-1 rounded-full ${socketId ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {socketId ? "● Connected" : "○ Disconnected"}
          </span>
          {yourMark && (
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">
              You are: {yourMark}
            </span>
          )}
        </div>

        {/* Game State Messages */}
        <div className="text-2xl font-bold mb-6 h-8">
          {winner ? (
            winner === 'Draw' ? (
              <span className="text-yellow-400">It's a Draw!</span>
            ) : (
              <span className="text-green-400">{winner} Wins!</span>
            )
          ) : (
            <span>
              {currentPlayer === yourMark ? (
                <span className="text-blue-400">Your Turn</span>
              ) : (
                <span className="text-gray-400">Waiting for {currentPlayer}...</span>
              )}
            </span>
          )}
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-3 bg-gray-700 p-3 rounded-2xl mb-8">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleMove(i)}
              disabled={!!cell || !!winner || currentPlayer !== yourMark}
              className={`w-24 h-24 bg-gray-800 rounded-xl shadow-inner transition-all duration-300 flex items-center justify-center text-5xl font-bold
                ${!cell && !winner && currentPlayer === yourMark ? 'hover:bg-gray-600 cursor-pointer hover:shadow-cyan-500/20' : 'cursor-default'}
                ${cell === 'X' ? 'text-cyan-400' : 'text-rose-400'}`}
            >
              {cell && (
                <span className="animate-in zoom-in-50 duration-200">
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reset Button */}
        {winner && (
          <button
            onClick={resetGame}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

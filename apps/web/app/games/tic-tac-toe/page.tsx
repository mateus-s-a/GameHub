"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import { GameSetupConfig } from "@gamehub/types";
import GameSetup from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import AlertModal from "@/(shared)/components/ui/AlertModal";
import ConfirmModal from "@/(shared)/components/ui/ConfirmModal";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import { X } from "lucide-react";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import { useMatchManager } from "@/features/match/hooks/useMatchManager";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";
import NavButton from "@/(shared)/components/ui/NavButton";
import Scoreboard from "@/features/match/components/Scoreboard";
import { motion, AnimatePresence } from "framer-motion";

type PlayerMark = "X" | "O" | null;
type RoundState = "waiting_players" | "playing" | "game_over" | "round_result";

interface GameState {
  board: PlayerMark[];
  currentPlayer: PlayerMark;
  winner: PlayerMark | "DRAW";
  winningLine: number[] | null;
  players: { id: string; mark: PlayerMark }[];
  rematchRequests: string[];
  currentRound: number;
  maxRounds: number;
  scores: Record<Exclude<PlayerMark, null>, number>;
  state: RoundState;
  turnEndTime: number | null;
  yourMark?: PlayerMark;
}

export default function TicTacToeGame() {
  const { playerName } = useSocket();

  const {
    socket,
    localSocketId,
    roomId,
    setIsHost,
    isGameStarted,
    roomLobby,
    disconnectMessage,
    matchTerminationCountdown,
    tempNotification,
    setTempNotification,
    rematchRequested,
    // Actions
    joinRoom,
    leaveRoom,
    toggleReady,
    startMatch,
    requestRematch,
  } = useMatchManager({
    namespace: "ttt",
    playerName,
  });

  const [gameStateData, setGameStateData] = useState<GameState | null>(null);
  const [board, setBoard] = useState<PlayerMark[]>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<PlayerMark>("X");
  const [winner, setWinner] = useState<PlayerMark | "DRAW">(null);
  const [yourMark, setYourMark] = useState<PlayerMark>(null);
  const [roundState, setRoundState] = useState<RoundState>("waiting_players");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(1);
  const [rematchRequests, setRematchRequests] = useState<string[]>([]);

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

    socket.on("matchFound", () => {
      // Game-specific resets
      setWinner(null);
      setBoard(Array(9).fill(null));
      setRoundState("waiting_players");
    });

    return () => {
      socket.off("gameState");
      socket.off("matchFound");
    };
  }, [socket]);

  const handleCellClick = (index: number) => {
    if (
      socket &&
      roomId &&
      board[index] === null &&
      winner === null &&
      yourMark === currentPlayer
    ) {
      socket.emit("makeMove", { roomId, index });
    }
  };

  const playAgain = () => {
    leaveRoom();
    setBoard(Array(9).fill(null));
    setWinner(null);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setBoard(Array(9).fill(null));
    setWinner(null);
    setGameStateData(null);
    setSetupNeeded(false);
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
              gameId="ttt"
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
          gameLabel="Tic-Tac-Toe"
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
      <GameShell playerName={playerName}>
        <RoomLobby
          roomLobby={roomLobby}
          localPlayerId={localSocketId || ""}
          onToggleReady={toggleReady}
          onStartMatch={startMatch}
          onLeaveRoom={handleLeaveRoom}
          onUpdateConfig={handleUpdateConfig}
          themeColor="cyan"
          tempNotification={tempNotification}
        />
      </GameShell>
    );
  }

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

      {/* Temporary Toast Notification */}
      {tempNotification && (
        <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-[#1a1a1a] border-l-4 border-white/20 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse" />
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
        <h1 className="text-4xl font-iosevka-bold mb-8 text-white tracking-widest uppercase">
          Tic-Tac-Toe
        </h1>

        {isGameStarted && !winner && (
          <Button
            variant="ghost"
            onClick={() => setIsExitModalOpen(true)}
            className="mb-8 border-red-500/20 text-red-500 hover:bg-red-500/10"
          >
            <X className="w-3 h-3" />
            <span>LEAVE MATCH</span>
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

        <Card className="w-full max-w-md p-10 flex flex-col items-center gap-8 bg-[#161616]">
          <div className="flex justify-between w-full mb-2 text-xs font-iosevka-bold tracking-widest uppercase text-[var(--muted)]">
            <span
              className={`px-4 py-2 rounded-lg border ${localSocketId ? "bg-white/5 border-white/10" : "bg-red-500/10 border-red-500/20"}`}
            >
              {localSocketId ? "CONNECTED" : "OFFLINE"}
            </span>
            {yourMark && (
              <span className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                MARK: {yourMark}
              </span>
            )}
          </div>

          <Scoreboard
            players={
              gameStateData?.players.map((p) => ({
                id: p.id,
                name: roomLobby?.players.find((rp) => rp.id === p.id)?.name,
                score: scores[p.mark as string] || 0,
                isConnected: true,
              })) || []
            }
            localPlayerId={localSocketId || ""}
            currentRound={currentRound}
            maxRounds={maxRounds}
            gameId="ttt"
          />

          <div className="text-center text-xl h-12 flex items-center justify-center w-full bg-[#111111] rounded-xl border border-white/5">
            {roundState === "playing" && (
              <span className="text-white animate-pulse font-iosevka-bold uppercase tracking-widest">
                {yourMark === currentPlayer ? "YOUR TURN" : "OPPONENT'S TURN"}
              </span>
            )}
            {roundState === "round_result" && (
              <span className="text-white font-iosevka-bold uppercase tracking-widest">
                {winner === "DRAW"
                  ? "IT'S A DRAW!"
                  : `${winner} WINS THE ROUND!`}
              </span>
            )}
            {roundState === "game_over" && (
              <span className="text-white font-iosevka-bold uppercase tracking-widest">
                GAME OVER!
              </span>
            )}
          </div>

          {roundState === "playing" && (
            <div className="scale-150 py-4">
              <TimerDisplay turnEndTime={gameStateData?.turnEndTime || null} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 bg-[#1a1a1a] p-4 rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden">
            {/* Winning Line Overlay */}
            {roundState === "round_result" &&
              gameStateData?.winningLine &&
              gameStateData.winningLine.length === 3 && (
                <svg
                  className="absolute inset-0 z-10 w-full h-full pointer-events-none"
                  viewBox="0 0 300 300"
                >
                  {(() => {
                    const line = gameStateData.winningLine;
                    if (!line || line.length < 3) return null;
                    const getCoords = (idx: number) => ({
                      x: (idx % 3) * 100 + 50,
                      y: Math.floor(idx / 3) * 100 + 50,
                    });
                    const startPos = line[0] ?? 0;
                    const endPos = line[2] ?? 0;
                    const start = getCoords(startPos);
                    const end = getCoords(endPos);
                    return (
                      <motion.line
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={winner === "X" ? "#22d3ee" : "#f472b6"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        style={{
                          filter: `drop-shadow(0 0 12px ${winner === "X" ? "#22d3ee" : "#f472b6"})`,
                        }}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    );
                  })()}
                </svg>
              )}

            {board.map((cell, i) => (
              <motion.button
                key={i}
                whileHover={
                  cell === null && winner === null && yourMark === currentPlayer
                    ? { scale: 1.05, backgroundColor: "rgba(255,255,255,0.03)" }
                    : {}
                }
                whileTap={
                  cell === null && winner === null && yourMark === currentPlayer
                    ? { scale: 0.95 }
                    : {}
                }
                onClick={() => handleCellClick(i)}
                disabled={
                  cell !== null || winner !== null || yourMark !== currentPlayer
                }
                className={`w-28 h-28 flex items-center justify-center rounded-xl border z-20 ${
                  cell === "X"
                    ? "text-cyan-400 bg-cyan-400/5 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                    : cell === "O"
                      ? "text-pink-400 bg-pink-400/5 border-pink-400/20 shadow-[0_0_20px_rgba(244,114,182,0.1)]"
                      : "bg-[#111111] border-white/5 hover:border-white/20"
                } disabled:opacity-100 relative`}
              >
                <AnimatePresence>
                  {cell === "X" && (
                    <motion.svg
                      viewBox="0 0 100 100"
                      className="w-16 h-16 stroke-current"
                      style={{ filter: "drop-shadow(0 0 8px currentColor)" }}
                    >
                      <motion.line
                        x1="20"
                        y1="20"
                        x2="80"
                        y2="80"
                        strokeWidth="12"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                      <motion.line
                        x1="80"
                        y1="20"
                        x2="20"
                        y2="80"
                        strokeWidth="12"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      />
                    </motion.svg>
                  )}
                  {cell === "O" && (
                    <motion.svg
                      viewBox="0 0 100 100"
                      className="w-16 h-16 stroke-current fill-none"
                      style={{ filter: "drop-shadow(0 0 8px currentColor)" }}
                    >
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="35"
                        strokeWidth="12"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>

          {roundState === "game_over" && (
            <div className="w-full pt-8 border-t border-white/5">
              <EndMatchOptions
                rematchRequested={rematchRequested}
                opponentLeft={!!disconnectMessage}
                hasOpponentRequested={
                  rematchRequests.find((id) => id !== localSocketId) !==
                  undefined
                }
                onRequestRematch={requestRematch}
                onPlayAgain={playAgain}
                primaryColorGradient="from-cyan-600 to-cyan-900"
                primaryColorHover="hover:from-cyan-500 hover:to-cyan-800"
              />
            </div>
          )}
        </Card>
      </div>
    </GameShell>
  );
}

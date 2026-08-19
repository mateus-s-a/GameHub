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
import ReturnToLobbyBadge from "@/features/match/components/ReturnToLobbyBadge";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";
import NavButton from "@/(shared)/components/ui/NavButton";
import Scoreboard from "@/features/match/components/Scoreboard";
import { motion, AnimatePresence } from "framer-motion";
import { GAME_CONSTANTS } from "@gamehub/core";

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
    returnToLobbyCountdown,
    setReturnToLobbyCountdown,
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

      if (
        serverState.state === "game_over" &&
        returnToLobbyCountdown === null
      ) {
        setReturnToLobbyCountdown(GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC);
      }
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

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Responsive Grid Shell: Column on Mobile, 2-Column Split on Desktop */}
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start justify-center">
          
          {/* Left Column: HUD & Information Panel */}
          <Card className="w-full lg:w-80 p-5 md:p-6 flex flex-col items-center gap-5 bg-[#141414] border border-cyan-500/20 shadow-2xl shrink-0">
            <h1 className="text-2xl md:text-3xl font-iosevka-bold text-white tracking-widest uppercase text-center drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]">
              Tic-Tac-Toe
            </h1>

            {/* Connection Status & Mark Badge */}
            <div className="flex items-center justify-between w-full text-xs font-iosevka-bold tracking-widest uppercase">
              <span
                className={`px-3 py-1.5 rounded-lg border ${localSocketId ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
              >
                {localSocketId ? "CONNECTED" : "OFFLINE"}
              </span>
              {yourMark && (
                <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                  MARK: {yourMark}
                </span>
              )}
            </div>

            {/* Scoreboard */}
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

            {/* Turn Banner Status */}
            <div className="text-center text-sm md:text-base py-3 px-4 flex items-center justify-center w-full bg-[#0d0d0d] rounded-xl border border-white/5 shadow-inner">
              {roundState === "playing" && (
                <span className="text-cyan-300 animate-pulse font-iosevka-bold uppercase tracking-wider">
                  {yourMark === currentPlayer ? "YOUR TURN" : "OPPONENT'S TURN"}
                </span>
              )}
              {roundState === "round_result" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  {winner === "DRAW"
                    ? "IT'S A DRAW!"
                    : `${winner} WINS ROUND!`}
                </span>
              )}
              {roundState === "game_over" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  GAME OVER!
                </span>
              )}
            </div>

            {/* Native TimerDisplay */}
            {roundState === "playing" && (
              <div className="w-full flex justify-center py-1">
                <TimerDisplay turnEndTime={gameStateData?.turnEndTime || null} size="md" />
              </div>
            )}

            {/* Leave Match Button */}
            {isGameStarted && !winner && (
              <Button
                variant="ghost"
                onClick={() => setIsExitModalOpen(true)}
                className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs tracking-widest font-iosevka-bold uppercase"
              >
                <X className="w-4 h-4 mr-2" />
                <span>LEAVE MATCH</span>
              </Button>
            )}
          </Card>

          {/* Right Column: Arena Board Frame */}
          <Card className="w-full flex-1 max-w-[min(90vw,440px)] lg:max-w-none p-5 md:p-8 flex flex-col items-center justify-center bg-[#161616] border border-white/10 shadow-2xl relative">
            
            {/* Fluid Dynamic 3x3 Grid */}
            <div className="w-full max-w-[360px] lg:max-w-[400px] aspect-square grid grid-cols-3 gap-3 md:gap-4 bg-[#141414] p-3 md:p-4 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
              
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

              {/* Grid Cells */}
              {board.map((cell, i) => (
                <motion.button
                  key={i}
                  whileHover={
                    cell === null && winner === null && yourMark === currentPlayer
                      ? { scale: 1.04, backgroundColor: "rgba(255,255,255,0.05)" }
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
                  className={`w-full h-full aspect-square flex items-center justify-center rounded-2xl border z-20 ${
                    cell === "X"
                      ? "text-cyan-400 bg-cyan-400/10 border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                      : cell === "O"
                        ? "text-pink-400 bg-pink-400/10 border-pink-400/30 shadow-[0_0_20px_rgba(244,114,182,0.15)]"
                        : "bg-[#0f0f0f] border-white/5 hover:border-white/20"
                  } disabled:opacity-100 relative transition-all`}
                >
                  <AnimatePresence>
                    {cell === "X" && (
                      <motion.svg
                        viewBox="0 0 100 100"
                        className="w-[60%] h-[60%] stroke-current"
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
                          transition={{ duration: 0.3, delay: 0.15 }}
                        />
                      </motion.svg>
                    )}
                    {cell === "O" && (
                      <motion.svg
                        viewBox="0 0 100 100"
                        className="w-[60%] h-[60%] stroke-current fill-none"
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
                          transition={{ duration: 0.4 }}
                        />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>

            {/* End Match Options Box */}
            {roundState === "game_over" && (
              <div className="w-full max-w-[400px] mt-6 pt-6 border-t border-white/10 relative z-10">
                <ReturnToLobbyBadge
                  initialSeconds={
                    returnToLobbyCountdown ||
                    GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC
                  }
                  barColorClass="bg-cyan-500/30"
                />
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
      </div>
    </GameShell>
  );
}

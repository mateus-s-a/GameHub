"use client";

import React, { useEffect, useState } from "react";
import { GameSetupConfig } from "@gamehub/types";
import GameSetup from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import ConfirmModal from "@/(shared)/components/ui/ConfirmModal";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import { ArrowDown, X } from "lucide-react";
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

type ConnectFourColor = "RED" | "YELLOW";
type ConnectFourCell = ConnectFourColor | null;
type RoundState = "waiting_players" | "playing" | "game_over" | "round_result";

interface WinningLine {
  color: ConnectFourColor;
  coords: [number, number][];
}

interface GameState {
  board: ConnectFourCell[][];
  currentPlayer: ConnectFourColor;
  winner: ConnectFourColor | "Draw" | null;
  winningLine: WinningLine | null;
  players: { id: string; color: ConnectFourColor }[];
  rematchRequests: string[];
  currentRound: number;
  maxRounds: number;
  scores: Record<ConnectFourColor, number>;
  state: RoundState;
  turnEndTime: number | null;
  timeLimit: number;
  yourColor?: ConnectFourColor;
}

const ROWS = 6;
const COLS = 7;

export default function ConnectFourGame() {
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
    leaveRoom,
    toggleReady,
    startMatch,
    requestRematch,
    returnToLobbyCountdown,
    setReturnToLobbyCountdown,
  } = useMatchManager({
    namespace: "c4",
    playerName,
  });

  const [gameStateData, setGameStateData] = useState<GameState | null>(null);
  const [board, setBoard] = useState<ConnectFourCell[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
  );
  const [currentPlayer, setCurrentPlayer] = useState<ConnectFourColor>("RED");
  const [winner, setWinner] = useState<ConnectFourColor | "Draw" | null>(null);
  const [winningLine, setWinningLine] = useState<WinningLine | null>(null);
  const [yourColor, setYourColor] = useState<ConnectFourColor | null>(null);
  const [roundState, setRoundState] = useState<RoundState>("waiting_players");
  const [scores, setScores] = useState<Record<string, number>>({
    RED: 0,
    YELLOW: 0,
  });
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(1);
  const [rematchRequests, setRematchRequests] = useState<string[]>([]);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

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
      setWinningLine(serverState.winningLine);

      setRematchRequests(serverState.rematchRequests || []);
      setCurrentRound(serverState.currentRound || 1);
      setMaxRounds(serverState.maxRounds || 1);

      setScores(serverState.scores || { RED: 0, YELLOW: 0 });
      setRoundState(serverState.state || "waiting_players");
      if (serverState.yourColor !== undefined) {
        setYourColor(serverState.yourColor);
      }

      if (
        serverState.state === "game_over" &&
        returnToLobbyCountdown === null
      ) {
        setReturnToLobbyCountdown(GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC);
      }
    });

    socket.on("matchFound", () => {
      setWinner(null);
      setWinningLine(null);
      setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
      setRoundState("waiting_players");
    });

    return () => {
      socket.off("gameState");
      socket.off("matchFound");
    };
  }, [socket, returnToLobbyCountdown, setReturnToLobbyCountdown]);

  const handleColumnClick = (colIndex: number) => {
    if (
      socket &&
      roomId &&
      board[ROWS - 1]?.[colIndex] === null &&
      winner === null &&
      yourColor === currentPlayer
    ) {
      socket.emit("makeMove", { roomId, col: colIndex });
    }
  };

  const playAgain = () => {
    leaveRoom();
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setWinner(null);
    setWinningLine(null);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
    setWinner(null);
    setWinningLine(null);
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

  const handleUpdateConfig = (config: GameSetupConfig) => {
    if (socket && roomId) {
      socket.emit("updateRoomConfig", { roomId, config });
    }
  };

  const isWinningCell = (row: number, col: number) => {
    if (!winningLine) return false;
    return winningLine.coords.some(([r, c]) => r === row && c === col);
  };

  const isColFull = (colIndex: number) => {
    return board[ROWS - 1]?.[colIndex] !== null;
  };

  const isMyTurn = yourColor === currentPlayer && !winner;

  // View 1: Setup Modal
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
              gameId="c4"
            />
          </div>
        </div>
      </GameShell>
    );
  }

  // View 2: Room Browser
  if (!roomId && !setupNeeded) {
    return (
      <GameShell playerName={playerName}>
        <RoomBrowser
          rooms={rooms}
          onCreateRoom={handleCreateRoomClick}
          onJoinRoom={handleJoinRoomClick}
          gameLabel="Connect 4"
        />
      </GameShell>
    );
  }

  // View 3: Lobby Waiting Room
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
          themeColor="red"
          tempNotification={tempNotification}
        />
      </GameShell>
    );
  }

  // View 4: In-Match Screen
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
          <Card className="w-full lg:w-80 p-5 md:p-6 flex flex-col items-center gap-5 bg-[#161214] border border-red-500/20 shadow-2xl shrink-0">
            <h1 className="text-2xl md:text-3xl font-iosevka-bold text-white tracking-widest uppercase text-center drop-shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              Connect 4
            </h1>

            {/* Connection Status & Color Badge */}
            <div className="flex items-center justify-between w-full text-xs font-iosevka-bold tracking-widest uppercase gap-2">
              <span
                className={`px-3 py-1.5 rounded-lg border ${localSocketId ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}
              >
                {localSocketId ? "CONNECTED" : "OFFLINE"}
              </span>
              {yourColor && (
                <span
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                    yourColor === "RED"
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${yourColor === "RED" ? "bg-red-500" : "bg-amber-400"}`}
                  />
                  YOU ARE: {yourColor}
                </span>
              )}
            </div>

            {/* Scoreboard */}
            <Scoreboard
              players={
                gameStateData?.players.map((p) => ({
                  id: p.id,
                  name: roomLobby?.players.find((rp) => rp.id === p.id)?.name,
                  score: scores[p.color as string] || 0,
                  isConnected: true,
                })) || []
              }
              localPlayerId={localSocketId || ""}
              currentRound={currentRound}
              maxRounds={maxRounds}
              gameId="c4"
            />

            {/* Turn Banner Status */}
            <div className="text-center text-sm md:text-base py-3 px-4 flex items-center justify-center w-full bg-[#140a0c] rounded-xl border border-white/5 shadow-inner">
              {roundState === "playing" && (
                <span
                  className={`font-iosevka-bold uppercase tracking-wider flex items-center gap-2 ${
                    isMyTurn ? "text-white animate-pulse" : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${currentPlayer === "RED" ? "bg-red-500" : "bg-amber-400"}`}
                  />
                  {isMyTurn
                    ? "YOUR TURN"
                    : `OPPONENT'S TURN (${currentPlayer})`}
                </span>
              )}
              {roundState === "round_result" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  {winner === "Draw"
                    ? "IT'S A DRAW!"
                    : `${winner} WINS ROUND!`}
                </span>
              )}
              {roundState === "game_over" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  {winner === "Draw"
                    ? "MATCH TIED!"
                    : `${winner} WON MATCH!`}
                </span>
              )}
            </div>

            {/* Timer Display */}
            {roundState === "playing" && gameStateData?.turnEndTime && (
              <div className="w-full flex justify-center py-1">
                <TimerDisplay turnEndTime={gameStateData.turnEndTime} size="lg" />
              </div>
            )}

            {/* Leave Match Button */}
            {isGameStarted && !winner && (
              <Button
                variant="ghost"
                onClick={() => setIsExitModalOpen(true)}
                className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 mt-2"
              >
                <X className="w-4 h-4 mr-2" />
                <span>LEAVE MATCH</span>
              </Button>
            )}
          </Card>

          {/* Right Column: Connect 4 Matrix Arena */}
          <Card className="w-full max-w-[min(95vw,560px)] lg:max-w-xl p-4 sm:p-6 flex flex-col items-center gap-5 bg-[#161214] border border-red-500/20 shadow-2xl shrink-0">
            <div className="relative p-2.5 sm:p-4 rounded-2xl bg-[#1a0a0c] border border-red-500/20 shadow-2xl flex flex-col items-center w-full">
              {/* Hover Column Disc Drops Preview */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 w-full">
                {Array.from({ length: COLS }).map((_, c) => {
                  const isHovered = hoveredCol === c;
                  const canDrop = isMyTurn && !isColFull(c);

                  return (
                    <div
                      key={`preview-${c}`}
                      className="h-6 sm:h-8 flex items-center justify-center cursor-pointer"
                      onClick={() => canDrop && handleColumnClick(c)}
                      onMouseEnter={() => setHoveredCol(c)}
                      onMouseLeave={() => setHoveredCol(null)}
                    >
                      <AnimatePresence>
                        {isHovered && canDrop && (
                          <motion.div
                            initial={{ y: -6, opacity: 0, scale: 0.6 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -6, opacity: 0, scale: 0.6 }}
                            className={`w-5 h-5 sm:w-7 sm:h-7 aspect-square shrink-0 rounded-full flex items-center justify-center shadow-lg ${
                              yourColor === "RED"
                                ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/50"
                                : "bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-500/50"
                            }`}
                          >
                            <ArrowDown className="w-3 h-3 text-white animate-bounce" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Matrix Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-[#110507] p-2 sm:p-3.5 rounded-xl border border-white/5 shadow-inner w-full justify-items-center">
                {Array.from({ length: ROWS }).map((_, rIndex) => {
                  const r = ROWS - 1 - rIndex;

                  return (
                    <React.Fragment key={`row-${r}`}>
                      {Array.from({ length: COLS }).map((_, c) => {
                        const cell = board[r]?.[c];
                        const isWinning = isWinningCell(r, c);
                        const canClickColumn = isMyTurn && !isColFull(c);

                        return (
                          <div
                            key={`cell-${r}-${c}`}
                            onClick={() => canClickColumn && handleColumnClick(c)}
                            onMouseEnter={() => setHoveredCol(c)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={`
                              relative w-[min(11vw,48px)] h-[min(11vw,48px)] sm:w-14 sm:h-14 aspect-square rounded-full flex items-center justify-center shrink-0
                              bg-[#080203] border border-white/10 shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)]
                              ${canClickColumn ? "cursor-pointer hover:border-white/30" : "cursor-default"}
                            `}
                          >
                            <AnimatePresence>
                              {cell && (
                                <motion.div
                                  initial={{ y: -180, opacity: 0.6 }}
                                  animate={{
                                    y: 0,
                                    opacity: 1,
                                    scale: isWinning ? [1, 1.15, 1] : 1,
                                  }}
                                  transition={
                                    isWinning
                                      ? {
                                          scale: {
                                            repeat: Infinity,
                                            duration: 1.2,
                                            ease: "easeInOut",
                                          },
                                          y: {
                                            type: "spring",
                                            stiffness: 350,
                                            damping: 24,
                                          },
                                        }
                                      : {
                                          type: "spring",
                                          stiffness: 350,
                                          damping: 24,
                                        }
                                  }
                                  className={`
                                    w-[82%] h-[82%] aspect-square rounded-full shrink-0 relative flex items-center justify-center
                                    ${
                                      cell === "RED"
                                        ? "bg-gradient-to-br from-red-400 via-red-500 to-rose-700 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                                        : "bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 shadow-[0_0_12px_rgba(245,158,11,0.7)]"
                                    }
                                    ${
                                      isWinning
                                        ? "ring-4 ring-white shadow-[0_0_25px_rgba(255,255,255,0.9)] z-20"
                                        : ""
                                    }
                                  `}
                                >
                                  <div className="absolute top-1 left-1.5 w-[30%] h-[15%] bg-white/40 rounded-full blur-[0.3px]" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Game Over / Rematch Action Box */}
            {roundState === "game_over" && (
              <div className="w-full pt-4 border-t border-white/5 relative z-10">
                <ReturnToLobbyBadge
                  initialSeconds={
                    returnToLobbyCountdown ||
                    GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC
                  }
                  barColorClass="bg-red-500/30"
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
                  primaryColorGradient="from-red-600 to-rose-900"
                  primaryColorHover="hover:from-red-500 hover:to-rose-800"
                />
              </div>
            )}
          </Card>
        </div>
      </div>
    </GameShell>
  );
}

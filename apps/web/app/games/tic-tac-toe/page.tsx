"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import GameSetup, {
  GameSetupConfig,
} from "@/features/setup/components/GameSetup";
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

type PlayerMark = "X" | "O" | null;
type RoundState = "waiting_players" | "in_progress" | "game_over" | "round_result";

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
  yourMark?: PlayerMark;
  turnEndTime?: number | null;
}

export default function TicTacToeGame() {
  const router = useRouter();
  const { socketId: globalSocketId, playerName } = useSocket();

  const {
    socket,
    localSocketId,
    roomId,
    setRoomId,
    isHost,
    setIsHost,
    isGameStarted,
    setIsGameStarted,
    roomLobby,
    disconnectMessage,
    matchTerminationCountdown,
    tempNotification,
    setTempNotification,
    rematchRequested,
    setRematchRequested,
    // Actions
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startMatch,
    requestRematch,
    updateRoomConfig,
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

  const handleReturnToSetup = () => {
    leaveRoom();
    setSetupNeeded(true);
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
      <RoomLobby
        roomLobby={roomLobby}
        localPlayerId={localSocketId || ""}
        onToggleReady={() => socket?.emit("toggleReady", roomId)}
        onStartMatch={() => socket?.emit("startMatch", roomId)}
        onLeaveRoom={handleLeaveRoom}
        onUpdateConfig={handleUpdateConfig}
        themeColor="cyan"
      />
    );
  }

  return (
    <GameShell playerName={playerName}>
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
                name: p.mark === "X" ? "Player X" : "Player O",
                score: scores[p.mark as string] || 0,
                isConnected: true,
              })) || []
            }
            localPlayerId={localSocketId || ""}
          currentRound={currentRound}
          maxRounds={maxRounds}
          themeColor="cyan"
        />

        <div className="text-center text-xl h-12 flex items-center justify-center w-full bg-[#111111] rounded-xl border border-white/5">
          {roundState === "in_progress" && (
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

        {roundState === "in_progress" && (
          <div className="scale-150 py-4">
            <TimerDisplay turnEndTime={gameStateData?.turnEndTime || null} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 bg-[#1a1a1a] p-4 rounded-2xl shadow-2xl border border-white/5 relative">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={
                cell !== null || winner !== null || yourMark !== currentPlayer
              }
              className={`w-28 h-28 flex items-center justify-center text-5xl font-iosevka-bold rounded-xl transition-all duration-300 border ${
                cell === "X"
                  ? "text-cyan-400 bg-cyan-400/5 border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
                  : cell === "O"
                    ? "text-pink-400 bg-pink-400/5 border-pink-400/20 shadow-[0_0_20px_rgba(244,114,182,0.1)]"
                    : "bg-[#111111] border-white/5 hover:border-white/20"
              } hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:opacity-100`}
            >
              {cell}
            </button>
          ))}
        </div>

        {roundState === "game_over" && (
          <div className="w-full pt-8 border-t border-white/5">
            <EndMatchOptions
              rematchRequested={rematchRequested}
              opponentLeft={!!disconnectMessage}
              hasOpponentRequested={
                rematchRequests.find((id) => id !== localSocketId) !== undefined
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

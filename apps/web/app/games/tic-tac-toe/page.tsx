"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import GameSetup, {
  GameSetupConfig,
} from "@/features/setup/components/GameSetup";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import AlertModal from "@/\(shared\)/components/ui/AlertModal";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import { X } from "lucide-react";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import useRoomLobby from "@/features/lobby/hooks/useRoomLobby";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import Scoreboard from "@/features/match/components/Scoreboard";
import ConfirmModal from "@/\(shared\)/components/ui/ConfirmModal";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";
import NavButton from "@/(shared)/components/ui/NavButton";

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
  const router = useRouter();
  const { socketId: globalSocketId, playerName } = useSocket();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [localSocketId, setLocalSocketId] = useState<string | null>(null);
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
    const s: Socket = io("http://localhost:3001/ttt", {
      auth: { playerName },
    });
    setSocket(s);

    s.on("connect", () => {
      setLocalSocketId(s.id || null);
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

    s.on(
      "opponentDisconnected",
      ({ playerName: leaverName }: { playerName: string }) => {
        setDisconnectMessage(
          `Connection Lost: ${leaverName} has left the match.`,
        );
      },
    );

    s.on("matchTerminationUpdate", ({ countdown }: { countdown: number }) => {
      setMatchTerminationCountdown(countdown);
    });

    s.on("matchTerminated", () => {
      handleLeaveRoom();
    });

    s.on("playerLeft", (message: string) => {
      setTempNotification(message);
      setTimeout(() => setTempNotification(null), 5000);
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
                score: scores[p.mark as "X" | "O"] || 0,
                isConnected: true,
              })) || []
            }
            localPlayerId={localSocketId || ""}
            currentRound={currentRound}
            maxRounds={maxRounds}
            themeColor="white"
          />

          {/* State Information */}
          <div className="text-center text-xl h-12 flex items-center justify-center mb-4 bg-[#222222] w-full rounded-xl border border-white/5">
            {winner && winner !== "Draw" && roundState !== "round_result" && (
              <span className="text-white font-iosevka-bold">
                PLAYER {winner} WINS!
              </span>
            )}
            {winner === "Draw" && roundState !== "round_result" && (
              <span className="text-white/40 font-iosevka-bold">DRAW!</span>
            )}
            {roundState === "round_result" && (
              <span className="text-white animate-pulse">ROUND OVER!</span>
            )}
            {!winner && currentPlayer === yourMark && (
              <span className="text-white animate-pulse font-iosevka-bold">
                YOUR TURN
              </span>
            )}
            {!winner && currentPlayer !== yourMark && (
              <span className="text-white/40 italic">
                OPPONENT&apos;S TURN...
              </span>
            )}
          </div>

          {!winner && (
            <div className="scale-150 py-4">
              <TimerDisplay turnEndTime={gameStateData?.turnEndTime || null} />
            </div>
          )}

          {/* Board */}
          <div className="grid grid-cols-3 gap-3 bg-[#222222] p-4 rounded-2xl mb-8 border border-white/5 shadow-inner">
            {board.map((cell, i) => (
              <button
                key={i}
                onClick={() => handleMove(i)}
                disabled={!!cell || !!winner || currentPlayer !== yourMark}
                className={`w-28 h-28 bg-[#111111] rounded-xl transition-all duration-300 flex items-center justify-center text-5xl font-iosevka-bold border border-white/5
                  ${!cell && !winner && currentPlayer === yourMark ? "hover:bg-[#1a1a1a] hover:border-white/10" : "cursor-default"}
                  ${cell === "X" ? "text-white" : "text-white/40"}`}
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
                primaryColorGradient="from-[#333333] to-[#1a1a1a]"
                primaryColorHover="hover:from-[#444444] hover:to-[#222222]"
              />
            </div>
          )}
        </Card>
      </div>
    </GameShell>
  );
}

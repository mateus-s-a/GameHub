"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Ghost,
  Gamepad2,
  Cpu,
  Skull,
  Rocket,
  Star,
  Gem,
  Flame,
  Zap,
  Crown,
  Shield,
  Heart,
  Trophy,
  Compass,
  Sparkles,
  Wand2,
  Moon,
  Sun,
  Sword,
  Bot,
  Orbit,
  Disc,
  Eye,
  Key,
  X,
} from "lucide-react";
import { useMatchManager } from "@/features/match/hooks/useMatchManager";
import { useRoomList } from "@/features/lobby/hooks/useRoomList";
import { useSocket } from "@/(shared)/providers/SocketProvider";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import GameSetup from "@/features/setup/components/GameSetup";
import RoomLobby from "@/features/lobby/components/RoomLobby";
import RoomBrowser from "@/features/lobby/components/RoomBrowser";
import Scoreboard from "@/features/match/components/Scoreboard";
import TimerDisplay from "@/features/match/components/TimerDisplay";
import ConfirmModal from "@/(shared)/components/ui/ConfirmModal";
import MatchTerminationBanner from "@/features/match/components/MatchTerminationBanner";
import { ReturnToLobbyBadge } from "@/features/match/components/ReturnToLobbyBadge";
import EndMatchOptions from "@/features/match/components/EndMatchOptions";
import NavButton from "@/(shared)/components/ui/NavButton";
import { GameShell } from "@repo/ui/game-shell";
import { GAME_CONSTANTS } from "@gamehub/core";
import { GameSetupConfig } from "@gamehub/types";

// Symbol icon mapper
const SYMBOL_ICONS: Record<string, React.ReactNode> = {
  arcade_ghost: <Ghost className="w-6 h-6 md:w-8 md:h-8 text-orange-400" />,
  arcade_pac: <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />,
  arcade_invader: <Bot className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />,
  arcade_joystick: <Disc className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />,
  cyber_neon: <Zap className="w-6 h-6 md:w-8 md:h-8 text-amber-300" />,
  cyber_cpu: <Cpu className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />,
  cyber_sword: <Sword className="w-6 h-6 md:w-8 md:h-8 text-red-400" />,
  cyber_skull: <Skull className="w-6 h-6 md:w-8 md:h-8 text-pink-400" />,
  space_planet: <Orbit className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />,
  space_rocket: <Rocket className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />,
  space_star: <Star className="w-6 h-6 md:w-8 md:h-8 text-yellow-300 fill-yellow-300" />,
  space_comet: <Flame className="w-6 h-6 md:w-8 md:h-8 text-rose-400" />,
  gem_diamond: <Gem className="w-6 h-6 md:w-8 md:h-8 text-cyan-300" />,
  gem_ruby: <Heart className="w-6 h-6 md:w-8 md:h-8 text-red-500 fill-red-500" />,
  gem_emerald: <Shield className="w-6 h-6 md:w-8 md:h-8 text-emerald-300" />,
  gem_sapphire: <Key className="w-6 h-6 md:w-8 md:h-8 text-blue-300" />,
  animal_fox: <Crown className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />,
  animal_owl: <Eye className="w-6 h-6 md:w-8 md:h-8 text-indigo-300" />,
  animal_dragon: <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />,
  animal_wolf: <Moon className="w-6 h-6 md:w-8 md:h-8 text-teal-300" />,
  magic_orb: <Sun className="w-6 h-6 md:w-8 md:h-8 text-amber-200" />,
  magic_scroll: <Compass className="w-6 h-6 md:w-8 md:h-8 text-orange-300" />,
  magic_wand: <Wand2 className="w-6 h-6 md:w-8 md:h-8 text-purple-300" />,
  magic_potion: <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-pink-300" />,
};

interface MemoryCardItem {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedByPlayerId: string | null;
}

interface MemoryCardGameState {
  cards: MemoryCardItem[];
  grid: { rows: number; cols: number };
  scores: Record<string, number>;
  turnPlayerId: string;
  playersOrder: string[];
  isCheckingMatch: boolean;
  winnerId: string | "Draw" | null;
  status: "waiting_players" | "playing" | "round_result" | "game_over";
  maxRounds: number;
  currentRound: number;
  timeLimit: number;
  turnEndTime: number | null;
}

export default function MemoryCardPage() {
  const { playerName } = useSocket();

  const {
    socket,
    localSocketId,
    roomLobby,
    roomId,
    tempNotification,
    setTempNotification,
    matchTerminationCountdown,
    returnToLobbyCountdown,
    setReturnToLobbyCountdown,
    setIsHost,
    isGameStarted,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startMatch,
    updateRoomConfig,
  } = useMatchManager({ namespace: "mc", playerName });

  const rooms = useRoomList(socket);

  const [setupNeeded, setSetupNeeded] = useState(false);
  const [gameStateData, setGameStateData] = useState<MemoryCardGameState | null>(null);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false);

  useEffect(() => {
    if (roomLobby && roomLobby.status === "in_progress" && socket && roomId) {
      socket.emit("joinRoom", roomId);
    }
  }, [roomLobby, socket, roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on("gameState", (data: MemoryCardGameState) => {
      setSetupNeeded(false);
      setGameStateData(data);
    });

    socket.on("rematchStarted", () => {
      setRematchRequested(false);
      setReturnToLobbyCountdown(null);
    });

    return () => {
      socket.off("gameState");
      socket.off("rematchStarted");
    };
  }, [socket, setReturnToLobbyCountdown]);

  const handleCardClick = (cardId: number) => {
    if (
      socket &&
      roomId &&
      gameStateData &&
      gameStateData.turnPlayerId === localSocketId &&
      !gameStateData.isCheckingMatch
    ) {
      socket.emit("flipCard", { roomId, cardId });
    }
  };

  const handleRequestRematch = () => {
    if (socket && roomId) {
      setRematchRequested(true);
      socket.emit("requestRematch", roomId);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setGameStateData(null);
    setSetupNeeded(false);
    setRematchRequested(false);
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

  const isMyTurn = gameStateData?.turnPlayerId === localSocketId;
  const turnPlayerName =
    roomLobby?.players.find((p) => p.id === gameStateData?.turnPlayerId)?.name ||
    "Player";

  const getGridColsClass = (cols: number) => {
    switch (cols) {
      case 4:
        return "grid-cols-4";
      case 5:
        return "grid-cols-5";
      case 6:
        return "grid-cols-6";
      case 8:
        return "grid-cols-8";
      default:
        return "grid-cols-6";
    }
  };

  // View 1: Setup Modal with BACK TO LIST ROOMS button
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
              gameId="mc"
              onStart={handleStartGame}
              onCancel={() => setSetupNeeded(false)}
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
          gameLabel="Memory Card"
        />
      </GameShell>
    );
  }

  // View 3: Room Lobby
  if (roomId && !isGameStarted) {
    return (
      <GameShell playerName={playerName}>
        <RoomLobby
          roomLobby={roomLobby}
          localPlayerId={localSocketId || ""}
          onToggleReady={toggleReady}
          onStartMatch={startMatch}
          onLeaveRoom={handleLeaveRoom}
          onUpdateConfig={updateRoomConfig}
          themeColor="orange"
          tempNotification={tempNotification}
        />
      </GameShell>
    );
  }

  // View 4: Active Game Screen
  return (
    <GameShell playerName={playerName}>
      {matchTerminationCountdown !== null && (
        <MatchTerminationBanner
          countdown={matchTerminationCountdown}
          title="Match Terminated"
          message="Insufficient players remaining. Returning to lobby..."
        />
      )}

      {/* Temporary Toast Notification */}
      {tempNotification && (
        <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-[#1a1a1a] border-l-4 border-orange-500/50 text-white px-6 py-4 rounded-r-xl shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span className="font-iosevka-medium whitespace-pre-line text-sm">
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

      {/* Exit Confirmation Modal */}
      <ConfirmModal
        isOpen={isExitModalOpen}
        title="Leave Memory Card Match?"
        message="Are you sure you want to leave? Your match progress will be lost."
        onConfirm={() => {
          handleLeaveRoom();
          setIsExitModalOpen(false);
        }}
        onCancel={() => setIsExitModalOpen(false)}
        confirmText="Leave"
        cancelText="Stay"
        themeColor="orange"
      />

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Responsive Grid Shell: Column on Mobile, 2-Column Split on Desktop */}
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-start justify-center">
          
          {/* Left Column: HUD & Information Panel */}
          <Card className="w-full lg:w-80 p-5 md:p-6 flex flex-col items-center gap-5 bg-[#180d0a] border border-orange-500/20 shadow-2xl shrink-0">
            <h1 className="text-2xl md:text-3xl font-iosevka-bold text-white tracking-widest uppercase text-center drop-shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              Memory Card
            </h1>

            {/* Connection Status & Mode Badge */}
            <div className="flex items-center justify-between w-full text-xs font-iosevka-bold tracking-widest uppercase">
              <span
                className={`px-3 py-1.5 rounded-lg border ${
                  localSocketId
                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {localSocketId ? "CONNECTED" : "OFFLINE"}
              </span>
              <span className="px-3 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-400">
                MODE: {gameStateData?.grid ? `${gameStateData.grid.cols}×${gameStateData.grid.rows}` : "STANDARD"}
              </span>
            </div>

            {/* Scoreboard */}
            <Scoreboard
              players={
                gameStateData?.playersOrder.map((pId: string) => ({
                  id: pId,
                  name: roomLobby?.players.find((rp) => rp.id === pId)?.name || pId,
                  score: gameStateData?.scores[pId] || 0,
                  isConnected: true,
                })) || []
              }
              localPlayerId={localSocketId || ""}
              currentRound={gameStateData?.currentRound || 1}
              maxRounds={gameStateData?.maxRounds || 1}
              gameId="mc"
            />

            {/* Turn Banner Status */}
            <div className="text-center text-sm md:text-base py-3 px-4 flex items-center justify-center w-full bg-[#120806] rounded-xl border border-white/5 shadow-inner">
              {gameStateData?.status === "playing" && (
                <span
                  className={`font-iosevka-bold uppercase tracking-wider flex items-center gap-2 ${
                    isMyTurn ? "text-orange-400 animate-pulse" : "text-gray-400"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                  {isMyTurn
                    ? "YOUR TURN — FLIP A CARD"
                    : `${turnPlayerName}'S TURN`}
                </span>
              )}
              {gameStateData?.status === "game_over" && (
                <span className="text-white font-iosevka-bold uppercase tracking-wider">
                  {gameStateData.winnerId === "Draw"
                    ? "MATCH TIED!"
                    : `${
                        roomLobby?.players.find(
                          (p) => p.id === gameStateData.winnerId
                        )?.name || "PLAYER"
                      } WON THE MATCH!`}
                </span>
              )}
            </div>

            {/* Native TimerDisplay */}
            {gameStateData?.status === "playing" && gameStateData?.turnEndTime && (
              <div className="w-full flex justify-center py-1">
                <TimerDisplay turnEndTime={gameStateData.turnEndTime} size="md" />
              </div>
            )}

            {/* Leave Match Button */}
            <Button
              variant="ghost"
              onClick={() => setIsExitModalOpen(true)}
              className="w-full border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs tracking-widest font-iosevka-bold uppercase"
            >
              LEAVE MATCH
            </Button>
          </Card>

          {/* Right Column: Central Game Arena */}
          <div className="flex-1 w-full flex flex-col items-center">
            <Card className="w-full p-4 md:p-6 flex flex-col items-center gap-6 bg-[#180d0a] border border-orange-500/20 shadow-2xl">
              {/* 3D Memory Card Grid */}
              {gameStateData?.grid && (
                <div
                  className={`grid ${getGridColsClass(
                    gameStateData.grid.cols
                  )} gap-2 md:gap-3 bg-[#120806] p-4 md:p-6 rounded-2xl border border-orange-500/20 shadow-inner w-full max-w-3xl`}
                >
                  {gameStateData.cards.map((card: MemoryCardItem) => {
                    const canClick =
                      isMyTurn &&
                      !card.isFlipped &&
                      !card.isMatched &&
                      !gameStateData.isCheckingMatch;

                    return (
                      <div
                        key={card.id}
                        className="w-full aspect-square relative"
                        style={{ perspective: "1000px" }}
                      >
                        <motion.div
                          className="w-full h-full relative cursor-pointer"
                          style={{ transformStyle: "preserve-3d" }}
                          animate={{
                            rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                          }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          onClick={() => canClick && handleCardClick(card.id)}
                        >
                          {/* Verso da Carta (Face Down) */}
                          <div
                            className={`absolute inset-0 rounded-xl bg-[#221410] border border-orange-500/20 shadow-md flex flex-col items-center justify-center transition-colors ${
                              canClick ? "hover:border-orange-500/50 hover:bg-[#2c1813]" : "opacity-80"
                            }`}
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full border border-orange-500/30 flex items-center justify-center text-orange-400/40 font-iosevka-bold text-[10px] md:text-xs">
                              GH
                            </div>
                          </div>

                          {/* Frente da Carta (Face Up) */}
                          <div
                            className={`absolute inset-0 rounded-xl bg-[#2a1712] border shadow-2xl flex items-center justify-center ${
                              card.isMatched
                                ? "border-orange-400 bg-orange-950/40 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                                : "border-orange-500/40"
                            }`}
                            style={{
                              backfaceVisibility: "hidden",
                              transform: "rotateY(180deg)",
                            }}
                          >
                            {SYMBOL_ICONS[card.symbol] || (
                              <Sparkles className="w-6 h-6 text-orange-400" />
                            )}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Game Over / Match End Actions Box */}
              {gameStateData?.status === "game_over" && (
                <div className="w-full pt-6 border-t border-white/5 relative z-10">
                  <ReturnToLobbyBadge
                    initialSeconds={
                      returnToLobbyCountdown ||
                      GAME_CONSTANTS.MATCH_AUTO_RETURN_DELAY_SEC
                    }
                    barColorClass="bg-orange-500/30"
                  />
                  <EndMatchOptions
                    rematchRequested={rematchRequested}
                    opponentLeft={false}
                    hasOpponentRequested={false}
                    onRequestRematch={handleRequestRematch}
                    onPlayAgain={handleLeaveRoom}
                    primaryColorGradient="from-orange-500 to-amber-600"
                    primaryColorHover="hover:from-orange-400 hover:to-amber-500"
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </GameShell>
  );
}


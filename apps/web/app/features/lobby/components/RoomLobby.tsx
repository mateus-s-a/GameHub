import React from "react";
import { RoomInfo } from "@gamehub/types";
import { User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameConfigPanel from "@/features/setup/components/GameConfigPanel";
import { GameSetupConfig } from "@gamehub/types";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { useSocket } from "@/(shared)/providers/SocketProvider";

export interface RoomLobbyProps {
  roomLobby: RoomInfo | null;
  localPlayerId: string;
  onToggleReady: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onUpdateConfig?: (config: GameSetupConfig) => void;
  themeColor?: string;
  tempNotification?: string | null;
}

const GAME_THEMES = {
  ttt: {
    gradient: "from-cyan-500 to-blue-600",
    glow: "shadow-cyan-500/50",
    border: "border-cyan-400/30",
  },
  gtf: {
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/50",
    border: "border-emerald-400/30",
  },
  rps: {
    gradient: "from-purple-500 to-indigo-600",
    glow: "shadow-purple-500/50",
    border: "border-purple-400/30",
  },
  hangman: {
    gradient: "from-lime-500 to-emerald-600",
    glow: "shadow-lime-500/50",
    border: "border-lime-400/30",
  },
};

export default function RoomLobby({
  roomLobby,
  localPlayerId,
  onToggleReady,
  onStartMatch,
  onLeaveRoom,
  onUpdateConfig,
  tempNotification,
}: RoomLobbyProps) {
  const { playerName } = useSocket();

  if (!roomLobby) return null;

  const isHost = roomLobby.hostId === localPlayerId;
  const allReady = roomLobby.players.every((p) => p.isReady);
  const canStart = roomLobby.players.length >= 2 && allReady;
  const theme =
    GAME_THEMES[roomLobby.gameType as keyof typeof GAME_THEMES] ||
    GAME_THEMES.ttt;

  const slots = Array.from({ length: roomLobby.maxPlayers }).map((_, i) => {
    return roomLobby.players[i] || null;
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room link copied!");
  };

  return (
    <>
      {/* Notifications */}
      <AnimatePresence>
        {tempNotification && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50, y: -20 }}
            className="fixed top-8 right-8 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-gray-900/90 backdrop-blur-md border-b-4 border-blue-500 rounded-2xl p-6 shadow-2xl flex items-center gap-6 overflow-hidden relative">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/30">
                <User size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-iosevka-bold text-white uppercase tracking-wider">
                  Notification
                </h3>
                <p className="text-gray-400 font-iosevka-regular text-sm whitespace-pre-line">
                  {tempNotification}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-24"
      >
        {/* PLAYER SLOTS Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <Card
            title="PLAYER SLOTS"
            className="min-h-[480px] h-fit p-10 flex flex-col gap-6"
          >
            <div className="flex-grow overflow-y-auto pr-2 space-y-4 max-h-[400px] custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {slots.map((p, index) => (
                  <motion.div
                    key={p ? p.id : `empty-${index}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border border-[#333333] bg-[#1a1a1a] transition-colors ${!p ? "opacity-40 grayscale" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center text-white/50 border border-white/10 overflow-hidden">
                          <User size={32} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#111111] border border-white/20 rounded-full w-8 h-8 flex items-center justify-center text-[10px] font-iosevka-bold text-white/60">
                          P{index + 1}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xl font-iosevka-bold text-white">
                          {p ? p.name : "Waiting..."}
                          {p?.isHost && (
                            <span className="ml-2 text-xs text-[var(--muted)] font-iosevka-regular">
                              (Host)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {p && (
                      <motion.div
                        whileHover={{
                          scale: p.id === localPlayerId ? 1.05 : 1,
                        }}
                        whileTap={{ scale: p.id === localPlayerId ? 0.95 : 1 }}
                      >
                        <Button
                          variant={p.isReady ? "highlight" : "ghost"}
                          onClick={
                            p.id === localPlayerId ? onToggleReady : undefined
                          }
                          className={`px-6 py-2 rounded-full text-xs font-iosevka-bold tracking-widest border-white/10 disabled:opacity-80 ${p.id === localPlayerId && !p.isReady ? "animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]" : ""}`}
                          disabled={p.id !== localPlayerId}
                        >
                          {p.isReady ? "READY" : "WAITING"}
                        </Button>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>

        {/* MATCH SETTINGS Column */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          className="flex flex-col gap-6 h-full"
        >
          <Card
            title="MATCH SETTINGS"
            className={`flex-grow p-10 bg-[#161616] relative overflow-hidden ${
              !isHost ? "opacity-40 grayscale pointer-events-none" : ""
            }`}
          >
            {!isHost && (
              <div className="absolute inset-0 z-10 bg-black/20 flex items-center justify-center">
                <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-[10px] font-iosevka-bold text-white/60 tracking-widest uppercase">
                  Locked
                </span>
              </div>
            )}
            <GameConfigPanel
              gameId={roomLobby.gameType as any}
              config={roomLobby.config}
              onApply={(newConfig) => onUpdateConfig?.(newConfig)}
              isHost={isHost}
              isLobby={true}
            />
          </Card>

          {/* ROOM CUSTOMIZATION - Disabled state as placeholder */}
          <Card
            title="ROOM CUSTOMIZATION"
            className="p-10 bg-[#161616] opacity-40 grayscale pointer-events-none relative overflow-hidden"
          >
            <div className="absolute inset-0 z-10 bg-black/20 flex items-center justify-center">
              <span className="bg-white/10 border border-white/20 px-4 py-2 rounded-full text-[10px] font-iosevka-bold text-white/60 tracking-widest">
                COMING SOON
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-iosevka-bold text-[var(--muted)] uppercase tracking-widest">
                Room Code
              </label>
              <div className="flex items-center bg-[#222222] border border-[#333333] rounded-xl overflow-hidden p-1 shadow-inner">
                <span className="flex-grow px-4 py-2 font-iosevka-bold text-white text-lg tracking-wider">
                  #GH-{roomLobby.id.substring(0, 5).toUpperCase()}
                </span>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={handleCopyLink}
                    variant="ghost"
                    className="px-4 py-3 h-full rounded-lg border-2 border-white/10 hover:border-white/20"
                  >
                    SHARE LINK
                  </Button>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Global Room Controls (Bottom Center) */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
        className="flex items-center justify-center gap-6 mt-12 mb-12 w-full"
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onLeaveRoom}
            className="px-10 py-5 rounded-full text-lg tracking-tighter uppercase font-iosevka-bold border-2 border-white/10 hover:border-white/20"
          >
            LEAVE ROOM
          </Button>
        </motion.div>
        {isHost && (
          <motion.button
            onClick={onStartMatch}
            disabled={!canStart}
            whileHover={
              canStart ? { scale: 1.05, filter: "brightness(1.1)" } : {}
            }
            whileTap={canStart ? { scale: 0.95 } : {}}
            className={`relative overflow-hidden px-12 py-5 rounded-full text-lg tracking-tighter uppercase font-iosevka-bold border-2 transition-all duration-300 ${
              canStart
                ? `bg-gradient-to-r ${theme.gradient} border-white/20 ${theme.glow}`
                : "bg-white/5 border-white/10 opacity-30 cursor-not-allowed grayscale"
            }`}
          >
            {/* Shimmer Overlay */}
            {canStart && (
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "linear",
                  repeatDelay: 1,
                }}
                className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              />
            )}
            <span className="relative z-10">START MATCH</span>
          </motion.button>
        )}
      </motion.div>

      {/* Game Countdown View */}
      {roomLobby.countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#111111]/95 flex flex-col items-center justify-center p-8 backdrop-blur-2xl">
          <h1 className="text-[240px] font-iosevka-bold text-white tracking-widest animate-pulse leading-none mb-12">
            {roomLobby.countdown}
          </h1>
          <p className="text-2xl font-iosevka-bold text-[var(--muted)] uppercase tracking-[1em] -mr-[1em] animate-pulse">
            GAME STARTING...
          </p>
        </div>
      )}
    </>
  );
}

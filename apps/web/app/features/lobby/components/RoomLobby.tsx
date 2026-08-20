import React, { useState } from "react";
import { RoomInfo } from "@gamehub/types";
import { User, Copy, Check, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GameConfigPanel from "@/features/setup/components/GameConfigPanel";
import { GameSetupConfig } from "@gamehub/types";
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
    glow: "shadow-cyan-500/30",
    border: "border-cyan-400/30",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  },
  c4: {
    gradient: "from-red-500 to-rose-600",
    glow: "shadow-red-500/30",
    border: "border-red-400/30",
    badge: "bg-red-500/10 text-red-400 border-red-500/30",
  },
  mc: {
    gradient: "from-orange-500 to-amber-600",
    glow: "shadow-orange-500/50",
    border: "border-orange-400/30",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  },
  gtf: {
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
    border: "border-emerald-400/30",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  rps: {
    gradient: "from-purple-500 to-indigo-600",
    glow: "shadow-purple-500/30",
    border: "border-purple-400/30",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  hangman: {
    gradient: "from-lime-500 to-emerald-600",
    glow: "shadow-lime-500/30",
    border: "border-lime-400/30",
    badge: "bg-lime-500/10 text-lime-400 border-lime-500/30",
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
  const [copied, setCopied] = useState(false);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="w-full max-w-6xl flex flex-col gap-6 mb-24 font-iosevka-regular">
        {/* TOP HEADER HUD: Room Code & Quick Share */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-[#161616] p-4 md:p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl border font-iosevka-bold text-sm tracking-wider uppercase ${theme.badge}`}>
              Lobby #{roomLobby.id.substring(0, 5).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-iosevka-bold text-white tracking-wide uppercase">
                Match Lobby
              </span>
              <span className="text-xs text-[var(--muted)]">
                {roomLobby.players.length}/{roomLobby.maxPlayers} Players Connected
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] border border-white/10 flex items-center justify-center gap-2.5 text-xs font-iosevka-bold text-white uppercase tracking-wider transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-gray-400" />
                <span>Share Room Link</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* MAIN SPLIT GRID: Players & Settings */}
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
          className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start"
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
              className="min-h-[420px] p-6 md:p-8 flex flex-col gap-6 bg-[#161616]"
            >
              <div className="flex-grow overflow-y-auto pr-1 space-y-3.5 max-h-[360px] custom-scrollbar">
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
                      className={`flex items-center justify-between p-3.5 md:p-4 rounded-xl border border-[#333333] bg-[#1a1a1a] transition-colors ${!p ? "opacity-40 grayscale" : ""}`}
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 md:w-14 md:h-14 bg-[#222222] rounded-full flex items-center justify-center text-white/50 border border-white/10 overflow-hidden">
                            <User size={26} />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-[#111111] border border-white/20 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-[10px] font-iosevka-bold text-white/60">
                            P{index + 1}
                          </div>
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-base md:text-lg font-iosevka-bold text-white truncate max-w-[110px] sm:max-w-[180px] md:max-w-[240px] lg:max-w-none block">
                            {p ? p.name : "Waiting..."}
                            {p?.isHost && (
                              <span className="ml-2 text-xs text-blue-400 font-iosevka-regular shrink-0 inline-block">
                                (Host)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {p && (
                        <motion.div
                          className="shrink-0 ml-2"
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
                            className={`px-3 md:px-6 py-2 rounded-full text-xs font-iosevka-bold tracking-widest border-white/10 disabled:opacity-80 ${p.id === localPlayerId && !p.isReady ? "animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.1)]" : ""}`}
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
          >
            <Card
              title="MATCH SETTINGS"
              className="min-h-[420px] p-6 md:p-8 bg-[#161616]"
            >
              <GameConfigPanel
                gameId={roomLobby.gameType as any}
                config={roomLobby.config}
                onApply={(newConfig) => onUpdateConfig?.(newConfig)}
                isHost={isHost}
                isLobby={true}
              />
            </Card>
          </motion.div>
        </motion.div>

        {/* Global Sticky Room Controls (Desktop & Mobile Adaptive) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed md:relative bottom-0 left-0 right-0 z-40 bg-[#111111]/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-4 md:p-0 border-t border-white/10 md:border-none shadow-2xl md:shadow-none flex items-center justify-center gap-4 md:gap-6 mt-4 md:mt-8 mb-0 md:mb-8"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onLeaveRoom}
              className="px-6 md:px-10 py-3.5 md:py-5 rounded-full text-xs md:text-base tracking-wider uppercase font-iosevka-bold border border-white/10 hover:border-white/20 bg-[#1a1a1a]"
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
              className={`relative overflow-hidden px-8 md:px-12 py-3.5 md:py-5 rounded-full text-xs md:text-base tracking-wider uppercase font-iosevka-bold border transition-all duration-300 ${
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
      </div>

      {/* Game Countdown View */}
      {roomLobby.countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#111111]/95 flex flex-col items-center justify-center p-8 backdrop-blur-2xl">
          <h1 className="text-[140px] md:text-[240px] font-iosevka-bold text-white tracking-widest animate-pulse leading-none mb-8 md:mb-12">
            {roomLobby.countdown}
          </h1>
          <p className="text-lg md:text-2xl font-iosevka-bold text-[var(--muted)] uppercase tracking-[0.5em] md:tracking-[1em] -mr-[0.5em] md:-mr-[1em] animate-pulse">
            GAME STARTING...
          </p>
        </div>
      )}
    </>
  );
}

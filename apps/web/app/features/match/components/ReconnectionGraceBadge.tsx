"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2, Users } from "lucide-react";
import { ReconnectionGraceState } from "../hooks/useMatchManager";

interface ReconnectionGraceBadgeProps {
  grace: ReconnectionGraceState | null;
}

export default function ReconnectionGraceBadge({
  grace,
}: ReconnectionGraceBadgeProps) {
  if (!grace) return null;

  return (
    <AnimatePresence>
      {grace.isPaused ? (
        // Modal Overlay for 2-Player matches (Game paused, waiting for opponent)
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 15 }}
            className="w-full max-w-sm p-6 bg-[#16161a]/95 border border-amber-500/30 rounded-3xl shadow-[0_0_40px_rgba(245,158,11,0.2)] text-center relative overflow-hidden"
          >
            {/* Top Amber Light Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <WifiOff className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base font-bold text-white mb-1 tracking-wide">
              Waiting Connection
            </h3>
            <p className="text-xs text-gray-300 mb-5 leading-relaxed">
              <span className="font-semibold text-amber-400">
                {grace.playerName}
              </span>{" "}
              lost connection. The match is paused temporarily.
            </p>

            {/* Countdown Badge */}
            <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-black/40 border border-white/5 mx-auto w-fit">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-lg font-extrabold text-amber-300 font-mono">
                {grace.countdown}s
              </span>
              <span className="text-xs text-gray-400">until forfeit</span>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        // Non-intrusive floating toast for 3+ player matches (Game keeps going!)
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-20 right-4 md:right-8 z-40 max-w-xs p-3.5 bg-[#18181b]/95 border border-amber-500/30 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-xs font-bold text-amber-300 truncate">
                {grace.playerName} disconnected
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {grace.countdown}s
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate">
              The match continues with the other players.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

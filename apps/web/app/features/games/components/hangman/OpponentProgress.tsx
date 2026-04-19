import React from "react";
import { motion } from "framer-motion";
import { HangmanPlayerStatus } from "@gamehub/core";

interface OpponentProgressProps {
  name: string;
  attemptsLeft: number;
  progress: number;
  isLocal?: boolean;
  status: HangmanPlayerStatus;
}

export default function OpponentProgress({
  name,
  attemptsLeft,
  progress,
  isLocal = false,
  status,
}: OpponentProgressProps) {
  const maxAttempts = 6;
  const mistakes = maxAttempts - attemptsLeft;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Player Name & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === "solved"
                ? "bg-lime-500 shadow-[0_0_10px_#84cc16]"
                : status === "failed"
                  ? "bg-red-500"
                  : "bg-white/20"
            }`}
          />
          <span
            className={`text-xs font-iosevka-bold tracking-wider ${isLocal ? "text-white" : "text-white/60"}`}
          >
            {name} {isLocal && "(YOU)"}
          </span>
        </div>
        <span className="text-[10px] font-iosevka-bold text-white/20 uppercase tracking-widest">
          {attemptsLeft} / {maxAttempts}
        </span>
      </div>

      {/* Mini Gallows + Progress */}
      <div className="flex items-center gap-3">
        {/* Mini Gallows Icon */}
        <div className="relative w-6 h-6 border-b border-white/10 flex-shrink-0">
          <div className="absolute left-1 bottom-0 w-[1px] h-5 bg-white/10" />
          <div className="absolute left-1 top-0 w-3 h-[1px] bg-white/10" />

          {/* The "Man" indicator */}
          <div className="absolute right-2 top-1 flex flex-col items-center gap-0.5">
            {mistakes >= 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1.5 h-1.5 rounded-full bg-red-500/60"
              />
            )}
            {mistakes >= 2 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-[1px] h-2 bg-red-500/40"
              />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            className={`h-full transition-colors duration-500 rounded-full ${
              status === "solved"
                ? "bg-lime-500"
                : mistakes >= 5
                  ? "bg-red-500"
                  : "bg-white/30"
            }`}
          />
        </div>

        <span className="text-[10px] font-iosevka-bold text-white/20 uppercase tracking-widest flex-shrink-0">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}

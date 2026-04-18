import React from "react";
import { motion } from "framer-motion";

interface OpponentProgressProps {
  attemptsLeft: number;
  progress: number;
  isLocal?: boolean;
}

export default function OpponentProgress({
  attemptsLeft,
  progress,
  isLocal = false,
}: OpponentProgressProps) {
  // Mini gallows logic
  const maxAttempts = 6;
  const mistakes = maxAttempts - attemptsLeft;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mini Gallows Icon */}
          <div className="relative w-6 h-6 border-b border-white/10">
            <div className="absolute left-1 bottom-0 w-[1px] h-5 bg-white/10" />
            <div className="absolute left-1 top-0 w-3 h-[1px] bg-white/10" />

            {/* The "Man" indicator - simple dots for the mini version */}
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

          <span
            className={`text-[10px] font-iosevka-bold uppercase tracking-widest ${isLocal ? "text-white" : "text-white/40"}`}
          >
            {attemptsLeft} / 6
          </span>
        </div>

        <span className="text-[10px] font-iosevka-bold text-white/20 uppercase tracking-widest">
          {Math.round(progress * 100)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          className={`h-full transition-colors duration-500 ${
            progress === 1
              ? "bg-lime-500"
              : mistakes >= 5
                ? "bg-red-500"
                : "bg-white/30"
          }`}
        />
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ReturnToLobbyBadgeProps {
  initialSeconds: number;
  barColorClass?: string;
}

export function ReturnToLobbyBadge({
  initialSeconds,
  barColorClass = "bg-cyan-500/30",
}: ReturnToLobbyBadgeProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
    const interval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds]);

  return (
    <div className="flex flex-col items-center gap-2 mb-4 w-full">
      <span className="text-[10px] text-white/20 font-iosevka-bold uppercase tracking-widest">
        Returning to Lobby in {seconds}s
      </span>
      <motion.div
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{
          duration: initialSeconds,
          ease: "linear",
        }}
        className={`h-0.5 rounded-full ${barColorClass}`}
      />
    </div>
  );
}

export default React.memo(ReturnToLobbyBadge);

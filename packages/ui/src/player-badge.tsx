import React from "react";
import { User } from "lucide-react";

interface PlayerBadgeProps {
  playerName: string;
  className?: string;
}

export const PlayerBadge = ({
  playerName,
  className = "",
}: PlayerBadgeProps) => {
  return (
    <div
      className={`flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm shadow-xl ${className}`}
    >
      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/60">
        <User size={18} />
      </div>
      <span className="text-sm font-iosevka-bold text-[var(--muted)] tracking-wider">
        {playerName || "GUEST"}
      </span>
    </div>
  );
};

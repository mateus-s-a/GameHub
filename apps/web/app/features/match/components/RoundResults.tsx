import React from "react";
import { Check, X } from "lucide-react";

interface PlayerResult {
  id: string;
  name?: string;
  choice: string | null;
}

interface RoundResultsProps {
  players: PlayerResult[];
  localPlayerId: string;
  correctAnswer: string | null;
  themeColor?: "red" | "emerald" | "blue" | "orange" | "purple" | "cyan";
  verb?: string; // e.g., "Guessed", "Chose", "Picked"
}

export default function RoundResults({
  players,
  localPlayerId,
  correctAnswer,
  themeColor = "blue",
  verb = "Guessed",
}: RoundResultsProps) {
  const themes = {
    red: "border-red-500/30 text-red-400",
    emerald: "border-emerald-500/30 text-emerald-400",
    blue: "border-blue-500/30 text-blue-400",
    orange: "border-orange-500/30 text-orange-400",
    purple: "border-purple-500/30 text-purple-400",
    cyan: "border-cyan-500/30 text-cyan-400",
  };

  const theme = themes[themeColor];

  // Grid layout: 1 col for 1 player, 2 cols for 2+, 1 col again on mobile
  const gridCols =
    players.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2";

  return (
    <div className={`grid ${gridCols} gap-4 w-full mt-4`}>
      {players.map((player) => {
        const isLocal = player.id === localPlayerId;
        const isCorrect = player.choice === correctAnswer;
        const shortId = player.id.substring(0, 5).toUpperCase();
        const displayName = `PLAYER-${shortId}${isLocal ? " (You)" : ""}`;

        return (
          <div
            key={player.id}
            className={`bg-gray-900/50 p-6 rounded-2xl border ${isCorrect ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-gray-700/50"} backdrop-blur-sm transition-all hover:bg-gray-900/70`}
          >
            <div className="flex justify-between items-start mb-4">
              <span
                className={`text-xs uppercase font-iosevka-bold tracking-widest ${isLocal ? theme.split(" ")[1] : "text-gray-500"}`}
              >
                {displayName}
              </span>
              {isCorrect ? (
                <div className="bg-emerald-500/20 p-1 rounded-full text-emerald-400 ring-4 ring-emerald-500/5">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                <div className="bg-red-500/20 p-1 rounded-full text-red-400 ring-4 ring-red-500/5">
                  <X className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 uppercase tracking-tighter mb-1">
                {verb}
              </span>
              <span
                className={`text-lg font-iosevka-medium truncate ${isCorrect ? "text-emerald-400" : "text-gray-400 line-through decoration-red-500/50 decoration-2 italic"}`}
              >
                {player.choice || "Nothing"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

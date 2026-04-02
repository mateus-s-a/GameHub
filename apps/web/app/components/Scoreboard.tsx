import React from "react";
import { Wifi, WifiOff } from "lucide-react";

export interface ScoreboardPlayer {
  id: string;
  name?: string;
  score: number;
  isConnected?: boolean;
}

interface ScoreboardProps {
  players: ScoreboardPlayer[];
  localPlayerId: string;
  currentRound: number;
  maxRounds: number;
  themeColor?: string;
}

const THEME_STYLES = {
  emerald: {
    textAccent: "text-emerald-400",
    borderAccent: "border-emerald-500/30",
    bgAccent: "bg-emerald-500/10",
  },
  cyan: {
    textAccent: "text-cyan-400",
    borderAccent: "border-cyan-500/30",
    bgAccent: "bg-cyan-500/10",
  },
  purple: {
    textAccent: "text-purple-400",
    borderAccent: "border-purple-500/30",
    bgAccent: "bg-purple-500/10",
  },
  orange: {
    textAccent: "text-orange-400",
    borderAccent: "border-orange-500/30",
    bgAccent: "bg-orange-500/10",
  },
};

export default function Scoreboard({
  players,
  localPlayerId,
  currentRound,
  maxRounds,
  themeColor = "emerald",
}: ScoreboardProps) {
  const selectedStyle = THEME_STYLES[themeColor as keyof typeof THEME_STYLES] || THEME_STYLES.emerald;
  const isMultiplayer = players.length > 2;

  return (
    <div className="w-full bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50 shadow-inner overflow-hidden mb-6 relative">
      <div className={`flex ${isMultiplayer ? "flex-col gap-4" : "justify-between items-center"} w-full`}>
        
        {/* Players Container */}
        <div className={`flex-1 grid ${isMultiplayer ? "grid-cols-2 lg:grid-cols-4 gap-3" : "grid-cols-2 gap-16 w-full"}`}>
          {players.map((player, idx) => {
            const isLocal = player.id === localPlayerId;
            const displayName = player.name || (isLocal ? "You" : `player-${player.id.substring(0, 5)}`);
            
            return (
              <div 
                key={player.id} 
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                  isLocal 
                    ? `${selectedStyle.borderAccent} ${selectedStyle.bgAccent} shadow-[0_0_15px_rgba(0,0,0,0.2)]` 
                    : "bg-gray-800/40 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 w-full justify-center">
                  <span className={`text-[10px] font-iosevka-bold uppercase tracking-widest truncate max-w-[80px] ${isLocal ? selectedStyle.textAccent : "text-gray-400"}`}>
                    {displayName}
                  </span>
                  {player.isConnected !== false ? (
                    <Wifi className={`w-3 h-3 ${isLocal ? "text-emerald-400" : "text-gray-500"}`} />
                  ) : (
                    <WifiOff className="w-3 h-3 text-red-500 animate-pulse" />
                  )}
                </div>
                <div className="text-3xl font-iosevka-bold text-white tabular-nums">
                  {player.score}
                </div>
                {isLocal && (
                  <span className={`text-[8px] font-iosevka-medium mt-1 uppercase ${selectedStyle.textAccent} opacity-80`}>
                    Your Score
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Round Counter */}
        <div className={`${isMultiplayer ? "w-full pt-2 border-t border-gray-800/50" : "absolute left-1/2 -translate-x-1/2 flex flex-col items-center"} text-center`}>
          <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-iosevka-bold mb-0.5">
            Round
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xl font-iosevka-bold text-white/90">{currentRound}</span>
            <span className="text-gray-600 font-iosevka-light text-sm">/</span>
            <span className="text-sm font-iosevka-medium text-gray-400">{maxRounds}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

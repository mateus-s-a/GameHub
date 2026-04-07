import { useState } from "react";
import GameConfigPanel from "@/features/setup/components/GameConfigPanel";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export interface GameSetupConfig {
  maxRounds: number;
  timeLimit: number;
  region?: string; // Only for GTF
  maxPlayers?: number; // Only for GTF currently mapped
}

interface GameSetupProps {
  onStart: (config: GameSetupConfig) => void;
  onCancel?: () => void;
  gameId: "ttt" | "rps" | "gtf";
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
};

export default function GameSetup({
  onStart,
  onCancel,
  gameId,
}: GameSetupProps) {
  const [currentConfig, setCurrentConfig] = useState<GameSetupConfig>({
    maxRounds: gameId === "gtf" ? 5 : 3,
    timeLimit: 15,
    region: "All",
    maxPlayers: 2,
  });

  const theme = GAME_THEMES[gameId];

  const handleStart = (config: GameSetupConfig) => {
    onStart(config);
  };

  return (
    <div className="flex flex-col items-center gap-6 max-w-sm w-full font-iosevka-regular animate-in slide-in-from-bottom duration-500">
      <GameConfigPanel
        gameId={gameId}
        config={currentConfig}
        isHost={true}
        isLobby={false}
        onChange={setCurrentConfig}
        onApply={handleStart}
      />
      <div className="w-full space-y-3">
        <motion.button
          onClick={() => handleStart(currentConfig)}
          whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
          whileTap={{ scale: 0.98 }}
          className={`group relative overflow-hidden w-full py-5 bg-gradient-to-r ${theme.gradient} text-white font-iosevka-bold text-2xl rounded-2xl shadow-xl ${theme.glow} transition-shadow duration-300 flex items-center justify-center gap-3 border ${theme.border}`}
        >
          {/* Shimmer Overlay */}
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

          {/* <Sparkles className="w-6 h-6 animate-pulse" /> */}
          <span className="relative z-10 tracking-wider">CREATE MATCH</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </div>
  );
}

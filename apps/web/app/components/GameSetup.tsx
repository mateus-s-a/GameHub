import { useState } from "react";
import GameConfigPanel from "./GameConfigPanel";

export interface GameSetupConfig {
  maxRounds: number;
  timeLimit: number;
  region?: string; // Only for GTF
  maxPlayers?: number; // Only for GTF currently mapped
}

interface GameSetupProps {
  onStart: (config: GameSetupConfig) => void;
  gameId: "ttt" | "rps" | "gtf";
}

export default function GameSetup({ onStart, gameId }: GameSetupProps) {
  const [currentConfig, setCurrentConfig] = useState<GameSetupConfig>({
    maxRounds: gameId === "gtf" ? 5 : 3,
    timeLimit: 15,
    region: "All",
    maxPlayers: 2,
  });

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
      <button
        onClick={() => handleStart(currentConfig)}
        className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-iosevka-bold text-2xl rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/10"
      >
        Create Match
      </button>
    </div>
  );
}

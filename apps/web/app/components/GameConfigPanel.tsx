import { useState, useEffect } from "react";
import { GameSetupConfig } from "./GameSetup";

interface GameConfigPanelProps {
  gameId: "ttt" | "rps" | "gtf";
  config: GameSetupConfig;
  onApply: (config: GameSetupConfig) => void;
  isHost: boolean;
  isLobby?: boolean;
  onChange?: (config: GameSetupConfig) => void;
}

export default function GameConfigPanel({
  gameId,
  config,
  onApply,
  isHost,
  isLobby = false,
  onChange,
}: GameConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<GameSetupConfig>(config);

  // Sync local state when external config changes (only for guests)
  useEffect(() => {
    if (!isHost) {
      setLocalConfig(config);
    }
  }, [config, isHost]);

  const handleChange = (
    field: keyof GameSetupConfig,
    value: string | number,
  ) => {
    setLocalConfig((prev) => {
      const next = { ...prev, [field]: value };
      // Move side effect out of the render/update cycle to avoid React warning
      if (onChange) {
        setTimeout(() => onChange(next), 0);
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(localConfig);
  };

  const readOnly = !isHost;

  return (
    <div
      className={`p-6 bg-gray-800/60 backdrop-blur-sm rounded-2xl border ${isLobby ? "border-white/20" : "border-gray-700"} shadow-xl space-y-6 w-full max-w-sm font-iosevka-regular`}
    >
      <h3 className="text-xl font-iosevka-bold text-white mb-4 border-b border-gray-700 pb-2">
        {isLobby ? "Match Settings" : "Host Options"}
      </h3>

      {/* Number of Rounds */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-widest font-semibold flex justify-between">
          <span>Number of Rounds</span>
          {isLobby && isHost && localConfig.maxRounds !== config.maxRounds && (
            <span className="text-orange-400 animate-pulse">Modified</span>
          )}
        </label>
        <select
          disabled={readOnly}
          className="bg-gray-950 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          value={localConfig.maxRounds}
          onChange={(e) => handleChange("maxRounds", Number(e.target.value))}
        >
          <option value={1}>1 Round (Sudden Death)</option>
          <option value={3}>Best of 3</option>
          <option value={5}>Best of 5</option>
          <option value={10}>Best of 10</option>
        </select>
      </div>

      {/* Time Limit */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-widest font-semibold flex justify-between">
          <span>Turn Time Limit</span>
          {isLobby && isHost && localConfig.timeLimit !== config.timeLimit && (
            <span className="text-orange-400 animate-pulse">Modified</span>
          )}
        </label>
        <select
          disabled={readOnly}
          className="bg-gray-950 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          value={localConfig.timeLimit}
          onChange={(e) => handleChange("timeLimit", Number(e.target.value))}
        >
          <option value={5}>5 Seconds (Blitz)</option>
          <option value={15}>15 Seconds (Normal)</option>
          <option value={30}>30 Seconds</option>
          <option value={60}>60 Seconds</option>
          <option value={0}>Unlimited</option>
        </select>
      </div>

      {/* GTF Specifics */}
      {gameId === "gtf" && (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-semibold flex justify-between">
              <span>Continent Filter</span>
              {isLobby && isHost && localConfig.region !== config.region && (
                <span className="text-orange-400 animate-pulse">Modified</span>
              )}
            </label>
            <select
              disabled={readOnly}
              className="bg-gray-950 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              value={localConfig.region}
              onChange={(e) => handleChange("region", e.target.value)}
            >
              <option value="All">Global (All Regions)</option>
              <option value="Americas">Americas</option>
              <option value="Europe">Europe</option>
              <option value="Africa">Africa</option>
              <option value="Asia">Asia</option>
              <option value="Oceania">Oceania</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-widest font-semibold flex justify-between">
              <span>Max Players</span>
            </label>
            <select
              disabled={readOnly || isLobby}
              className="bg-gray-950 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-orange-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              value={localConfig.maxPlayers}
              onChange={(e) =>
                handleChange("maxPlayers", Number(e.target.value))
              }
            >
              <option value={2}>2 Players (Classic)</option>
              <option value={3}>3 Players</option>
              <option value={4}>4 Players</option>
            </select>
            {isLobby && (
              <p className="text-[10px] text-gray-500 italic mt-1 font-iosevka-medium">
                Player count cannot be changed after room creation.
              </p>
            )}
          </div>
        </>
      )}

      {isHost && isLobby && (
        <button
          onClick={handleApply}
          className="w-full py-4 mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:brightness-110 text-white font-iosevka-bold text-lg rounded-xl shadow-lg transition-all active:scale-95"
        >
          Apply Changes
        </button>
      )}
    </div>
  );
}

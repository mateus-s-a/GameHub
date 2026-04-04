import React, { useState, useEffect } from "react";
import { GameSetupConfig } from "@/features/setup/components/GameSetup";
import { Button } from "@repo/ui/button";

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
      if (onChange) {
        setTimeout(() => onChange(next), 0);
      }
      return next;
    });
  };

  const readOnly = !isHost;

  return (
    <div className="space-y-8 w-full font-iosevka-regular">
      {/* Number of Rounds */}
      <div className="flex flex-col gap-4">
        <label className="text-sm text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
          Number of Rounds
        </label>
        <div className="space-y-4">
          <select
            disabled={readOnly}
            className="w-full bg-[#222222] text-white p-4 rounded-xl border border-[#333333] focus:outline-none focus:border-white/40 disabled:opacity-60 transition-all appearance-none cursor-pointer"
            value={localConfig.maxRounds}
            onChange={(e) => handleChange("maxRounds", Number(e.target.value))}
          >
            <option value={1}>1 Round (Sudden Death)</option>
            <option value={3}>Best of 3</option>
            <option value={5}>Best of 5</option>
            <option value={7}>Best of 7</option>
          </select>

          {/* Slider Placeholder to match Image 3 UI */}
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={localConfig.maxRounds <= 7 ? localConfig.maxRounds : 7}
              disabled={readOnly}
              onChange={(e) =>
                handleChange("maxRounds", Number(e.target.value))
              }
              className="w-full accent-white bg-[#333333] h-1 rounded-lg outline-none appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[var(--muted)] mt-2 font-iosevka-bold">
              <span>1</span>
              <span>7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Turn Time */}
      <div className="flex flex-col gap-4">
        <label className="text-sm text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
          Turn Time
        </label>
        <div className="space-y-4">
          <select
            disabled={readOnly}
            className="w-full bg-[#222222] text-white p-4 rounded-xl border border-[#333333] focus:outline-none focus:border-white/40 disabled:opacity-60 transition-all appearance-none cursor-pointer"
            value={localConfig.timeLimit}
            onChange={(e) => handleChange("timeLimit", Number(e.target.value))}
          >
            <option value={5}>5 Seconds (Blitz)</option>
            <option value={15}>15 Seconds (Normal)</option>
            <option value={30}>30 Seconds</option>
            <option value={0}>Unlimited</option>
          </select>

          <div className="px-2 text-center">
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={localConfig.timeLimit}
              disabled={readOnly}
              onChange={(e) =>
                handleChange("timeLimit", Number(e.target.value))
              }
              className="w-full accent-white bg-[#333333] h-1 rounded-lg outline-none appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {isHost && isLobby && localConfig !== config && (
        <Button
          variant="highlight"
          onClick={() => onApply(localConfig)}
          className="w-full mt-4"
        >
          APPLY CHANGES
        </Button>
      )}
    </div>
  );
}

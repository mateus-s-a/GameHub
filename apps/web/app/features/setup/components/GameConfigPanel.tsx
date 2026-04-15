import React, { useState, useEffect, useMemo } from "react";
import { GameSetupConfig } from "@gamehub/types";
import { 
  compareConfigs, 
  ROUND_OPTIONS, 
  TIME_OPTIONS, 
  PLAYER_OPTIONS 
} from "@gamehub/core";
import { Button } from "@repo/ui/button";
import { Lock, RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StepSlider from "@/features/setup/components/StepSlider";

// ─────────────────────────────────────────────────────────────────────────────
// Root registry: fields that become locked FOR THE HOST once inside a lobby.
// Non-hosts are always read-only regardless of this list.
// To lock a new field, simply add its key here for the relevant gameId.
// ─────────────────────────────────────────────────────────────────────────────
const LOBBY_LOCKED_FIELDS: Record<string, Array<keyof GameSetupConfig>> = {
  gtf: ["maxPlayers"],
};

function isFieldLobbyLocked(
  gameId: string,
  field: keyof GameSetupConfig,
): boolean {
  return LOBBY_LOCKED_FIELDS[gameId]?.includes(field) ?? false;
}

function LockedFieldWrapper({
  locked,
  isHost,
  children,
}: {
  locked: boolean;
  isHost: boolean;
  children: React.ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>
      {isHost && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center gap-1.5 bg-[#111111]/80 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full text-[10px] font-iosevka-bold text-white/50 tracking-widest uppercase">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        </div>
      )}
    </div>
  );
}

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
  const [isPending, setIsPending] = useState(false);

  // Memoize changes to avoid re-calculating on every unrelated render
  const hasChanges = useMemo(() => {
    return !compareConfigs(localConfig, config);
  }, [localConfig, config]);

  // Sync with server config ONLY if we don't have local modifications
  // This prevents the "sync race" when players join/leave during editing.
  useEffect(() => {
    if (!hasChanges || !isHost) {
      setLocalConfig(config);
      setIsPending(false); // Reset pending if server confirms/broadcasts
    }
  }, [config, isHost, hasChanges]);

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

  const handleApply = async () => {
    setIsPending(true);
    onApply(localConfig);
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  const isDisabled = (field: keyof GameSetupConfig): boolean =>
    !isHost || (isLobby && isFieldLobbyLocked(gameId, field));

  const selectClass =
    "w-full bg-[#222222] text-white p-4 rounded-xl border border-[#333333] focus:outline-none focus:border-white/40 disabled:opacity-60 transition-all appearance-none cursor-pointer";

  return (
    <div className="space-y-8 w-full font-iosevka-regular">
      {/* Number of Rounds */}
      <div className="flex flex-col gap-4">
        <label className="text-sm text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
          Number of Rounds
        </label>
        <div className="space-y-4">
          <select
            disabled={isDisabled("maxRounds")}
            className={selectClass}
            value={localConfig.maxRounds}
            onChange={(e) => handleChange("maxRounds", Number(e.target.value))}
          >
            {ROUND_OPTIONS.map((val) => (
              <option key={val} value={val}>
                {val === 1 ? "1 Round (Sudden Death)" : `Best of ${val}`}
              </option>
            ))}
          </select>

          <StepSlider
            options={ROUND_OPTIONS}
            value={localConfig.maxRounds}
            onChange={(v) => handleChange("maxRounds", v)}
            disabled={isDisabled("maxRounds")}
            label="Number of Rounds"
            formatter={(val) => (val === 1 ? "1 Round" : `Best of ${val}`)}
          />
        </div>
      </div>

      {/* Turn Time */}
      <div className="flex flex-col gap-4">
        <label className="text-sm text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
          Turn Time
        </label>
        <div className="space-y-4">
          <select
            disabled={isDisabled("timeLimit")}
            className={selectClass}
            value={localConfig.timeLimit}
            onChange={(e) => handleChange("timeLimit", Number(e.target.value))}
          >
            {TIME_OPTIONS.map((val) => (
              <option key={val} value={val}>
                {val === 0
                  ? "Unlimited"
                  : `${val} Seconds ${val <= 5 ? "(Blitz)" : val === 15 ? "(Normal)" : ""}`}
              </option>
            ))}
          </select>

          <StepSlider
            options={TIME_OPTIONS}
            value={localConfig.timeLimit}
            onChange={(v) => handleChange("timeLimit", v)}
            disabled={isDisabled("timeLimit")}
            label="Turn Time"
            formatter={(val) => (val === 0 ? "Unlimited" : `${val}s`)}
          />
        </div>
      </div>

      {/* GTF Specific Options: Max Players & Region */}
      {gameId === "gtf" && (
        <>
          <div className="flex flex-col gap-4">
            <label className="text-sm text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
              Max Players
            </label>
            <LockedFieldWrapper
              locked={isLobby && isFieldLobbyLocked(gameId, "maxPlayers")}
              isHost={isHost}
            >
              <div className="space-y-4">
                <select
                  disabled={isDisabled("maxPlayers")}
                  className={selectClass}
                  value={localConfig.maxPlayers || 2}
                  onChange={(e) =>
                    handleChange("maxPlayers", Number(e.target.value))
                  }
                >
                  {PLAYER_OPTIONS.map((val) => (
                    <option key={val} value={val}>
                      {val} Players {val === 2 ? "(PvP)" : val === 4 ? "(Small Group)" : ""}
                    </option>
                  ))}
                </select>

                <StepSlider
                  options={PLAYER_OPTIONS}
                  value={localConfig.maxPlayers || 2}
                  onChange={(v) => handleChange("maxPlayers", v)}
                  disabled={isDisabled("maxPlayers")}
                  label="Max Players"
                  formatter={(val) => `${val} Players`}
                />
              </div>
            </LockedFieldWrapper>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-sm text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
              Region / Continent
            </label>
            <div className="space-y-4">
              <select
                disabled={isDisabled("region")}
                className={selectClass}
                value={localConfig.region || "Global"}
                onChange={(e) => handleChange("region", e.target.value)}
              >
                <option value="Global">Global / Worldwide</option>
                <option value="Americas">Americas</option>
                <option value="Africa">Africa</option>
                <option value="Europe">Europe</option>
                <option value="Asia">Asia</option>
                <option value="Oceania">Oceania</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons for Host in Lobby */}
      {isHost && isLobby && (
        <div className="pt-4 space-y-3">
          <div className="flex gap-3 h-14">
            <AnimatePresence>
              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0, x: -20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: "100%" }}
                  exit={{ opacity: 0, x: -20, width: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex-1"
                >
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="w-full h-full border-2 border-white/5 hover:bg-white/5 text-white/60 font-iosevka-bold uppercase tracking-widest"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant={hasChanges ? "highlight" : "ghost"}
              onClick={handleApply}
              disabled={!hasChanges || isPending}
              className={`flex-[2] h-full transition-all duration-300 ${
                hasChanges
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 border-white/10 opacity-40 grayscale"
              }`}
            >
              <div className="flex items-center justify-center gap-2 font-iosevka-bold uppercase tracking-[0.2em]">
                {isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : hasChanges ? (
                  <>
                    <Check className="w-4 h-4" />
                    Apply Changes
                  </>
                ) : (
                  "Settings Saved"
                )}
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

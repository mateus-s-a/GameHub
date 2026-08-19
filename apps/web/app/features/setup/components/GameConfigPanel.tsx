import React, { useState, useEffect, useMemo } from "react";
import { GameSetupConfig } from "@gamehub/types";
import {
  compareConfigs,
  ROUND_OPTIONS,
  TIME_OPTIONS,
  PLAYER_OPTIONS,
  GameId,
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
  gameId: GameId;
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

  if (!isHost && isLobby) {
    return (
      <div className="space-y-4 w-full font-iosevka-regular">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <span className="text-xs font-iosevka-bold text-[var(--muted)] tracking-widest uppercase flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            MATCH RULES (READ ONLY)
          </span>
          <span className="text-[10px] font-iosevka-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 uppercase tracking-widest">
            SET BY HOST
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Number of Rounds */}
          <div className="p-4 rounded-xl bg-[#111111] border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] font-iosevka-bold text-[var(--muted)] uppercase tracking-wider">
              Rounds Format
            </span>
            <span className="text-base font-iosevka-bold text-white uppercase tracking-wide">
              {config.maxRounds === 1 ? "1 Round (Sudden Death)" : `Best of ${config.maxRounds}`}
            </span>
          </div>

          {/* Turn Time */}
          <div className="p-4 rounded-xl bg-[#111111] border border-white/5 flex flex-col gap-1">
            <span className="text-[11px] font-iosevka-bold text-[var(--muted)] uppercase tracking-wider">
              Turn Time Limit
            </span>
            <span className="text-base font-iosevka-bold text-white uppercase tracking-wide">
              {config.timeLimit === 0 ? "Unlimited" : `${config.timeLimit} Seconds`}
            </span>
          </div>

          {/* GTF Specific Rules */}
          {gameId === "gtf" && (
            <>
              <div className="p-4 rounded-xl bg-[#111111] border border-white/5 flex flex-col gap-1">
                <span className="text-[11px] font-iosevka-bold text-[var(--muted)] uppercase tracking-wider">
                  Max Players
                </span>
                <span className="text-base font-iosevka-bold text-white uppercase tracking-wide">
                  {config.maxPlayers || 2} Players
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#111111] border border-white/5 flex flex-col gap-1">
                <span className="text-[11px] font-iosevka-bold text-[var(--muted)] uppercase tracking-wider">
                  Region / Continent
                </span>
                <span className="text-base font-iosevka-bold text-white uppercase tracking-wide">
                  {config.region || "Global"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const selectClass =
    "w-full bg-[#222222] text-white p-4 rounded-xl border border-[#333333] focus:outline-none focus:border-white/40 disabled:opacity-60 transition-all appearance-none cursor-pointer";

  return (
    <div className="space-y-6 w-full font-iosevka-regular">
      {/* Number of Rounds */}
      <div className="flex flex-col gap-3">
        <label className="text-xs text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
          Number of Rounds
        </label>
        <StepSlider
          options={ROUND_OPTIONS}
          value={localConfig.maxRounds}
          onChange={(v) => handleChange("maxRounds", v)}
          disabled={isDisabled("maxRounds")}
          label="Number of Rounds"
          formatter={(val) => (val === 1 ? "1 Round" : `Best of ${val}`)}
        />
      </div>

      {/* Turn Time */}
      <div className="flex flex-col gap-3">
        <label className="text-xs text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
          Turn Time
        </label>
        <StepSlider
          options={TIME_OPTIONS}
          value={localConfig.timeLimit}
          onChange={(v) => handleChange("timeLimit", v)}
          disabled={isDisabled("timeLimit")}
          label="Turn Time"
          formatter={(val) => (val === 0 ? "Unlimited" : `${val}s`)}
        />
      </div>

      {/* GTF Specific Options: Max Players & Region */}
      {gameId === "gtf" && (
        <>
          <div className="flex flex-col gap-3">
            <label className="text-xs text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
              Max Players
            </label>
            <LockedFieldWrapper
              locked={isLobby && isFieldLobbyLocked(gameId, "maxPlayers")}
              isHost={isHost}
            >
              <StepSlider
                options={PLAYER_OPTIONS}
                value={localConfig.maxPlayers || 2}
                onChange={(v) => handleChange("maxPlayers", v)}
                disabled={isDisabled("maxPlayers")}
                label="Max Players"
                formatter={(val) => `${val} Players`}
              />
            </LockedFieldWrapper>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-xs text-[var(--muted)] font-iosevka-bold uppercase tracking-widest">
              Region / Continent
            </label>
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
        </>
      )}

      {/* Action Buttons for Host in Lobby */}
      {isHost && isLobby && (
        <div className="pt-2 space-y-3">
          <div className="flex gap-3 h-12">
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
                    className="w-full h-full border border-white/10 hover:bg-white/5 text-white/60 font-iosevka-bold text-xs uppercase tracking-widest"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Reset
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant={hasChanges ? "highlight" : "ghost"}
              onClick={handleApply}
              disabled={!hasChanges || isPending}
              className={`flex-[2] h-full transition-all duration-300 text-xs ${
                hasChanges
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white shadow-lg shadow-blue-500/20"
                  : "bg-white/5 border border-white/10 opacity-40 grayscale"
              }`}
            >
              <div className="flex items-center justify-center gap-2 font-iosevka-bold uppercase tracking-[0.2em]">
                {isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : hasChanges ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
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

import React from "react";
import { RoomInfo } from "@gamehub/types";
import { User, Copy, Users } from "lucide-react";
import GameConfigPanel from "@/features/setup/components/GameConfigPanel";
import { GameSetupConfig } from "@/features/setup/components/GameSetup";
import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";

export interface RoomLobbyProps {
  roomLobby: RoomInfo | null;
  localPlayerId: string;
  onToggleReady: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onUpdateConfig?: (config: GameSetupConfig) => void;
  themeColor?: string;
}

export default function RoomLobby({
  roomLobby,
  localPlayerId,
  onToggleReady,
  onStartMatch,
  onLeaveRoom,
  onUpdateConfig,
  themeColor = "emerald",
}: RoomLobbyProps) {
  if (!roomLobby) return null;

  const isHost = roomLobby.hostId === localPlayerId;
  const allReady = roomLobby.players.every((p) => p.isReady);
  const canStart = roomLobby.players.length >= 2 && allReady;

  const slots = Array.from({ length: 2 }).map((_, i) => {
    return roomLobby.players[i] || null;
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room link copied!");
  };

  return (
    <GameShell socketId={localPlayerId}>
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-24">
        {/* PLAYER SLOTS Card */}
        <Card
          title="PLAYER SLOTS"
          className="h-[480px] p-10 flex flex-col gap-6"
        >
          <div className="space-y-4">
            {slots.map((p, index) => (
              <div
                key={p ? p.id : `empty-${index}`}
                className={`flex items-center justify-between p-4 rounded-xl border border-[#333333] bg-[#1a1a1a] transition-all ${!p ? "opacity-40 grayscale" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center text-white/50 border border-white/10 overflow-hidden">
                      <User size={32} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#111111] border border-white/20 rounded-full w-8 h-8 flex items-center justify-center text-[10px] font-iosevka-bold text-white/60">
                      P{index + 1}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-xl font-iosevka-bold text-white">
                      {p ? p.name : "Waiting..."}
                      {p?.isHost && (
                        <span className="ml-2 text-xs text-[var(--muted)] font-iosevka-regular">
                          (Host)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {p && (
                  <Button
                    variant={p.isReady ? "highlight" : "ghost"}
                    onClick={p.id === localPlayerId ? onToggleReady : undefined}
                    className="px-6 py-2 rounded-full text-xs font-iosevka-bold tracking-widest bg-white/5 border-white/10 disabled:opacity-80"
                    disabled={p.id !== localPlayerId}
                  >
                    {p.isReady ? "READY UP" : "WAITING"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* MATCH SETTINGS Column */}
        <div className="flex flex-col gap-6 h-full">
          <Card title="MATCH SETTINGS" className="flex-grow p-10 bg-[#161616]">
            <GameConfigPanel
              gameId={roomLobby.gameType as any}
              config={roomLobby.config}
              onApply={(newConfig) => onUpdateConfig?.(newConfig)}
              isHost={isHost}
              isLobby={true}
            />
          </Card>

          <Card title="ROOM CUSTOMIZATION" className="p-10 bg-[#161616]">
            <div className="flex flex-col gap-4">
              <label className="text-sm font-iosevka-bold text-[var(--muted)] uppercase tracking-widest">
                Room Code
              </label>
              <div className="flex items-center bg-[#222222] border border-[#333333] rounded-xl overflow-hidden p-1 shadow-inner">
                <span className="flex-grow px-4 py-2 font-iosevka-bold text-white text-lg tracking-wider">
                  #GH-{roomLobby.id.substring(0, 5).toUpperCase()}
                </span>
                <Button
                  onClick={handleCopyLink}
                  variant="ghost"
                  className="px-4 py-3 h-full rounded-lg border-2 border-white/10 hover:border-white/20"
                >
                  SHARE LINK
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Global Room Controls (Bottom Center) */}
      <div className="flex items-center gap-6 mt-12 mb-12">
        <Button
          onClick={onLeaveRoom}
          className="px-10 py-5 rounded-full text-lg tracking-tighter uppercase font-iosevka-bold border-2 border-white/10 hover:border-white/20"
        >
          LEAVE ROOM
        </Button>
        <Button
          onClick={onStartMatch}
          disabled={!canStart}
          className={`px-12 py-5 rounded-full text-lg tracking-tighter uppercase font-iosevka-bold border-2 ${canStart ? "bg-white/10 border-white/20 hover:bg-white/20" : "opacity-40 grayscale pointer-events-none"}`}
        >
          START MATCH
        </Button>
      </div>

      {/* Game Countdown View */}
      {roomLobby.countdown !== null && (
        <div className="fixed inset-0 z-50 bg-[#111111]/95 flex flex-col items-center justify-center p-8 backdrop-blur-2xl">
          <h1 className="text-[240px] font-iosevka-bold text-white tracking-widest animate-pulse leading-none mb-12">
            {roomLobby.countdown}
          </h1>
          <p className="text-2xl font-iosevka-bold text-[var(--muted)] uppercase tracking-[1em] -mr-[1em] animate-pulse">
            GAME STARTING...
          </p>
        </div>
      )}
    </GameShell>
  );
}

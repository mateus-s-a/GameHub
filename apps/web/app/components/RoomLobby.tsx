import React from "react";
import { RoomInfo } from "@gamehub/types";
import { Users, CheckCircle, XCircle, Play, X, Settings2 } from "lucide-react";
import GameConfigPanel from "./GameConfigPanel";
import { GameSetupConfig } from "./GameSetup";

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

  const themeStyles: Record<string, { bgAccent: string; textAccent: string }> =
    {
      emerald: { bgAccent: "bg-emerald-500", textAccent: "text-emerald-400" },
      cyan: { bgAccent: "bg-cyan-500", textAccent: "text-cyan-400" },
      purple: { bgAccent: "bg-purple-500", textAccent: "text-purple-400" },
      orange: { bgAccent: "bg-orange-500", textAccent: "text-orange-400" },
    };

  const style = (themeStyles[themeColor] || themeStyles["emerald"]) as {
    bgAccent: string;
    textAccent: string;
  };

  // Populate empty slots visually based on maxPlayers configured in Backend!
  const slots = Array.from({ length: roomLobby.maxPlayers }).map((_, i) => {
    return roomLobby.players[i] || null;
  });

  const allReady = roomLobby.players.every((p) => p.isReady);
  const canStart = roomLobby.players.length >= 2 && allReady;

  return (
    <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 p-8 max-w-6xl w-full mx-auto font-iosevka-regular mt-8 z-10">
      {/* Left Column: Player List */}
      <div className="flex flex-col bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full lg:w-2/3 p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-700/20 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

        <div className="flex justify-between items-center w-full mb-8">
          <div>
            <h2 className="text-3xl font-iosevka-bold text-white text-left">
              Match Lobby
            </h2>
            <p className="text-sm text-gray-400 text-left">
              {roomLobby.hostName}&apos;s Room - {roomLobby.playerCount}/
              {roomLobby.maxPlayers}
            </p>
          </div>
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20"
          >
            <X className="w-5 h-5" />
            Leave Room
          </button>
        </div>

        <div className="w-full space-y-3 mb-8">
          {slots.map((p, index) => (
            <div
              key={p ? p.id : `empty-${index}`}
              className={`flex items-center justify-between p-4 rounded-xl border ${p ? "bg-gray-700/50 border-gray-500/30" : "bg-gray-800 border-gray-700/50 border-dashed"}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${p ? style.bgAccent : "bg-gray-700"} text-white`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <span
                  className={`text-lg ${p ? (p.id === localPlayerId ? style.textAccent : "text-gray-200") : "text-gray-500"}`}
                >
                  {p
                    ? `${p.name} ${p.isHost ? "(Host)" : ""}`
                    : "Waiting for player..."}
                </span>
              </div>

              {p && (
                <div className="flex items-center gap-3">
                  {p.isReady ? (
                    <span className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <CheckCircle className="w-5 h-5" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-gray-400 text-sm">
                      <XCircle className="w-5 h-5" /> Not Ready
                    </span>
                  )}

                  {p.id === localPlayerId && roomLobby.countdown === null && (
                    <button
                      onClick={onToggleReady}
                      className={`ml-4 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${p.isReady ? "bg-gray-600 hover:bg-gray-500 text-white" : `${style.bgAccent} hover:opacity-80 text-white`}`}
                    >
                      {p.isReady ? "Cancel Ready" : "Ready Up"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {roomLobby.countdown !== null && (
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
            <h1
              className={`text-9xl font-iosevka-bold ${style.textAccent} animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]`}
            >
              {roomLobby.countdown}
            </h1>
            <p className="text-xl text-gray-300 mt-6 tracking-widest font-iosevka-bold uppercase">
              Game Starting...
            </p>
          </div>
        )}

        {isHost ? (
          <button
            onClick={onStartMatch}
            disabled={!canStart || roomLobby.countdown !== null}
            className={`w-full py-4 rounded-xl font-iosevka-bold text-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg ${canStart ? `${style.bgAccent} hover:brightness-110 text-white cursor-pointer` : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
          >
            <Play className="w-6 h-6" /> Start Match
          </button>
        ) : (
          <div className="text-gray-400 text-sm mt-2 text-center">
            {roomLobby.countdown === null
              ? "Waiting for Host to start the match..."
              : ""}
          </div>
        )}
      </div>

      {/* Right Column: Config Panel */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-700">
        <div className="flex items-center gap-2 text-gray-400 mb-2 px-2 uppercase tracking-widest text-xs font-iosevka-bold">
          <Settings2 className="w-4 h-4" />
          <span>Room Customization</span>
        </div>
        <GameConfigPanel
          gameId={roomLobby.gameType as "ttt" | "rps" | "gtf"}
          config={roomLobby.config}
          isHost={isHost}
          isLobby={true}
          onApply={(newConfig) => onUpdateConfig?.(newConfig)}
        />
      </div>
    </div>
  );
}

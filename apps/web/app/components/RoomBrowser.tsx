import React from "react";
import { RoomInfo } from "@gamehub/types";
import { Info, Clock, Swords } from "lucide-react";

interface RoomBrowserProps {
  rooms: RoomInfo[];
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  gameLabel: string;
}

export default function RoomBrowser({
  rooms,
  onCreateRoom,
  onJoinRoom,
  gameLabel,
}: RoomBrowserProps) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Header and Controls */}
      <div className="w-full flex justify-between items-center mb-8 border-b border-gray-700/50 pb-4">
        <div>
          <h2 className="text-2xl font-iosevka-bold tracking-wider text-white">
            {gameLabel} Lobby
          </h2>
        </div>
        <button
          onClick={onCreateRoom}
          className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 font-iosevka-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-white border border-emerald-400/30"
        >
          Create Room
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-iosevka-bold text-white tracking-widest uppercase mb-2">
            Active Rooms
          </h1>
          <p className="text-gray-400 font-iosevka-regular text-sm tracking-wide">
            Click to Join a Room
          </p>
        </div>

        {/* Room List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-500 font-iosevka-regular italic border-2 border-dashed border-gray-700/30 rounded-2xl bg-gray-800/30">
              No rooms currently available. Create one to get started!
            </div>
          ) : (
            rooms.map((room) => {
              const inProgress = room.status === "in_progress";
              const isFull = room.playerCount >= room.maxPlayers;
              const isDisabled = inProgress || isFull;

              return (
                <button
                  key={room.id}
                  disabled={isDisabled}
                  onClick={() => onJoinRoom(room.id)}
                  className={`group w-full flex flex-col p-5 rounded-2xl border text-left transition-all ${
                    isDisabled
                      ? "bg-gray-800/50 border-gray-700 cursor-not-allowed opacity-80"
                      : "bg-gray-800/80 border-gray-600 hover:border-emerald-500/50 hover:bg-gray-750 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                  }`}
                >
                  <div className="flex justify-between items-start w-full mb-3">
                    <span className="font-iosevka-bold text-lg text-emerald-400 max-w-[60%] truncate group-hover:text-emerald-300">
                      {room.hostName}
                    </span>
                    <span className="bg-gray-900/80 border border-gray-600 px-3 py-1 rounded-full text-xs font-iosevka-bold text-gray-300">
                      room-{room.id.substring(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm mt-auto w-full">
                    {/* Status Badge */}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-iosevka-bold border ${
                        inProgress
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {inProgress ? (
                        <>
                          <Swords className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase">In Game</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] uppercase">Waiting</span>
                        </>
                      )}
                    </div>

                    {/* Players Info */}
                    <div className="flex items-center gap-1.5 text-gray-400 ml-auto bg-gray-900/40 px-3 py-1.5 rounded-full border border-gray-700/50">
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-iosevka-regular text-xs">
                        {room.playerCount} / {room.maxPlayers}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { RoomInfo } from "@gamehub/types";
import { User, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { useRouter } from "next/navigation";

interface RoomBrowserProps {
  rooms: RoomInfo[];
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  gameLabel: string;
}

import NavButton from "@/(shared)/components/ui/NavButton";

export default function RoomBrowser({
  rooms,
  onCreateRoom,
  onJoinRoom,
  gameLabel,
}: RoomBrowserProps) {
  const router = useRouter();

  const handleBackToHub = () => {
    router.push("/");
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-start pt-12">
      {/* Back Button */}
      <NavButton
        onClick={handleBackToHub}
        label="BACK TO HUB"
        className="mb-12"
      />

      {/* Lobby Title */}
      <h1 className="text-6xl font-iosevka-bold text-white mb-16 tracking-tight">
        {gameLabel} Lobby
      </h1>

      {/* Create Room Button */}
      <div className="w-full flex justify-center mb-20">
        <Button
          onClick={onCreateRoom}
          className="w-full max-w-lg py-5 text-lg border-2 border-white/20 hover:border-white/40"
        >
          CREATE ROOM
        </Button>
      </div>

      {/* Active Rooms Section */}
      <div className="w-full pb-20">
        <h2 className="text-2xl font-iosevka-bold text-white mb-4 tracking-tight">
          Active Rooms
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {rooms.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[var(--muted)] font-iosevka-regular italic border border-[#333333] rounded-2xl bg-[#1a1a1a]/30">
              No rooms currently available. Create one to get started!
            </div>
          ) : (
            rooms.map((room) => {
              const isDisabled =
                room.status === "in_progress" ||
                room.playerCount >= room.maxPlayers;

              return (
                <Card
                  key={room.id}
                  className={`p-6 flex items-center gap-6 cursor-pointer hover:bg-[#1a1a1a] transition-all border-[#333333] active:scale-[0.98] ${isDisabled ? "opacity-50 grayscale" : ""}`}
                  onClick={() => !isDisabled && onJoinRoom(room.id)}
                >
                  <div className="w-16 h-16 bg-[#222222] rounded-lg flex items-center justify-center text-white/40">
                    <User size={32} />
                  </div>

                  <div className="flex flex-col gap-1 flex-grow">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-white" />
                      <span className="text-sm font-iosevka-bold text-white">
                        Host: {room.hostName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[var(--muted)]" />
                      <span className="text-xs font-iosevka-regular text-[var(--muted)] capitalize">
                        Status:{" "}
                        {room.status === "waiting" ? "Waiting" : "In Game"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <User size={14} className="text-[var(--muted)]" />
                      <span className="text-xs font-iosevka-regular text-[var(--muted)]">
                        Players: {room.playerCount}/{room.maxPlayers}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

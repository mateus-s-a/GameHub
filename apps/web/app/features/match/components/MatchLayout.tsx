"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@repo/ui/button";
import ConfirmModal from "@/(shared)/components/ui/ConfirmModal";
import { getGameById, GameId } from "@gamehub/core";

interface MatchLayoutProps {
  gameId: GameId;
  isGameOver: boolean;
  onLeave: () => void;
  children: React.ReactNode;
}

export default function MatchLayout({
  gameId,
  isGameOver,
  onLeave,
  children,
}: MatchLayoutProps) {
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const game = getGameById(gameId);

  return (
    <div className="w-full max-w-4xl flex flex-col items-center pt-8 px-4 mx-auto pb-24 relative min-h-[calc(100vh-80px)]">
      <h1 className="text-4xl font-iosevka-bold mb-8 text-white tracking-widest uppercase text-center">
        {game?.title || "Match"}
      </h1>

      {!isGameOver && (
        <Button
          variant="ghost"
          onClick={() => setIsExitModalOpen(true)}
          className="mb-8 border-red-500/20 text-red-500 hover:bg-red-500/10"
        >
          <X className="w-3 h-3" />
          <span>LEAVE MATCH</span>
        </Button>
      )}

      <ConfirmModal
        isOpen={isExitModalOpen}
        title="Leave Match?"
        message="Are you sure you want to leave the current match? Your progress will be lost."
        onConfirm={() => {
          onLeave();
          setIsExitModalOpen(false);
        }}
        onCancel={() => setIsExitModalOpen(false)}
        confirmText="Leave"
        cancelText="Stay"
        themeColor="red"
      />

      {children}
    </div>
  );
}

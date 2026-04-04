import React from "react";
import { Logo } from "./logo";
import { PlayerBadge } from "./player-badge";

interface GameShellProps {
  children: React.ReactNode;
  playerName: string;
}

export const GameShell = ({ children, playerName }: GameShellProps) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-8 overflow-hidden bg-[var(--background)]">
      {/* Top Header */}
      <div className="absolute top-8 left-8">
        <Logo />
      </div>

      {children}

      {/* Bottom Profile Badge */}
      <div className="absolute bottom-8 right-8">
        <PlayerBadge playerName={playerName} />
      </div>
    </div>
  );
};

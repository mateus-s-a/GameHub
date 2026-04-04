import React from "react";
import { Logo } from "./logo";
import { PlayerBadge } from "./player-badge";

interface GameShellProps {
  children: React.ReactNode;
  socketId?: string | null;
}

export const GameShell = ({ children, socketId }: GameShellProps) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-8 overflow-hidden bg-[var(--background)]">
      {/* Top Header */}
      <div className="absolute top-8 left-8">
        <Logo />
      </div>

      {children}

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-8">
        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/40 shadow-xl">
          N
        </div>
      </div>

      {/* Bottom Profile Badge */}
      <div className="absolute bottom-8 right-8">
        <PlayerBadge socketId={socketId} />
      </div>
    </div>
  );
};

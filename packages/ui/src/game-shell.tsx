import React from "react";
import { Logo } from "./logo";

interface GameShellProps {
  children: React.ReactNode;
  playerName: string;
}

export const GameShell = ({ children }: GameShellProps) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Top Header */}
      <div className="absolute top-8 left-8">
        <Logo />
      </div>

      {children}
    </div>
  );
};

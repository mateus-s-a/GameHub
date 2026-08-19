import React from "react";
import { Logo } from "./logo";

interface GameShellProps {
  children: React.ReactNode;
  playerName?: string;
}

export const GameShell = ({ children }: GameShellProps) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start md:justify-center p-4 md:p-8 overflow-x-hidden">
      {/* Top Header Responsivo: fluxo relativo no mobile / absoluto no desktop */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 mb-2 md:mb-0 md:absolute md:top-8 md:left-8 md:w-auto z-30 shrink-0">
        <Logo />
      </header>

      {/* Conteúdo principal do jogo com margem de segurança no topo */}
      <main className="w-full flex flex-col items-center justify-center pt-2 md:pt-12">
        {children}
      </main>
    </div>
  );
};

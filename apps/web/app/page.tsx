"use client";

import { GameShell } from "@repo/ui/game-shell";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Separator } from "@repo/ui/separator";
import Link from "next/link";

export default function HubMenu() {
  const games = [
    {
      id: "tic-tac-toe",
      title: "TIC-TAC-TOE",
      description: "The classic 3x3 grid game. Simple, elegant, and ruthless.",
      status: "active",
      href: "/games/tic-tac-toe",
      buttonText: "PLAY NOW",
    },
    {
      id: "rock-paper-scissors",
      title: "ROCK-PAPER-SCISSORS",
      description: "A mental battle of hidden choices and commitments.",
      status: "active",
      href: "/games/rock-paper-scissors",
      buttonText: "ENTER MATCHMAKING",
    },
    {
      id: "guess-the-flag",
      title: "GUESS THE FLAG PVP",
      description: "High-speed geographical trivia against live opponents.",
      status: "coming_soon",
      href: "/games/guess-the-flag",
      buttonText: "ENTER MATCHMAKING",
    },
  ];

  return (
    <GameShell>
      <div className="w-full max-w-5xl flex flex-col items-center">
        {/* Main Title */}
        <h1 className="text-[120px] font-iosevka-bold tracking-tight text-white mb-12 leading-none">
          GameHub
        </h1>

        {/* Separator */}
        <div className="w-full max-w-4xl px-8">
          <Separator text="SELECT YOUR ARENA" />
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
          {games.map((game) => (
            <Card
              key={game.id}
              className="flex flex-col items-center text-center p-10 group bg-[#111111] hover:bg-[#151515] transition-all"
            >
              <h2 className="text-2xl font-iosevka-bold text-white mb-4 tracking-wider">
                {game.title}
              </h2>
              <p className="text-sm font-iosevka-regular text-[var(--muted)] leading-relaxed mb-10 h-12">
                {game.description}
              </p>

              <Link href={game.href} className="w-full">
                <Button
                  variant={game.id === "tic-tac-toe" ? "primary" : "highlight"}
                  className="w-full"
                  disabled={game.status === "coming_soon"}
                >
                  {game.buttonText}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </GameShell>
  );
}

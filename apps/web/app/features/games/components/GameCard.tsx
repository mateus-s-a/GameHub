"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { GameEntry } from "@gamehub/core";
import TicTacToeHero from "./illustrations/TicTacToeHero";
import GuessTheFlagHero from "./illustrations/GuessTheFlagHero";
import RockPaperScissorsHero from "./illustrations/RockPaperScissorsHero";

const illustrationMap: Record<GameEntry["illustration"], React.FC<{ className?: string }>> = {
  ttt: TicTacToeHero,
  gtf: GuessTheFlagHero,
  rps: RockPaperScissorsHero,
};

interface GameCardProps {
  game: GameEntry;
  isActive: boolean;
}

export default function GameCard({ game, isActive }: GameCardProps) {
  const Illustration = illustrationMap[game.illustration];

  return (
    <div
      className={`
        relative flex flex-col items-center justify-between
        w-full h-full rounded-2xl overflow-hidden
        transition-all duration-500
        ${isActive
          ? "bg-[#111111]/90 backdrop-blur-sm"
          : "bg-[#0e0e10]/60"
        }
      `}
      style={{
        border: "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: isActive
          ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.4)`
          : "none",
      }}
    >
      {/* Subtle accent glow — ambient layer */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${game.accentColor}, transparent 70%)`,
          }}
        />
      )}

      {/* Hero Illustration */}
      <div className="relative flex-1 w-full flex items-center justify-center pt-6 md:pt-10">
        <motion.div
          animate={isActive ? { y: [0, -6, 0] } : { y: 0 }}
          transition={
            isActive
              ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
        >
          <Illustration className="w-48 h-40 md:w-64 md:h-52" />
        </motion.div>
      </div>

      {/* Text Content */}
      <div className="relative flex flex-col items-center gap-1 px-6 pb-2">
        {/* Category Label */}
        <span className="text-[10px] md:text-xs font-iosevka-bold tracking-[0.3em] text-white/40 uppercase">
          {game.category}
        </span>

        {/* Game Title */}
        <h2
          className="text-xl md:text-3xl font-iosevka-bold text-white tracking-tight text-center leading-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          {game.title}
        </h2>

        {/* Subtitle */}
        <p className="text-[11px] md:text-sm font-iosevka-regular text-white/30 text-center max-w-[280px] leading-relaxed mt-1">
          {game.description}
        </p>
      </div>

      {/* CTA Button */}
      <div className="relative px-6 pb-6 md:pb-8 pt-4">
        {isActive ? (
          <Link href={`/games/${game.slug}`} tabIndex={0}>
            <motion.button
              className="px-10 py-3 bg-white text-black font-iosevka-bold text-sm tracking-[0.2em] uppercase rounded-full cursor-pointer border-none outline-none"
              whileHover={{ scale: 1.05, boxShadow: "0 8px 24px rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.97 }}
              style={{ boxShadow: "0 4px 16px rgba(255,255,255,0.08)" }}
            >
              PLAY NOW
            </motion.button>
          </Link>
        ) : (
          <div className="h-[46px]" /> // Spacer when not active
        )}
      </div>
    </div>
  );
}

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { type GameEntry, ANIMATION_TOKENS } from "@gamehub/core";

// Lazy-load illustrations for optimal bundle size
const illustrationMap = {
  ttt: dynamic(() => import("./illustrations/TicTacToeHero")),
  gtf: dynamic(() => import("./illustrations/GuessTheFlagHero")),
  rps: dynamic(() => import("./illustrations/RockPaperScissorsHero")),
  hangman: dynamic(() => import("./illustrations/HangmanHero")),
};

interface GameCardProps {
  game: GameEntry;
  isActive: boolean;
}

export default function GameCard({ game, isActive }: GameCardProps) {
  const Illustration = illustrationMap[game.illustration];

  // Hardware-accelerated hardware hints
  const gpuHint = { rotateZ: 0.01 };

  return (
    <motion.div
      initial={false}
      animate={{
        backgroundColor: isActive ? "rgba(17, 17, 17, 0.9)" : "rgba(14, 14, 16, 0.6)",
        borderColor: isActive ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.04)",
        ...gpuHint,
      }}
      transition={ANIMATION_TOKENS.CAROUSEL_SPRING}
      className="relative flex flex-col items-center justify-between w-full h-full rounded-2xl overflow-hidden border"
      style={{
        boxShadow: isActive
          ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.4)`
          : "none",
        transformStyle: "preserve-3d",
      }}
    >
      {/* 
        DOUBLE-BUFFER BLUR STRATEGY:
        Instead of animating 'filter: blur()', we render two layers and cross-fade opacity.
        Firefox handles this on the compositor, avoiding expensive re-paints.
      */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{ 
          filter: ANIMATION_TOKENS.BLUR_FIXED_AMOUNT,
          opacity: isActive ? 0 : 1,
          zIndex: 0
        }}
      />
      
      <div 
        className="absolute inset-0 pointer-events-none backdrop-blur-sm"
        style={{ 
          opacity: isActive ? 1 : 0,
          zIndex: 0
        }}
      />

      {/* Subtle accent glow — ambient layer */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 50% 30%, ${game.accentColor}, transparent 70%)`,
              zIndex: 1
            }}
          />
        )}
      </AnimatePresence>

      {/* Hero Illustration */}
      <div className="relative z-10 flex-1 w-full flex items-center justify-center pt-6 md:pt-10">
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
      <motion.div 
        animate={{ opacity: isActive ? 1 : 0.4 }}
        className="relative z-10 flex flex-col items-center gap-1 px-6 pb-2"
      >
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
      </motion.div>

      {/* CTA Button */}
      <div className="relative z-10 px-6 pb-6 md:pb-8 pt-4">
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
    </motion.div>
  );
}

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GAMES_REGISTRY } from "@gamehub/core";
import { Logo } from "@repo/ui/logo";
import { useCarousel } from "../hooks/useCarousel";
import GameCard from "./GameCard";
import CarouselDots from "./CarouselDots";
import VersionTag from "./VersionTag";

export default function GameCarousel() {
  const games = GAMES_REGISTRY.filter((g) => g.status === "active");

  const {
    activeIndex,
    direction,
    goTo,
    goNext,
    goPrev,
    prefersReducedMotion,
  } = useCarousel({
    totalItems: games.length,
  });

  // Position helper: returns the relative position from the active card
  const getRelativeIndex = (index: number) => {
    const diff = index - activeIndex;
    const len = games.length;
    // Normalize to [-1, 0, 1] range for circular wrapping
    if (diff === 0) return 0;
    if (diff === 1 || diff === -(len - 1)) return 1;
    if (diff === -1 || diff === len - 1) return -1;
    return diff > 0 ? 2 : -2; // Off-screen
  };

  const cardVariants = {
    center: {
      x: "0%",
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      zIndex: 10,
    },
    left: {
      x: "-75%",
      scale: 0.72,
      opacity: 0.4,
      filter: "blur(3px)",
      zIndex: 1,
    },
    right: {
      x: "75%",
      scale: 0.72,
      opacity: 0.4,
      filter: "blur(3px)",
      zIndex: 1,
    },
    hiddenLeft: {
      x: "-150%",
      scale: 0.5,
      opacity: 0,
      filter: "blur(8px)",
      zIndex: 0,
    },
    hiddenRight: {
      x: "150%",
      scale: 0.5,
      opacity: 0,
      filter: "blur(8px)",
      zIndex: 0,
    },
  };

  const getVariant = (relPos: number) => {
    switch (relPos) {
      case 0:
        return "center";
      case -1:
        return "left";
      case 1:
        return "right";
      default:
        return relPos < 0 ? "hiddenLeft" : "hiddenRight";
    }
  };

  const transitionConfig = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, stiffness: 200, damping: 28, mass: 1 };

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(255,255,255,0.025) 0%, transparent 70%)",
        }}
      />

      {/* Top-Left Brand Mark */}
      <div className="absolute top-8 left-8 z-30">
        <Logo />
      </div>

      {/* Carousel Container */}
      <div className="relative w-full flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-[420px] md:max-w-[480px] aspect-[3/4] md:aspect-[3/4]">
          {games.map((game, index) => {
            const relPos = getRelativeIndex(index);
            const variant = getVariant(relPos);
            const isActive = relPos === 0;
            const isAdjacent = Math.abs(relPos) === 1;

            return (
              <motion.div
                key={game.id}
                className="absolute inset-0"
                variants={cardVariants}
                animate={variant}
                transition={transitionConfig}
                onClick={() => {
                  if (relPos === -1) goPrev();
                  if (relPos === 1) goNext();
                }}
                style={{
                  cursor: isAdjacent ? "pointer" : "default",
                  pointerEvents:
                    isActive || isAdjacent ? "auto" : "none",
                }}
              >
                <GameCard game={game} isActive={isActive} />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="relative z-20 pb-12 md:pb-16">
        <CarouselDots
          total={games.length}
          activeIndex={activeIndex}
          onDotClick={goTo}
        />
      </div>

      {/* Version Tag */}
      <VersionTag />
    </div>
  );
}

"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GAMES_REGISTRY, ANIMATION_TOKENS } from "@gamehub/core";
import { Logo } from "@repo/ui/logo";
import { useCarousel } from "../hooks/useCarousel";
import { useCarouselDrag } from "../hooks/useCarouselDrag";
import GameCard from "./GameCard";
import CarouselDots from "./CarouselDots";
import VersionTag from "./VersionTag";
import CarouselArrow from "./CarouselArrow";

export default function GameCarousel() {
  const games = GAMES_REGISTRY.filter((g) => g.status === "active");
  const transitionRef = useRef<number>(0);

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

  // Gestures
  const { dragProps, isDragging } = useCarouselDrag(
    () => handleNext(),
    () => handlePrev()
  );

  // Throttled navigation to prevent rapid-click stutter
  const handleNext = () => {
    const now = Date.now();
    if (now - transitionRef.current < 400) return;
    transitionRef.current = now;
    goNext();
  };

  const handlePrev = () => {
    const now = Date.now();
    if (now - transitionRef.current < 400) return;
    transitionRef.current = now;
    goPrev();
  };

  const handleGoTo = (index: number) => {
    const now = Date.now();
    if (now - transitionRef.current < 400) return;
    transitionRef.current = now;
    goTo(index);
  };

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

  /**
   * FIREFOX HARDWARE ACCELERATION STRATEGY:
   * 1. Use 'rotateZ(0.01deg)' to force a new compositor layer.
   * 2. Use 'transform-style: preserve-3d' and 'perspective' on the container.
   * 3. Avoid animating 'filter' values (handled via opacity cross-fade in GameCard).
   */
  const gpuHint = { rotateZ: 0.01 };

  const cardVariants = {
    center: {
      x: "0%",
      scale: 1,
      opacity: 1,
      zIndex: 10,
      ...gpuHint,
    },
    left: {
      x: "-75%",
      scale: 0.72,
      opacity: 0.4,
      zIndex: 1,
      ...gpuHint,
    },
    right: {
      x: "75%",
      scale: 0.72,
      opacity: 0.4,
      zIndex: 1,
      ...gpuHint,
    },
    hiddenLeft: {
      x: "-150%",
      scale: 0.5,
      opacity: 0,
      zIndex: 0,
      ...gpuHint,
    },
    hiddenRight: {
      x: "150%",
      scale: 0.5,
      opacity: 0,
      zIndex: 0,
      ...gpuHint,
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
    : ANIMATION_TOKENS.CAROUSEL_SPRING;

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ perspective: "1200px" }}
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

      {/* Desktop Navigation Arrows — Flanking the central card area on PC */}
      <AnimatePresence>
        {!isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-between z-40 pointer-events-none max-w-[1200px] mx-auto px-4 md:px-0"
          >
            <div className="pointer-events-auto">
              <CarouselArrow direction="prev" onClick={handlePrev} />
            </div>
            <div className="pointer-events-auto">
              <CarouselArrow direction="next" onClick={handleNext} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Carousel Container */}
      <div className="relative w-full flex-1 flex items-center justify-center">
        <div 
          className="relative w-full max-w-[420px] md:max-w-[480px] aspect-[3/4] md:aspect-[3/4]"
          style={{ transformStyle: "preserve-3d" }}
        >
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
                {...dragProps}
                onClick={() => {
                  // Only trigger card-based nav if clicking the "peek" area explicitly
                  // and not the center card which has its own CTAs
                  if (relPos === -1) handlePrev();
                  if (relPos === 1) handleNext();
                }}
                style={{
                  cursor: isAdjacent ? "pointer" : "default",
                  pointerEvents:
                    isActive || isAdjacent ? "auto" : "none",
                  transformStyle: "preserve-3d",
                  touchAction: "pan-y", // Prevent vertical scroll interference
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
          onDotClick={handleGoTo}
        />
      </div>

      {/* Version Tag */}
      <VersionTag />
    </div>
  );
}

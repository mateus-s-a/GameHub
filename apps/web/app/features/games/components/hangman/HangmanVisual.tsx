import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HangmanVisualProps {
  attemptsLeft: number;
  className?: string;
}

export default function HangmanVisual({
  attemptsLeft,
  className = "",
}: HangmanVisualProps) {
  // Mapping attempts to segment visibility
  // 6: Empty, 5: Head, 4: Torso, 3: L-Arm, 2: R-Arm, 1: L-Leg, 0: R-Leg
  const segments = [
    { id: "head", threshold: 5 },
    { id: "torso", threshold: 4 },
    { id: "l-arm", threshold: 3 },
    { id: "r-arm", threshold: 2 },
    { id: "l-leg", threshold: 1 },
    { id: "r-leg", threshold: 0 },
  ];

  const springTransition = {
    type: "spring" as const,
    stiffness: 200,
    damping: 20,
  };

  return (
    <svg
      viewBox="0 0 320 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      shapeRendering="geometricPrecision"
    >
      {/* Gallows Structure — Permanent layers */}
      <g
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <line x1="60" y1="220" x2="160" y2="220" /> {/* Base */}
        <line x1="80" y1="220" x2="80" y2="60" /> {/* Post */}
        <line x1="80" y1="60" x2="180" y2="60" /> {/* Beam */}
        <line x1="80" y1="90" x2="110" y2="60" /> {/* Support */}
        <line
          x1="180"
          y1="60"
          x2="180"
          y2="90"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />{" "}
        {/* Rope */}
      </g>

      {/* The Hangman — Dynamic segments */}
      <g stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round">
        {/* Head */}
        <AnimatePresence>
          {attemptsLeft <= 5 && (
            <motion.circle
              key="head"
              cx="180"
              cy="105"
              r="15"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={springTransition}
              fill="rgba(255,255,255,0.02)"
            />
          )}
        </AnimatePresence>

        {/* Torso */}
        <AnimatePresence>
          {attemptsLeft <= 4 && (
            <motion.line
              key="torso"
              x1="180"
              y1="120"
              x2="180"
              y2="170"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>

        {/* Left Arm */}
        <AnimatePresence>
          {attemptsLeft <= 3 && (
            <motion.line
              key="l-arm"
              x1="180"
              y1="135"
              x2="155"
              y2="155"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>

        {/* Right Arm */}
        <AnimatePresence>
          {attemptsLeft <= 2 && (
            <motion.line
              key="r-arm"
              x1="180"
              y1="135"
              x2="205"
              y2="155"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>

        {/* Left Leg */}
        <AnimatePresence>
          {attemptsLeft <= 1 && (
            <motion.line
              key="l-leg"
              x1="180"
              y1="170"
              x2="160"
              y2="200"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>

        {/* Right Leg */}
        <AnimatePresence>
          {attemptsLeft <= 0 && (
            <motion.line
              key="r-leg"
              x1="180"
              y1="170"
              x2="200"
              y2="200"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={springTransition}
            />
          )}
        </AnimatePresence>
      </g>

      {/* Ambient environment arcs */}
      <path
        d="M60 250 Q160 220 260 250"
        stroke="rgba(255,255,255,0.02)"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}

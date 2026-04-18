import React from "react";

export default function HangmanHero({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      shapeRendering="geometricPrecision"
    >
      {/* Gallows Structure — Subtle ghost borders */}
      <g
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Base */}
        <line x1="60" y1="220" x2="160" y2="220" />
        {/* Post */}
        <line x1="80" y1="220" x2="80" y2="60" />
        {/* Beam */}
        <line x1="80" y1="60" x2="180" y2="60" />
        {/* Support */}
        <line x1="80" y1="90" x2="110" y2="60" />
        {/* Rope */}
        <line
          x1="180"
          y1="60"
          x2="180"
          y2="90"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
      </g>

      {/* The Hangman — Layered segments for performance-optimized opacity transitions */}
      <g stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round">
        {/* Head */}
        <circle
          cx="180"
          cy="105"
          r="15"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.15)"
        />
        {/* Body */}
        <line x1="180" y1="120" x2="180" y2="170" />
        {/* Arms */}
        <line x1="180" y1="135" x2="155" y2="155" />
        <line x1="180" y1="135" x2="205" y2="155" />
        {/* Legs */}
        <line x1="180" y1="170" x2="160" y2="200" />
        <line x1="180" y1="170" x2="200" y2="200" />
      </g>

      {/* Word Blanks — Dotted/Dashed baseline */}
      <g stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round">
        <line x1="210" y1="220" x2="225" y2="220" />
        <line x1="235" y1="220" x2="250" y2="220" />
        <line x1="260" y1="220" x2="275" y2="220" />
        <line x1="285" y1="220" x2="300" y2="220" />
      </g>

      {/* Ambient environment arcs */}
      <path
        d="M60 250 Q160 220 260 250"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M40 260 Q160 225 280 260"
        stroke="rgba(255,255,255,0.02)"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}

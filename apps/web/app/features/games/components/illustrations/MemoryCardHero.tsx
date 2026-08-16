import React from "react";

export default function MemoryCardHero({
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
    >
      {/* Outer Decorative Ring */}
      <circle
        cx="160"
        cy="140"
        r="110"
        stroke="rgba(255, 255, 255, 0.06)"
        strokeWidth="0.5"
        strokeDasharray="4 6"
        fill="none"
      />

      {/* Back Card (Face Down) - Tilted Left */}
      <g transform="translate(85, 60) rotate(-12, 60, 80)">
        <rect
          x="0"
          y="0"
          width="110"
          height="150"
          rx="12"
          fill="rgba(255, 255, 255, 0.03)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
        />
        {/* Inner Card Grid Pattern */}
        <rect
          x="10"
          y="10"
          width="90"
          height="130"
          rx="8"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
        />
        <circle
          cx="55"
          cy="75"
          r="22"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          fill="rgba(255, 255, 255, 0.04)"
        />
        <path
          d="M 55 60 L 67 75 L 55 90 L 43 75 Z"
          fill="rgba(255, 255, 255, 0.25)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1"
        />
      </g>

      {/* Front Card (Face Up - Matching Pair) - Tilted Right */}
      <g transform="translate(135, 75) rotate(10, 60, 80)">
        <rect
          x="0"
          y="0"
          width="110"
          height="150"
          rx="12"
          fill="rgba(255, 255, 255, 0.06)"
          stroke="rgba(255, 255, 255, 0.35)"
          strokeWidth="2"
        />
        <rect
          x="8"
          y="8"
          width="94"
          height="134"
          rx="8"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1"
          fill="none"
        />
        {/* Emblem Symbol (Star/Diamond Pair) */}
        <circle
          cx="55"
          cy="75"
          r="28"
          fill="rgba(255, 255, 255, 0.05)"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
        />
        <polygon
          points="55,54 62,70 79,75 62,80 55,96 48,80 31,75 48,70"
          fill="rgba(255, 255, 255, 0.7)"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth="1"
        />
      </g>

      {/* 3D Flip Arc Motion Line */}
      <path
        d="M 65 140 A 90 40 0 0 1 255 140"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        fill="none"
      />
      <polygon
        points="255,140 245,134 247,143"
        fill="rgba(255, 255, 255, 0.6)"
      />

      {/* Sparkles / Match Highlights */}
      <circle cx="85" cy="50" r="3" fill="rgba(255, 255, 255, 0.5)" />
      <circle cx="245" cy="65" r="2.5" fill="rgba(255, 255, 255, 0.6)" />
      <circle cx="260" cy="205" r="3" fill="rgba(255, 255, 255, 0.4)" />
    </svg>
  );
}

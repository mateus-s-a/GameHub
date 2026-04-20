import React from "react";

/**
 * Shared Hand Base logic for Rock, Paper, and Scissors.
 * Standardizes the wrist and palm for visual consistency.
 */
const HandBase = () => (
  <g shapeRendering="geometricPrecision">
    {/* Wrist */}
    <rect
      x="18"
      y="98"
      width="34"
      height="25"
      rx="5"
      fill="rgba(255,255,255,0.05)"
      stroke="rgba(255,255,255,0.12)"
      strokeWidth="1"
    />
    {/* Palm */}
    <rect
      x="10"
      y="55"
      width="50"
      height="50"
      rx="10"
      fill="rgba(255,255,255,0.08)"
      stroke="rgba(255,255,255,0.2)"
      strokeWidth="1.5"
    />
  </g>
);

export default function RockPaperScissorsHero({
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
      {/* Rock (Fist) — Left */}
      <g transform="translate(40, 75)">
        <HandBase />
        {/* Thumb — folded over */}
        <ellipse
          cx="12"
          cy="78"
          rx="8"
          ry="16"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          transform="rotate(-25 12 78)"
        />
        {/* Finger bumps (folded) */}
        <ellipse
          cx="25"
          cy="58"
          rx="11"
          ry="7"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />
        <ellipse
          cx="40"
          cy="55"
          rx="10"
          ry="8"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
        <ellipse
          cx="55"
          cy="58"
          rx="11"
          ry="7"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />
      </g>

      {/* Paper (Open Hand) — Center */}
      <g transform="translate(130, 75)">
        <HandBase />
        {/* Extended Fingers */}
        <rect
          x="14"
          y="5"
          width="10"
          height="60"
          rx="5"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
        <rect
          x="28"
          y="0"
          width="10"
          height="65"
          rx="5"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
        />
        <rect
          x="42"
          y="5"
          width="10"
          height="60"
          rx="5"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
        <rect
          x="54"
          y="15"
          width="9"
          height="50"
          rx="4.5"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />
        {/* Thumb (spread) */}
        <ellipse
          cx="5"
          cy="85"
          rx="8"
          ry="18"
          fill="rgba(255,255,255,0.07)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
          transform="rotate(-30 5 85)"
        />
      </g>

      {/* Scissors (V-Sign Hand) — Right */}
      <g transform="translate(220, 75)">
        <HandBase />
        {/* Index Finger — V sign leg 1 */}
        <rect
          x="18"
          y="-10"
          width="10"
          height="65"
          rx="5"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          transform="rotate(-15 18 55)"
        />
        {/* Middle Finger — V sign leg 2 */}
        <rect
          x="38"
          y="-10"
          width="10"
          height="65"
          rx="5"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          transform="rotate(15 48 55)"
        />
        {/* Folded fingers */}
        <ellipse
          cx="44"
          cy="72"
          rx="10"
          ry="7"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <ellipse
          cx="42"
          cy="88"
          rx="9"
          ry="6"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        {/* Thumb (folded across) */}
        <ellipse
          cx="22"
          cy="80"
          rx="7"
          ry="14"
          fill="rgba(255,255,255,0.1)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          transform="rotate(45 22 80)"
        />
      </g>

      {/* VS indicators — positioned between hands */}
      <g>
        <text
          x="110"
          y="165"
          fill="rgba(255,255,255,0.15)"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          style={{ letterSpacing: "0.1em" }}
        >
          VS
        </text>
        <text
          x="210"
          y="165"
          fill="rgba(255,255,255,0.15)"
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          style={{ letterSpacing: "0.1em" }}
        >
          VS
        </text>
      </g>

      {/* Decorative environment arcs */}
      <path
        d="M60 250 Q160 220 260 250"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M40 260 Q160 225 280 260"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}

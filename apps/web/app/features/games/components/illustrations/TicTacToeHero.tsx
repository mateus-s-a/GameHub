import React from "react";

export default function TicTacToeHero({
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
      {/* Grid Lines */}
      <line
        x1="130"
        y1="40"
        x2="130"
        y2="240"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="200"
        y1="40"
        x2="200"
        y2="240"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="70"
        y1="107"
        x2="260"
        y2="107"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="70"
        y1="173"
        x2="260"
        y2="173"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* X marks */}
      <g stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round">
        {/* Top-left X */}
        <line x1="85" y1="55" x2="115" y2="93" />
        <line x1="115" y1="55" x2="85" y2="93" />
        {/* Center X */}
        <line x1="150" y1="120" x2="180" y2="158" />
        <line x1="180" y1="120" x2="150" y2="158" />
        {/* Bottom-right X */}
        <line x1="215" y1="188" x2="245" y2="226" />
        <line x1="245" y1="188" x2="215" y2="226" />
      </g>

      {/* O marks */}
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="3" fill="none">
        {/* Top-right O */}
        <circle cx="230" cy="74" r="19" />
        {/* Middle-left O */}
        <circle cx="100" cy="140" r="19" />
        {/* Bottom-center O */}
        <circle cx="165" cy="207" r="19" />
      </g>

      {/* Decorative dice — bottom-left */}
      <g transform="translate(40, 230) rotate(-15)">
        <rect
          x="0"
          y="0"
          width="28"
          height="28"
          rx="5"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <circle cx="8" cy="8" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="20" cy="8" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="14" cy="14" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="8" cy="20" r="2" fill="rgba(255,255,255,0.4)" />
        <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.4)" />
      </g>

      {/* Decorative dice — top-right */}
      <g transform="translate(255, 25) rotate(20)">
        <rect
          x="0"
          y="0"
          width="22"
          height="22"
          rx="4"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
        <circle cx="7" cy="7" r="1.5" fill="rgba(255,255,255,0.3)" />
        <circle cx="15" cy="15" r="1.5" fill="rgba(255,255,255,0.3)" />
      </g>
    </svg>
  );
}

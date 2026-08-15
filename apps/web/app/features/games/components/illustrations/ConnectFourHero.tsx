import React from "react";

export default function ConnectFourHero({
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
      <defs>
        {/* Glow filter */}
        <filter id="c4-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Red Disc Gradient */}
        <linearGradient id="c4-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        {/* Yellow Disc Gradient */}
        <linearGradient id="c4-yellow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* Grid Stand Frame */}
      <rect
        x="45"
        y="45"
        width="230"
        height="190"
        rx="16"
        fill="rgba(30, 41, 59, 0.7)"
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth="2"
      />

      {/* Grid Slots (7 columns x 5 visible rows preview) */}
      {/* Column 0 */}
      <circle cx="75" cy="75" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="75" cy="105" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="75" cy="135" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="75" cy="165" r="11" fill="url(#c4-red)" />
      <circle cx="75" cy="195" r="11" fill="url(#c4-yellow)" />

      {/* Column 1 */}
      <circle cx="103" cy="75" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="103" cy="105" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="103" cy="135" r="11" fill="url(#c4-red)" />
      <circle cx="103" cy="165" r="11" fill="url(#c4-yellow)" />
      <circle cx="103" cy="195" r="11" fill="url(#c4-red)" />

      {/* Column 2 */}
      <circle cx="131" cy="75" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="131" cy="105" r="11" fill="url(#c4-red)" />
      <circle cx="131" cy="135" r="11" fill="url(#c4-yellow)" />
      <circle cx="131" cy="165" r="11" fill="url(#c4-red)" />
      <circle cx="131" cy="195" r="11" fill="url(#c4-yellow)" />

      {/* Column 3 */}
      <circle cx="160" cy="75" r="11" fill="url(#c4-red)" filter="url(#c4-glow)" />
      <circle cx="160" cy="105" r="11" fill="url(#c4-yellow)" />
      <circle cx="160" cy="135" r="11" fill="url(#c4-red)" />
      <circle cx="160" cy="165" r="11" fill="url(#c4-yellow)" />
      <circle cx="160" cy="195" r="11" fill="url(#c4-red)" />

      {/* Column 4 */}
      <circle cx="188" cy="75" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="188" cy="105" r="11" fill="url(#c4-yellow)" />
      <circle cx="188" cy="135" r="11" fill="url(#c4-yellow)" />
      <circle cx="188" cy="165" r="11" fill="url(#c4-red)" />
      <circle cx="188" cy="195" r="11" fill="url(#c4-yellow)" />

      {/* Column 5 */}
      <circle cx="216" cy="75" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="216" cy="105" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="216" cy="135" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="216" cy="165" r="11" fill="url(#c4-yellow)" />
      <circle cx="216" cy="195" r="11" fill="url(#c4-red)" />

      {/* Column 6 */}
      <circle cx="245" cy="75" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="245" cy="105" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="245" cy="135" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="245" cy="165" r="11" fill="rgba(15, 23, 42, 0.8)" stroke="rgba(255,255,255,0.06)" />
      <circle cx="245" cy="195" r="11" fill="url(#c4-yellow)" />

      {/* Connect 4 Diagonal Win Laser Line Highlight (RED discs at [75,165], [103,135], [131,105], [160,75]) */}
      <line
        x1="70"
        y1="170"
        x2="165"
        y2="70"
        stroke="#ef4444"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#c4-glow)"
      />

      {/* Stand legs */}
      <path
        d="M 35 245 L 65 235 L 75 245 Z"
        fill="rgba(30, 41, 59, 0.9)"
        stroke="rgba(255, 255, 255, 0.1)"
      />
      <path
        d="M 285 245 L 255 235 L 245 245 Z"
        fill="rgba(30, 41, 59, 0.9)"
        stroke="rgba(255, 255, 255, 0.1)"
      />
    </svg>
  );
}

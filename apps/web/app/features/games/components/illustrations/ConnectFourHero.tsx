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
      {/* Outer Grid Stand Frame */}
      <rect
        x="45"
        y="45"
        width="230"
        height="190"
        rx="16"
        fill="rgba(255, 255, 255, 0.03)"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="2"
      />

      {/* Grid Slot Cells (7 columns x 5 visible rows preview) */}
      {/* Row 1 */}
      <circle cx="75" cy="75" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="103" cy="75" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="131" cy="75" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="160" cy="75" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="188" cy="75" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="216" cy="75" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="245" cy="75" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

      {/* Row 2 */}
      <circle cx="75" cy="105" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="103" cy="105" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="131" cy="105" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="160" cy="105" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="188" cy="105" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="216" cy="105" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="245" cy="105" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

      {/* Row 3 */}
      <circle cx="75" cy="135" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="103" cy="135" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="131" cy="135" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="160" cy="135" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="188" cy="135" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="216" cy="135" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
      <circle cx="245" cy="135" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

      {/* Row 4 */}
      <circle cx="75" cy="165" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="103" cy="165" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="131" cy="165" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="160" cy="165" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="188" cy="165" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="216" cy="165" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="245" cy="165" r="11" fill="rgba(255, 255, 255, 0.02)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

      {/* Row 5 (Bottom) */}
      <circle cx="75" cy="195" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="103" cy="195" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="131" cy="195" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="160" cy="195" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="188" cy="195" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />
      <circle cx="216" cy="195" r="11" fill="rgba(255, 255, 255, 0.65)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" />
      <circle cx="245" cy="195" r="11" fill="rgba(255, 255, 255, 0.35)" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1.5" />

      {/* Connect 4 Diagonal Win Stroke Line Highlight ([75,165], [103,135], [131,105], [160,75]) */}
      <line
        x1="70"
        y1="170"
        x2="165"
        y2="70"
        stroke="rgba(255, 255, 255, 0.8)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Outer Decorative Ring around the board */}
      <rect
        x="35"
        y="35"
        width="250"
        height="210"
        rx="22"
        stroke="rgba(255, 255, 255, 0.06)"
        strokeWidth="0.5"
        strokeDasharray="4 6"
        fill="none"
      />

      {/* Stand Base Legs */}
      <path
        d="M 35 245 L 65 235 L 75 245 Z"
        fill="rgba(255, 255, 255, 0.08)"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />
      <path
        d="M 285 245 L 255 235 L 245 245 Z"
        fill="rgba(255, 255, 255, 0.08)"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1"
      />
    </svg>
  );
}

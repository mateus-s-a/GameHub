import React from "react";

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
      {/* Rock (Fist) — left */}
      <g transform="translate(40, 80)">
        {/* Wrist */}
        <rect x="20" y="90" width="40" height="30" rx="6" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        {/* Palm */}
        <rect x="12" y="40" width="56" height="55" rx="12" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        {/* Finger bumps */}
        <ellipse cx="25" cy="42" rx="12" ry="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <ellipse cx="40" cy="38" rx="10" ry="9" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <ellipse cx="55" cy="42" rx="12" ry="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        {/* Thumb */}
        <ellipse cx="10" cy="65" rx="8" ry="14" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" transform="rotate(-15 10 65)" />
      </g>

      {/* Paper (Open hand) — center */}
      <g transform="translate(130, 60)">
        {/* Palm */}
        <rect x="8" y="65" width="50" height="50" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        {/* Fingers */}
        <rect x="12" y="15" width="10" height="55" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <rect x="26" y="8" width="10" height="62" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <rect x="40" y="15" width="10" height="55" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        {/* Pinky */}
        <rect x="52" y="28" width="9" height="42" rx="4.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        {/* Thumb */}
        <ellipse cx="5" cy="80" rx="8" ry="18" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" transform="rotate(-25 5 80)" />
        {/* Wrist */}
        <rect x="16" y="112" width="34" height="25" rx="5" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </g>

      {/* Scissors — right */}
      <g transform="translate(220, 75)">
        {/* Handle ring 1 */}
        <ellipse cx="35" cy="100" rx="16" ry="14" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {/* Handle ring 2 */}
        <ellipse cx="55" cy="108" rx="14" ry="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {/* Pivot */}
        <circle cx="45" cy="75" r="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        {/* Blade 1 */}
        <line x1="45" y1="75" x2="20" y2="15" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Blade 2 */}
        <line x1="45" y1="75" x2="65" y2="15" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Connection lines to handles */}
        <line x1="35" y1="87" x2="45" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <line x1="55" y1="96" x2="45" y2="75" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
      </g>

      {/* VS indicators */}
      <g>
        <text x="120" y="170" fill="rgba(255,255,255,0.12)" fontSize="14" fontWeight="bold" textAnchor="middle">VS</text>
        <text x="215" y="170" fill="rgba(255,255,255,0.12)" fontSize="14" fontWeight="bold" textAnchor="middle">VS</text>
      </g>

      {/* Decorative arcs */}
      <path d="M60 250 Q160 220 260 250" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none" />
      <path d="M40 260 Q160 225 280 260" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" fill="none" />
    </svg>
  );
}

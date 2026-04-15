import React from "react";

export default function GuessTheFlagHero({
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
      {/* Globe */}
      <circle cx="160" cy="130" r="80" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="rgba(255,255,255,0.03)" />
      {/* Latitude lines */}
      <ellipse cx="160" cy="130" rx="80" ry="30" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <ellipse cx="160" cy="130" rx="80" ry="55" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {/* Longitude lines */}
      <ellipse cx="160" cy="130" rx="30" ry="80" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      <ellipse cx="160" cy="130" rx="55" ry="80" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {/* Equator */}
      <line x1="80" y1="130" x2="240" y2="130" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* Prime meridian */}
      <line x1="160" y1="50" x2="160" y2="210" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      {/* Continent blobs (abstract shapes) */}
      <path
        d="M130 95 Q140 85 155 90 Q160 95 155 105 Q150 110 140 108 Q130 105 130 95Z"
        fill="rgba(255,255,255,0.12)"
      />
      <path
        d="M170 110 Q185 105 195 115 Q200 125 190 135 Q180 138 172 130 Q165 120 170 110Z"
        fill="rgba(255,255,255,0.1)"
      />
      <path
        d="M125 130 Q135 125 145 132 Q148 140 140 148 Q130 150 122 142 Q120 135 125 130Z"
        fill="rgba(255,255,255,0.08)"
      />

      {/* Compass — bottom-right */}
      <g transform="translate(230, 190)">
        <circle cx="30" cy="30" r="28" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)" />
        <circle cx="30" cy="30" r="22" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" fill="none" />
        {/* N-S needle */}
        <polygon points="30,8 27,30 30,26 33,30" fill="rgba(255,255,255,0.6)" />
        <polygon points="30,52 27,30 30,34 33,30" fill="rgba(255,255,255,0.2)" />
        {/* E-W marks */}
        <line x1="8" y1="30" x2="14" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <line x1="46" y1="30" x2="52" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        {/* N label */}
        <text x="30" y="7" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontWeight="bold">N</text>
        {/* Center dot */}
        <circle cx="30" cy="30" r="2" fill="rgba(255,255,255,0.5)" />
      </g>

      {/* Flag pin markers */}
      <g>
        {/* Pin 1 */}
        <line x1="135" y1="100" x2="135" y2="82" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <rect x="135" y="76" width="12" height="8" rx="1" fill="rgba(255,255,255,0.3)" />
        {/* Pin 2 */}
        <line x1="185" y1="120" x2="185" y2="102" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <rect x="185" y="96" width="12" height="8" rx="1" fill="rgba(255,255,255,0.25)" />
        {/* Pin 3 */}
        <line x1="150" y1="150" x2="150" y2="132" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <rect x="150" y="126" width="12" height="8" rx="1" fill="rgba(255,255,255,0.2)" />
      </g>

      {/* Decorative ring around globe */}
      <circle cx="160" cy="130" r="90" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none" strokeDasharray="4 6" />
    </svg>
  );
}

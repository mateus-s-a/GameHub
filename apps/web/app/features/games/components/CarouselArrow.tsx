"use client";

import React from "react";
import { GhostButton } from "@repo/ui/ghost-button";

interface CarouselArrowProps {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
}

export default function CarouselArrow({
  direction,
  onClick,
  disabled = false,
}: CarouselArrowProps) {
  const isNext = direction === "next";

  return (
    <GhostButton
      onClick={onClick}
      disabled={disabled}
      ariaLabel={isNext ? "Next game" : "Previous game"}
      className="group w-12 h-12 md:w-14 md:h-14"
      dragListener={false}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <path
          d={isNext ? "M9 6L15 12L9 18" : "M15 6L9 12L15 18"}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </GhostButton>
  );
}

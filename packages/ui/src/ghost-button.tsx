"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GhostButtonProps extends HTMLMotionProps<"button"> {
  ariaLabel: string;
}

export const GhostButton = React.forwardRef<
  HTMLButtonElement,
  GhostButtonProps
>(({ children, ariaLabel, className = "", ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      aria-label={ariaLabel}
      className={`
          relative flex items-center justify-center
          min-w-[44px] min-h-[44px] rounded-full
          bg-white/5 border border-white/10 backdrop-blur-md
          text-white/40 transition-colors duration-200
          hover:bg-white/10 hover:text-white/80 hover:border-white/20
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30
          disabled:opacity-20 disabled:pointer-events-none
          ${className}
        `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      {children}
    </motion.button>
  );
});

GhostButton.displayName = "GhostButton";

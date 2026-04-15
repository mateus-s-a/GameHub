"use client";

import React from "react";
import { motion } from "framer-motion";

interface CarouselDotsProps {
  total: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
}

export default function CarouselDots({
  total,
  activeIndex,
  onDotClick,
}: CarouselDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.button
          key={i}
          onClick={() => onDotClick(i)}
          className="relative cursor-pointer bg-transparent border-none outline-none p-1"
          aria-label={`Go to game ${i + 1}`}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            className="rounded-full"
            animate={{
              width: i === activeIndex ? 32 : 6,
              height: 6,
              backgroundColor:
                i === activeIndex
                  ? "rgba(255, 255, 255, 0.8)"
                  : "rgba(255, 255, 255, 0.15)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        </motion.button>
      ))}
    </div>
  );
}

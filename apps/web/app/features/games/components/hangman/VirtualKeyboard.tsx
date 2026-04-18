import React, { useCallback } from "react";
import { motion } from "framer-motion";

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  guessedLetters: string[];
  disabled?: boolean;
}

export default function VirtualKeyboard({
  onKeyPress,
  guessedLetters,
  disabled = false,
}: VirtualKeyboardProps) {
  // EVENT DELEGATION: Single click handler for the entire keyboard
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      const target = e.target as HTMLElement;
      const button = target.closest("button");
      if (!button) return;

      const key = button.getAttribute("data-key");
      if (key && !guessedLetters.includes(key)) {
        onKeyPress(key);
      }
    },
    [onKeyPress, guessedLetters, disabled],
  );

  return (
    <div
      className="flex flex-col gap-2 md:gap-3 items-center"
      onClick={handleClick}
    >
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-2 md:gap-3">
          {row.map((key) => {
            const isGuessed = guessedLetters.includes(key);
            return (
              <motion.button
                key={key}
                data-key={key}
                whileHover={
                  !isGuessed && !disabled ? { scale: 1.1, y: -2 } : {}
                }
                whileTap={!isGuessed && !disabled ? { scale: 0.95 } : {}}
                disabled={isGuessed || disabled}
                className={`
                  w-8 h-10 md:w-12 md:h-14 rounded-lg md:rounded-xl font-iosevka-bold text-sm md:text-lg transition-all duration-300
                  flex items-center justify-center border
                  ${
                    isGuessed
                      ? "bg-white/5 border-white/5 text-white/10"
                      : "bg-white/[0.03] border-white/10 text-white/60 hover:border-white/20 hover:text-white"
                  }
                  ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                `}
                style={{
                  boxShadow:
                    !isGuessed && !disabled
                      ? "0 4px 12px rgba(0,0,0,0.2)"
                      : "none",
                }}
              >
                {key}
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

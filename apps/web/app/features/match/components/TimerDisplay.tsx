import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export interface TimerDisplayProps {
  turnEndTime: number | null;
  size?: "sm" | "md" | "lg";
}

export default function TimerDisplay({
  turnEndTime,
  size = "md",
}: TimerDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!turnEndTime) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((turnEndTime - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    // Initial check
    setTimeLeft(Math.max(0, Math.ceil((turnEndTime - Date.now()) / 1000)));

    return () => clearInterval(interval);
  }, [turnEndTime]);

  if (timeLeft === null) return null;

  const isWarning = timeLeft <= 5;

  const sizeClasses = {
    sm: "px-3 py-1 text-sm border gap-1.5",
    md: "px-4 py-1.5 text-base md:text-lg border gap-2",
    lg: "px-6 py-2.5 text-xl md:text-2xl border-2 gap-2.5",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      className={`rounded-full font-iosevka-bold shadow-lg w-fit mx-auto transition-colors duration-300 flex items-center justify-center ${sizeClasses[size]} ${
        isWarning
          ? "bg-red-950/80 border-red-500/80 text-red-200 animate-pulse shadow-red-900/40"
          : "bg-[#181818] border-white/10 text-cyan-300 shadow-black/50"
      }`}
    >
      <Clock className={iconSizes[size]} /> <span>{timeLeft}s</span>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function TimerDisplay({
  turnEndTime,
}: {
  turnEndTime: number | null;
}) {
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

  return (
    <div
      className={`mt-4 px-6 py-3 rounded-full font-bold text-2xl shadow-lg border-2 font-iosevka-bold w-fit mx-auto transition-colors duration-300 flex items-center justify-center gap-2 ${isWarning ? "bg-red-900 border-red-500 text-red-200 animate-pulse" : "bg-gray-800 border-gray-600 text-blue-300"}`}
    >
      <Clock className="w-6 h-6" /> {timeLeft}s
    </div>
  );
}

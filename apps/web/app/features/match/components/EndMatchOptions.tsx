import React from "react";

interface EndMatchOptionsProps {
  rematchRequested: boolean;
  opponentLeft: boolean;
  hasOpponentRequested: boolean;
  onRequestRematch: () => void;
  onPlayAgain: () => void;
  primaryColorGradient?: string;
  primaryColorHover?: string;
}

export default function EndMatchOptions({
  rematchRequested,
  opponentLeft,
  hasOpponentRequested,
  onRequestRematch,
  onPlayAgain,
  primaryColorGradient = "from-blue-600 to-indigo-600",
  primaryColorHover = "hover:from-blue-500 hover:to-indigo-500",
}: EndMatchOptionsProps) {
  const getRematchText = () => {
    if (opponentLeft) return "Opponent Left";
    if (rematchRequested) return "Waiting for Opponent...";
    if (hasOpponentRequested) return "Accept Rematch";
    return "Request Rematch";
  };

  const isRematchDisabled = rematchRequested || opponentLeft;

  return (
    <div className="w-full flex flex-col gap-3 mt-6">
      <button
        onClick={onRequestRematch}
        disabled={isRematchDisabled}
        className={`w-full py-3 rounded-xl font-bold text-lg shadow-lg transition-all ${
          isRematchDisabled
            ? "bg-gray-700 text-gray-400 cursor-not-allowed border outline-none border-gray-600"
            : `bg-gradient-to-r ${primaryColorGradient} ${primaryColorHover} hover:shadow-xl active:scale-95 text-white`
        }`}
      >
        {getRematchText()}
      </button>
      <button
        onClick={onPlayAgain}
        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
      >
        Play New Opponent
      </button>
    </div>
  );
}

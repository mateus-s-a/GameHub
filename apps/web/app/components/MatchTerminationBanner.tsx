import React from "react";
import { AlertTriangle, LogOut } from "lucide-react";

interface MatchTerminationBannerProps {
  countdown: number;
}

export default function MatchTerminationBanner({
  countdown,
}: MatchTerminationBannerProps) {
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 animate-in slide-in-from-top duration-500">
      <div className="bg-gray-900/90 backdrop-blur-md border-b-4 border-orange-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(249,115,22,0.3)] flex items-center gap-6 overflow-hidden relative group">
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-red-500/10 animate-pulse" />
        
        {/* Warning Icon Container */}
        <div className="relative w-16 h-16 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-400 shrink-0 border border-orange-500/30">
          <AlertTriangle className="w-8 h-8 animate-bounce" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-ping" />
        </div>

        {/* Text Content */}
        <div className="flex-1 space-y-1 relative z-10">
          <h3 className="text-xl font-iosevka-bold text-white tracking-wide">
            Connection Lost
          </h3>
          <p className="text-gray-400 font-iosevka-regular text-sm leading-tight">
            Opponent left the room. Match terminated.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-orange-400 font-iosevka-medium text-sm">
              Leaving match in <span className="text-white text-lg font-iosevka-bold mx-1">{countdown}s</span>
            </span>
          </div>
        </div>

        {/* Exit Icon decoration */}
        <div className="w-12 h-12 flex items-center justify-center text-gray-700 opacity-30">
          <LogOut className="w-10 h-10 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </div>
      </div>
    </div>
  );
}

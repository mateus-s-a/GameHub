"use client";

import React from "react";
import { useSocket } from "../../providers/SocketProvider";

export default function LatencyIndicator() {
  const { latency, isConnected } = useSocket();

  const getLatencyColor = () => {
    if (!isConnected || latency === null) return "bg-red-500 shadow-red-500/50";
    if (latency < 60) return "bg-emerald-500 shadow-emerald-500/50";
    if (latency < 150) return "bg-amber-500 shadow-amber-500/50";
    return "bg-rose-500 shadow-rose-500/50";
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10 text-xs font-iosevka-medium text-gray-300 shadow-2xl select-none">
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getLatencyColor()}`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${getLatencyColor()}`}
        />
      </span>

      <span>
        {isConnected && latency !== null ? `${latency} ms` : "OFFLINE"}
      </span>
    </div>
  );
}

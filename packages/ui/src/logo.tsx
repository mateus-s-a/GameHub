import React from "react";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-iosevka-bold rounded-lg text-lg">
        G
      </div>
      <div className="w-8 h-8 bg-white/20 text-white flex items-center justify-center font-iosevka-bold rounded-lg text-lg backdrop-blur-sm -ml-4">
        H
      </div>
      <span className="ml-2 text-xl font-iosevka-bold tracking-tight text-white uppercase">
        GameHub
      </span>
    </div>
  );
};

import React from "react";
import Link from "next/link";

export const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 group transition-opacity hover:opacity-80 active:scale-95 ${className}`}
    >
      <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-iosevka-bold rounded-lg text-lg">
        G
      </div>
      <div className="w-8 h-8 bg-white/20 text-white flex items-center justify-center font-iosevka-bold rounded-lg text-lg backdrop-blur-sm -ml-4">
        H
      </div>
      <span className="ml-2 text-xl font-iosevka-bold tracking-tight text-white uppercase group-hover:text-white/90">
        GameHub
      </span>
    </Link>
  );
};

import React from "react";

export default function VersionTag() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-8 md:left-8 md:translate-x-0 z-40 pointer-events-none">
      <span className="text-[10px] md:text-[11px] text-white/10 md:text-white/20 font-iosevka-regular tracking-widest uppercase">
        v0.6.0
      </span>
    </div>
  );
}

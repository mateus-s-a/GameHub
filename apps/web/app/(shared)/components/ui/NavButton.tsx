import React from "react";
import { ArrowLeft, LucideIcon } from "lucide-react";

export interface NavButtonProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  className?: string;
}

export default function NavButton({
  label,
  onClick,
  icon: Icon = ArrowLeft,
  className = "",
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222222] text-white 
        font-iosevka-bold rounded-lg border border-[#333333] transition-all active:scale-95 text-xs group ${className}`}
    >
      <Icon
        size={14}
        className="group-hover:-translate-x-1 transition-transform"
      />{" "}
      {label}
    </button>
  );
}

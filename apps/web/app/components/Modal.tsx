import React, { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  className = "",
  maxWidth = "max-w-md",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={`bg-gray-800 border-2 border-gray-700/60 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full ${maxWidth} relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

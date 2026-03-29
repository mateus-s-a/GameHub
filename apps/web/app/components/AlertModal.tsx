import React from "react";
import { AlertCircle } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
}

export default function AlertModal({
  isOpen,
  title = "Notice",
  message,
  onConfirm,
  confirmText = "Okay",
}: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-gray-800 border-2 border-gray-700/50 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 flex flex-col items-center text-center space-y-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mb-2">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-iosevka-bold text-white tracking-wide">
          {title}
        </h2>

        <p className="text-gray-400 font-iosevka-regular text-sm px-2 leading-relaxed pb-4">
          {message}
        </p>

        <button
          onClick={onConfirm}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-iosevka-bold rounded-xl shadow-lg transition-all active:scale-95 border border-red-500/50"
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}

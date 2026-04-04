import React from "react";
import { AlertCircle } from "lucide-react";
import Modal from "./Modal";

interface AlertModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  countdown?: number | null;
}

export default function AlertModal({
  isOpen,
  title = "Notice",
  message,
  onConfirm,
  confirmText = "Okay",
  countdown,
}: AlertModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onConfirm} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 mb-2 shadow-inner ring-4 ring-red-500/10">
          <AlertCircle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-iosevka-bold text-white tracking-wider mb-2">
            {title}
          </h2>
          <p className="text-gray-400 font-iosevka-regular text-sm px-4 leading-relaxed">
            {message}
          </p>
        </div>

        {countdown !== undefined && countdown !== null && (
          <div className="bg-gray-950/50 px-6 py-3 rounded-2xl border border-gray-700/50 animate-pulse">
            <p className="text-orange-400 font-iosevka-medium text-sm">
              Leaving match in {countdown}s...
            </p>
          </div>
        )}

        <button
          onClick={onConfirm}
          className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-iosevka-bold rounded-2xl shadow-xl transition-all active:scale-95 border border-red-500/40"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}

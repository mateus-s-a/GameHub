import React from "react";
import { HelpCircle } from "lucide-react";
import Modal from "./Modal";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  themeColor?: "red" | "emerald" | "blue" | "orange" | "purple" | "cyan";
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  themeColor = "red",
}: ConfirmModalProps) {
  const themes = {
    red: "from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-red-500/40 text-red-400 font-iosevka-bold",
    emerald: "from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border-emerald-500/40 text-emerald-400 font-iosevka-bold",
    blue: "from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-500/40 text-blue-400 font-iosevka-bold",
    orange: "from-orange-600 to-orange-700 hover:from-orange-400 hover:to-orange-500 border-orange-500/40 text-orange-400 font-iosevka-bold",
    purple: "from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-500/40 text-purple-400 font-iosevka-bold",
    cyan: "from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 border-cyan-500/40 text-cyan-400 font-iosevka-bold",
  };

  const theme = themes[themeColor];

  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className={`w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center ${theme.split(" ")[2]} mb-2 shadow-inner ring-4 ring-gray-700/50`}>
          <HelpCircle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-iosevka-bold text-white tracking-wider mb-2">
            {title}
          </h2>
          <p className="text-gray-400 font-iosevka-regular text-sm px-4 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex w-full gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-iosevka-bold rounded-2xl shadow-lg transition-all active:scale-95 border border-gray-600/50 hover:border-gray-500"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 bg-gradient-to-r rounded-2xl shadow-xl transition-all active:scale-95 border ${theme}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

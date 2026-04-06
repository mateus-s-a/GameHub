"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Check, X } from "lucide-react";
import { useSocket } from "../../providers/SocketProvider";

export default function UserProfile() {
  const { playerName, updatePlayerName, isLocked } = useSocket();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(playerName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(playerName);
  }, [playerName]);

  const handleStartEdit = () => {
    if (isLocked) return;
    setIsEditing(true);
    // Focus after animation
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditValue(playerName);
  };

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (editValue.trim() && editValue.trim() !== playerName) {
      updatePlayerName(editValue.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <motion.div
        layout
        initial={false}
        onClick={!isEditing ? handleStartEdit : undefined}
        className={`
          flex items-center gap-3 p-2 pl-2 pr-4 rounded-full
          bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10
          shadow-2xl transition-colors cursor-pointer
          ${isLocked ? "opacity-40 grayscale pointer-events-none" : "hover:bg-[#222222]/90"}
          ${isEditing ? "ring-2 ring-orange-500/50 border-orange-500/50" : ""}
        `}
      >
        {/* Avatar Icon */}
        <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 border border-white/5">
          <User className="w-5 h-5" />
        </div>

        {/* Name Input/Text */}
        <div className="flex flex-col min-w-[120px]">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel(e as any);
              }}
              className="bg-transparent border-none outline-none text-white font-iosevka-bold text-sm tracking-widest w-full"
              maxLength={15}
            />
          ) : (
            <span className="text-white font-iosevka-bold text-sm tracking-widest truncate max-w-[150px]">
              {playerName}
            </span>
          )}
        </div>

        {/* Actions */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1"
            >
              <button
                onClick={handleCancel}
                className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                className="p-1 hover:text-green-400 text-gray-500 transition-colors"
                title="Save Name"
              >
                <Check className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Busy Tooltip */}
      {isLocked && (
        <div className="absolute -top-10 right-0 whitespace-nowrap bg-black/60 text-gray-400 text-[10px] px-3 py-1 rounded-full font-iosevka-medium border border-white/5">
          NAME LOCKED DURING MATCH
        </div>
      )}
    </div>
  );
}

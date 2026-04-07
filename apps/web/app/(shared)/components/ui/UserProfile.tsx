"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Check, X, ChevronLeft } from "lucide-react";
import { useSocket } from "../../providers/SocketProvider";

export default function UserProfile() {
  const {
    playerName,
    updatePlayerName,
    isLocked,
    isProfileExpanded,
    setIsProfileExpanded,
  } = useSocket();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(playerName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(playerName);
  }, [playerName]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked || !isProfileExpanded) return;
    setIsEditing(true);
    // Focus after animation
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCancel = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditValue(playerName);
  };

  const handleSave = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (editValue.trim() && editValue.trim() !== playerName) {
      updatePlayerName(editValue.trim());
    }
    setIsEditing(false);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProfileExpanded(!isProfileExpanded);
    if (isEditing) handleCancel();
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-2">
      <motion.div
        layout
        initial={false}
        onClick={!isEditing && isProfileExpanded ? handleStartEdit : undefined}
        className={`
          flex items-center gap-3 p-2 rounded-full
          bg-[#1a1a1a]/80 backdrop-blur-md border border-white/10
          shadow-2xl transition-all duration-300
          ${isLocked ? "opacity-60 grayscale cursor-default" : isProfileExpanded && !isEditing ? "hover:bg-[#222222]/90 cursor-pointer" : "cursor-default"}
          ${isEditing ? "ring-2 ring-orange-500/50 border-orange-500/50 pr-4" : isProfileExpanded ? "pr-4" : "pr-2"}
        `}
      >
        {/* Toggle Arrow */}
        <motion.button
          onClick={toggleExpand}
          className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400"
          animate={{ rotate: isProfileExpanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        {/* Separator if expanded */}
        <AnimatePresence>
          {isProfileExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-[1px] h-4 bg-white/10 ml-1" />

              {/* Avatar Icon */}
              <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 border border-white/5 shrink-0">
                <User className="w-4 h-4" />
              </div>

              {/* Name Input/Text */}
              <div className="flex flex-col min-w-[100px]">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel(e);
                    }}
                    className="bg-transparent border-none outline-none text-white font-iosevka-bold text-sm tracking-widest w-full"
                    maxLength={15}
                  />
                ) : (
                  <span className="text-white font-iosevka-bold text-sm tracking-widest truncate max-w-[120px]">
                    {playerName}
                  </span>
                )}
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                  <button
                    onClick={handleCancel}
                    className="p-1 hover:text-red-400 text-gray-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSave}
                    className="p-1 hover:text-green-400 text-gray-500 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Busy Tooltip */}
      <AnimatePresence>
        {isLocked && isProfileExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-10 right-0 whitespace-nowrap bg-black/60 text-gray-400 text-[10px] px-3 py-1 rounded-full font-iosevka-medium border border-white/5"
          >
            NAME LOCKED DURING MATCH
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

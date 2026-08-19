"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Check, X, ChevronLeft, Edit } from "lucide-react";
import { useSocket } from "../../providers/SocketProvider";
import LatencyIndicator from "./LatencyIndicator";

export default function UserProfile() {
  const {
    playerName,
    updatePlayerName,
    isLocked,
    isProfileExpanded,
    setIsProfileExpanded,
    isFirstVisit,
    dismissFirstVisitNotice,
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

    if (isFirstVisit) {
      dismissFirstVisitNotice();
    }

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
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex items-center gap-2">
      <LatencyIndicator />
      {/* First-Time User Onboarding Tooltip Banner */}
      <AnimatePresence>
        {isFirstVisit && isProfileExpanded && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: [0, -4, 0], scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{
              y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
            }}
            onClick={handleStartEdit}
            className="absolute bottom-full mb-3 right-0 cursor-pointer bg-[#1a1a1a]/95 backdrop-blur-md border border-orange-500/50 text-orange-200 text-xs px-3.5 py-2 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.25)] font-iosevka-medium flex items-center gap-2 whitespace-nowrap select-none z-10"
          >
            <Edit className="w-4 h-4 text-orange-400 shrink-0 animate-pulse" />
            <span>Change your nickname here.</span>
            {/* Arrow pointing down */}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-[#1a1a1a] border-r border-b border-orange-500/50 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

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
            className="absolute bottom-full mb-3 right-0 whitespace-nowrap bg-black/60 text-gray-400 text-[10px] px-3 py-1 rounded-full font-iosevka-medium border border-white/5"
          >
            NAME LOCKED DURING MATCH
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

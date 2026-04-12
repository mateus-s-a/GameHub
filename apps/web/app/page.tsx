"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FloatingBackground from "./components/ui/FloatingBackground";

export default function LandingPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      {/* Floating 3D Background */}
      <FloatingBackground />

      {/* Top-Left Brand Mark */}
      <motion.div
        className="absolute top-8 left-8 z-10 flex items-center gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <span className="text-xl font-iosevka-bold text-white tracking-tight">
          GH
        </span>
        <span className="text-xs font-iosevka-regular text-[var(--muted)] tracking-[0.3em] uppercase">
          GAMEHUB
        </span>
      </motion.div>

      {/* Center Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      >
        {/* Title */}
        <h1 className="text-[80px] md:text-[120px] lg:text-[140px] font-iosevka-light tracking-tight text-white leading-none mb-8 select-none">
          GameHub
        </h1>

        {/* PLAY Button Area */}
        <div className="flex flex-col items-center gap-0">
          {/* Divider Line */}
          <motion.div
            className="w-48 h-[1px] bg-white/20 mb-6"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          />

          {/* PLAY Button */}
          <Link href="/games">
            <motion.button
              className="px-12 py-3 text-sm font-iosevka-regular text-white/80 tracking-[0.4em] uppercase cursor-pointer bg-transparent border-none relative group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              {/* Hover glow */}
              <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-lg transition-all duration-300" />
              <span className="relative">PLAY</span>
            </motion.button>
          </Link>

          {/* Bottom accent line */}
          <motion.div
            className="w-32 h-[1px] bg-white/10 mt-6"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 1.1 }}
          />
        </div>
      </motion.div>
    </div>
  );
}

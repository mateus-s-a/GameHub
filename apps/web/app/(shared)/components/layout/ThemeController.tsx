"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const THEMES: Record<string, { bg: string; glow: string }> = {
  home: {
    bg: "#0e0e10",
    glow: "rgba(255, 255, 255, 0.04)",
  },
  ttt: {
    bg: "#0a1218",
    glow: "rgba(34, 211, 238, 0.08)",
  },
  gtf: {
    bg: "#0a140e",
    glow: "rgba(16, 185, 129, 0.08)",
  },
  rps: {
    bg: "#110a18",
    glow: "rgba(168, 85, 247, 0.08)",
  },
};

export default function ThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    let themeKey = "home";

    if (pathname.includes("tic-tac-toe")) themeKey = "ttt";
    else if (pathname.includes("guess-the-flag")) themeKey = "gtf";
    else if (pathname.includes("rock-paper-scissors")) themeKey = "rps";

    const theme = THEMES[themeKey]!;
    const html = document.documentElement;

    // Apply directly to <html> — nothing can sit behind this
    html.style.backgroundColor = theme.bg;
    html.style.transition = "background-color 2s ease-in-out";

    // Update glow variable for the atmosphere overlay
    html.style.setProperty("--theme-glow", theme.glow);
  }, [pathname]);

  return null;
}

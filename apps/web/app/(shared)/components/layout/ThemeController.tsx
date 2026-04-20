"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GAME_THEMES, GameId, getGameBySlug } from "@gamehub/core";

export default function ThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    // Derive slug from path: /games/[slug]
    const match = pathname.match(/\/games\/([^\/]+)/);
    const slug = match ? match[1] : null;

    // Resolve slug to GameId
    const game = slug ? getGameBySlug(slug) : null;
    const theme = game ? GAME_THEMES[game.id] : null;
    const html = document.documentElement;

    if (theme) {
      // Apply centralized theme properties
      html.setAttribute("data-theme", theme.id);
      html.style.backgroundColor = theme.colors.background;
      html.style.setProperty("--theme-glow", theme.colors.glow);
      html.style.setProperty("--theme-accent", theme.colors.accent);
    } else {
      // Default / Home theme
      html.removeAttribute("data-theme");
      html.style.backgroundColor = "#0e0e10";
      html.style.setProperty("--theme-glow", "rgba(255, 255, 255, 0.04)");
      html.style.setProperty("--theme-accent", "#ffffff");
    }

    html.style.transition = "background-color 2s ease-in-out";
  }, [pathname]);

  return null;
}

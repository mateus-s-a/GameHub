import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "iosevka-light": ["Iosevka Charon Mono", "monospace"],
        "iosevka-regular": ["Iosevka Charon Mono", "monospace"],
        "iosevka-medium": ["Iosevka Charon Mono", "monospace"],
        "iosevka-bold": ["Iosevka Charon Mono", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;

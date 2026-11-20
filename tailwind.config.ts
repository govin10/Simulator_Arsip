import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#fdf2f7", 100: "#fbe3ee", 200: "#f6c9dc", 500: "#d6709e", 600: "#b84a7c", 700: "#9c3a67", 800: "#7f2f54", 900: "#5a2340" },
        blush: "#fdf6f9",
              },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;

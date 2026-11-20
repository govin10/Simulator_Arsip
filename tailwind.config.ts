import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#fdf2f7", 100: "#fbe3ee", 200: "#f6c9dc", 300: "#efa6c4", 400: "#e488b0", 500: "#d6709e", 600: "#b84a7c", 700: "#9c3a67", 800: "#7f2f54", 900: "#5a2340" },
        blush: "#fdf6f9",
        // lemari arsip logam (abu-abu bernuansa pink)
        kayu: { 100: "#f4eff2", 300: "#d9cfd5", 500: "#7f717a", 700: "#433a42" },
              },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;

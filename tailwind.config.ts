import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef6f3", 100: "#d5e9e1", 500: "#2f7a62", 600: "#256552", 700: "#1d5142", 900: "#10302a" },
        kayu: { 100: "#f3e8d6", 300: "#d9b98a", 500: "#a87a45", 700: "#6e4c26" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1E4D",
          dark: "#16336E",
        },
        orange: {
          DEFAULT: "#F2841C",
          dark: "#E0630A",
        },
        teal: "#0E9C90",
        purple: "#6D28D9",
        bg: "#FAF8F3",
        ink: "#151933",
        "ink-soft": "#565B78",
        line: "#E7E2D6",
      },
      fontFamily: {
        display: ["var(--font-display)", "Tajawal", "Poppins", "sans-serif"],
        body: ["var(--font-body)", "IBM Plex Sans Arabic", "Inter", "sans-serif"],
      },
      borderRadius: {
        wow: "18px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          yellow: "#F5C400",
          orange: "#E8541A",
          dark: "#0D0D0D",
          surface: "#1A1A1A",
          muted: "#2A2A2A",
          border: "#333333",
          text: "#F0F0F0",
          subtle: "#888888",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      screens: {
        xs: "390px",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(14px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scalePop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "70%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slideUp 0.45s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "scale-pop": "scalePop 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;

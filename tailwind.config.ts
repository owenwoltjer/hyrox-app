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
    },
  },
  plugins: [],
};

export default config;

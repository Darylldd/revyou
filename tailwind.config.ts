import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans:  ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        bg:        "#080604",
        surface:   "#110e09",
        surface2:  "#1a1510",
        border:    "#2d2318",
        amber:     "#d4890a",
        burgundy:  "#7c1d1d",
        panic:     "#dc2626",
        parchment: "#f0e6d3",
      },
    },
  },
  plugins: [],
};

export default config;
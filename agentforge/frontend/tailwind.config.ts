import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: "#1a1a2e",
          surface: "#16213e",
          border: "#0f3460",
          accent: "#e94560",
        },
      },
    },
  },
  plugins: [],
};

export default config;

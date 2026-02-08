/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#050810",
          card: "#0e1220",
        },
        neon: {
          blue: "#4488ff",
          cyan: "#00ffcc",
          red: "#ff0044",
          yellow: "#facc15",
        },
      },
      fontFamily: {
        mono: ["monospace"],
      },
    },
  },
  plugins: [],
};

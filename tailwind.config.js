/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          500: "#6366f1",
          900: "#312e81",
        },
        surface: {
          dark: "#0f172a",
          card: "#1e293b",
        },
      },
    },
  },
  plugins: [],
};

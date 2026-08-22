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
          400: "#34D399", // Mint (for highlights)
          500: "#10B981", // Electric Emerald (primary buttons)
          600: "#059669", // Deep Emerald (for press states)
        },
        surface: {
          dark: "#090D0E", // Obsidian (main app background)
          card: "#131B1E", // Charcoal (for login forms and cards)
        },
      },
    },
  },
  plugins: [],
};
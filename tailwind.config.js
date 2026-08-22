// Palette is shared with src/constants/colors.ts so components and classes
// can never drift apart. Edit the JSON, not this file.
const palette = require("./src/constants/palette.json");

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
      colors: palette,
    },
  },
  plugins: [],
};
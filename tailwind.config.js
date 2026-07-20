/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-contrast palette tuned for outdoor / sunlight readability
        brand: {
          50: "#f0f9ee",
          100: "#dcf0d6",
          200: "#b8e0b0",
          300: "#8cc97f",
          400: "#5fae52",
          500: "#3f8f34", // primary green
          600: "#2f7127",
          700: "#265a20",
          800: "#20481c",
          900: "#1b3c18",
        },
        earth: {
          50: "#faf6f1",
          100: "#f0e6d8",
          200: "#e0cbae",
          300: "#caa877",
          400: "#b6874f",
          500: "#8a5e2f", // coffee/soil accent
          600: "#6f4a25",
          700: "#573a1e",
        },
        danger: "#dc2626",
        warning: "#d97706",
      },
      fontSize: {
        // Slightly larger base scale for field readability
        base: ["1rem", "1.5rem"],
        lg: ["1.15rem", "1.65rem"],
      },
    },
  },
  plugins: [],
};

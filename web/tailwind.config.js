import forms from "@tailwindcss/forms";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F2F0FF",
          100: "#E6E1FF",
          200: "#CFC7FF",
          300: "#B8ADFF",
          400: "#A193FF",
          500: "#8A79FF",
          600: "#7C5CFF",
          700: "#6B4BE6",
          800: "#553CB3",
          900: "#3A287A",
        },
        tealx: { 500: "#00D5C4" },
        base: {
          950: "#07090C",
          900: "#0B0E12",
          850: "#0F1522",
          800: "#141A24",
          700: "#1B2230",
          600: "#222A39",
          500: "#2B3547",
          400: "#566074",
          300: "#A9AFB9",
          200: "#CDD3DC",
          100: "#EAEAEA",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [forms],
};

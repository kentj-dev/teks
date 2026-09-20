/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      colors: {
        ink: "#171717",
        accent: "#1687ff",
      },
      boxShadow: {
        bubble: "0 1px 2px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

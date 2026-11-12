/** @type {import('tailwindcss').Config} */
/**
 * Crafthand Market uses Tailwind CSS v4 with design tokens in app/globals.css (@theme).
 * This config keeps editor/tooling awareness of content paths and brand aliases.
 */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          amber: "#c2410c",
          emerald: "#047857",
          gold: "#b45309",
          ink: "#292524",
          cream: "#faf6f1",
        },
      },
      fontFamily: {
        display: ["var(--font-outfit)", "Georgia", "serif"],
        body: ["var(--font-outfit)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
}

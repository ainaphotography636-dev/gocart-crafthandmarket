/** @type {import('tailwindcss').Config} */
/**
 * CraftHand Market uses Tailwind CSS v4 with design tokens in app/globals.css (@theme).
 * This config keeps editor/tooling awareness of content paths and brand aliases.
 * Logo sample: Craft #C85A32 · Hand #1E293B · Market #0F766E
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
          amber: "#c85a32",
          emerald: "#0f766e",
          gold: "#b45309",
          ink: "#1e293b",
          cream: "#f8f5f0",
          forest: "#0f766e",
          slate: "#1e293b",
          terracotta: "#c85a32",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-outfit)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
}

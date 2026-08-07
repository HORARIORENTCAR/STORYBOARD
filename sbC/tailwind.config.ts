import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d6f5e0",
          200: "#aeeac4",
          300: "#7ad9a3",
          400: "#48c17f",
          500: "#27a663",
          600: "#18854e",
          700: "#146942",
          800: "#0f4f33",
          900: "#0c3f29",
          950: "#062418",
        },
        ink: {
          50: "#f5f7f6",
          100: "#e8ece9",
          200: "#cdd6d1",
          300: "#a6b5ac",
          400: "#788d81",
          500: "#5a7263",
          600: "#455a4d",
          700: "#38493f",
          800: "#2c3a32",
          900: "#182620",
          950: "#0d1712",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(13, 23, 18, 0.06), 0 8px 24px -12px rgba(13, 23, 18, 0.12)",
        pop: "0 20px 60px -15px rgba(13, 23, 18, 0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F4F6F3",
        card: "#FFFFFF",
        "card-hover": "#F7FAF5",
        border: "#DDE8D8",
        primary: "#4A7B1E",
        "primary-dark": "#3A6117",
        accent: "#5EA818",
        "text-base": "#1A2710",
        "text-muted": "#6B7B5A",
        navbar: "#2B331D",
        "navbar-border": "#3d4c25",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
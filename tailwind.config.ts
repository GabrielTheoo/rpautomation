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
        bg: "#2B331D",
        card: "#344020",
        "card-hover": "#3d4c25",
        border: "#4a5c2d",
        primary: "#A7C871",
        "primary-dark": "#8aab57",
        accent: "#BBF261",
        "text-base": "#e8f0d9",
        "text-muted": "#8fa870",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#303030",
        panel: "#ffffff",
        panelSoft: "#f4f4f4",
        gameBg: "#2f6f6d",
        gameTop: "#3f3f3f",
        gameTopLight: "#505050",
        gameBlue: "#3f86c6",
        gameBlueDark: "#2d5f92",
        gameRed: "#d93236",
        gameRedDark: "#b92b30",
        gameGreen: "#2f9f73",
        gameYellow: "#ffe22f",
        gameOrange: "#ec672f",
        gameCanvas: "#bfbfbf",
        gameCream: "#fbfad0",
        gameBorder: "#96962c",
      },
      boxShadow: {
        game: "5px 6px 0 rgba(25, 65, 62, 0.9)",
      },
    },
  },
  plugins: [],
};

export default config;

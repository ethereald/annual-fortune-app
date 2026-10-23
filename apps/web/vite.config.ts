import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "single"
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: "prompt",
            includeAssets: ["fortune-mark.svg"],
            manifest: {
              name: "流年 Annual Fortune",
              short_name: "流年",
              description: "離線、隱私優先的年度命盤工作台",
              theme_color: "#f7f4ef",
              background_color: "#f7f4ef",
              display: "standalone",
              start_url: "/",
              icons: [
                {
                  src: "/fortune-mark.svg",
                  sizes: "any",
                  type: "image/svg+xml",
                  purpose: "any maskable",
                },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,svg,woff2}"],
            },
          }),
        ]),
  ],
  build: {
    target: "es2022",
    outDir: "dist",
  },
}));

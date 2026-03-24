import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/solana": {
        target: "http://127.0.0.1:8899",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/solana/, ""),
      },
    },
  },
});

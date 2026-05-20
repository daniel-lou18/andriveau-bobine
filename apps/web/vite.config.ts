import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const webDir = fileURLToPath(new URL(".", import.meta.url));
/** Hoisted workspace deps live at the repo root (`npm` does not link them into `apps/web/node_modules`). */
const repoRoot = path.resolve(webDir, "../..");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.join(repoRoot, "node_modules/react"),
      "react-dom": path.join(repoRoot, "node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});

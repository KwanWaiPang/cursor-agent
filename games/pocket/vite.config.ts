import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * GitHub Pages serves this game under /cursor-agent/games/pocket/,
 * so assets must be relative (`./`).
 */
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.source.html", import.meta.url)),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/shots/**", "**/assets/**"],
    },
  },
  preview: { host: "127.0.0.1", port: 4174 },
});

import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "../katago"),
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: path.resolve(__dirname, "src/hub.ts"),
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        entryFileNames: "hub.js",
        chunkFileNames: "assets/[name].js",
      },
    },
  },
});

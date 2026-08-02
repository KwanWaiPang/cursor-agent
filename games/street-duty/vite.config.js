import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Relative base so the build works under GitHub Pages
  // (https://…/cursor-agent/games/street-duty/).
  base: './',
  // Dev/build entry stays as the Vite source HTML; sync-pages-build.mjs then
  // copies dist into the game root for legacy branch-based Pages.
  build: {
    target: 'es2022',
    // Keep the published tree small for branch deploys.
    sourcemap: false,
    chunkSizeWarningLimit: 4096,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'index.source.html'),
    },
  },
  // Bind IPv4 explicitly: the default `localhost` binds ::1 only on macOS,
  // which the capture harness (127.0.0.1) cannot reach.
  // `hmr: false` when the capture harness owns the server (OW_NO_HMR=1): a file
  // saved by a concurrently-working agent otherwise reloads the page mid-capture
  // and playwright fails with "Execution context was destroyed".
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: process.env.OW_NO_HMR ? false : undefined,
  },
  preview: { host: '127.0.0.1' },
  // Large binary game assets served verbatim.
  assetsInclude: ['**/*.ktx2', '**/*.hdr', '**/*.exr', '**/*.bin', '**/*.glb'],
});

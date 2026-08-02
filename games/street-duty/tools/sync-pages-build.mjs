#!/usr/bin/env node
/**
 * Copy Vite dist into the game root so legacy GitHub Pages (branch: main)
 * can serve a real build. Dev continues to use index.source.html via Vite.
 */
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const assets = resolve(root, 'assets');

const htmlName = existsSync(resolve(dist, 'index.html'))
  ? 'index.html'
  : existsSync(resolve(dist, 'index.source.html'))
    ? 'index.source.html'
    : null;

if (!htmlName) {
  console.error('[sync-pages-build] no built html in dist/ — run vite build first');
  process.exit(1);
}

let html = readFileSync(resolve(dist, htmlName), 'utf8');
if (!html.includes('./assets/')) {
  console.error('[sync-pages-build] built html does not reference ./assets/ — abort');
  process.exit(1);
}

rmSync(assets, { recursive: true, force: true });
cpSync(resolve(dist, 'assets'), assets, { recursive: true });
writeFileSync(resolve(root, 'index.html'), html);

const js = readdirSync(assets).filter((f) => f.endsWith('.js'));
console.info(`[sync-pages-build] wrote index.html + assets (${js.join(', ')}) for Pages`);

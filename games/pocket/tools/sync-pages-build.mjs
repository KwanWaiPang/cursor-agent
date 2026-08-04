#!/usr/bin/env node
/**
 * Copy Vite dist into the game root for GitHub Pages (branch deploy).
 */
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const assets = resolve(root, "assets");

const htmlName = existsSync(resolve(dist, "index.html"))
  ? "index.html"
  : existsSync(resolve(dist, "index.source.html"))
    ? "index.source.html"
    : null;

if (!htmlName) {
  console.error("[sync-pages-build] no built html in dist/ — run vite build first");
  process.exit(1);
}

let html = readFileSync(resolve(dist, htmlName), "utf8");
if (!html.includes("./assets/")) {
  console.error("[sync-pages-build] built html does not reference ./assets/ — abort");
  process.exit(1);
}

rmSync(assets, { recursive: true, force: true });
cpSync(resolve(dist, "assets"), assets, { recursive: true });
writeFileSync(resolve(root, "index.html"), html);

// Vendored Pokémon GLBs from public/models → Pages game root.
const distModels = resolve(dist, "models");
const rootModels = resolve(root, "models");
if (existsSync(distModels)) {
  rmSync(rootModels, { recursive: true, force: true });
  cpSync(distModels, rootModels, { recursive: true });
}

// Self-hosted model-viewer (dex 3D preview) from public/vendor.
const distVendor = resolve(dist, "vendor");
const rootVendor = resolve(root, "vendor");
if (existsSync(distVendor)) {
  rmSync(rootVendor, { recursive: true, force: true });
  cpSync(distVendor, rootVendor, { recursive: true });
}

const js = readdirSync(assets).filter((f) => f.endsWith(".js"));
const modelCount = existsSync(resolve(rootModels, "pokemon/regular"))
  ? readdirSync(resolve(rootModels, "pokemon/regular")).filter((f) => f.endsWith(".glb")).length
  : 0;
const hasViewer = existsSync(resolve(rootVendor, "model-viewer.min.js"));
console.info(
  `[sync-pages-build] wrote index.html + assets (${js.join(", ")}) + ${modelCount} glbs` +
    `${hasViewer ? " + model-viewer" : ""} for Pages`,
);

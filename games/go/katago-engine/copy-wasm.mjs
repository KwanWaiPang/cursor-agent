import fs from "node:fs/promises";
import path from "node:path";

const srcDir = path.resolve("node_modules/@tensorflow/tfjs-backend-wasm/dist");
const outDir = path.resolve("../katago/tfjs");
const names = (await fs.readdir(srcDir)).filter((name) => name.endsWith(".wasm"));
if (!names.length) throw new Error(`no wasm files in ${srcDir}`);
await fs.mkdir(outDir, { recursive: true });
await Promise.all(names.map((name) => fs.copyFile(path.join(srcDir, name), path.join(outDir, name))));
console.log(`copied ${names.length} wasm files`);

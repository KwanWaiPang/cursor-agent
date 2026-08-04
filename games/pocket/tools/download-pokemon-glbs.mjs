/**
 * Download Pokemon-3D-api regular-form GLBs into public/models/pokemon/regular/.
 *
 * Usage:
 *   node tools/download-pokemon-glbs.mjs
 *
 * Source: https://github.com/Pokemon-3D-api/assets
 * Models © Nintendo / Creatures Inc. / GAME FREAK — fan redistribution only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/models/pokemon/regular');
fs.mkdirSync(outDir, { recursive: true });

const treeRes = await fetch(
  'https://api.github.com/repos/Pokemon-3D-api/assets/git/trees/main?recursive=1',
);
if (!treeRes.ok) throw new Error(`github tree ${treeRes.status}`);
const tree = await treeRes.json();
const files = (tree.tree || []).filter(
  (t) => t.path.startsWith('models/opt/regular/') && t.path.endsWith('.glb'),
);

const byId = new Map();
for (const f of files) {
  const name = path.basename(f.path);
  const m = name.match(/^(\d+)(?:-([MF]))?\.glb$/);
  if (!m) continue;
  const id = +m[1];
  const gender = m[2] || '';
  const list = byId.get(id) || [];
  list.push({ gender, path: f.path });
  byId.set(id, list);
}

const jobs = [...byId.entries()].map(([id, variants]) => {
  const pick = variants.find((v) => !v.gender) || variants.find((v) => v.gender === 'M') || variants[0];
  return { id, path: pick.path };
});
jobs.sort((a, b) => a.id - b.id);
console.log(`remote unique ids: ${jobs.length}`);

async function download(job) {
  const dest = path.join(outDir, `${job.id}.glb`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) return 'skip';
  const url = `https://cdn.jsdelivr.net/gh/Pokemon-3D-api/assets@main/${job.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error('too small');
  fs.writeFileSync(dest, buf);
  return 'ok';
}

const CONCURRENCY = 12;
let i = 0;
let ok = 0;
let skip = 0;
let fail = 0;
async function worker() {
  while (i < jobs.length) {
    const job = jobs[i++];
    try {
      const r = await download(job);
      if (r === 'skip') skip++;
      else ok++;
    } catch (e) {
      fail++;
      console.warn('FAIL', job.id, e.message || e);
    }
    if ((ok + skip + fail) % 50 === 0) {
      console.log(`progress ${ok + skip + fail}/${jobs.length}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const ids = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith('.glb'))
  .map((f) => +f.replace('.glb', ''))
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      source: 'https://github.com/Pokemon-3D-api/assets',
      category: 'regular',
      count: ids.length,
      ids,
      fetchedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ ok, skip, fail, onDisk: ids.length }, null, 2));

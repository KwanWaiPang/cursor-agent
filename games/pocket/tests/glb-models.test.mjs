import { test } from 'node:test';
import assert from 'node:assert/strict';

import { glbUrlForDexId } from '../src/gameplay/pokemon/GlbModels.ts';
import { KANTO_DEX } from '../src/gameplay/dex/index.ts';

test('glb urls cover every kanto national id', () => {
  for (const e of KANTO_DEX) {
    const local = glbUrlForDexId(e.id, 'local');
    const cdn = glbUrlForDexId(e.id, 'cdn');
    const raw = glbUrlForDexId(e.id, 'raw');
    assert.match(local, new RegExp(`/${e.id}\\.glb$`));
    assert.match(cdn, new RegExp(`/${e.id}\\.glb$`));
    assert.match(raw, new RegExp(`/${e.id}\\.glb$`));
    assert.ok(local.includes('models/pokemon/regular'));
    assert.ok(cdn.includes('jsdelivr.net'));
    assert.ok(raw.includes('raw.githubusercontent.com'));
  }
});

test('vendored kanto glbs exist on disk', async () => {
  const { access } = await import('node:fs/promises');
  const { resolve, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const id of [1, 25, 151]) {
    const file = resolve(root, `public/models/pokemon/regular/${id}.glb`);
    await access(file);
  }
});

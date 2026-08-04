import { test } from 'node:test';
import assert from 'node:assert/strict';

import { glbUrlForDexId } from '../src/gameplay/pokemon/GlbModels.ts';
import { KANTO_DEX } from '../src/gameplay/dex/index.ts';

test('glb urls cover every kanto national id', () => {
  for (const e of KANTO_DEX) {
    const cdn = glbUrlForDexId(e.id, 'cdn');
    const raw = glbUrlForDexId(e.id, 'raw');
    assert.match(cdn, new RegExp(`/${e.id}\\.glb$`));
    assert.match(raw, new RegExp(`/${e.id}\\.glb$`));
    assert.ok(cdn.includes('jsdelivr.net'));
    assert.ok(raw.includes('raw.githubusercontent.com'));
  }
});

test('sample remote glbs are reachable', async () => {
  for (const id of [1, 25, 151]) {
    const url = glbUrlForDexId(id, 'cdn');
    const res = await fetch(url, { method: 'HEAD' });
    assert.equal(res.status, 200, `${url} -> ${res.status}`);
  }
});

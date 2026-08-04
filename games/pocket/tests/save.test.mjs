import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DexProgress } from '../src/gameplay/dex/DexProgress.ts';
import {
  clearSave,
  formatSaveAge,
  hasSave,
  peekSave,
  writeSave,
} from '../src/gameplay/SaveGame.ts';

test('save slot round-trips partner and dex lists', () => {
  clearSave();
  assert.equal(hasSave(), false);

  const ok = writeSave({
    v: 1,
    savedAt: Date.now() - 120_000,
    partner: { species: 'squirtle', level: 5, hp: 18, maxHp: 20 },
    seen: ['squirtle', 'pidgey', 'sizzlipede'],
    owned: ['squirtle'],
    player: { x: 1, y: 0, z: 2, yaw: 0.5, pitch: -0.1 },
  });
  assert.equal(ok, true);
  assert.equal(hasSave(), true);

  const data = peekSave();
  assert.ok(data);
  assert.equal(data.partner.species, 'squirtle');
  assert.ok(data.seen.includes('sizzlipede'));
  assert.match(formatSaveAge(data.savedAt), /分钟前/);

  DexProgress.reset();
  DexProgress.importProgress(data.seen, data.owned);
  assert.ok(DexProgress.hasSeen('sizzlipede'));
  assert.ok(DexProgress.hasOwned('squirtle'));
  assert.equal(DexProgress.kantoSeenCount(), 2);

  clearSave();
  assert.equal(hasSave(), false);
});

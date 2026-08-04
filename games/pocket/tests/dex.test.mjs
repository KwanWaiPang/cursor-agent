import { test } from 'node:test';
import assert from 'node:assert/strict';

import { KANTO_DEX, KANTO_BY_SLUG, TYPE_ZH, formatDexNo } from '../src/gameplay/dex/index.ts';
import { SPECIES, MOVES, effectiveness } from '../src/gameplay/battle/data.ts';
import { DexProgress } from '../src/gameplay/dex/DexProgress.ts';

test('kanto dex covers #001–151 with chinese names', () => {
  assert.equal(KANTO_DEX.length, 151);
  assert.equal(KANTO_DEX[0].slug, 'bulbasaur');
  assert.equal(KANTO_DEX[0].name, '妙蛙种子');
  assert.equal(KANTO_DEX[24].name, '皮卡丘');
  assert.equal(KANTO_DEX[150].name, '梦幻');
  assert.equal(formatDexNo(25), '#025');
  assert.ok(TYPE_ZH.electric);
});

test('every dex entry has battle data and moves', () => {
  for (const e of KANTO_DEX) {
    const b = SPECIES[e.slug];
    assert.ok(b, `missing battle species ${e.slug}`);
    assert.equal(b.name, e.name);
    assert.equal(b.base.hp, e.base.hp);
    assert.ok(b.moves.length >= 1);
    for (const mid of b.moves) assert.ok(MOVES[mid], `${e.slug} move ${mid}`);
  }
  assert.equal(Object.keys(SPECIES).length, 151);
});

test('dex progress tracks seen and owned across gens', () => {
  DexProgress.reset();
  assert.equal(DexProgress.seenCount(), 0);
  DexProgress.markSeen('pidgey');
  DexProgress.markOwned('charmander');
  DexProgress.markSeen('sizzlipede');
  assert.ok(DexProgress.hasSeen('pidgey'));
  assert.ok(DexProgress.hasSeen('charmander'));
  assert.ok(DexProgress.hasSeen('sizzlipede'));
  assert.ok(DexProgress.hasOwned('charmander'));
  assert.equal(DexProgress.ownedCount(), 1);
  assert.equal(DexProgress.kantoSeenCount(), 2);
  assert.ok(KANTO_BY_SLUG.pidgey);
});

test('electric is super effective vs water/flying', () => {
  assert.equal(effectiveness('electric', ['water']), 2);
  assert.equal(effectiveness('electric', ['flying']), 2);
  assert.equal(effectiveness('electric', ['ground']), 0);
});

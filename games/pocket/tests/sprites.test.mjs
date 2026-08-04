import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MISSING_GLB_IDS,
  NATIONAL_DEX,
  hasRegularGlb,
  spriteFallbackUrls,
} from '../src/gameplay/dex/index.ts';
import { showdownSpriteId } from '../src/gameplay/dex/sprites.ts';

test('national dex covers #001–1025', () => {
  assert.equal(NATIONAL_DEX.length, 1025);
  assert.equal(NATIONAL_DEX[0].name, '妙蛙种子');
  assert.equal(NATIONAL_DEX[849].slug, 'sizzlipede');
  assert.equal(NATIONAL_DEX[1024].slug, 'pecharunt');
});

test('missing GLB set matches upstream gap count', () => {
  assert.equal(MISSING_GLB_IDS.size, 54);
  assert.equal(hasRegularGlb(1), true);
  assert.equal(hasRegularGlb(850), false);
  assert.equal(hasRegularGlb(25), true);
});

test('sprite fallbacks prefer PokeAPI artwork then Showdown', () => {
  const urls = spriteFallbackUrls(850, 'sizzlipede');
  assert.match(urls[0], /official-artwork\/850\.png$/);
  assert.match(urls[1], /sprites\/dex\/sizzlipede\.png$/);
  assert.match(urls[2], /sprites\/ani\/sizzlipede\.gif$/);
  assert.match(urls[3], /sprites\/pokemon\/850\.png$/);
  assert.equal(showdownSpriteId('mr-rime'), 'mrrime');
  assert.equal(showdownSpriteId('tapu-koko'), 'tapukoko');
});

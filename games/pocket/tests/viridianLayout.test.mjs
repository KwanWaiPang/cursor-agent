import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  VIRIDIAN,
  inForestGrass,
  onViridianPath,
  treeNeedsCollider,
  viridianPathX,
} from '../src/world/viridianLayout.ts';
import { TERRAIN } from '../src/world/Terrain.ts';
import { SPECIES } from '../src/gameplay/battle/data.ts';

test('terrain walkable bound reaches Viridian City', () => {
  assert.ok(TERRAIN.playMaxZ > 60);
  assert.equal(TERRAIN.playMaxZ, VIRIDIAN.playMaxZ);
  assert.ok(TERRAIN.minZ + TERRAIN.depth > VIRIDIAN.playMaxZ + 4);
});

test('forest grass is off the dirt path and between gate and city', () => {
  const midZ = (VIRIDIAN.forestZ0 + VIRIDIAN.forestZ1) / 2;
  const path = viridianPathX(midZ);
  assert.equal(inForestGrass(path, midZ), false);
  assert.equal(onViridianPath(path, midZ), true);
  assert.equal(inForestGrass(path + 4.2, midZ), true);
  assert.equal(inForestGrass(0, 20), false);
  assert.equal(inForestGrass(0, 56), false);
});

test('tree colliders cover Route 1 south through Viridian City', () => {
  assert.equal(treeNeedsCollider(1.55, 20), true);
  assert.equal(treeNeedsCollider(5.2, 40.4), true);
  assert.equal(treeNeedsCollider(-8, 56), true);
  assert.equal(treeNeedsCollider(0, VIRIDIAN.playMaxZ + 1), false);
  assert.equal(treeNeedsCollider(30, 40), false);
});

test('gym and forest species exist in the Kanto battle table', () => {
  assert.equal(SPECIES.sandshrew.name, '穿山鼠');
  assert.ok(SPECIES.sandshrew.types.includes('ground'));
  assert.equal(SPECIES.paras.name, '派拉斯');
  assert.ok(SPECIES.kakuna);
  assert.ok(SPECIES.metapod);
});

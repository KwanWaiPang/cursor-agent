/**
 * Barrel for the Pokemon creatures.
 *
 * Preferred path: remote GLB models from Pokemon-3D-api/assets via
 * `loadCreature()`. Procedural sculpts remain as a synchronous offline
 * fallback (`buildCreature`) when the network/Draco path fails.
 */
import { buildBulbasaur } from './pokemon/Bulbasaur';
import { buildCharmander } from './pokemon/Charmander';
import { buildSquirtle } from './pokemon/Squirtle';
import { buildPidgey } from './pokemon/Pidgey';
import { buildRattata } from './pokemon/Rattata';
import { buildOddish } from './pokemon/Oddish';
import { buildCaterpie } from './pokemon/Caterpie';
import { buildGenericCreature } from './pokemon/Generic';
import { loadGlbCreature } from './pokemon/GlbModels';
import { isKantoSpecies } from './dex';
import type { Creature, SpeciesId, StarterId } from './pokemon/shared';

export { buildBulbasaur } from './pokemon/Bulbasaur';
export { buildCharmander } from './pokemon/Charmander';
export { buildSquirtle } from './pokemon/Squirtle';
export { buildPidgey } from './pokemon/Pidgey';
export { buildRattata } from './pokemon/Rattata';
export { buildOddish } from './pokemon/Oddish';
export { buildCaterpie } from './pokemon/Caterpie';
export { buildGenericCreature } from './pokemon/Generic';
export { loadGlbCreature, prefetchGlbIds, glbUrlForDexId } from './pokemon/GlbModels';
export { buildPokeBall, type PokeBall } from './pokemon/PokeBall';
export { STARTERS, SPECIES, type Creature, type StarterId, type SpeciesId } from './pokemon/shared';

const CUSTOM: Record<string, () => Creature> = {
  bulbasaur: buildBulbasaur,
  charmander: buildCharmander,
  squirtle: buildSquirtle,
  pidgey: buildPidgey,
  rattata: buildRattata,
  oddish: buildOddish,
  caterpie: buildCaterpie,
};

/** Synchronous procedural/generic fallback (offline, tests, capture harness). */
export function buildCreature(id: SpeciesId): Creature {
  const custom = CUSTOM[id];
  if (custom) return custom();
  if (!isKantoSpecies(id)) {
    console.warn(`[pokemon] unknown species "${id}", falling back to rattata`);
    return buildRattata();
  }
  return buildGenericCreature(id);
}

/**
 * Preferred builder: remote GLB, then procedural fallback.
 * Use this from battles / lab so every Kanto mon can show the API model.
 */
export async function loadCreature(id: SpeciesId): Promise<Creature> {
  try {
    return await loadGlbCreature(id);
  } catch (err) {
    console.warn(`[pokemon] GLB load failed for ${id}, using procedural`, err);
    return buildCreature(id);
  }
}

/** Builds a starter by id (sync procedural). Prefer `loadCreature` in play. */
export function buildStarter(id: StarterId): Creature {
  return buildCreature(id);
}

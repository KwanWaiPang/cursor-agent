/**
 * Barrel for the Pokemon creatures.
 *
 * Hand-authored sculpts cover the starters and early Route 1 fauna. Every
 * other Kanto species falls back to a type-coloured generic so the full
 * Pokédex can appear in battle and in the dex browser.
 */
import { buildBulbasaur } from './pokemon/Bulbasaur';
import { buildCharmander } from './pokemon/Charmander';
import { buildSquirtle } from './pokemon/Squirtle';
import { buildPidgey } from './pokemon/Pidgey';
import { buildRattata } from './pokemon/Rattata';
import { buildOddish } from './pokemon/Oddish';
import { buildCaterpie } from './pokemon/Caterpie';
import { buildGenericCreature } from './pokemon/Generic';
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

/** Builds any Kanto species by slug. */
export function buildCreature(id: SpeciesId): Creature {
  const custom = CUSTOM[id];
  if (custom) return custom();
  if (!isKantoSpecies(id)) {
    console.warn(`[pokemon] unknown species "${id}", falling back to rattata`);
    return buildRattata();
  }
  return buildGenericCreature(id);
}

/** Builds a starter by id. */
export function buildStarter(id: StarterId): Creature {
  return buildCreature(id);
}

/**
 * Battle data — species stats, moves and the type chart.
 *
 * Species roster is the full Kanto Pokédex (#001–151) sourced from PokeAPI.
 * Hand-tuned movepools cover early-route fauna and the starters; everything
 * else gets a type-appropriate default set so any dex entry can battle.
 */

import { KANTO_DEX, type DexTypeId } from '../dex/kanto';

export type SpeciesId = string;

export type TypeId = DexTypeId;

export type StatId = 'atk' | 'def' | 'spe' | 'acc';

export interface MoveDef {
  id: string;
  name: string;
  type: TypeId;
  /** 0 for status moves. */
  power: number;
  /** 0..1. */
  accuracy: number;
  pp: number;
  priority: number;
  category: 'physical' | 'status';
  /** Stat-stage change applied on hit (status moves only). */
  effect?: { stat: StatId; delta: number; target: 'foe' | 'self' };
  /** Presentation hint for the FX layer. */
  fx: 'tackle' | 'quick' | 'vine' | 'ember' | 'water' | 'gust' | 'growl' | 'tailwhip' | 'sand';
}

export const MOVES: Record<string, MoveDef> = {
  tackle: {
    id: 'tackle', name: '撞击', type: 'normal', power: 40, accuracy: 0.95,
    pp: 35, priority: 0, category: 'physical', fx: 'tackle',
  },
  scratch: {
    id: 'scratch', name: '抓', type: 'normal', power: 40, accuracy: 1,
    pp: 35, priority: 0, category: 'physical', fx: 'tackle',
  },
  'quick-attack': {
    id: 'quick-attack', name: '电光一闪', type: 'normal', power: 40, accuracy: 1,
    pp: 30, priority: 1, category: 'physical', fx: 'quick',
  },
  'vine-whip': {
    id: 'vine-whip', name: '藤鞭', type: 'grass', power: 45, accuracy: 1,
    pp: 25, priority: 0, category: 'physical', fx: 'vine',
  },
  ember: {
    id: 'ember', name: '火花', type: 'fire', power: 40, accuracy: 1,
    pp: 25, priority: 0, category: 'physical', fx: 'ember',
  },
  'water-gun': {
    id: 'water-gun', name: '水枪', type: 'water', power: 40, accuracy: 1,
    pp: 25, priority: 0, category: 'physical', fx: 'water',
  },
  gust: {
    id: 'gust', name: '起风', type: 'flying', power: 40, accuracy: 1,
    pp: 35, priority: 0, category: 'physical', fx: 'gust',
  },
  growl: {
    id: 'growl', name: '叫声', type: 'normal', power: 0, accuracy: 1,
    pp: 40, priority: 0, category: 'status', fx: 'growl',
    effect: { stat: 'atk', delta: -1, target: 'foe' },
  },
  'tail-whip': {
    id: 'tail-whip', name: '摇尾巴', type: 'normal', power: 0, accuracy: 1,
    pp: 30, priority: 0, category: 'status', fx: 'tailwhip',
    effect: { stat: 'def', delta: -1, target: 'foe' },
  },
  'sand-attack': {
    id: 'sand-attack', name: '泼沙', type: 'ground', power: 0, accuracy: 1,
    pp: 15, priority: 0, category: 'status', fx: 'sand',
    effect: { stat: 'acc', delta: -1, target: 'foe' },
  },
  absorb: {
    id: 'absorb', name: '吸取', type: 'grass', power: 20, accuracy: 1,
    pp: 25, priority: 0, category: 'physical', fx: 'vine',
  },
  'string-shot': {
    id: 'string-shot', name: '吐丝', type: 'bug', power: 0, accuracy: 0.95,
    pp: 40, priority: 0, category: 'status', fx: 'growl',
    effect: { stat: 'spe', delta: -1, target: 'foe' },
  },
  'poison-sting': {
    id: 'poison-sting', name: '毒针', type: 'poison', power: 15, accuracy: 1,
    pp: 35, priority: 0, category: 'physical', fx: 'tackle',
  },
  'thunder-shock': {
    id: 'thunder-shock', name: '电击', type: 'electric', power: 40, accuracy: 1,
    pp: 30, priority: 0, category: 'physical', fx: 'quick',
  },
  confusion: {
    id: 'confusion', name: '念力', type: 'psychic', power: 50, accuracy: 1,
    pp: 25, priority: 0, category: 'physical', fx: 'gust',
  },
  'rock-throw': {
    id: 'rock-throw', name: '落石', type: 'rock', power: 50, accuracy: 0.9,
    pp: 15, priority: 0, category: 'physical', fx: 'tackle',
  },
  'ice-shard': {
    id: 'ice-shard', name: '冰砾', type: 'ice', power: 40, accuracy: 1,
    pp: 30, priority: 1, category: 'physical', fx: 'quick',
  },
  'dragon-rage': {
    id: 'dragon-rage', name: '龙之怒', type: 'dragon', power: 40, accuracy: 1,
    pp: 10, priority: 0, category: 'physical', fx: 'ember',
  },
  'shadow-sneak': {
    id: 'shadow-sneak', name: '影子偷袭', type: 'ghost', power: 40, accuracy: 1,
    pp: 30, priority: 1, category: 'physical', fx: 'quick',
  },
  'mach-punch': {
    id: 'mach-punch', name: '音速拳', type: 'fighting', power: 40, accuracy: 1,
    pp: 30, priority: 1, category: 'physical', fx: 'quick',
  },
  'fairy-wind': {
    id: 'fairy-wind', name: '妖精之风', type: 'fairy', power: 40, accuracy: 1,
    pp: 30, priority: 0, category: 'physical', fx: 'gust',
  },
  'metal-claw': {
    id: 'metal-claw', name: '金属爪', type: 'steel', power: 50, accuracy: 0.95,
    pp: 35, priority: 0, category: 'physical', fx: 'tackle',
  },
};

export interface SpeciesBattleData {
  id: SpeciesId;
  name: string;
  types: TypeId[];
  /** Gen-1-style base stats used by this engine (HP / Atk / Def / Spe). */
  base: { hp: number; atk: number; def: number; spe: number };
  /** Move ids in learn order; a battle set is the first four. */
  moves: string[];
}

/** Hand-authored movepools for species the player actually meets early. */
const MOVE_OVERRIDES: Partial<Record<string, string[]>> = {
  bulbasaur: ['tackle', 'growl', 'vine-whip'],
  charmander: ['scratch', 'growl', 'ember'],
  squirtle: ['tackle', 'tail-whip', 'water-gun'],
  pidgey: ['tackle', 'sand-attack', 'gust', 'quick-attack'],
  rattata: ['tackle', 'tail-whip', 'quick-attack'],
  oddish: ['absorb', 'growl', 'vine-whip'],
  caterpie: ['tackle', 'string-shot'],
  weedle: ['poison-sting', 'string-shot'],
  spearow: ['scratch', 'growl', 'gust'],
  'nidoran-f': ['tackle', 'growl', 'poison-sting'],
  'nidoran-m': ['tackle', 'growl', 'poison-sting'],
  ekans: ['tackle', 'poison-sting', 'tail-whip'],
  pikachu: ['thunder-shock', 'growl', 'quick-attack'],
  metapod: ['tackle', 'string-shot'],
  kakuna: ['poison-sting', 'string-shot'],
};

function defaultMoves(types: TypeId[]): string[] {
  const primary = types[0] ?? 'normal';
  const byType: Partial<Record<TypeId, string[]>> = {
    normal: ['tackle', 'growl', 'quick-attack'],
    fire: ['scratch', 'growl', 'ember'],
    water: ['tackle', 'tail-whip', 'water-gun'],
    grass: ['tackle', 'growl', 'vine-whip'],
    electric: ['thunder-shock', 'growl', 'quick-attack'],
    ice: ['tackle', 'growl', 'ice-shard'],
    fighting: ['tackle', 'growl', 'mach-punch'],
    poison: ['tackle', 'poison-sting', 'tail-whip'],
    ground: ['tackle', 'sand-attack'],
    flying: ['tackle', 'gust', 'quick-attack'],
    psychic: ['tackle', 'confusion', 'growl'],
    bug: ['tackle', 'string-shot'],
    rock: ['tackle', 'rock-throw'],
    ghost: ['tackle', 'shadow-sneak'],
    dragon: ['tackle', 'growl', 'dragon-rage'],
    fairy: ['tackle', 'growl', 'fairy-wind'],
    steel: ['tackle', 'metal-claw'],
  };
  return byType[primary] ?? ['tackle', 'growl'];
}

function buildSpecies(): Record<SpeciesId, SpeciesBattleData> {
  const out: Record<SpeciesId, SpeciesBattleData> = {};
  for (const e of KANTO_DEX) {
    const types = e.types as TypeId[];
    out[e.slug] = {
      id: e.slug,
      name: e.name,
      types,
      base: { hp: e.base.hp, atk: e.base.atk, def: e.base.def, spe: e.base.spe },
      moves: MOVE_OVERRIDES[e.slug] ?? defaultMoves(types),
    };
  }
  return out;
}

export const SPECIES: Record<SpeciesId, SpeciesBattleData> = buildSpecies();

/**
 * Type effectiveness, attacker -> defender. Only pairs that differ from 1 are
 * listed. Uses modern chart values so steel/fairy entries from the current
 * official dex resolve correctly.
 */
const CHART: Partial<Record<TypeId, Partial<Record<TypeId, number>>>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fighting: {
    normal: 2, rock: 2, steel: 2, ice: 2,
    flying: 0.5, poison: 0.5, bug: 0.5, psychic: 0.5, fairy: 0.5, ghost: 0,
  },
  flying: { fighting: 2, bug: 2, grass: 2, rock: 0.5, steel: 0.5, electric: 0.5 },
  poison: { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: {
    fire: 2, electric: 2, poison: 2, rock: 2, steel: 2,
    grass: 0.5, bug: 0.5, flying: 0,
  },
  rock: {
    fire: 2, ice: 2, flying: 2, bug: 2,
    fighting: 0.5, ground: 0.5, steel: 0.5,
  },
  bug: {
    grass: 2, psychic: 2,
    fighting: 0.5, flying: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5, fire: 0.5, fairy: 0.5,
  },
  ghost: { ghost: 2, psychic: 2, normal: 0 },
  steel: {
    rock: 2, ice: 2, fairy: 2,
    steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5,
  },
  fire: {
    grass: 2, ice: 2, bug: 2, steel: 2,
    fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5,
  },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass: {
    water: 2, ground: 2, rock: 2,
    fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5,
  },
  electric: {
    water: 2, flying: 2,
    electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5 },
  ice: {
    grass: 2, ground: 2, flying: 2, dragon: 2,
    fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5,
  },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  fairy: { fighting: 2, dragon: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
};

/** Combined effectiveness of a move type against a defender's type list. */
export function effectiveness(moveType: TypeId, defenderTypes: TypeId[]): number {
  let mult = 1;
  for (const t of defenderTypes) {
    mult *= CHART[moveType]?.[t] ?? 1;
  }
  return mult;
}

/** Gen-1 stat formulas at a level, no IVs/EVs. */
export function statsAtLevel(species: SpeciesBattleData, level: number) {
  const grow = (base: number) => Math.floor((2 * base * level) / 100);
  return {
    hp: grow(species.base.hp) + level + 10,
    atk: grow(species.base.atk) + 5,
    def: grow(species.base.def) + 5,
    spe: grow(species.base.spe) + 5,
  };
}

/** Gen-1 stat-stage multiplier: -6..+6 -> 2/8 .. 8/2. */
export function stageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

/** Accuracy stages use thirds rather than halves. */
export function accuracyStageMultiplier(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

export interface DamageRoll {
  damage: number;
  crit: boolean;
  effectiveness: number;
  stab: boolean;
}

/**
 * Gen-1 damage. `rng` supplies every roll so a seeded battle is replayable.
 *
 * Crits are a flat 1/16 and double the level term (which is what Gen 1 does —
 * at equal levels it comes out just under 2x). Gen 1 also has crits ignore
 * stat stages; that subtlety is kept because it prevents a Growl-locked player
 * from being unable to win.
 */
export function computeDamage(
  level: number,
  move: MoveDef,
  atk: number,
  def: number,
  atkUnmodified: number,
  defUnmodified: number,
  attackerTypes: TypeId[],
  defenderTypes: TypeId[],
  rng: () => number,
): DamageRoll {
  const eff = effectiveness(move.type, defenderTypes);
  const stab = attackerTypes.includes(move.type);
  if (move.power <= 0 || eff === 0) {
    return { damage: 0, crit: false, effectiveness: eff, stab };
  }

  const crit = rng() < 1 / 16;
  const L = crit ? level * 2 : level;
  const A = crit ? atkUnmodified : atk;
  const D = crit ? defUnmodified : def;

  let dmg = Math.floor(Math.floor((Math.floor((2 * L) / 5 + 2) * move.power * A) / Math.max(1, D)) / 50) + 2;
  if (stab) dmg = Math.floor(dmg * 1.5);
  dmg = Math.floor(dmg * eff);
  if (dmg > 0) {
    const roll = 217 + Math.floor(rng() * 39); // 217..255
    dmg = Math.max(1, Math.floor((dmg * roll) / 255));
  }
  return { damage: dmg, crit, effectiveness: eff, stab };
}

/**
 * Pokédex façade — Kanto #001–151 lookups, national index, type labels, progress.
 */
import { KANTO_BY_ID, KANTO_BY_SLUG, KANTO_DEX, type DexEntry, type DexTypeId } from './kanto';
import {
  NATIONAL_BY_ID,
  NATIONAL_BY_SLUG,
  NATIONAL_DEX,
  type NationalEntry,
} from './national';
import { MISSING_GLB_IDS, hasRegularGlb, spriteFallbackUrls } from './sprites';
import { findDexIndex } from './search';

export {
  KANTO_BY_ID,
  KANTO_BY_SLUG,
  KANTO_DEX,
  NATIONAL_BY_ID,
  NATIONAL_BY_SLUG,
  NATIONAL_DEX,
  MISSING_GLB_IDS,
  hasRegularGlb,
  spriteFallbackUrls,
  findDexIndex,
  type DexEntry,
  type DexTypeId,
  type NationalEntry,
};

/** Every Kanto slug is a valid battle/sculpt species id. */
export type SpeciesId = string;

export const TYPE_ZH: Record<DexTypeId, string> = {
  normal: '一般',
  fighting: '格斗',
  flying: '飞行',
  poison: '毒',
  ground: '地面',
  rock: '岩石',
  bug: '虫',
  ghost: '幽灵',
  steel: '钢',
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能力',
  ice: '冰',
  dragon: '龙',
  fairy: '妖精',
};

/** Soft type colours for dex chips and generic creatures. */
export const TYPE_COLOR: Record<DexTypeId, number> = {
  normal: 0xa8a878,
  fighting: 0xc03028,
  flying: 0xa890f0,
  poison: 0xa040a0,
  ground: 0xe0c068,
  rock: 0xb8a038,
  bug: 0xa8b820,
  ghost: 0x705898,
  steel: 0xb8b8d0,
  fire: 0xf08030,
  water: 0x6890f0,
  grass: 0x78c850,
  electric: 0xf8d030,
  psychic: 0xf85888,
  ice: 0x98d8d8,
  dragon: 0x7038f8,
  fairy: 0xee99ac,
};

export function dexEntry(idOrSlug: string | number): DexEntry | undefined {
  if (typeof idOrSlug === 'number') return KANTO_BY_ID[idOrSlug];
  return KANTO_BY_SLUG[idOrSlug];
}

export function isKantoSpecies(id: string): boolean {
  return id in KANTO_BY_SLUG;
}

export function formatDexNo(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

export function heightLabel(dm: number): string {
  return `${(dm / 10).toFixed(1)} m`;
}

export function weightLabel(hg: number): string {
  return `${(hg / 10).toFixed(1)} kg`;
}

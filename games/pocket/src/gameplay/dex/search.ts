import { NATIONAL_DEX, type NationalEntry } from './national';

/** Resolve a jump query to a 0-based national-dex index, or -1. */
export function findDexIndex(
  raw: string,
  list: readonly NationalEntry[] = NATIONAL_DEX,
): number {
  const q = raw.trim().toLowerCase();
  if (!q) return -1;
  const asNum = Number(q.replace(/^#/, ''));
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= list.length) return asNum - 1;
  let hit = list.findIndex((e) => e.slug === q || e.name === raw.trim());
  if (hit < 0) {
    hit = list.findIndex((e) => e.name.includes(raw.trim()) || e.slug.includes(q));
  }
  return hit;
}

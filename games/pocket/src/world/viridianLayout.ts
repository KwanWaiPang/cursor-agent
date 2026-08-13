/**
 * Shared footprints for the Route 1 south expansion (forest + Viridian City).
 * Terrain pads, vegetation keepout, wild grass and the city builder all read
 * the same numbers so colliders, trees and the ground cannot disagree.
 */

export const VIRIDIAN = {
  /** World +Z of the existing stone gate. */
  gateZ: 32.15,
  forestZ0: 33.6,
  forestZ1: 47.4,
  cityZ0: 47.8,
  cityZ1: 67.4,
  playMaxZ: 67.8,
} as const;

export const VIRIDIAN_PADS: { cx: number; cz: number; hx: number; hz: number; feather: number; dy: number }[] = [
  { cx: 1.4, cz: 56.2, hx: 10.2, hz: 7.4, feather: 3.2, dy: 0.05 }, // plaza
  { cx: -8.3, cz: 53.1, hx: 4.6, hz: 4.0, feather: 2.2, dy: 0.08 }, // Pokémon Center
  { cx: 10.7, cz: 53.1, hx: 4.0, hz: 3.7, feather: 2.0, dy: 0.08 }, // Mart
  { cx: 1.35, cz: 62.6, hx: 5.8, hz: 5.0, feather: 2.4, dy: 0.1 }, // Gym
  { cx: -11.2, cz: 59.2, hx: 3.5, hz: 3.3, feather: 1.8, dy: 0.06 },
  { cx: 12.6, cz: 59.2, hx: 3.5, hz: 3.3, feather: 1.8, dy: 0.06 },
];

export const VIRIDIAN_FOOTPRINTS: { cx: number; cz: number; hx: number; hz: number }[] = [
  { cx: 1.4, cz: 56.2, hx: 9.6, hz: 6.8 }, // plaza keepout
  { cx: -8.3, cz: 53.1, hx: 4.2, hz: 3.6 },
  { cx: 10.7, cz: 53.1, hx: 3.6, hz: 3.3 },
  { cx: 1.35, cz: 62.6, hx: 5.4, hz: 4.6 },
  { cx: -11.2, cz: 59.2, hx: 3.2, hz: 3.0 },
  { cx: 12.6, cz: 59.2, hx: 3.2, hz: 3.0 },
];

/** Dirt-path x through the south expansion (matches Terrain MAIN_PATH). */
export function viridianPathX(z: number): number {
  return 1.55 + (z - 32) * 0.008;
}

export function onViridianPath(x: number, z: number, half = 2.15): boolean {
  return Math.abs(x - viridianPathX(z)) <= half;
}

/** Inside Viridian Forest tall-grass lobes (off the path). */
export function inForestGrass(x: number, z: number): boolean {
  if (z < VIRIDIAN.forestZ0 || z > VIRIDIAN.forestZ1 || Math.abs(x) > 13.2) return false;
  return !onViridianPath(x, z, 2.05);
}

/**
 * Trunks the player can walk into need colliders. The original Pallet box
 * stopped at z < 27; the Viridian slice reaches playMaxZ.
 */
export function treeNeedsCollider(x: number, z: number): boolean {
  return Math.abs(x) < 23 && z < VIRIDIAN.playMaxZ && z > -27;
}

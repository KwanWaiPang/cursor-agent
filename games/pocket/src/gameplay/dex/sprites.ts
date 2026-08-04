/**
 * Dex sprite fallbacks when Pokemon-3D-api has no regular GLB.
 * Artwork: PokeAPI official-artwork / default sprites.
 * Animated: Pokémon Showdown `ani` GIFs.
 */

/** National dex ids with no `regular/{id}.glb` in Pokemon-3D-api/assets (see MISSING.json). */
export const MISSING_GLB_IDS: ReadonlySet<number> = new Set([850,851,852,853,854,859,860,861,863,864,866,868,873,878,879,882,883,918,919,931,935,936,938,939,940,944,950,951,952,953,954,955,956,961,963,964,968,969,970,971,972,976,977,986,988,989,991,992,993,1011,1012,1013,1022,1024]);

export function hasRegularGlb(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && !MISSING_GLB_IDS.has(id);
}

/** PokeAPI slug → Showdown sprite id (strip hyphens). */
export function showdownSpriteId(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function officialArtworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function pokeApiDefaultSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function showdownAniUrl(slug: string): string {
  return `https://play.pokemonshowdown.com/sprites/ani/${showdownSpriteId(slug)}.gif`;
}

export function showdownDexUrl(slug: string): string {
  return `https://play.pokemonshowdown.com/sprites/dex/${showdownSpriteId(slug)}.png`;
}

/** Ordered fallbacks for a dex entry without (or failing) 3D. */
export function spriteFallbackUrls(id: number, slug: string): string[] {
  return [
    officialArtworkUrl(id),
    showdownDexUrl(slug),
    showdownAniUrl(slug),
    pokeApiDefaultSpriteUrl(id),
  ];
}

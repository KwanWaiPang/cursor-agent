import type { GameContext } from '../../core/Context';
import { EVENTS } from '../../core/Context';
import { isKantoSpecies } from './index';

/**
 * DexProgress — which Kanto species the player has seen or obtained.
 * In-memory for this session (no save slot yet).
 */
class DexProgressStore {
  private seen = new Set<string>();
  private owned = new Set<string>();

  init(ctx: GameContext): void {
    ctx.events.on(EVENTS.STARTER_CHOSEN, (payload) => {
      const id = (payload as { id?: string })?.id;
      if (id) this.markOwned(id);
    });
    ctx.events.on('battle:encounter', (payload) => {
      const id = (payload as { species?: string })?.species;
      if (id) this.markSeen(id);
    });
    // Lab shelves preview all three starters as "seen".
    for (const id of ['bulbasaur', 'charmander', 'squirtle']) this.markSeen(id);
  }

  markSeen(species: string): void {
    if (!isKantoSpecies(species)) return;
    this.seen.add(species);
  }

  markOwned(species: string): void {
    if (!isKantoSpecies(species)) return;
    this.seen.add(species);
    this.owned.add(species);
  }

  hasSeen(species: string): boolean {
    return this.seen.has(species);
  }

  hasOwned(species: string): boolean {
    return this.owned.has(species);
  }

  seenCount(): number {
    return this.seen.size;
  }

  ownedCount(): number {
    return this.owned.size;
  }

  /** Debug / tests. */
  reset(): void {
    this.seen.clear();
    this.owned.clear();
  }
}

export const DexProgress = new DexProgressStore();

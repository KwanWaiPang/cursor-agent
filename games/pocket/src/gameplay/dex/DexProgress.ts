import type { GameContext } from '../../core/Context';
import { EVENTS } from '../../core/Context';
import { NATIONAL_BY_SLUG } from './national';

/**
 * DexProgress — which national-dex species the player has seen or obtained.
 * Persist via SaveGame; in-memory until then.
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

  private known(species: string): boolean {
    return species in NATIONAL_BY_SLUG;
  }

  private sanitizeList(list: unknown): string[] {
    if (!Array.isArray(list)) return [];
    const out: string[] = [];
    for (const id of list) {
      if (typeof id === 'string' && this.known(id)) out.push(id);
    }
    return out;
  }

  markSeen(species: string): void {
    if (!this.known(species)) return;
    this.seen.add(species);
  }

  markOwned(species: string): void {
    if (!this.known(species)) return;
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

  kantoSeenCount(): number {
    let n = 0;
    for (const id of this.seen) {
      const e = NATIONAL_BY_SLUG[id];
      if (e && e.id >= 1 && e.id <= 151) n++;
    }
    return n;
  }

  exportSeen(): string[] {
    return [...this.seen];
  }

  exportOwned(): string[] {
    return [...this.owned];
  }

  importProgress(seen: unknown, owned: unknown): void {
    this.seen = new Set(this.sanitizeList(seen));
    this.owned = new Set(this.sanitizeList(owned));
    for (const id of this.owned) this.seen.add(id);
  }

  /** Debug / new-game. */
  reset(): void {
    this.seen.clear();
    this.owned.clear();
  }
}

export const DexProgress = new DexProgressStore();

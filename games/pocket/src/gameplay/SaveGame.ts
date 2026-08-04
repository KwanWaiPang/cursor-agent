import type { GameContext } from '../core/Context';
import { EVENTS } from '../core/Context';
import { PlayerData, type PartyMon } from './battle/PlayerData';
import { SPECIES, type SpeciesId } from './battle/data';
import { DexProgress } from './dex/DexProgress';

/**
 * SaveGame — single localStorage slot for the Pallet Town opener.
 * Persists partner, dex progress, and player pose across reloads.
 */

const KEY = 'pocket.adventure.save.v1';

/** In-memory fallback when localStorage is missing (tests / locked-down embeds). */
const memory = new Map<string, string>();

export interface SaveV1 {
  v: 1;
  savedAt: number;
  partner: PartyMon | null;
  seen: string[];
  owned: string[];
  player: { x: number; y: number; z: number; yaw: number; pitch: number };
}

function isSpeciesId(id: string): id is SpeciesId {
  return id in SPECIES;
}

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  } catch {
    /* private mode */
  }
  return memory.get(key) ?? null;
}

function storageSet(key: string, value: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return true;
    }
  } catch {
    /* quota / private mode */
  }
  memory.set(key, value);
  return true;
}

function storageRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
  memory.delete(key);
}

export function hasSave(): boolean {
  return !!storageGet(KEY);
}

export function peekSave(): SaveV1 | null {
  try {
    const raw = storageGet(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveV1;
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  storageRemove(KEY);
}

export function captureSave(ctx: GameContext): SaveV1 {
  const g = (globalThis as unknown as {
    __GAME__?: { player?: { state: { position: { x: number; y: number; z: number }; yaw: number; pitch: number } } };
  }).__GAME__;
  const p = g?.player?.state;
  const partner = PlayerData.partner;
  return {
    v: 1,
    savedAt: Date.now(),
    partner: partner
      ? {
          species: partner.species,
          level: partner.level,
          hp: partner.hp,
          maxHp: partner.maxHp,
        }
      : null,
    seen: DexProgress.exportSeen(),
    owned: DexProgress.exportOwned(),
    player: p
      ? {
          x: p.position.x,
          y: p.position.y,
          z: p.position.z,
          yaw: p.yaw,
          pitch: p.pitch,
        }
      : { x: -7.6, y: 0, z: 6.2, yaw: -0.62, pitch: 0 },
  };
}

export function writeSave(data: SaveV1): boolean {
  return storageSet(KEY, JSON.stringify(data));
}

/** Snapshot current runtime into localStorage. */
export function saveNow(ctx: GameContext): boolean {
  return writeSave(captureSave(ctx));
}

/**
 * Hydrate PlayerData / DexProgress / player pose from the slot.
 * Call after BattleSystem (which inits those stores) and player exist.
 */
export function loadSave(ctx: GameContext): boolean {
  const data = peekSave();
  if (!data) return false;

  DexProgress.importProgress(data.seen, data.owned);

  if (data.partner && isSpeciesId(data.partner.species)) {
    PlayerData.restorePartner({
      species: data.partner.species,
      level: Math.max(1, data.partner.level | 0),
      hp: Math.max(0, data.partner.hp | 0),
      maxHp: Math.max(1, data.partner.maxHp | 0),
    });
  } else {
    PlayerData.clearPartner();
  }

  const g = (globalThis as unknown as {
    __GAME__?: {
      player?: {
        teleport: (pos: { x: number; y: number; z: number }, yaw?: number) => void;
        state: { pitch: number };
      };
      THREE?: { Vector3: new (x: number, y: number, z: number) => { x: number; y: number; z: number } };
    };
  }).__GAME__;

  if (g?.player && data.player) {
    const { x, y, z, yaw, pitch } = data.player;
    if (g.THREE) {
      g.player.teleport(new g.THREE.Vector3(x, y, z), yaw);
    } else {
      g.player.teleport({ x, y, z }, yaw);
    }
    g.player.state.pitch = pitch ?? 0;
  }

  // Sync lab starter props if a partner was restored.
  const dbg = ctx.scene.userData.starterDebug as
    | { restore?: (id: string) => void }
    | undefined;
  if (data.partner?.species && dbg?.restore) {
    dbg.restore(data.partner.species);
  }

  return true;
}

/** Wire auto-save on story beats + page hide. */
export function installAutosave(ctx: GameContext): void {
  const persist = (): void => {
    saveNow(ctx);
  };
  ctx.events.on(EVENTS.STARTER_CHOSEN, persist);
  ctx.events.on('battle:end', persist);
  ctx.events.on('battle:victory', persist);

  const onHide = (): void => {
    persist();
  };
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
}

export function formatSaveAge(savedAt: number): string {
  const mins = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

export const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "手枪",
    damage: 22,
    rpm: 220,
    magSize: 12,
    reserve: 48,
    reloadMs: 1400,
    spread: 0.018,
    range: 55,
    heavy: false,
  },
  rifle: {
    id: "rifle",
    name: "突击步枪",
    damage: 18,
    rpm: 520,
    magSize: 30,
    reserve: 90,
    reloadMs: 2100,
    spread: 0.012,
    range: 80,
    heavy: true,
  },
};

export function createLoadout(primary = "rifle") {
  const def = WEAPONS[primary] || WEAPONS.rifle;
  return {
    def,
    mag: def.magSize,
    reserve: def.reserve,
    reloading: false,
    reloadEnds: 0,
    lastShot: 0,
  };
}

export function tryReload(loadout, now, sfx) {
  if (loadout.reloading) return false;
  if (loadout.mag >= loadout.def.magSize) return false;
  if (loadout.reserve <= 0) return false;
  loadout.reloading = true;
  loadout.reloadEnds = now + loadout.def.reloadMs;
  sfx?.reload();
  return true;
}

export function updateReload(loadout, now) {
  if (!loadout.reloading) return;
  if (now < loadout.reloadEnds) return;
  const need = loadout.def.magSize - loadout.mag;
  const take = Math.min(need, loadout.reserve);
  loadout.mag += take;
  loadout.reserve -= take;
  loadout.reloading = false;
}

export function canShoot(loadout, now) {
  if (loadout.reloading) return false;
  if (loadout.mag <= 0) return false;
  const interval = 60000 / loadout.def.rpm;
  return now - loadout.lastShot >= interval;
}

export function consumeShot(loadout, now) {
  loadout.mag -= 1;
  loadout.lastShot = now;
}

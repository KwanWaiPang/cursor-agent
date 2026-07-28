/** 五武器：手枪 / AK-47 / M4 / 霰弹 / 栓狙 */
export const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "手枪",
    damage: 22,
    rpm: 220,
    magSize: 12,
    reserve: 48,
    reloadMs: 2800,
    spread: 0.018,
    range: 55,
    heavy: false,
    view: "pistol",
    adsSpreadMul: 0.35,
    kick: 0.018,
  },
  rifle: {
    id: "rifle",
    name: "AK-47",
    damage: 20,
    rpm: 600,
    magSize: 30,
    reserve: 200,
    reloadMs: 3000,
    spread: 0.014,
    range: 85,
    heavy: true,
    view: "ak",
    adsSpreadMul: 0.28,
    kick: 0.028,
  },
  m4: {
    id: "m4",
    name: "M4",
    damage: 17,
    rpm: 720,
    magSize: 30,
    reserve: 200,
    reloadMs: 2800,
    // 比 AK 更稳：腰射散布更小，开镜更准
    spread: 0.009,
    range: 90,
    heavy: true,
    view: "m4",
    adsSpreadMul: 0.22,
    kick: 0.018,
  },
  shotgun: {
    id: "shotgun",
    name: "霰弹枪",
    damage: 11, // 每颗弹丸；近距离多发命中爆发高
    rpm: 75,
    magSize: 6,
    reserve: 36,
    reloadMs: 3200,
    spread: 0.085,
    range: 28,
    heavy: true,
    view: "shotgun",
    pellets: 8,
    adsSpreadMul: 0.72, // 开镜略收，但仍是近战武器
    hipSpreadMul: 1.15,
    kick: 0.055,
  },
  sniper: {
    id: "sniper",
    name: "栓狙",
    damage: 78,
    rpm: 42, // 与 chamberMs 配合，实际受栓动限制
    magSize: 5,
    reserve: 25,
    reloadMs: 3400,
    spread: 0.004,
    range: 160,
    heavy: true,
    view: "sniper",
    chamberMs: 1450, // 开火后拉栓
    adsSpreadMul: 0.15,
    hipSpreadMul: 18, // 腰射几乎不可用
    adsFov: 28,
    kick: 0.07,
  },
};

export const WEAPON_IDS = ["pistol", "rifle", "m4", "shotgun", "sniper"];

export function createLoadout(primary = "rifle", opts = {}) {
  const def = WEAPONS[primary] || WEAPONS.rifle;
  const reserve = opts.reserve != null ? opts.reserve : def.reserve;
  return {
    def,
    mag: def.magSize,
    reserve,
    reloading: false,
    reloadEnds: 0,
    lastShot: 0,
    chamberUntil: 0,
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
  if (loadout.chamberUntil && now < loadout.chamberUntil) return false;
  const interval = 60000 / loadout.def.rpm;
  return now - loadout.lastShot >= interval;
}

export function consumeShot(loadout, now) {
  loadout.mag -= 1;
  loadout.lastShot = now;
  if (loadout.def.chamberMs) {
    loadout.chamberUntil = now + loadout.def.chamberMs;
  }
}

export function isWeaponLoot(kind) {
  return WEAPON_IDS.includes(kind);
}

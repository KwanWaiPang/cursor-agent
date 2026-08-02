/** 五武器：手枪 / AK-47 / M4 / 霰弹 / 栓狙
 * 伤害按「职责」拉开：AK 重、M4 快而稳、霰弹近战爆发、栓狙一击、手枪补枪。
 * 默认敌人约 58–90 HP（波次/模式不同）。
 */
export const DEFAULT_ZONE_MUL = { head: 2, body: 1, limb: 0.72 };

export const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "手枪",
    damage: 26,
    rpm: 220,
    magSize: 12,
    reserve: 48,
    reloadMs: 2800,
    spread: 0.018,
    range: 70,
    heavy: false,
    view: "pistol",
    adsSpreadMul: 0.35,
    kick: 0.032,
    // 爆头略低于步枪，鼓励近距点射而非远距离爆头狙
    zoneMul: { head: 1.85, body: 1, limb: 0.75 },
  },
  rifle: {
    id: "rifle",
    name: "AK-47",
    damage: 24,
    rpm: 600,
    magSize: 30,
    reserve: 200,
    reloadMs: 3000,
    // 中远距仍可用：腰射略收，硬射程加长（无「突然失效」感）
    spread: 0.011,
    range: 110,
    heavy: true,
    view: "ak",
    adsSpreadMul: 0.24,
    // 后坐略高于 M4，但不再过度抬头，便于连射控枪
    kick: 0.034,
    zoneMul: { head: 2, body: 1, limb: 0.72 },
  },
  m4: {
    id: "m4",
    name: "M4",
    damage: 18,
    rpm: 720,
    magSize: 30,
    reserve: 200,
    reloadMs: 2800,
    // 比 AK 更稳：腰射散布更小，开镜更准；单发略低、射速补齐
    spread: 0.009,
    range: 120,
    heavy: true,
    view: "m4",
    adsSpreadMul: 0.22,
    kick: 0.034,
    zoneMul: { head: 2, body: 1, limb: 0.72 },
  },
  shotgun: {
    id: "shotgun",
    name: "霰弹枪",
    damage: 10, // 每颗弹丸；近距多发命中爆发，远距乏力
    rpm: 75,
    magSize: 6,
    reserve: 36,
    reloadMs: 3200,
    spread: 0.085,
    range: 28,
    heavy: true,
    view: "shotgun",
    pellets: 8,
    adsSpreadMul: 0.72,
    hipSpreadMul: 1.15,
    kick: 0.095,
    // 弹丸爆头倍率压低，避免一发多弹丸全爆头秒全图
    zoneMul: { head: 1.35, body: 1, limb: 0.8 },
  },
  sniper: {
    id: "sniper",
    name: "栓狙",
    damage: 48, // 躯干约 2 枪；爆头仍可一击
    rpm: 42,
    magSize: 5,
    reserve: 25,
    reloadMs: 3400,
    spread: 0.004,
    range: 160,
    heavy: true,
    view: "sniper",
    chamberMs: 1450,
    adsSpreadMul: 0.15,
    hipSpreadMul: 18,
    adsFov: 28,
    kick: 0.12,
    zoneMul: { head: 2.5, body: 1, limb: 0.85 },
  },
};

export const WEAPON_IDS = ["pistol", "rifle", "m4", "shotgun", "sniper"];

/** 命中部位倍率（可被单枪 zoneMul 覆盖） */
export function zoneMultiplier(def, hitZone = "body") {
  const table = def?.zoneMul || DEFAULT_ZONE_MUL;
  if (hitZone === "head") return table.head ?? DEFAULT_ZONE_MUL.head;
  if (hitZone === "limb") return table.limb ?? DEFAULT_ZONE_MUL.limb;
  return table.body ?? DEFAULT_ZONE_MUL.body;
}

/** 数字键 1–5 对应槽位 */
export const WEAPON_HOTKEYS = {
  Digit1: "pistol",
  Digit2: "rifle",
  Digit3: "m4",
  Digit4: "shotgun",
  Digit5: "sniper",
  Numpad1: "pistol",
  Numpad2: "rifle",
  Numpad3: "m4",
  Numpad4: "shotgun",
  Numpad5: "sniper",
};

export function weaponSlotIndex(id) {
  const i = WEAPON_IDS.indexOf(id);
  return i >= 0 ? i + 1 : 0;
}

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

/** 武器库：捡枪入库，不自动切换；按键自选 */
export function createArsenal(startId = "rifle") {
  const id = WEAPONS[startId] ? startId : "rifle";
  const owned = Object.create(null);
  owned[id] = createLoadout(id);
  return {
    owned,
    activeId: id,
    get active() {
      return this.owned[this.activeId] || this.owned.rifle || Object.values(this.owned)[0];
    },
  };
}

/**
 * 拾取武器：未持有则入库（不切换）；已持有则补该枪备弹。
 * @returns {{ status: 'stowed'|'ammo', id: string, name: string, slot: number }}
 */
export function pickupWeapon(arsenal, kind) {
  const def = WEAPONS[kind];
  if (!def || !arsenal) return null;
  if (arsenal.owned[kind]) {
    const lo = arsenal.owned[kind];
    const add = def.magSize * 2;
    const cap = def.reserve * 2;
    lo.reserve = Math.min(cap, lo.reserve + add);
    return { status: "ammo", id: kind, name: def.name, slot: weaponSlotIndex(kind) };
  }
  arsenal.owned[kind] = createLoadout(kind);
  return { status: "stowed", id: kind, name: def.name, slot: weaponSlotIndex(kind) };
}

/** 切换到已持有武器；换弹进度保留在该枪上，后台继续完成 */
export function selectWeapon(arsenal, id) {
  if (!arsenal?.owned?.[id]) return false;
  if (arsenal.activeId === id) return false;
  arsenal.activeId = id;
  return true;
}

/** 推进武器库内所有换弹（切枪后也能装完） */
export function updateArsenalReloads(arsenal, now) {
  if (!arsenal?.owned) return;
  for (const id of Object.keys(arsenal.owned)) {
    updateReload(arsenal.owned[id], now);
  }
}

/** 弹药补给：优先当前枪，溢出再分给其它已持有 */
export function distributeAmmo(arsenal, amount = null) {
  if (!arsenal?.active) return [];
  const filled = [];
  const active = arsenal.active;
  const addActive = amount != null ? amount : active.def.magSize * 2;
  const capActive = active.def.reserve * 2;
  const before = active.reserve;
  active.reserve = Math.min(capActive, active.reserve + addActive);
  if (active.reserve > before) {
    filled.push({ id: active.def.id, name: active.def.name, gained: active.reserve - before });
  }
  let spill = Math.max(0, addActive - (active.reserve - before));
  if (spill <= 0) return filled;
  for (const id of WEAPON_IDS) {
    if (spill <= 0) break;
    if (id === active.def.id) continue;
    const lo = arsenal.owned[id];
    if (!lo) continue;
    const cap = lo.def.reserve * 2;
    const room = cap - lo.reserve;
    if (room <= 0) continue;
    const give = Math.min(room, Math.max(lo.def.magSize, Math.floor(spill)));
    lo.reserve += give;
    spill -= give;
    filled.push({ id, name: lo.def.name, gained: give });
  }
  return filled;
}

/** 在已持有武器间循环（滚轮） */
export function cycleWeapon(arsenal, dir = 1) {
  if (!arsenal) return false;
  const ownedIds = WEAPON_IDS.filter((id) => arsenal.owned[id]);
  if (ownedIds.length < 2) return false;
  const idx = ownedIds.indexOf(arsenal.activeId);
  const next = ownedIds[(idx + (dir >= 0 ? 1 : -1) + ownedIds.length) % ownedIds.length];
  return selectWeapon(arsenal, next);
}

export function listOwnedWeapons(arsenal) {
  if (!arsenal) return [];
  return WEAPON_IDS.filter((id) => arsenal.owned[id]).map((id) => {
    const lo = arsenal.owned[id];
    return {
      id,
      name: lo.def.name,
      slot: weaponSlotIndex(id),
      active: id === arsenal.activeId,
      mag: lo.mag,
      reserve: lo.reserve,
    };
  });
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

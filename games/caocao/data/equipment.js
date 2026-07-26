/**
 * 装备表 + 事件特效（结构参考 mengde equipments）
 */

export const EQUIPMENT = {
  yitian: {
    id: "yitian",
    name: "倚天剑",
    type: "weapon",
    modifiers: { atk: 12 },
    effects: [
      { event: "turn_begin", effect: "restore_hp", multiplier: 8 },
      { event: "on_normal_attack", effect: "enhance_basic_attack", multiplier: 8 },
    ],
    description: "曹操自备宝剑。",
  },
  short_sword: {
    id: "short_sword",
    name: "短剑",
    type: "weapon",
    modifiers: { atk: 6, def: 2 },
    effects: [
      { event: "action_done", effect: "restore_hp", multiplier: 5 },
      { event: "on_normal_attack", effect: "critical_boost", addend: 8 },
    ],
    description: "常见短兵。",
  },
  heaven_sword: {
    id: "heaven_sword",
    name: "倚天·仿",
    type: "weapon",
    modifiers: { atk: 18 },
    effects: [
      { event: "turn_begin", effect: "restore_hp", multiplier: 12 },
      { event: "on_normal_attack", effect: "double_boost", addend: 12 },
      { event: "on_normal_attack", effect: "enhance_basic_attack", multiplier: 10 },
    ],
    description: "锋利异常。",
  },
  taiping: {
    id: "taiping",
    name: "太平清领道",
    type: "aid",
    modifiers: { itl: 6, skl: 3 },
    effects: [
      { event: "turn_begin", effect: "restore_mp", addend: 4 },
      { event: "on_magic", effect: "enhance_magic", multiplier: 15 },
    ],
    description: "黄巾秘传道书。",
  },
  guding: {
    id: "guding",
    name: "古锭刀·仿",
    type: "weapon",
    modifiers: { atk: 10 },
    effects: [{ event: "on_normal_attack", effect: "critical_boost", addend: 10 }],
  },
  fangtian: {
    id: "fangtian",
    name: "方天画戟·仿",
    type: "weapon",
    modifiers: { atk: 16, skl: 2 },
    effects: [
      { event: "on_normal_attack", effect: "enhance_basic_attack", multiplier: 12 },
      { event: "action_done", effect: "restore_hp", multiplier: 6 },
    ],
  },
  baiyin: {
    id: "baiyin",
    name: "白银铠·仿",
    type: "armor",
    modifiers: { def: 8, hp: 8 },
    effects: [{ event: "on_attacked", effect: "reduce_damage", multiplier: 10 }],
  },
  jueying: {
    id: "jueying",
    name: "绝影·仿",
    type: "aid",
    modifiers: { move: 1, spd: 4 },
    effects: [],
  },
  feilong: {
    id: "feilong",
    name: "飞龙道袍·仿",
    type: "armor",
    modifiers: { def: 5, itl: 3 },
    effects: [{ event: "turn_begin", effect: "restore_mp", addend: 2 }],
  },
  liguang: {
    id: "liguang",
    name: "李广之弓·仿",
    type: "weapon",
    modifiers: { atk: 11, skl: 4 },
    effects: [{ event: "on_normal_attack", effect: "critical_boost", addend: 15 }],
  },
};

export function getEquipment(id) {
  return EQUIPMENT[id] || null;
}

/** 将背包条目转为引擎 gear（含 effects） */
export function inventoryToGear(inventory) {
  const list = [];
  for (const item of inventory || []) {
    const def = getEquipment(item.id) || item;
    const mod = def.modifiers || {};
    list.push({
      id: def.id || item.id,
      name: def.name || item.name,
      type: def.type || item.type || "aid",
      atk: mod.atk || item.atk || 0,
      def: mod.def || item.def || 0,
      skl: mod.skl || item.skl || 0,
      spd: mod.spd || item.spd || 0,
      itl: mod.itl || item.itl || 0,
      move: mod.move || item.move || 0,
      hp: mod.hp || item.hp || 0,
      effects: def.effects || item.effects || [],
    });
  }
  return list;
}

/** 为武将分配装备：主公优先武器，其余按类型分一件 */
export function assignLoadout(playerDefs, gearList) {
  const weapons = gearList.filter((g) => g.type === "weapon");
  const armors = gearList.filter((g) => g.type === "armor");
  const aids = gearList.filter((g) => g.type === "aid" || !g.type);
  const used = new Set();
  const take = (arr, prefer) => {
    let item = arr.find((g) => prefer && g.id === prefer && !used.has(g.id));
    if (!item) item = arr.find((g) => !used.has(g.id));
    if (item) used.add(item.id);
    return item ? [item] : [];
  };

  return playerDefs.map((def, i) => {
    const loadout = [];
    if (def.generalId === "caocao") {
      loadout.push(...take(weapons, "yitian"));
      loadout.push(...take(aids, "taiping"));
    } else if (i === 1) {
      loadout.push(...take(weapons));
    } else if (def.classId === "strategist" || def.generalId === "xunyu" || def.generalId === "guojia") {
      loadout.push(...take(aids));
    } else {
      loadout.push(...take(armors));
      if (!loadout.length) loadout.push(...take(weapons));
    }
    return { ...def, loadout };
  });
}

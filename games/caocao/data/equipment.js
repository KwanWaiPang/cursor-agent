/**
 * 装备表（结构参考 mengde config.lua equipments；数值自研）
 */

export const EQUIPMENT = {
  yitian: {
    id: "yitian",
    name: "倚天剑",
    type: "weapon",
    modifiers: { atk: 12 },
    description: "曹操自备宝剑。",
  },
  short_sword: {
    id: "short_sword",
    name: "短剑",
    type: "weapon",
    modifiers: { atk: 6, def: 2 },
    description: "常见短兵。",
  },
  heaven_sword: {
    id: "heaven_sword",
    name: "倚天·仿",
    type: "weapon",
    modifiers: { atk: 18 },
    description: "锋利异常。",
  },
  taiping: {
    id: "taiping",
    name: "太平清领道",
    type: "aid",
    modifiers: { itl: 6, skl: 3 },
    description: "黄巾秘传道书。",
  },
  guding: {
    id: "guding",
    name: "古锭刀·仿",
    type: "weapon",
    modifiers: { atk: 10 },
  },
  fangtian: {
    id: "fangtian",
    name: "方天画戟·仿",
    type: "weapon",
    modifiers: { atk: 16, skl: 2 },
  },
};

/** 将背包条目转为引擎 gear 加成列表 */
export function inventoryToGear(inventory) {
  const list = [];
  for (const item of inventory || []) {
    const def = EQUIPMENT[item.id] || item;
    const mod = def.modifiers || item;
    list.push({
      id: def.id || item.id,
      name: def.name || item.name,
      atk: mod.atk || item.atk || 0,
      def: mod.def || item.def || 0,
      skl: mod.skl || item.skl || 0,
      spd: mod.spd || item.spd || 0,
      itl: mod.itl || item.itl || 0,
      move: mod.move || item.move || 0,
      hp: mod.hp || item.hp || 0,
    });
  }
  return list;
}

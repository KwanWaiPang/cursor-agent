/**
 * 计策表（结构参考 mengde config.lua magics）
 */

export const MAGICS = {
  fire_0: {
    id: "fire_0",
    name: "火计",
    target: "enemy",
    range: "Distance4_Incl",
    mp: 10,
    effects: [{ type: "hp", power: -70 }],
    learnAt: { strategist: 1, cavalry: 8 },
  },
  heal_0: {
    id: "heal_0",
    name: "回复",
    target: "ally",
    range: "Distance4_Incl",
    mp: 10,
    effects: [{ type: "hp", power: 50 }],
    learnAt: { strategist: 1 },
  },
  stun: {
    id: "stun",
    name: "扰乱",
    target: "enemy",
    range: "Distance4_Incl",
    mp: 8,
    effects: [
      { type: "hp", power: -20 },
      { type: "condition", condition: "stunned", turns: 2 },
    ],
    learnAt: { strategist: 3 },
  },
  root: {
    id: "root",
    name: "定身",
    target: "enemy",
    range: "Distance3_Incl",
    mp: 8,
    effects: [
      { type: "hp", power: -30 },
      { type: "condition", condition: "rooted", turns: 2 },
    ],
    learnAt: { strategist: 5 },
  },
};

export function magicsForUnit(unit) {
  const list = [];
  for (const m of Object.values(MAGICS)) {
    const need = m.learnAt?.[unit.classId];
    if (need != null && unit.level >= need) list.push(m);
  }
  return list;
}

/**
 * 兵种 / 地形 / 攻击射程（参考 mengde hero_classes + attack_range + terrain_movecost）
 */

/** 命名攻击射程（相对坐标，移植自 mengde attack_range.h.inc） */
export const ATTACK_RANGES = {
  Adjacent4: [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ],
  Adjacent8: [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ],
  Distance2_4: [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0],
  ],
  Distance2_8: [
    [0, 2],
    [1, 1],
    [2, 0],
    [1, -1],
    [0, -2],
    [-1, -1],
    [-2, 0],
    [-1, 1],
  ],
  Distance3_Incl: (() => {
    const cells = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d >= 1 && d <= 3) cells.push([dx, dy]);
      }
    }
    return cells;
  })(),
  Distance4_Incl: (() => {
    const cells = [];
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d >= 1 && d <= 4) cells.push([dx, dy]);
      }
    }
    return cells;
  })(),
};

export const CLASSES = {
  infantry: {
    id: "infantry",
    name: "步兵",
    move: 5,
    attackRange: "Adjacent8",
    beats: "archer",
    color: "#6b4f2a",
    mpBase: 10,
    mpGrowth: 1,
  },
  cavalry: {
    id: "cavalry",
    name: "骑兵",
    move: 6,
    attackRange: "Adjacent4",
    beats: "infantry",
    color: "#8b2e2e",
    mpBase: 10,
    mpGrowth: 1,
  },
  archer: {
    id: "archer",
    name: "弓兵",
    move: 5,
    attackRange: "Distance2_8",
    beats: "cavalry",
    color: "#2f5d3a",
    mpBase: 10,
    mpGrowth: 1,
  },
  strategist: {
    id: "strategist",
    name: "策士",
    move: 5,
    attackRange: "Adjacent4",
    beats: null,
    color: "#3a4a6b",
    mpBase: 40,
    mpGrowth: 2,
  },
};

/**
 * 地形移动消耗：按兵种（参考 mengde terrain_movecost）
 * 9 = 不可通行
 */
export const TERRAIN = {
  plain: {
    name: "平地",
    moveCostByClass: { infantry: 1, cavalry: 1, archer: 1, strategist: 1 },
    effectPct: { infantry: 100, cavalry: 110, archer: 100, strategist: 100 },
    fill: "#c4b28a",
    block: false,
  },
  road: {
    name: "官道",
    moveCostByClass: { infantry: 1, cavalry: 1, archer: 1, strategist: 1 },
    effectPct: { infantry: 100, cavalry: 100, archer: 100, strategist: 100 },
    fill: "#d2c4a0",
    block: false,
  },
  forest: {
    name: "树林",
    moveCostByClass: { infantry: 2, cavalry: 2, archer: 2, strategist: 1 },
    effectPct: { infantry: 100, cavalry: 100, archer: 100, strategist: 100 },
    fill: "#5f7a45",
    block: false,
  },
  hill: {
    name: "山地",
    moveCostByClass: { infantry: 3, cavalry: 3, archer: 3, strategist: 2 },
    effectPct: { infantry: 100, cavalry: 100, archer: 110, strategist: 100 },
    fill: "#8a7a55",
    block: false,
  },
  fort: {
    name: "城垣",
    moveCostByClass: { infantry: 1, cavalry: 1, archer: 1, strategist: 1 },
    effectPct: { infantry: 110, cavalry: 100, archer: 110, strategist: 100 },
    fill: "#9a9080",
    block: false,
  },
  water: {
    name: "河流",
    moveCostByClass: { infantry: 9, cavalry: 9, archer: 9, strategist: 9 },
    effectPct: { infantry: 100, cavalry: 100, archer: 100, strategist: 100 },
    fill: "#6a90b0",
    block: true,
  },
};

export function terrainMoveCost(terrainId, classId) {
  const t = TERRAIN[terrainId] || TERRAIN.plain;
  return t.moveCostByClass?.[classId] ?? 1;
}

export function terrainEffectPct(terrainId, classId) {
  const t = TERRAIN[terrainId] || TERRAIN.plain;
  return t.effectPct?.[classId] ?? 100;
}

export function classAdvantage(attackerClass, defenderClass) {
  const a = CLASSES[attackerClass];
  const d = CLASSES[defenderClass];
  if (!a || !d) return 1;
  if (a.beats === defenderClass) return 1.25;
  if (d.beats === attackerClass) return 0.8;
  return 1;
}

export function attackOffsets(classId) {
  const cls = CLASSES[classId];
  const key = cls?.attackRange || "Adjacent4";
  return ATTACK_RANGES[key] || ATTACK_RANGES.Adjacent4;
}

export function magicOffsets(rangeKey) {
  return ATTACK_RANGES[rangeKey] || ATTACK_RANGES.Distance4_Incl;
}

/** 兵种与地形规则（P1） */
export const CLASSES = {
  infantry: {
    id: "infantry",
    name: "步兵",
    move: 4,
    range: [1, 1],
    beats: "archer",
    color: "#6b4f2a",
  },
  cavalry: {
    id: "cavalry",
    name: "骑兵",
    move: 6,
    range: [1, 1],
    beats: "infantry",
    color: "#8b2e2e",
  },
  archer: {
    id: "archer",
    name: "弓兵",
    move: 4,
    range: [2, 2],
    beats: "cavalry",
    color: "#2f5d3a",
  },
  strategist: {
    id: "strategist",
    name: "策士",
    move: 3,
    range: [1, 2],
    beats: null,
    color: "#3a4a6b",
  },
};

/** 地形：moveCost、防御修正、对骑/步额外 */
export const TERRAIN = {
  plain: { name: "平地", moveCost: 1, defBonus: 0, block: "#c4b28a", block: false },
  forest: { name: "树林", moveCost: 2, defBonus: 0.1, fill: "#5f7a45", block: false },
  hill: { name: "山地", moveCost: 2, defBonus: 0.15, fill: "#8a7a55", block: false },
  fort: { name: "城垣", moveCost: 1, defBonus: 0.2, fill: "#9a9080", block: false },
  water: { name: "河流", moveCost: 99, defBonus: 0, fill: "#6a90b0", block: true },
  road: { name: "官道", moveCost: 1, defBonus: 0, fill: "#d2c4a0", block: false },
};

export function classAdvantage(attackerClass, defenderClass) {
  const a = CLASSES[attackerClass];
  const d = CLASSES[defenderClass];
  if (!a || !d) return 1;
  if (a.beats === defenderClass) return 1.25;
  if (d.beats === attackerClass) return 0.8;
  return 1;
}

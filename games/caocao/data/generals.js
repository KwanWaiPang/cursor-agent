/** 武将模板：成长与默认兵种（战役中会复制为战场单位） */
export const GENERALS = {
  caocao: {
    id: "caocao",
    name: "曹操",
    classId: "cavalry",
    base: { hp: 42, atk: 28, def: 18, skl: 20, spd: 18 },
    growth: { hp: 6, atk: 3, def: 2, skl: 2, spd: 2 },
    portrait: "#c45c2a",
    lord: true,
  },
  xiahou_dun: {
    id: "xiahou_dun",
    name: "夏侯惇",
    classId: "cavalry",
    base: { hp: 40, atk: 30, def: 16, skl: 14, spd: 16 },
    growth: { hp: 6, atk: 3, def: 2, skl: 1, spd: 2 },
    portrait: "#8b2e2e",
  },
  dianwei: {
    id: "dianwei",
    name: "典韦",
    classId: "infantry",
    base: { hp: 48, atk: 32, def: 20, skl: 10, spd: 12 },
    growth: { hp: 7, atk: 3, def: 3, skl: 1, spd: 1 },
    portrait: "#5a3a20",
  },
  xunyu: {
    id: "xunyu",
    name: "荀彧",
    classId: "strategist",
    base: { hp: 28, atk: 18, def: 12, skl: 28, spd: 14 },
    growth: { hp: 3, atk: 2, def: 1, skl: 4, spd: 1 },
    portrait: "#3a4a6b",
  },
  // 敌军模板
  zhangjiao: {
    id: "zhangjiao",
    name: "张角",
    classId: "strategist",
    base: { hp: 36, atk: 22, def: 14, skl: 26, spd: 12 },
    growth: { hp: 4, atk: 2, def: 1, skl: 3, spd: 1 },
    portrait: "#5a2a6b",
  },
  yellow_spear: {
    id: "yellow_spear",
    name: "黄巾武士",
    classId: "infantry",
    base: { hp: 28, atk: 18, def: 12, skl: 8, spd: 10 },
    growth: { hp: 4, atk: 2, def: 1, skl: 1, spd: 1 },
    portrait: "#c9a227",
  },
  yellow_archer: {
    id: "yellow_archer",
    name: "黄巾弓手",
    classId: "archer",
    base: { hp: 24, atk: 20, def: 10, skl: 12, spd: 12 },
    growth: { hp: 3, atk: 2, def: 1, skl: 2, spd: 1 },
    portrait: "#d4b84a",
  },
  yellow_rider: {
    id: "yellow_rider",
    name: "黄巾骑兵",
    classId: "cavalry",
    base: { hp: 26, atk: 22, def: 11, skl: 10, spd: 14 },
    growth: { hp: 4, atk: 2, def: 1, skl: 1, spd: 2 },
    portrait: "#b8952a",
  },
};

export function statsAtLevel(template, level) {
  const lv = Math.max(1, level);
  const s = { ...template.base };
  for (const k of Object.keys(template.growth)) {
    s[k] = template.base[k] + template.growth[k] * (lv - 1);
  }
  s.hpMax = s.hp;
  return s;
}

/** 武将模板：成长与默认兵种（战役中会复制为战场单位） */

function g(id, name, classId, base, growth, portrait, extra = {}) {
  return { id, name, classId, base, growth, portrait, ...extra };
}

export const GENERALS = {
  caocao: g(
    "caocao",
    "曹操",
    "cavalry",
    { hp: 42, atk: 28, def: 18, skl: 20, spd: 18 },
    { hp: 6, atk: 3, def: 2, skl: 2, spd: 2 },
    "#c45c2a",
    { lord: true }
  ),
  xiahou_dun: g(
    "xiahou_dun",
    "夏侯惇",
    "cavalry",
    { hp: 40, atk: 30, def: 16, skl: 14, spd: 16 },
    { hp: 6, atk: 3, def: 2, skl: 1, spd: 2 },
    "#8b2e2e"
  ),
  xiahou_yuan: g(
    "xiahou_yuan",
    "夏侯渊",
    "archer",
    { hp: 34, atk: 28, def: 14, skl: 18, spd: 20 },
    { hp: 4, atk: 3, def: 1, skl: 2, spd: 3 },
    "#a05030"
  ),
  dianwei: g(
    "dianwei",
    "典韦",
    "infantry",
    { hp: 48, atk: 32, def: 20, skl: 10, spd: 12 },
    { hp: 7, atk: 3, def: 3, skl: 1, spd: 1 },
    "#5a3a20"
  ),
  xuchu: g(
    "xuchu",
    "许褚",
    "infantry",
    { hp: 50, atk: 34, def: 18, skl: 8, spd: 10 },
    { hp: 7, atk: 3, def: 2, skl: 1, spd: 1 },
    "#6a4028"
  ),
  xunyu: g(
    "xunyu",
    "荀彧",
    "strategist",
    { hp: 28, atk: 18, def: 12, skl: 28, spd: 14 },
    { hp: 3, atk: 2, def: 1, skl: 4, spd: 1 },
    "#3a4a6b"
  ),
  guojia: g(
    "guojia",
    "郭嘉",
    "strategist",
    { hp: 26, atk: 20, def: 10, skl: 30, spd: 16 },
    { hp: 3, atk: 2, def: 1, skl: 4, spd: 2 },
    "#2a3a5b"
  ),
  zhangliao: g(
    "zhangliao",
    "张辽",
    "cavalry",
    { hp: 38, atk: 30, def: 16, skl: 18, spd: 18 },
    { hp: 5, atk: 3, def: 2, skl: 2, spd: 2 },
    "#4a5a8b"
  ),

  // 通用敌军模板（用 nameOverride 显示原作将名）
  enemy_infantry: g(
    "enemy_infantry",
    "敌军步兵",
    "infantry",
    { hp: 28, atk: 18, def: 12, skl: 8, spd: 10 },
    { hp: 4, atk: 2, def: 1, skl: 1, spd: 1 },
    "#7a6a4a"
  ),
  enemy_archer: g(
    "enemy_archer",
    "敌军弓手",
    "archer",
    { hp: 24, atk: 20, def: 10, skl: 12, spd: 12 },
    { hp: 3, atk: 2, def: 1, skl: 2, spd: 1 },
    "#8a7a50"
  ),
  enemy_cavalry: g(
    "enemy_cavalry",
    "敌军骑兵",
    "cavalry",
    { hp: 26, atk: 22, def: 11, skl: 10, spd: 14 },
    { hp: 4, atk: 2, def: 1, skl: 1, spd: 2 },
    "#6a5a40"
  ),
  enemy_strategist: g(
    "enemy_strategist",
    "敌军军师",
    "strategist",
    { hp: 22, atk: 16, def: 10, skl: 24, spd: 12 },
    { hp: 3, atk: 2, def: 1, skl: 3, spd: 1 },
    "#4a3a5a"
  ),
  boss_generic: g(
    "boss_generic",
    "敌军主将",
    "cavalry",
    { hp: 40, atk: 28, def: 16, skl: 16, spd: 14 },
    { hp: 5, atk: 3, def: 2, skl: 2, spd: 2 },
    "#5a2a6b"
  ),

  // 兼容旧关卡 id
  zhangjiao: g(
    "zhangjiao",
    "张角",
    "strategist",
    { hp: 36, atk: 22, def: 14, skl: 26, spd: 12 },
    { hp: 4, atk: 2, def: 1, skl: 3, spd: 1 },
    "#5a2a6b"
  ),
  yellow_spear: g(
    "yellow_spear",
    "黄巾武士",
    "infantry",
    { hp: 28, atk: 18, def: 12, skl: 8, spd: 10 },
    { hp: 4, atk: 2, def: 1, skl: 1, spd: 1 },
    "#c9a227"
  ),
  yellow_archer: g(
    "yellow_archer",
    "黄巾弓手",
    "archer",
    { hp: 24, atk: 20, def: 10, skl: 12, spd: 12 },
    { hp: 3, atk: 2, def: 1, skl: 2, spd: 1 },
    "#d4b84a"
  ),
  yellow_rider: g(
    "yellow_rider",
    "黄巾骑兵",
    "cavalry",
    { hp: 26, atk: 22, def: 11, skl: 10, spd: 14 },
    { hp: 4, atk: 2, def: 1, skl: 1, spd: 2 },
    "#b8952a"
  ),
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

const THEME_MINION = {
  yellow: ["yellow_spear", "yellow_archer", "yellow_rider"],
  dongzhuo: ["enemy_infantry", "enemy_cavalry", "enemy_archer"],
  lvbu: ["enemy_cavalry", "enemy_infantry", "enemy_archer"],
  xuzhou: ["enemy_infantry", "enemy_archer", "enemy_strategist"],
  zhangxiu: ["enemy_cavalry", "enemy_infantry", "enemy_archer"],
  yuanshu: ["enemy_infantry", "enemy_cavalry", "enemy_strategist"],
  bandit: ["enemy_infantry", "enemy_archer", "enemy_cavalry"],
  liubei: ["enemy_cavalry", "enemy_infantry", "enemy_strategist"],
  yuanshao: ["enemy_cavalry", "enemy_infantry", "enemy_archer"],
  wuhuan: ["enemy_cavalry", "enemy_archer", "enemy_infantry"],
  sunquan: ["enemy_infantry", "enemy_archer", "enemy_strategist"],
  xiliang: ["enemy_cavalry", "enemy_cavalry", "enemy_archer"],
  hanzhong: ["enemy_infantry", "enemy_strategist", "enemy_cavalry"],
  demon: ["enemy_strategist", "enemy_cavalry", "enemy_archer"],
};

export function minionIdsForTheme(theme) {
  return THEME_MINION[theme] || THEME_MINION.bandit;
}

export function bossTemplateForClass(classId) {
  const map = {
    infantry: "enemy_infantry",
    archer: "enemy_archer",
    cavalry: "enemy_cavalry",
    strategist: "enemy_strategist",
  };
  return map[classId] || "boss_generic";
}

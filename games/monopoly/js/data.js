/**
 * 「世界之旅」式环线棋盘数据
 * 玩法骨架参考 HumanSean/javascript-monopoly（ISC）
 */

export const CELL_COUNT = 40;

/** 角色令牌（纯色，无第三方角色图） */
export const TOKEN_PRESETS = [
  { id: "red", name: "赤旅", color: "#b5402e" },
  { id: "blue", name: "青旅", color: "#2a5f8f" },
  { id: "green", name: "翠旅", color: "#2f7a4a" },
  { id: "gold", name: "金旅", color: "#b8892a" },
];

/**
 * 顺时针环线：起点在左下角，沿底边 → 右边 → 顶边 → 左边
 * type: go | property | chance | fate | tax | jail | gotojail | park | airport | trip | casino | bonus
 */
export const BOARD = [
  { name: "起点", type: "go", value: 0 },
  { name: "开罗", type: "property", value: 600, group: "a" },
  { name: "命运", type: "fate", value: 0 },
  { name: "雅典", type: "property", value: 800, group: "a" },
  { name: "所得税", type: "tax", value: 1000 },
  { name: "东京站", type: "airport", value: 1200, twin: 25 },
  { name: "伊斯坦布尔", type: "property", value: 1000, group: "b" },
  { name: "机会", type: "chance", value: 0 },
  { name: "耶路撒冷", type: "property", value: 1100, group: "b" },
  { name: "迪拜", type: "property", value: 1400, group: "b" },
  { name: "监狱", type: "jail", value: 0 },

  { name: "莫斯科", type: "property", value: 1600, group: "c" },
  { name: "机会", type: "chance", value: 0 },
  { name: "圣彼得堡", type: "property", value: 1700, group: "c" },
  { name: "斯德哥尔摩", type: "property", value: 1900, group: "c" },
  { name: "巴黎站", type: "airport", value: 1200, twin: 35 },
  { name: "罗马", type: "property", value: 2200, group: "d" },
  { name: "命运", type: "fate", value: 0 },
  { name: "威尼斯", type: "property", value: 2300, group: "d" },
  { name: "马德里", type: "property", value: 2500, group: "d" },

  { name: "免费停车", type: "park", value: 0 },
  { name: "伦敦", type: "property", value: 2800, group: "e" },
  { name: "机会", type: "chance", value: 0 },
  { name: "阿姆斯特丹", type: "property", value: 2900, group: "e" },
  { name: "柏林", type: "property", value: 3100, group: "e" },
  { name: "纽约站", type: "airport", value: 1200, twin: 5 },
  { name: "纽约", type: "property", value: 3500, group: "f" },
  { name: "洛杉矶", type: "property", value: 3600, group: "f" },
  { name: "奢侈税", type: "tax", value: 1500 },
  { name: "芝加哥", type: "property", value: 3800, group: "f" },
  { name: "去监狱", type: "gotojail", value: 0 },

  { name: "里约", type: "property", value: 4000, group: "g" },
  { name: "布宜诺斯艾利斯", type: "property", value: 4100, group: "g" },
  { name: "命运", type: "fate", value: 0 },
  { name: "墨西哥城", type: "property", value: 4300, group: "g" },
  { name: "香港站", type: "airport", value: 1200, twin: 15 },
  { name: "新加坡", type: "property", value: 4600, group: "h" },
  { name: "机会", type: "chance", value: 0 },
  { name: "东京", type: "property", value: 4800, group: "h" },
  { name: "阿尔卑斯", type: "trip", value: 0 },
];

export const GROUP_COLORS = {
  a: "#8b5a2b",
  b: "#2a6f9e",
  c: "#9a3d6a",
  d: "#c48a3a",
  e: "#2f7a4a",
  f: "#b5402e",
  g: "#5a4a8a",
  h: "#1c5c6e",
};

/** 机会 / 命运卡 */
export const CARDS = [
  { text: "扶老奶奶过马路，村委会奖励 $1000", money: 1000, jail: 0 },
  { text: "中了彩票头奖，获得 $5000", money: 5000, jail: 0 },
  { text: "被劫匪抢走 $3000", money: -3000, jail: 0 },
  { text: "路边捡到 $500", money: 500, jail: 0 },
  { text: "医院账单 $800", money: -800, jail: 0 },
  { text: "兼职家教收入 $2000", money: 2000, jail: 0 },
  { text: "换新手机花费 $1300", money: -1300, jail: 0 },
  { text: "奖学金到账 $3000", money: 3000, jail: 0 },
  { text: "双十一剁手 $2000", money: -2000, jail: 0 },
  { text: "什么也没发生", money: 0, jail: 0 },
  { text: "偷税漏税：罚款 $1000，拘留 1 天", money: -1000, jail: 1 },
  { text: "超速行驶：罚款 $2000，拘留 2 天", money: -2000, jail: 2 },
  { text: "违建查处：罚款 $1000，拘留 3 天", money: -1000, jail: 3 },
  { text: "考试作弊被关 5 天", money: 0, jail: 5 },
  { text: "卖闲置赚了 $100", money: 100, jail: 0 },
  { text: "看电影花了 $100", money: -100, jail: 0 },
  { text: "工地搬砖赚了 $500", money: 500, jail: 0 },
  { text: "钱包落在出租车上，丢失 $1000", money: -1000, jail: 0 },
];

export function rentOf(cell) {
  if (!cell || cell.type !== "property") return 0;
  const level = cell.level || 0;
  // 空地 / 小屋 / 别墅 / 酒店：约 1/5、1/2、原价、双倍
  const factors = [0.2, 0.5, 1, 2];
  return Math.round(cell.value * factors[Math.min(level, 3)]);
}

export function upgradeCost(cell) {
  return Math.round(cell.value / 2);
}

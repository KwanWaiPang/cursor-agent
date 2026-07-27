/**
 * 「世界之旅」式环线棋盘
 * 视觉与城市编排参考实体棋常见环线布局（原创配置，非官方复制）
 * 玩法骨架参考 HumanSean/javascript-monopoly（ISC）
 */

export const CELL_COUNT = 40;

export const TOKEN_PRESETS = [
  { id: "red", name: "赤旅", color: "#c62828" },
  { id: "blue", name: "青旅", color: "#1565c0" },
  { id: "green", name: "翠旅", color: "#2e7d32" },
  { id: "gold", name: "金旅", color: "#f9a825" },
];

/**
 * 起点在右下角，顺时针：底边向左 → 左边向上 → 顶边向右 → 右边向下
 * icon: emoji；group: 色组
 */
export const BOARD = [
  // 底边（右→左）：美洲
  { name: "起点", type: "go", value: 2000, icon: "🚀", subtitle: "路过领 $2000" },
  { name: "古巴", type: "property", value: 600, group: "brown", icon: "🇨🇺" },
  { name: "命运", type: "fate", value: 0, icon: "❗" },
  { name: "墨西哥", type: "property", value: 800, group: "brown", icon: "🇲🇽" },
  { name: "所得税", type: "tax", value: 1000, icon: "💵" },
  { name: "纽约站", type: "station", value: 2000, icon: "🚉" },
  { name: "阿根廷", type: "property", value: 1000, group: "sky", icon: "🇦🇷" },
  { name: "机会", type: "chance", value: 0, icon: "?" },
  { name: "加拿大", type: "property", value: 1200, group: "sky", icon: "🇨🇦" },
  { name: "美国", type: "property", value: 1400, group: "sky", icon: "🇺🇸" },
  { name: "坐牢", type: "jail", value: 0, icon: "🔒", subtitle: "只是探视" },

  // 左边（下→上）：欧洲
  { name: "荷兰", type: "property", value: 1600, group: "pink", icon: "🇳🇱" },
  { name: "电力公司", type: "utility", value: 1500, icon: "💡" },
  { name: "希腊", type: "property", value: 1800, group: "pink", icon: "🇬🇷" },
  { name: "西班牙", type: "property", value: 2000, group: "pink", icon: "🇪🇸" },
  { name: "巴黎站", type: "station", value: 2000, icon: "🚉" },
  { name: "意大利", type: "property", value: 2200, group: "orange", icon: "🇮🇹" },
  { name: "命运", type: "fate", value: 0, icon: "❗" },
  { name: "德国", type: "property", value: 2400, group: "orange", icon: "🇩🇪" },
  { name: "法国", type: "property", value: 2600, group: "orange", icon: "🇫🇷" },

  // 顶边（左→右）：亚欧
  { name: "免费停车场", type: "park", value: 0, icon: "🅿️", subtitle: "休息一回" },
  { name: "英国", type: "property", value: 2800, group: "red", icon: "🇬🇧" },
  { name: "机会", type: "chance", value: 0, icon: "?" },
  { name: "俄罗斯", type: "property", value: 3000, group: "red", icon: "🇷🇺" },
  { name: "土耳其", type: "property", value: 3200, group: "red", icon: "🇹🇷" },
  { name: "东京站", type: "station", value: 2000, icon: "🚉" },
  { name: "泰国", type: "property", value: 3400, group: "yellow", icon: "🇹🇭" },
  { name: "澳大利亚", type: "property", value: 3600, group: "yellow", icon: "🇦🇺" },
  { name: "自来水公司", type: "utility", value: 1500, icon: "🚰" },
  { name: "新加坡", type: "property", value: 3800, group: "yellow", icon: "🇸🇬" },
  { name: "进监", type: "gotojail", value: 0, icon: "🚨", subtitle: "立刻入狱" },

  // 右边（上→下）：东亚
  { name: "巴西", type: "property", value: 4000, group: "green", icon: "🇧🇷" },
  { name: "日本", type: "property", value: 4200, group: "green", icon: "🇯🇵" },
  { name: "命运", type: "fate", value: 0, icon: "❗" },
  { name: "韩国", type: "property", value: 4400, group: "green", icon: "🇰🇷" },
  { name: "香港站", type: "station", value: 2000, icon: "🚉" },
  { name: "香港", type: "property", value: 4600, group: "navy", icon: "🇭🇰" },
  { name: "机会", type: "chance", value: 0, icon: "?" },
  { name: "中国", type: "property", value: 4800, group: "navy", icon: "🇨🇳" },
  { name: "财产税", type: "tax", value: 1500, icon: "💰" },
];

export const GROUP_COLORS = {
  brown: "#8d6e63",
  sky: "#29b6f6",
  pink: "#ec407a",
  orange: "#ff9800",
  red: "#e53935",
  yellow: "#fdd835",
  green: "#43a047",
  navy: "#1a237e",
};

export const CARDS = [
  { text: "扶老奶奶过马路，村委会奖励 $1000", money: 1000, jail: 0 },
  { text: "中了彩票头奖，获得 $5000", money: 5000, jail: 0 },
  { text: "被劫匪抢走 $3000", money: -3000, jail: 0 },
  { text: "路边捡到 $500", money: 500, jail: 0 },
  { text: "医院账单 $800", money: -800, jail: 0 },
  { text: "兼职家教收入 $2000", money: 2000, jail: 0 },
  { text: "换新手机花费 $1300", money: -1300, jail: 0 },
  { text: "奖学金到账 $3000", money: 3000, jail: 0 },
  { text: "环球旅行超支 $2000", money: -2000, jail: 0 },
  { text: "什么也没发生", money: 0, jail: 0 },
  { text: "偷税漏税：罚款 $1000，拘留 1 天", money: -1000, jail: 1 },
  { text: "超速行驶：罚款 $2000，拘留 2 天", money: -2000, jail: 2 },
  { text: "违建查处：罚款 $1000，拘留 3 天", money: -1000, jail: 3 },
  { text: "无照经营被关 5 天", money: 0, jail: 5 },
  { text: "卖闲置赚了 $100", money: 100, jail: 0 },
  { text: "看电影花了 $100", money: -100, jail: 0 },
  { text: "导游小费收入 $500", money: 500, jail: 0 },
  { text: "护照丢失补办 $1000", money: -1000, jail: 0 },
];

export function isDeed(cell) {
  return cell && (cell.type === "property" || cell.type === "station" || cell.type === "utility");
}

export function canUpgrade(cell) {
  return cell && cell.type === "property";
}

export function rentOf(cell, state) {
  if (!cell) return 0;
  if (cell.type === "property") {
    const level = cell.level || 0;
    const factors = [0.2, 0.5, 1, 2];
    return Math.round(cell.value * factors[Math.min(level, 3)]);
  }
  if (cell.type === "station" && state) {
    const owned = state.cells.filter(
      (c) => c.type === "station" && c.owner === cell.owner
    ).length;
    return 250 * owned * owned; // 1→250, 2→1000, 3→2250, 4→4000
  }
  if (cell.type === "utility") {
    return Math.round(cell.value * 0.4);
  }
  return 0;
}

export function upgradeCost(cell) {
  return Math.round(cell.value / 2);
}

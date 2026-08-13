/**
 * 「世界之旅」式环线棋盘
 * 视觉与城市编排参考实体棋常见环线布局（原创配置，非官方复制）
 * 玩法骨架参考 HumanSean/javascript-monopoly（ISC）
 */

export const CELL_COUNT = 40;

/** 仅保留棋子配色；显示名在开局时按人类/AI 序号生成（玩家1… / AI1…） */
export const TOKEN_PRESETS = [
  { id: "red", color: "#ff5252", accent: "#ffcdd2", shape: "round" },
  { id: "blue", color: "#448aff", accent: "#bbdefb", shape: "triangle" },
  { id: "green", color: "#69f0ae", accent: "#c8e6c9", shape: "square" },
  { id: "gold", color: "#ffd740", accent: "#fff9c4", shape: "star" },
];

export const AI_NAMES = ["艾米", "鲍勃", "卡罗"];

/**
 * 起点在右下角，顺时针：底边向左 → 左边向上 → 顶边向右 → 右边向下
 * 国家地产不使用国旗；特殊格仅用文字记号
 */
export const BOARD = [
  // 底边（右→左）：美洲
  { name: "起点", type: "go", value: 2000, mark: "起", subtitle: "路过+$2000" },
  { name: "古巴", type: "property", value: 600, group: "brown" },
  { name: "命运", type: "fate", value: 0, mark: "！" },
  { name: "墨西哥", type: "property", value: 800, group: "brown" },
  { name: "所得税", type: "tax", value: 1000, mark: "税" },
  { name: "纽约站", type: "station", value: 2000, mark: "站" },
  { name: "阿根廷", type: "property", value: 1000, group: "sky" },
  { name: "机会", type: "chance", value: 0, mark: "？" },
  { name: "加拿大", type: "property", value: 1200, group: "sky" },
  { name: "美国", type: "property", value: 1400, group: "sky" },
  { name: "暂停", type: "jail", value: 0, mark: "停", subtitle: "路过无事" },

  // 左边（下→上）：欧洲
  { name: "荷兰", type: "property", value: 1600, group: "pink" },
  { name: "电力", type: "utility", value: 1500, mark: "电" },
  { name: "希腊", type: "property", value: 1800, group: "pink" },
  { name: "西班牙", type: "property", value: 2000, group: "pink" },
  { name: "巴黎站", type: "station", value: 2000, mark: "站" },
  { name: "意大利", type: "property", value: 2200, group: "orange" },
  { name: "命运", type: "fate", value: 0, mark: "！" },
  { name: "德国", type: "property", value: 2400, group: "orange" },
  { name: "法国", type: "property", value: 2600, group: "orange" },

  // 顶边（左→右）：欧亚
  { name: "停车场", type: "park", value: 0, mark: "泊", subtitle: "休息一回" },
  { name: "英国", type: "property", value: 2800, group: "red" },
  { name: "机会", type: "chance", value: 0, mark: "？" },
  { name: "俄罗斯", type: "property", value: 3000, group: "red" },
  { name: "土耳其", type: "property", value: 3200, group: "red" },
  { name: "东京站", type: "station", value: 2000, mark: "站" },
  { name: "泰国", type: "property", value: 3400, group: "yellow" },
  { name: "澳大利亚", type: "property", value: 3600, group: "yellow" },
  { name: "自来水", type: "utility", value: 1500, mark: "水" },
  { name: "新加坡", type: "property", value: 3800, group: "yellow" },
  { name: "强制暂停", type: "gotojail", value: 0, mark: "止", subtitle: "停走数日" },

  // 右边（上→下）：亚非等（中国为统一国家地产，不含港澳台分列）
  { name: "巴西", type: "property", value: 4000, group: "green" },
  { name: "日本", type: "property", value: 4200, group: "green" },
  { name: "命运", type: "fate", value: 0, mark: "！" },
  { name: "韩国", type: "property", value: 4400, group: "green" },
  { name: "上海站", type: "station", value: 2000, mark: "站" },
  { name: "印度", type: "property", value: 4600, group: "navy" },
  { name: "机会", type: "chance", value: 0, mark: "？" },
  { name: "中国", type: "property", value: 4800, group: "navy" },
  { name: "财产税", type: "tax", value: 1500, mark: "税" },
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
  { text: "中了彩票，获得 $2000", money: 2000, jail: 0 },
  { text: "被劫匪抢走 $3000", money: -3000, jail: 0 },
  { text: "路边捡到 $500", money: 500, jail: 0 },
  { text: "医院账单 $800", money: -800, jail: 0 },
  { text: "兼职家教收入 $2000", money: 2000, jail: 0 },
  { text: "换新手机花费 $1300", money: -1300, jail: 0 },
  { text: "奖学金到账 $3000", money: 3000, jail: 0 },
  { text: "环球旅行超支 $2000", money: -2000, jail: 0 },
  { text: "什么也没发生", money: 0, jail: 0 },
  { text: "偷税漏税：罚款 $1000，暂停 1 天", money: -1000, jail: 1 },
  { text: "超速行驶：罚款 $2000，暂停 2 天", money: -2000, jail: 2 },
  { text: "违建查处：罚款 $1000，暂停 2 天", money: -1000, jail: 2 },
  { text: "证件过期被勒令暂停 2 天", money: 0, jail: 2 },
  { text: "卖闲置赚了 $100", money: 100, jail: 0 },
  { text: "看电影花了 $100", money: -100, jail: 0 },
  { text: "导游小费收入 $500", money: 500, jail: 0 },
  { text: "护照丢失补办 $1000", money: -1000, jail: 0 },
];

export const MAX_BUILD_LEVEL = 4; // 1–3 栋房子，第 4 级为酒店

/** 国家地产租金系数：空地 / 1栋 / 2栋 / 3栋 / 酒店（略加强以缩短残局） */
export const PROPERTY_RENT_FACTORS = [0.25, 0.55, 0.95, 1.5, 2.8];

export function isDeed(cell) {
  return cell && (cell.type === "property" || cell.type === "station" || cell.type === "utility");
}

/** 同色组全部地产 */
export function groupProperties(state, group) {
  if (!state || !group) return [];
  return state.cells.filter((c) => c.type === "property" && c.group === group);
}

/** 是否集齐某一色组（才能盖房；空地租金翻倍） */
export function ownsFullGroup(state, playerId, group) {
  const cells = groupProperties(state, group);
  return (
    cells.length > 0 &&
    playerId != null &&
    cells.every((c) => c.owner === playerId)
  );
}

export function canUpgrade(cell, _state = null) {
  // 不强制集齐同色才能盖房（否则残局极难结束）；玩家间交易另见 tryTrade
  return !!(cell && cell.type === "property");
}

export function stationRentByCount(count) {
  const n = Math.max(1, Math.min(4, count || 1));
  return 250 * n * n;
}

export function rentOf(cell, state) {
  if (!cell) return 0;
  if (cell.type === "property") {
    const level = cell.level || 0;
    let rent = Math.round(
      cell.value * PROPERTY_RENT_FACTORS[Math.min(level, MAX_BUILD_LEVEL)]
    );
    // 集齐同色且尚未盖房：空地租金 ×2（经典大富翁）
    if (
      level === 0 &&
      state &&
      ownsFullGroup(state, cell.owner, cell.group)
    ) {
      rent *= 2;
    }
    return rent;
  }
  if (cell.type === "station" && state) {
    const owned = state.cells.filter(
      (c) => c.type === "station" && c.owner === cell.owner
    ).length;
    return stationRentByCount(Math.max(1, owned));
  }
  if (cell.type === "utility") {
    return Math.round(cell.value * 0.4);
  }
  return 0;
}

export function upgradeCost(cell) {
  return Math.round(cell.value / 2);
}

/** 卖给银行的折旧比例（半价回收，避免原价套利） */
export const BANK_BUYBACK_RATE = 0.5;

/** 卖掉一级建筑（房子/酒店）回收价 */
export function buildingSellPrice(cell) {
  return Math.round(upgradeCost(cell) * BANK_BUYBACK_RATE);
}

/** 卖掉空地/车站/水电回收价（须先拆完建筑） */
export function landSellPrice(cell) {
  return Math.round((cell.value || 0) * BANK_BUYBACK_RATE);
}

export function buildLevelLabel(level) {
  if (!level) return "空地";
  if (level >= MAX_BUILD_LEVEL) return "酒店";
  return `${level} 栋房子`;
}

/** 列出某玩家可向银行变卖的操作 */
export function listBankSellActions(state, playerId) {
  const actions = [];
  state.cells.forEach((cell) => {
    if (cell.owner !== playerId || !isDeed(cell)) return;
    if ((cell.level || 0) > 0 && cell.type === "property") {
      const price = buildingSellPrice(cell);
      const label =
        (cell.level || 0) >= MAX_BUILD_LEVEL ? "卖掉酒店" : "卖掉 1 栋房子";
      actions.push({
        cellIndex: cell.index,
        kind: "building",
        name: cell.name,
        detail: `${buildLevelLabel(cell.level)} → ${buildLevelLabel(cell.level - 1)}`,
        label,
        price,
      });
    } else if ((cell.level || 0) === 0) {
      actions.push({
        cellIndex: cell.index,
        kind: "land",
        name: cell.name,
        detail: "地契归还银行",
        label: "卖掉地产",
        price: landSellPrice(cell),
      });
    }
  });
  // 优先列出回收价高的，方便应急凑钱
  actions.sort((a, b) => b.price - a.price);
  return actions;
}

/**
 * 生成地契卡展示数据（与对局公式一致）
 */
export function getDeedCard(cell, state) {
  if (!isDeed(cell)) return null;

  const houseCost = upgradeCost(cell);
  const base = {
    name: cell.name,
    icon: cell.mark || "",
    type: cell.type,
    group: cell.group || null,
    groupColor: cell.group ? GROUP_COLORS[cell.group] : null,
    price: cell.value,
    ownerId: cell.owner,
    level: cell.level || 0,
  };

  if (cell.type === "property") {
    const rents = PROPERTY_RENT_FACTORS.map((f) => Math.round(cell.value * f));
    return {
      ...base,
      kindLabel: "地产契",
      rows: [
        { label: "空地租金", value: rents[0], level: 0 },
        { label: "1 栋房子", value: rents[1], level: 1 },
        { label: "2 栋房子", value: rents[2], level: 2 },
        { label: "3 栋房子", value: rents[3], level: 3 },
        { label: "酒店", value: rents[4], level: 4 },
      ],
      costs: [
        { label: "购买价格", value: cell.value },
        { label: "每栋房价", value: houseCost },
        { label: "改建酒店", value: houseCost },
        { label: "卖房给银行", value: buildingSellPrice(cell) },
        { label: "卖地给银行", value: landSellPrice(cell) },
      ],
      note: "停在自己的地产上可盖房；集齐同色时空地租金×2。满级为酒店。卖给银行按半价折旧回收，须先拆房再卖地。",
    };
  }

  if (cell.type === "station") {
    return {
      ...base,
      kindLabel: "车站契",
      rows: [
        { label: "拥有 1 座车站", value: stationRentByCount(1), level: 1 },
        { label: "拥有 2 座车站", value: stationRentByCount(2), level: 2 },
        { label: "拥有 3 座车站", value: stationRentByCount(3), level: 3 },
        { label: "拥有 4 座车站", value: stationRentByCount(4), level: 4 },
      ],
      costs: [
        { label: "购买价格", value: cell.value },
        { label: "卖给银行", value: landSellPrice(cell) },
      ],
      note: "租金随你拥有的车站数量增加。卖给银行按半价折旧回收。",
      stationOwned:
        state && cell.owner != null
          ? state.cells.filter(
              (c) => c.type === "station" && c.owner === cell.owner
            ).length
          : 0,
    };
  }

  const utilRent = Math.round(cell.value * 0.4);
  return {
    ...base,
    kindLabel: "事业契",
    rows: [{ label: "使用费（租金）", value: utilRent, level: 0 }],
    costs: [
      { label: "购买价格", value: cell.value },
      { label: "卖给银行", value: landSellPrice(cell) },
    ],
    note: "他人停留时收取固定使用费。卖给银行按半价折旧回收。",
  };
}


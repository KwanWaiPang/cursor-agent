/**
 * 个性（致敬《三国志14》金色/蓝色/红色体系）
 * 文案与效果为自研演绎，非原作数值搬运。
 */

export const TRAIT_TIER = {
  gold: { name: "金", color: "#d4a84a", label: "强大" },
  blue: { name: "蓝", color: "#4a8aca", label: "良好" },
  red: { name: "红", color: "#c05050", label: "不利" },
};

/** @type {Record<string, {id:string,name:string,tier:string,desc:string,effects:object}>} */
export const TRAITS = {
  // 金色固有
  jianxiong: {
    id: "jianxiong",
    name: "奸雄",
    tier: "gold",
    desc: "统军临敌时，友军士气与攻击提升。",
    effects: { atkAura: 0.12, moraleAura: 0.1 },
  },
  shenjiang: {
    id: "shenjiang",
    name: "神将",
    tier: "gold",
    desc: "单骑破阵，武力发挥极致。",
    effects: { forceMul: 1.2, duelWin: 0.15 },
  },
  renhou: {
    id: "renhou",
    name: "仁厚",
    tier: "gold",
    desc: "仁德感人，登用与领地扩张更易。",
    effects: { charmMul: 1.15, paintBonus: 2 },
  },
  xiongcai: {
    id: "xiongcai",
    name: "雄才",
    tier: "gold",
    desc: "雄略过人，统率与政治兼长。",
    effects: { leadMul: 1.1, polMul: 1.1 },
  },
  wushuang: {
    id: "wushuang",
    name: "无双",
    tier: "gold",
    desc: "天下无双，战场无人能挡。",
    effects: { forceMul: 1.25, atkAura: 0.08 },
  },
  wolong: {
    id: "wolong",
    name: "卧龙",
    tier: "gold",
    desc: "运筹帷幄，计略与智力大增。",
    effects: { intMul: 1.25, schemeBonus: 0.2 },
  },
  fengchu: {
    id: "fengchu",
    name: "凤雏",
    tier: "gold",
    desc: "奇谋善断，计略成功率提升。",
    effects: { intMul: 1.15, schemeBonus: 0.15 },
  },
  zhongda: {
    id: "zhongda",
    name: "狼顾",
    tier: "gold",
    desc: "深沉善谋，防守与计略兼优。",
    effects: { intMul: 1.15, defAura: 0.1 },
  },
  baqi: {
    id: "baqi",
    name: "霸气",
    tier: "gold",
    desc: "威压四方，敌方士气易挫。",
    effects: { forceMul: 1.1, enemyMorale: -0.1 },
  },

  // 蓝色良好
  mingsheng: {
    id: "mingsheng",
    name: "名声",
    tier: "blue",
    desc: "担任地区官时涂色范围扩大。",
    effects: { paintBonus: 3 },
  },
  qinzheng: {
    id: "qinzheng",
    name: "勤政",
    tier: "blue",
    desc: "内政产出提高。",
    effects: { goldMul: 1.1, foodMul: 1.1 },
  },
  yongmeng: {
    id: "yongmeng",
    name: "勇猛",
    tier: "blue",
    desc: "近战杀伤提升。",
    effects: { forceMul: 1.08 },
  },
  jizhi: {
    id: "jizhi",
    name: "机智",
    tier: "blue",
    desc: "计略更易成功。",
    effects: { schemeBonus: 0.1 },
  },
  tujin: {
    id: "tujin",
    name: "突进",
    tier: "blue",
    desc: "行军涂色效率更高。",
    effects: { paintBonus: 2, moveBonus: 1 },
  },
  jianzhu: {
    id: "jianzhu",
    name: "建筑",
    tier: "blue",
    desc: "城池耐久与建设相关收益。",
    effects: { wallMul: 1.15 },
  },
  qinxue: {
    id: "qinxue",
    name: "潜在",
    tier: "blue",
    desc: "经验获取加快。",
    effects: { expMul: 1.2 },
  },
  wenzhao: {
    id: "wenzhao",
    name: "文藻",
    tier: "blue",
    desc: "政治与登用略优。",
    effects: { polMul: 1.08, charmMul: 1.05 },
  },
  jianren: {
    id: "jianren",
    name: "坚忍",
    tier: "blue",
    desc: "部队更耐消耗。",
    effects: { defAura: 0.08 },
  },
  xunliang: {
    id: "xunliang",
    name: "驯良",
    tier: "blue",
    desc: "忠诚更稳，难被挖角。",
    effects: { loyaltyBonus: 10 },
  },

  // 红色不利
  gangao: {
    id: "gangao",
    name: "高傲",
    tier: "red",
    desc: "难与同僚协同，连携效果降低。",
    effects: { auraMul: 0.7 },
  },
  huaiyi: {
    id: "huaiyi",
    name: "怀疑",
    tier: "red",
    desc: "忠诚波动，易生嫌隙。",
    effects: { loyaltyBonus: -8 },
  },
  caoshuai: {
    id: "caoshuai",
    name: "粗心",
    tier: "red",
    desc: "行军易遭伏击，侦察减弱。",
    effects: { ambushWeak: 0.15 },
  },
  jibing: {
    id: "jibing",
    name: "疾病",
    tier: "red",
    desc: "体弱，长期征战损耗更大。",
    effects: { forceMul: 0.92, moveBonus: -1 },
  },
  tanlan: {
    id: "tanlan",
    name: "贪婪",
    tier: "red",
    desc: "内政金产出被侵蚀。",
    effects: { goldMul: 0.9 },
  },
};

export function traitOf(id) {
  return TRAITS[id] || null;
}

export function describeTraits(ids = []) {
  return ids.map((id) => traitOf(id)).filter(Boolean);
}

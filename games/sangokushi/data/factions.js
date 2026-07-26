/**
 * 开局剧本：公元 190 年群雄割据
 * 武将编制：R-C-Group 势力表（powerId）全量武将 + 历史关键客将
 */

import { officersOfPower, officerByName, officerById } from "./officers.js";

export const FACTION_COLORS = {
  caocao: "#3a5a8a",
  liubei: "#2a6a3a",
  sunjian: "#8a3030",
  yuanshao: "#6a4a8a",
  yuanshu: "#8a6a2a",
  dongzhuo: "#4a3a2a",
  gongsunzan: "#2a6a6a",
  liubiao: "#5a6a3a",
  mateng: "#7a5a3a",
  shixie: "#3a6a5a",
  neutral: "#6a6558",
};

/** 剧本势力 ↔ 数据 powerId */
const POWER = {
  caocao: 1,
  liubei: 2,
  sunjian: 3,
  mateng: 4,
  dongzhuo: 6,
  liubiao: 7,
  yuanshao: 8,
  yuanshu: 9,
  gongsunzan: 12,
};

function idsOfNames(names) {
  return names.map((n) => officerByName(n)?.id).filter(Boolean);
}

/** 全量势力武将 + 客将（去重，君主置顶） */
function roster(powerId, extraNames = [], rulerName) {
  const must = idsOfNames(extraNames);
  const all = officersOfPower(powerId).map((o) => o.id);
  const ruler = rulerName ? officerByName(rulerName)?.id : all[0];
  const merged = [];
  const seen = new Set();
  for (const id of [ruler, ...must, ...all]) {
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

export const SCENARIO_190 = {
  id: "s190",
  name: "190 年 · 群雄割据",
  year: 190,
  desc: "董卓乱政，关东盟军初起。中华大地烽烟四起，以涂色争天下。",
  playable: ["caocao", "liubei", "sunjian", "yuanshao"],
  factions: {
    caocao: {
      id: "caocao",
      name: "曹操军",
      color: FACTION_COLORS.caocao,
      ruler: officerByName("曹操")?.id,
      powerId: POWER.caocao,
      cities: ["chenliu", "puyang", "dongjun", "jiyin", "qiao"],
      officers: roster(POWER.caocao, [], "曹操"),
    },
    liubei: {
      id: "liubei",
      name: "刘备军",
      color: FACTION_COLORS.liubei,
      ruler: officerByName("刘备")?.id,
      powerId: POWER.liubei,
      cities: ["xiaopei", "pei"],
      officers: roster(POWER.liubei, [], "刘备"),
    },
    sunjian: {
      id: "sunjian",
      name: "孙坚军",
      color: FACTION_COLORS.sunjian,
      ruler: officerByName("孙坚")?.id,
      powerId: POWER.sunjian,
      cities: ["changsha", "lujiang", "huan", "chaisang"],
      officers: roster(POWER.sunjian, [], "孙坚"),
    },
    yuanshao: {
      id: "yuanshao",
      name: "袁绍军",
      color: FACTION_COLORS.yuanshao,
      ruler: officerByName("袁绍")?.id,
      powerId: POWER.yuanshao,
      cities: ["ye", "nanpi", "ji", "julu", "anping", "bohai"],
      officers: roster(POWER.yuanshao, ["沮授", "张郃", "田丰"], "袁绍"),
    },
    yuanshu: {
      id: "yuanshu",
      name: "袁术军",
      color: FACTION_COLORS.yuanshu,
      ruler: officerByName("袁术")?.id,
      powerId: POWER.yuanshu,
      cities: ["shouchun", "jiujiang", "hefei"],
      officers: roster(POWER.yuanshu, [], "袁术"),
    },
    dongzhuo: {
      id: "dongzhuo",
      name: "董卓军",
      color: FACTION_COLORS.dongzhuo,
      ruler: officerByName("董卓")?.id,
      powerId: POWER.dongzhuo,
      cities: ["changan", "luoyang", "wan", "hongnong", "fengyi", "fufeng", "henei"],
      officers: roster(POWER.dongzhuo, ["吕布", "貂蝉", "贾诩"], "董卓"),
    },
    gongsunzan: {
      id: "gongsunzan",
      name: "公孙瓒军",
      color: FACTION_COLORS.gongsunzan,
      ruler: officerByName("公孙瓒")?.id,
      powerId: POWER.gongsunzan,
      cities: ["beiping", "xiangping", "zhuo", "yuyang"],
      officers: roster(POWER.gongsunzan, ["田豫"], "公孙瓒"),
    },
    liubiao: {
      id: "liubiao",
      name: "刘表军",
      color: FACTION_COLORS.liubiao,
      ruler: officerByName("刘表")?.id,
      powerId: POWER.liubiao,
      cities: ["xiangyang", "jiangling", "jiangxia", "xinye", "yicheng"],
      officers: roster(POWER.liubiao, [], "刘表"),
    },
    mateng: {
      id: "mateng",
      name: "马腾军",
      color: FACTION_COLORS.mateng,
      ruler: officerByName("马腾")?.id,
      powerId: POWER.mateng,
      cities: ["tianshui", "anding", "wuwei", "jincheng", "longxi", "hanyang"],
      officers: roster(POWER.mateng, ["韩遂"], "马腾"),
    },
    shixie: {
      id: "shixie",
      name: "士燮军",
      color: FACTION_COLORS.shixie,
      ruler: officerByName("士燮")?.id,
      powerId: 38,
      cities: ["jiaozhi", "nanhai", "cangwu", "hepu"],
      officers: [officerByName("士燮")?.id].filter(Boolean),
    },
  },
};

for (const f of Object.values(SCENARIO_190.factions)) {
  f.officers = f.officers.filter((id) => officerById(id));
  if (!f.ruler) f.ruler = f.officers[0];
}

/**
 * 开局剧本：公元 190 年群雄割据
 * 武将编制取自 R-C-Group 势力表（powerId）高能力武将
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

function roster(powerId, mustNames = [], limit = 14) {
  const must = [];
  for (const n of mustNames) {
    const o = officerByName(n);
    if (o) must.push(o.id);
  }
  const rest = officersOfPower(powerId, limit + 8)
    .map((o) => o.id)
    .filter((id) => !must.includes(id));
  return [...must, ...rest].slice(0, limit);
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
      cities: ["chenliu", "puyang"],
      officers: roster(POWER.caocao, ["曹操", "夏侯惇", "夏侯渊", "曹仁", "曹洪", "许褚", "典韦", "荀彧", "郭嘉", "乐进"], 14),
    },
    liubei: {
      id: "liubei",
      name: "刘备军",
      color: FACTION_COLORS.liubei,
      ruler: officerByName("刘备")?.id,
      powerId: POWER.liubei,
      cities: ["xiaopei"],
      officers: roster(POWER.liubei, ["刘备", "关羽", "张飞", "赵云", "徐庶"], 12),
    },
    sunjian: {
      id: "sunjian",
      name: "孙坚军",
      color: FACTION_COLORS.sunjian,
      ruler: officerByName("孙坚")?.id,
      powerId: POWER.sunjian,
      cities: ["changsha", "lujiang"],
      officers: roster(POWER.sunjian, ["孙坚", "孙策", "黄盖", "程普", "韩当", "周泰"], 12),
    },
    yuanshao: {
      id: "yuanshao",
      name: "袁绍军",
      color: FACTION_COLORS.yuanshao,
      ruler: officerByName("袁绍")?.id,
      powerId: POWER.yuanshao,
      cities: ["ye", "nanpi", "ji"],
      officers: roster(POWER.yuanshao, ["袁绍", "颜良", "文丑", "郭图", "沮授", "张郃"], 14),
    },
    yuanshu: {
      id: "yuanshu",
      name: "袁术军",
      color: FACTION_COLORS.yuanshu,
      ruler: officerByName("袁术")?.id,
      powerId: POWER.yuanshu,
      cities: ["shouchun"],
      officers: roster(POWER.yuanshu, ["袁术"], 8),
    },
    dongzhuo: {
      id: "dongzhuo",
      name: "董卓军",
      color: FACTION_COLORS.dongzhuo,
      ruler: officerByName("董卓")?.id,
      powerId: POWER.dongzhuo,
      cities: ["changan", "luoyang", "wan"],
      officers: roster(POWER.dongzhuo, ["董卓", "吕布", "华雄", "贾诩", "貂蝉"], 12),
    },
    gongsunzan: {
      id: "gongsunzan",
      name: "公孙瓒军",
      color: FACTION_COLORS.gongsunzan,
      ruler: officerByName("公孙瓒")?.id,
      powerId: POWER.gongsunzan,
      cities: ["beiping", "xiangping"],
      officers: roster(POWER.gongsunzan, ["公孙瓒"], 8),
    },
    liubiao: {
      id: "liubiao",
      name: "刘表军",
      color: FACTION_COLORS.liubiao,
      ruler: officerByName("刘表")?.id,
      powerId: POWER.liubiao,
      cities: ["xiangyang", "jiangling", "jiangxia"],
      officers: roster(POWER.liubiao, ["刘表"], 10),
    },
    mateng: {
      id: "mateng",
      name: "马腾军",
      color: FACTION_COLORS.mateng,
      ruler: officerByName("马腾")?.id,
      powerId: POWER.mateng,
      cities: ["tianshui", "anding", "wuwei"],
      officers: [
        ...roster(POWER.mateng, ["马腾", "马超"], 8),
        ...(officerByName("韩遂") ? [officerByName("韩遂").id] : []),
      ].slice(0, 10),
    },
    shixie: {
      id: "shixie",
      name: "士燮军",
      color: FACTION_COLORS.shixie,
      ruler: officerByName("士燮")?.id,
      powerId: 38,
      cities: ["jiaozhi", "nanhai"],
      officers: [officerByName("士燮")?.id].filter(Boolean),
    },
  },
};

// 校验编制存在
for (const f of Object.values(SCENARIO_190.factions)) {
  f.officers = f.officers.filter((id) => officerById(id));
  if (!f.ruler) f.ruler = f.officers[0];
}

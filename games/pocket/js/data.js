/**
 * 种族 / 招式 / 属性相性 — Gen1 风格纯数据。
 * 译名采用官方中文；非官方粉丝向作品。
 */

export const TYPE_ZH = {
  normal: "一般",
  flying: "飞行",
  grass: "草",
  fire: "火",
  water: "水",
  poison: "毒",
  ground: "地面",
  bug: "虫",
  electric: "电",
  fighting: "格斗",
  rock: "岩石",
  psychic: "超能力",
};

function M(id, name, type, power, accuracy, pp, extra = {}) {
  return {
    id,
    name,
    type,
    power,
    accuracy,
    pp,
    priority: extra.priority ?? 0,
    category: power > 0 ? "physical" : "status",
    fx: extra.fx || id,
    effect: extra.effect,
  };
}

export const MOVES = {
  tackle: M("tackle", "撞击", "normal", 40, 0.95, 35, { fx: "tackle" }),
  scratch: M("scratch", "抓", "normal", 40, 1, 35, { fx: "tackle" }),
  "quick-attack": M("quick-attack", "电光一闪", "normal", 40, 1, 30, { priority: 1, fx: "quick" }),
  "vine-whip": M("vine-whip", "藤鞭", "grass", 45, 1, 25, { fx: "vine" }),
  ember: M("ember", "火花", "fire", 40, 1, 25, { fx: "ember" }),
  "water-gun": M("water-gun", "水枪", "water", 40, 1, 25, { fx: "water" }),
  gust: M("gust", "起风", "flying", 40, 1, 35, { fx: "gust" }),
  growl: M("growl", "叫声", "normal", 0, 1, 40, {
    fx: "growl",
    effect: { stat: "atk", delta: -1, target: "foe" },
  }),
  "tail-whip": M("tail-whip", "摇尾巴", "normal", 0, 1, 30, {
    fx: "tailwhip",
    effect: { stat: "def", delta: -1, target: "foe" },
  }),
  "sand-attack": M("sand-attack", "泼沙", "ground", 0, 1, 15, {
    fx: "sand",
    effect: { stat: "acc", delta: -1, target: "foe" },
  }),
  "string-shot": M("string-shot", "吐丝", "bug", 0, 0.95, 40, {
    fx: "growl",
    effect: { stat: "spe", delta: -1, target: "foe" },
  }),
  "poison-sting": M("poison-sting", "毒针", "poison", 15, 1, 35, { fx: "tackle" }),
  harden: M("harden", "变硬", "normal", 0, 1, 30, {
    fx: "growl",
    effect: { stat: "def", delta: 1, target: "self" },
  }),
  leer: M("leer", "瞪眼", "normal", 0, 1, 30, {
    fx: "growl",
    effect: { stat: "def", delta: -1, target: "foe" },
  }),
  "thunder-shock": M("thunder-shock", "电击", "electric", 40, 1, 30, { fx: "ember" }),
  bite: M("bite", "咬住", "normal", 60, 1, 25, { fx: "tackle" }),
  absorb: M("absorb", "吸取", "grass", 20, 1, 25, { fx: "vine" }),
  confusion: M("confusion", "念力", "psychic", 50, 1, 25, { fx: "gust" }),
  "rock-throw": M("rock-throw", "落石", "rock", 50, 0.9, 15, { fx: "tackle" }),
  "low-kick": M("low-kick", "踢倒", "fighting", 50, 0.9, 20, { fx: "quick" }),
  wrap: M("wrap", "紧束", "normal", 15, 0.9, 20, { fx: "vine" }),
  peck: M("peck", "啄", "flying", 35, 1, 35, { fx: "quick" }),
  "mega-drain": M("mega-drain", "超级吸取", "grass", 40, 1, 15, { fx: "vine" }),
  "karate-chop": M("karate-chop", "空手劈", "fighting", 50, 1, 25, { fx: "tackle" }),
};

function S(id, name, types, base, moves, color, accent, blurb, shape = "blob", num = 0) {
  return { id, name, types, base, moves, color, accent, blurb, shape, num };
}

export const SPECIES = {
  bulbasaur: S("bulbasaur", "妙蛙种子", ["grass", "poison"], { hp: 45, atk: 49, def: 49, spe: 45 }, ["tackle", "growl", "vine-whip"], "#5cb85c", "#7ed17e", "背上的种子会吸收养分，一起长大。", "plant", 1),
  charmander: S("charmander", "小火龙", ["fire"], { hp: 39, atk: 52, def: 43, spe: 65 }, ["scratch", "growl", "ember"], "#e07a3a", "#f0b060", "尾巴上的火焰能反映情绪。", "lizard", 4),
  squirtle: S("squirtle", "杰尼龟", ["water"], { hp: 44, atk: 48, def: 65, spe: 43 }, ["tackle", "tail-whip", "water-gun"], "#4a9fd8", "#8ec8ef", "甲壳会随成长变硬。", "turtle", 7),
  caterpie: S("caterpie", "绿毛虫", ["bug"], { hp: 45, atk: 30, def: 35, spe: 45 }, ["tackle", "string-shot"], "#6ecf5a", "#a8e88a", "为了进化，拼命吃树叶。", "bug", 10),
  metapod: S("metapod", "铁甲蛹", ["bug"], { hp: 50, atk: 20, def: 55, spe: 30 }, ["harden"], "#78a848", "#c0d878", "壳很硬，里面正准备进化。", "bug", 11),
  weedle: S("weedle", "独角虫", ["bug", "poison"], { hp: 40, atk: 35, def: 30, spe: 50 }, ["poison-sting", "string-shot"], "#d8b040", "#f0d878", "头上的毒刺是它的武器。", "bug", 13),
  kakuna: S("kakuna", "铁壳蛹", ["bug", "poison"], { hp: 45, atk: 25, def: 50, spe: 35 }, ["harden"], "#e0c060", "#f5e0a0", "几乎不能动，靠壳防御。", "bug", 14),
  pidgey: S("pidgey", "波波", ["normal", "flying"], { hp: 40, atk: 45, def: 40, spe: 56 }, ["tackle", "sand-attack", "gust", "quick-attack"], "#c4a574", "#f0e0c0", "常见的小鸟宝可梦。", "bird", 16),
  rattata: S("rattata", "小拉达", ["normal"], { hp: 30, atk: 56, def: 35, spe: 72 }, ["tackle", "tail-whip", "quick-attack"], "#8a6a9a", "#c9a8d8", "门牙会不断生长。", "mouse", 19),
  spearow: S("spearow", "烈雀", ["normal", "flying"], { hp: 40, atk: 60, def: 30, spe: 70 }, ["peck", "growl", "leer"], "#c06040", "#e8a070", "性情急躁，地盘意识强。", "bird", 21),
  ekans: S("ekans", "阿柏蛇", ["poison"], { hp: 35, atk: 60, def: 44, spe: 55 }, ["wrap", "leer", "poison-sting"], "#a070c0", "#d0b0e8", "能自由地拉长身躯。", "snake", 23),
  pikachu: S("pikachu", "皮卡丘", ["electric"], { hp: 35, atk: 55, def: 40, spe: 90 }, ["thunder-shock", "growl", "quick-attack", "tail-whip"], "#f0d030", "#fff0a0", "两颊有电气囊。", "mouse", 25),
  "nidoran-f": S("nidoran-f", "尼多兰", ["poison"], { hp: 55, atk: 47, def: 52, spe: 41 }, ["growl", "tackle", "scratch", "poison-sting"], "#d8b0d0", "#f0d8e8", "听觉灵敏，性格谨慎。", "blob", 29),
  "nidoran-m": S("nidoran-m", "尼多朗", ["poison"], { hp: 46, atk: 57, def: 40, spe: 50 }, ["leer", "tackle", "poison-sting", "peck"], "#a090d0", "#c8b8f0", "耳朵很大，善于察觉危险。", "blob", 32),
  zubat: S("zubat", "超音蝠", ["poison", "flying"], { hp: 40, atk: 45, def: 35, spe: 55 }, ["leer", "bite", "gust"], "#7060b0", "#b0a0e0", "用超声波探路。", "bird", 41),
  oddish: S("oddish", "走路草", ["grass", "poison"], { hp: 45, atk: 50, def: 55, spe: 30 }, ["absorb", "growl", "mega-drain"], "#4068c0", "#70a060", "白天把脚埋进土里。", "plant", 43),
  paras: S("paras", "派拉斯", ["bug", "grass"], { hp: 35, atk: 70, def: 55, spe: 25 }, ["scratch", "absorb", "string-shot"], "#d07040", "#f0c070", "背上长着蘑菇。", "bug", 46),
  diglett: S("diglett", "地鼠", ["ground"], { hp: 10, atk: 55, def: 25, spe: 95 }, ["scratch", "growl", "sand-attack"], "#6a4830", "#b09070", "几乎只露出头部。", "blob", 50),
  mankey: S("mankey", "猴怪", ["fighting"], { hp: 40, atk: 80, def: 35, spe: 70 }, ["scratch", "leer", "low-kick", "karate-chop"], "#c09060", "#e8c8a0", "脾气暴躁，动不动就发火。", "blob", 56),
  growlithe: S("growlithe", "卡蒂狗", ["fire"], { hp: 55, atk: 70, def: 45, spe: 60 }, ["bite", "leer", "ember", "growl"], "#e07030", "#f0c070", "忠诚且勇敢。", "mouse", 58),
  poliwag: S("poliwag", "蚊香蝌蚪", ["water"], { hp: 40, atk: 50, def: 40, spe: 90 }, ["water-gun", "growl", "tackle", "tail-whip"], "#5080c8", "#a0c8f0", "肚子上的漩涡是它的内脏。", "blob", 60),
  abra: S("abra", "凯西", ["psychic"], { hp: 25, atk: 20, def: 15, spe: 90 }, ["confusion", "tackle"], "#d0b040", "#f0e090", "一天要睡十八个小时。", "blob", 63),
  machop: S("machop", "腕力", ["fighting"], { hp: 70, atk: 80, def: 50, spe: 35 }, ["low-kick", "leer", "karate-chop"], "#7080c0", "#b0b8e0", "喜欢锻炼肌肉。", "blob", 66),
  geodude: S("geodude", "小拳石", ["rock", "ground"], { hp: 40, atk: 80, def: 100, spe: 20 }, ["tackle", "rock-throw", "harden"], "#a09070", "#d0c8a8", "外表像石头，容易被忽略。", "rock", 74),
  onix: S("onix", "大岩蛇", ["rock", "ground"], { hp: 35, atk: 45, def: 160, spe: 70 }, ["tackle", "rock-throw", "harden", "wrap"], "#808078", "#c0c0b0", "身躯又长又坚硬。", "snake", 95),
};

export const STARTERS = ["bulbasaur", "charmander", "squirtle"];

/** 图鉴展示顺序 */
export const DEX_ORDER = Object.values(SPECIES)
  .sort((a, b) => a.num - b.num)
  .map((s) => s.id);

export const RIVAL_STARTER = {
  bulbasaur: "charmander",
  charmander: "squirtle",
  squirtle: "bulbasaur",
};

const CHART = {
  flying: { grass: 2, bug: 2, fighting: 2, rock: 0.5, electric: 0.5 },
  grass: { water: 2, ground: 2, rock: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5 },
  fire: { grass: 2, bug: 2, fire: 0.5, water: 0.5, rock: 0.5 },
  water: { fire: 2, ground: 2, rock: 2, water: 0.5, grass: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5 },
  ground: { fire: 2, poison: 2, rock: 2, electric: 2, grass: 0.5, bug: 0.5, flying: 0 },
  bug: { grass: 2, psychic: 2, fire: 0.5, fighting: 0.5, poison: 0.5, flying: 0.5 },
  electric: { water: 2, flying: 2, electric: 0.5, grass: 0.5, ground: 0 },
  fighting: { normal: 2, rock: 2, flying: 0.5, poison: 0.5, psychic: 0.5, bug: 0.5 },
  rock: { fire: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  normal: { rock: 0.5 },
};

export function effectiveness(moveType, defenderTypes) {
  let mult = 1;
  for (const t of defenderTypes) mult *= CHART[moveType]?.[t] ?? 1;
  return mult;
}

export function statsAtLevel(species, level) {
  const grow = (base) => Math.floor((2 * base * level) / 100);
  return {
    hp: grow(species.base.hp) + level + 10,
    atk: grow(species.base.atk) + 5,
    def: grow(species.base.def) + 5,
    spe: grow(species.base.spe) + 5,
  };
}

export function stageMultiplier(stage) {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function accuracyStageMultiplier(stage) {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

export function computeDamage(level, move, atk, def, atkRaw, defRaw, atkTypes, defTypes, rng) {
  const eff = effectiveness(move.type, defTypes);
  const stab = atkTypes.includes(move.type);
  if (move.power <= 0 || eff === 0) {
    return { damage: 0, crit: false, effectiveness: eff, stab };
  }
  const crit = rng() < 1 / 16;
  const L = crit ? level * 2 : level;
  const A = crit ? atkRaw : atk;
  const D = crit ? defRaw : def;
  let dmg =
    Math.floor(Math.floor((Math.floor((2 * L) / 5 + 2) * move.power * A) / Math.max(1, D)) / 50) + 2;
  if (stab) dmg = Math.floor(dmg * 1.5);
  dmg = Math.floor(dmg * eff);
  if (dmg > 0) {
    const roll = 217 + Math.floor(rng() * 39);
    dmg = Math.max(1, Math.floor((dmg * roll) / 255));
  }
  return { damage: dmg, crit, effectiveness: eff, stab };
}

export function makePartyMon(speciesId, level, hp, xp = 0) {
  const sp = SPECIES[speciesId];
  const stats = statsAtLevel(sp, level);
  return {
    species: speciesId,
    name: sp.name,
    level,
    xp,
    stats,
    hp: hp == null ? stats.hp : Math.max(0, Math.min(stats.hp, hp)),
    moves: sp.moves.slice(0, 4).map((id) => ({ id, pp: MOVES[id].pp })),
  };
}

export function xpToNext(level) {
  return level * 18;
}

/** 施加经验；可能连升多级。返回文案行。 */
export function applyXp(mon, amount) {
  const lines = [];
  mon.xp = (mon.xp || 0) + amount;
  lines.push(`${mon.name} 获得了 ${amount} 点经验！`);
  while (mon.level < 100 && mon.xp >= xpToNext(mon.level)) {
    mon.xp -= xpToNext(mon.level);
    mon.level += 1;
    const ratio = mon.stats.hp ? mon.hp / mon.stats.hp : 1;
    mon.stats = statsAtLevel(SPECIES[mon.species], mon.level);
    mon.hp = Math.max(1, Math.round(mon.stats.hp * ratio));
    // refresh moves from species learnset (keep PP ratio roughly)
    const ids = SPECIES[mon.species].moves.slice(0, 4);
    mon.moves = ids.map((id, i) => ({
      id,
      pp: mon.moves[i] ? Math.min(MOVES[id].pp, mon.moves[i].pp + 2) : MOVES[id].pp,
    }));
    lines.push(`${mon.name} 升到了 Lv.${mon.level}！`);
  }
  return lines;
}

export function catchRate(foeHp, foeMax, ballsOk) {
  if (!ballsOk) return 0;
  const hpFactor = 1 - foeHp / Math.max(1, foeMax);
  return Math.min(0.92, 0.28 + hpFactor * 0.55);
}

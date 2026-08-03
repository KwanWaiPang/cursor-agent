/**
 * 种族 / 招式 / 属性相性 — Gen1 公式纯数据。
 * 译名采用官方中文；项目为非官方粉丝向作品。
 */

export const TYPE_ZH = {
  normal: "一般",
  flying: "飞行",
  grass: "草",
  fire: "火",
  water: "水",
  poison: "毒",
  ground: "地面",
};

export const MOVES = {
  tackle: {
    id: "tackle",
    name: "撞击",
    type: "normal",
    power: 40,
    accuracy: 0.95,
    pp: 35,
    priority: 0,
    category: "physical",
    fx: "tackle",
  },
  scratch: {
    id: "scratch",
    name: "抓",
    type: "normal",
    power: 40,
    accuracy: 1,
    pp: 35,
    priority: 0,
    category: "physical",
    fx: "tackle",
  },
  "quick-attack": {
    id: "quick-attack",
    name: "电光一闪",
    type: "normal",
    power: 40,
    accuracy: 1,
    pp: 30,
    priority: 1,
    category: "physical",
    fx: "quick",
  },
  "vine-whip": {
    id: "vine-whip",
    name: "藤鞭",
    type: "grass",
    power: 45,
    accuracy: 1,
    pp: 25,
    priority: 0,
    category: "physical",
    fx: "vine",
  },
  ember: {
    id: "ember",
    name: "火花",
    type: "fire",
    power: 40,
    accuracy: 1,
    pp: 25,
    priority: 0,
    category: "physical",
    fx: "ember",
  },
  "water-gun": {
    id: "water-gun",
    name: "水枪",
    type: "water",
    power: 40,
    accuracy: 1,
    pp: 25,
    priority: 0,
    category: "physical",
    fx: "water",
  },
  gust: {
    id: "gust",
    name: "起风",
    type: "flying",
    power: 40,
    accuracy: 1,
    pp: 35,
    priority: 0,
    category: "physical",
    fx: "gust",
  },
  growl: {
    id: "growl",
    name: "叫声",
    type: "normal",
    power: 0,
    accuracy: 1,
    pp: 40,
    priority: 0,
    category: "status",
    fx: "growl",
    effect: { stat: "atk", delta: -1, target: "foe" },
  },
  "tail-whip": {
    id: "tail-whip",
    name: "摇尾巴",
    type: "normal",
    power: 0,
    accuracy: 1,
    pp: 30,
    priority: 0,
    category: "status",
    fx: "tailwhip",
    effect: { stat: "def", delta: -1, target: "foe" },
  },
  "sand-attack": {
    id: "sand-attack",
    name: "泼沙",
    type: "ground",
    power: 0,
    accuracy: 1,
    pp: 15,
    priority: 0,
    category: "status",
    fx: "sand",
    effect: { stat: "acc", delta: -1, target: "foe" },
  },
};

export const SPECIES = {
  bulbasaur: {
    id: "bulbasaur",
    name: "妙蛙种子",
    types: ["grass", "poison"],
    base: { hp: 45, atk: 49, def: 49, spe: 45 },
    moves: ["tackle", "growl", "vine-whip"],
    color: "#5cb85c",
    accent: "#7ed17e",
    blurb: "背上的种子会吸收养分，一起长大。性格沉稳。",
  },
  charmander: {
    id: "charmander",
    name: "小火龙",
    types: ["fire"],
    base: { hp: 39, atk: 52, def: 43, spe: 65 },
    moves: ["scratch", "growl", "ember"],
    color: "#e07a3a",
    accent: "#f0b060",
    blurb: "尾巴上的火焰能反映情绪。生性好胜。",
  },
  squirtle: {
    id: "squirtle",
    name: "杰尼龟",
    types: ["water"],
    base: { hp: 44, atk: 48, def: 65, spe: 43 },
    moves: ["tackle", "tail-whip", "water-gun"],
    color: "#4a9fd8",
    accent: "#8ec8ef",
    blurb: "甲壳会随成长变硬。爱玩水，反应灵敏。",
  },
  pidgey: {
    id: "pidgey",
    name: "波波",
    types: ["normal", "flying"],
    base: { hp: 40, atk: 45, def: 40, spe: 56 },
    moves: ["tackle", "sand-attack", "gust", "quick-attack"],
    color: "#c4a574",
    accent: "#f0e0c0",
    blurb: "常见的小鸟宝可梦，警惕性很高。",
  },
  rattata: {
    id: "rattata",
    name: "小拉达",
    types: ["normal"],
    base: { hp: 30, atk: 56, def: 35, spe: 72 },
    moves: ["tackle", "tail-whip", "quick-attack"],
    color: "#8a6a9a",
    accent: "#c9a8d8",
    blurb: "门牙会不断生长，什么都想咬一口。",
  },
};

export const STARTERS = ["bulbasaur", "charmander", "squirtle"];

const CHART = {
  flying: { grass: 2 },
  grass: { water: 2, ground: 2, fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5 },
  fire: { grass: 2, fire: 0.5, water: 0.5 },
  water: { fire: 2, ground: 2, water: 0.5, grass: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5 },
  ground: { fire: 2, poison: 2, grass: 0.5, flying: 0 },
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

export function makePartyMon(speciesId, level, hp) {
  const sp = SPECIES[speciesId];
  const stats = statsAtLevel(sp, level);
  return {
    species: speciesId,
    name: sp.name,
    level,
    stats,
    hp: hp == null ? stats.hp : Math.max(0, Math.min(stats.hp, hp)),
    moves: sp.moves.slice(0, 4).map((id) => ({ id, pp: MOVES[id].pp })),
  };
}

/**
 * 真新镇开局地图（俯视格子）。
 * 图例：
 *   . 草地/土地   , 石板路   # 墙/悬崖   T 树
 *   ~ 水          G 长草(遇敌) F 室内地板  D 门/出口
 *   B 建筑墙      = 实验台    @ 出生点标记(运行时替换)
 */

export const TILE = {
  GRASS: ".",
  PATH: ",",
  WALL: "#",
  TREE: "T",
  WATER: "~",
  TALL: "G",
  FLOOR: "F",
  DOOR: "D",
  BUILD: "B",
  TABLE: "=",
};

const SOLID = new Set(["#", "T", "~", "B", "="]);

export function isSolid(ch) {
  return SOLID.has(ch);
}

export function isTallGrass(ch) {
  return ch === "G";
}

/** @type {Record<string, { name: string; w: number; h: number; tiles: string[]; warps: object[]; npcs: object[]; spawns?: object[] }>} */
export const MAPS = {
  bedroom: {
    name: "自己的房间",
    w: 10,
    h: 8,
    tiles: [
      "BBBBBBBBBB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BFFFFDFFFB",
      "BBBBBBBBBB",
    ],
    warps: [{ x: 5, y: 6, to: "house", tx: 3, ty: 2, facing: "down" }],
    npcs: [
      {
        x: 2,
        y: 2,
        name: "电脑",
        solid: true,
        lines: ["启动了电脑……", "还没有联网对战。以后或许会有。", "关机了。"],
      },
      {
        x: 7,
        y: 2,
        name: "电视",
        solid: true,
        lines: ["电视正在播送：关都地区今天天气晴朗。", "……你关掉了电视。"],
      },
    ],
    spawn: { x: 5, y: 4, facing: "down" },
  },

  house: {
    name: "自己的家",
    w: 12,
    h: 10,
    tiles: [
      "BBBBBBBBBBBB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFDFFFFB",
      "BFFFFFFFFFFB",
      "BBBBBBBBBBBB",
    ],
    warps: [
      { x: 6, y: 7, to: "town", tx: 8, ty: 12, facing: "down" },
      { x: 3, y: 1, to: "bedroom", tx: 5, ty: 5, facing: "up" },
    ],
    npcs: [
      {
        x: 8,
        y: 3,
        name: "妈妈",
        solid: true,
        lines: [
          "妈妈：出门记得小心。",
          "大木博士好像在找你——去北边的研究所看看吧。",
          "路上的草丛里会跳出野生宝可梦哦。",
        ],
      },
    ],
    spawn: { x: 6, y: 5, facing: "down" },
  },

  town: {
    name: "真新镇",
    w: 22,
    h: 20,
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T....................T",
      "T..TTTT........TTTT..T",
      "T..T,,T........T,,T..T",
      "T..T,,T........T,,T..T",
      "T..T,,D........D,,T..T",
      "T..TTTT........TTTT..T",
      "T....................T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T..........,,,,......T",
      "T..........,,,,......T",
      "T..........,,,,......T",
      "T..........,,,,......T",
      "T~~~~......,,,,......T",
      "T~~~~......,,,,......T",
      "T~~~~,,,,,,,,,,,,,,,,T",
      "T..............GGGGGGT",
      "T..............GGGGGGT",
      "TTTTTTTTTTTTTTTDTTTTTT",
    ],
    warps: [
      { x: 6, y: 5, to: "house", tx: 6, ty: 6, facing: "up", label: "家" },
      { x: 15, y: 5, to: "lab", tx: 6, ty: 10, facing: "up", label: "研究所" },
      { x: 15, y: 19, to: "route1", tx: 7, ty: 1, facing: "down", label: "1号道路" },
    ],
    npcs: [
      {
        x: 10,
        y: 9,
        name: "路人",
        solid: true,
        lines: ["真新镇虽小，却是冒险的起点。", "北边是大木博士的研究所。"],
      },
      {
        x: 4,
        y: 11,
        name: "告示牌",
        solid: true,
        lines: ["真新镇 —— 红与绿的起点。", "南边通往 1 号道路。"],
      },
    ],
    spawn: { x: 8, y: 12, facing: "down" },
  },

  lab: {
    name: "大木研究所",
    w: 14,
    h: 12,
    tiles: [
      "BBBBBBBBBBBBBB",
      "BFFFFFFFFFFFFB",
      "BFFFFFFFFFFFFB",
      "BF===FFFF===FB",
      "BFFFFFFFFFFFFB",
      "BFFFFFFFFFFFFB",
      "BFFFFFFFFFFFFB",
      "BFFFFFFFFFFFFB",
      "BFFFFFFFFFFFFB",
      "BFFFFFFFFFFFFB",
      "BFFFFFDFFFFFFB",
      "BBBBBBBBBBBBBB",
    ],
    warps: [{ x: 6, y: 10, to: "town", tx: 15, ty: 6, facing: "down" }],
    npcs: [
      {
        x: 6,
        y: 2,
        name: "大木博士",
        id: "oak",
        solid: true,
        lines: [], // 由剧情脚本覆盖
      },
      {
        x: 3,
        y: 3,
        name: "球托盘·草",
        id: "ball-bulbasaur",
        solid: true,
        lines: ["装着妙蛙种子的精灵球。"],
      },
      {
        x: 6,
        y: 3,
        name: "球托盘·火",
        id: "ball-charmander",
        solid: true,
        lines: ["装着小火龙的精灵球。"],
      },
      {
        x: 9,
        y: 3,
        name: "球托盘·水",
        id: "ball-squirtle",
        solid: true,
        lines: ["装着杰尼龟的精灵球。"],
      },
      {
        x: 11,
        y: 6,
        name: "助手",
        solid: true,
        lines: ["助手：大木博士在研究宝可梦与人类的关系。", "请先和他谈谈。"],
      },
    ],
    spawn: { x: 6, y: 9, facing: "up" },
  },

  route1: {
    name: "1号道路",
    w: 16,
    h: 18,
    tiles: [
      "TTTTTTTTTTTTTTTT",
      "T,,,,,,D,,,,,,,T",
      "T,,,,,,,,,,,,,,T",
      "T,,,,GGGG,,,,,,T",
      "T,,,,GGGG,,,,,,T",
      "T,,,,,,,,,,,,,,T",
      "T,,,,,,GGGG,,,,T",
      "T,,,,,,GGGG,,,,T",
      "T,,,,,,,,,,,,,,T",
      "T,,,,GG,,,,,,,,T",
      "T,,,,GG,,,,,,,,T",
      "T~~~~~~~~~~~~~~T",
      "T~~~~~~~~~~~~~~T",
      "T,,,,,,,,,,,,,,T",
      "T,,,,,,GGGGGG,,T",
      "T,,,,,,GGGGGG,,T",
      "T,,,,,,,,,,,,,,T",
      "TTTTTTTTTTTTTTTT",
    ],
    warps: [{ x: 7, y: 1, to: "town", tx: 15, ty: 18, facing: "up" }],
    npcs: [
      {
        x: 3,
        y: 2,
        name: "告示牌",
        solid: true,
        lines: ["1 号道路", "前方长草中可能出现野生宝可梦！"],
      },
    ],
    spawns: [
      { species: "pidgey", weight: 55, levels: [2, 4] },
      { species: "rattata", weight: 45, levels: [2, 4] },
    ],
    spawn: { x: 7, y: 2, facing: "down" },
  },
};

export function tileAt(map, x, y) {
  if (y < 0 || y >= map.h || x < 0 || x >= map.w) return "#";
  return map.tiles[y][x];
}

export function pickWild(map, rng = Math.random) {
  const table = map.spawns || [];
  if (!table.length) return null;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of table) {
    roll -= e.weight;
    if (roll <= 0) {
      const [lo, hi] = e.levels;
      const level = lo + Math.floor(rng() * (hi - lo + 1));
      return { species: e.species, level };
    }
  }
  const last = table[table.length - 1];
  return { species: last.species, level: last.levels[0] };
}

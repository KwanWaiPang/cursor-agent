/**
 * 多地图：真新镇 → 1号道路 → 常青市 → 2号道路 → 常青森林 → 尼比市 / 道馆
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
      { x: 2, y: 2, name: "电脑", solid: true, lines: ["启动了电脑……", "图鉴数据已同步到口袋终端。", "关机了。"] },
      { x: 7, y: 2, name: "电视", solid: true, lines: ["电视：关都地区的训练家们正在挑战道馆！", "……你关掉了电视。"] },
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
        id: "mom",
        solid: true,
        lines: [],
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
      { x: 6, y: 5, to: "house", tx: 6, ty: 6, facing: "up" },
      { x: 15, y: 5, to: "lab", tx: 6, ty: 10, facing: "up" },
      { x: 15, y: 19, to: "route1", tx: 7, ty: 1, facing: "down" },
    ],
    npcs: [
      { x: 10, y: 9, name: "路人", solid: true, lines: ["真新镇虽小，却是冒险的起点。", "南边的 1 号道路通往常青市。"] },
      { x: 4, y: 11, name: "告示牌", solid: true, lines: ["真新镇", "南 → 1 号道路 / 常青市"] },
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
      { x: 6, y: 2, name: "大木博士", id: "oak", solid: true, lines: [] },
      { x: 3, y: 3, name: "球托盘·草", id: "ball-bulbasaur", solid: true, lines: ["装着妙蛙种子的精灵球。"] },
      { x: 6, y: 3, name: "球托盘·火", id: "ball-charmander", solid: true, lines: ["装着小火龙的精灵球。"] },
      { x: 9, y: 3, name: "球托盘·水", id: "ball-squirtle", solid: true, lines: ["装着杰尼龟的精灵球。"] },
      { x: 11, y: 6, name: "助手", solid: true, lines: ["助手：完成图鉴是大木博士的毕生心愿。"] },
      { x: 2, y: 8, name: "劲敌", id: "rival", solid: true, lines: [] },
    ],
    spawn: { x: 6, y: 9, facing: "up" },
  },

  route1: {
    name: "1号道路",
    w: 16,
    h: 20,
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
      "T,,,,GGGG,,,,,,T",
      "T,,,,,,D,,,,,,,T",
      "TTTTTTTTTTTTTTTT",
    ],
    warps: [
      { x: 7, y: 1, to: "town", tx: 15, ty: 18, facing: "up" },
      { x: 7, y: 18, to: "viridian", tx: 10, ty: 2, facing: "down" },
    ],
    npcs: [
      { x: 3, y: 2, name: "告示牌", solid: true, lines: ["1 号道路", "北：真新镇　南：常青市"] },
      {
        x: 11,
        y: 8,
        name: "少年",
        id: "trainer-route1",
        solid: true,
        trainer: {
          name: "少年·阿武",
          beatenFlag: "beatRoute1Kid",
          party: [{ species: "rattata", level: 4 }],
          intro: ["少年：喂！比试一下吧！"],
          win: ["少年：好强……你也会去常青市吗？"],
          lose: ["少年：回去再练练吧！"],
        },
        lines: ["少年：草丛里藏着宝可梦！"],
      },
    ],
    spawns: [
      { species: "pidgey", weight: 45, levels: [2, 4] },
      { species: "rattata", weight: 40, levels: [2, 4] },
      { species: "nidoran-f", weight: 8, levels: [3, 4] },
      { species: "nidoran-m", weight: 7, levels: [3, 4] },
    ],
    spawn: { x: 7, y: 2, facing: "down" },
  },

  viridian: {
    name: "常青市",
    w: 22,
    h: 18,
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T,,,,,,,,,,D,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T..BBBB....,,,,.BBBB.T",
      "T..BFFB....,,,,.BFFB.T",
      "T..BFDB....,,,,.BFDB.T",
      "T..BBBB....,,,,.BBBB.T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T....BBBBBB,,,,,,,,,,T",
      "T....BFFFFB,,,GGGG,,,T",
      "T....BFFDFB,,,GGGG,,,T",
      "T....BBBBBB,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,GGGG,,,,,,,,,,T",
      "T,,,,,,GGGG,,,,,,,,,,T",
      "T,,,,,,,,,,D,,,,,,,,,T",
      "TTTTTTTTTTTTTTTTTTTTTT",
    ],
    warps: [
      { x: 11, y: 1, to: "route1", tx: 7, ty: 17, facing: "up" },
      { x: 5, y: 5, to: "center", tx: 5, ty: 7, facing: "up" },
      { x: 18, y: 5, to: "mart", tx: 4, ty: 6, facing: "up" },
      { x: 11, y: 16, to: "route2", tx: 8, ty: 1, facing: "down" },
    ],
    npcs: [
      { x: 8, y: 8, name: "告示牌", solid: true, lines: ["常青市", "西：宝可梦中心　东：商店　南：2 号道路"] },
      { x: 14, y: 7, name: "老爷爷", solid: true, lines: ["往南穿过森林，就能到尼比市。", "那里有岩石道馆。"] },
      {
        x: 3,
        y: 12,
        name: "警察",
        solid: true,
        lines: ["前面的道路正在整修……不对，你可以通行。", "常青道馆馆主好像经常不在。"],
      },
    ],
    spawns: [{ species: "rattata", weight: 100, levels: [3, 5] }],
    spawn: { x: 11, y: 8, facing: "down" },
  },

  center: {
    name: "宝可梦中心",
    w: 12,
    h: 9,
    tiles: [
      "BBBBBBBBBBBB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFF==FFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFDFFFFFB",
      "BBBBBBBBBBBB",
    ],
    warps: [{ x: 5, y: 7, to: "viridian", tx: 5, ty: 6, facing: "down" }],
    npcs: [
      { x: 5, y: 3, name: "护士", id: "nurse", solid: true, lines: [] },
      { x: 9, y: 5, name: "训练家", solid: true, lines: ["中心可以免费恢复体力，太方便了！"] },
    ],
    spawn: { x: 5, y: 6, facing: "up" },
  },

  mart: {
    name: "友好商店",
    w: 10,
    h: 8,
    tiles: [
      "BBBBBBBBBB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BF===FFFFB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BFFFDFFFFB",
      "BBBBBBBBBB",
    ],
    warps: [{ x: 4, y: 6, to: "viridian", tx: 18, ty: 6, facing: "down" }],
    npcs: [
      { x: 3, y: 3, name: "店员", id: "clerk", solid: true, lines: [] },
      { x: 7, y: 4, name: "顾客", solid: true, lines: ["听说大木博士的包裹寄到这里了。"] },
    ],
    spawn: { x: 4, y: 5, facing: "up" },
  },

  route2: {
    name: "2号道路",
    w: 18,
    h: 16,
    tiles: [
      "TTTTTTTTTTTTTTTTTT",
      "T,,,,,,,D,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,T",
      "T,,,,GGGG,,,,,,,,T",
      "T,,,,GGGG,,GG,,,,T",
      "T,,,,,,,,,,GG,,,,T",
      "T,,,,,,,,,,,,,,,,T",
      "T,,,GGGGGG,,,,,,,T",
      "T,,,GGGGGG,,,,,,,T",
      "T,,,,,,,,,,,,,,,,T",
      "T,,,,,,TTTT,,,,,,T",
      "T,,,,,,T,,T,,,,,,T",
      "T,,,,,,T,,T,,,,,,T",
      "T,,,,,,TD,T,,,,,,T",
      "T,,,,,,,,,,,,,,,,T",
      "TTTTTTTTTTTTTTTTTT",
    ],
    warps: [
      { x: 8, y: 1, to: "viridian", tx: 11, ty: 15, facing: "up" },
      { x: 8, y: 13, to: "forest", tx: 9, ty: 1, facing: "down" },
    ],
    npcs: [
      { x: 3, y: 2, name: "告示牌", solid: true, lines: ["2 号道路", "南：常青森林入口"] },
      {
        x: 13,
        y: 6,
        name: "捕虫少年",
        id: "trainer-route2",
        solid: true,
        trainer: {
          name: "捕虫少年·小绿",
          beatenFlag: "beatRoute2Bug",
          party: [
            { species: "weedle", level: 5 },
            { species: "caterpie", level: 5 },
          ],
          intro: ["捕虫少年：虫子最棒了！来对战！"],
          win: ["捕虫少年：森林里还有更强的……"],
          lose: ["捕虫少年：虫系的潜力你还不懂！"],
        },
        lines: ["我要抓齐所有虫子！"],
      },
    ],
    spawns: [
      { species: "pidgey", weight: 30, levels: [3, 5] },
      { species: "caterpie", weight: 25, levels: [3, 5] },
      { species: "weedle", weight: 25, levels: [3, 5] },
      { species: "nidoran-m", weight: 10, levels: [4, 5] },
      { species: "nidoran-f", weight: 10, levels: [4, 5] },
    ],
    spawn: { x: 8, y: 2, facing: "down" },
  },

  forest: {
    name: "常青森林",
    w: 20,
    h: 18,
    tiles: [
      "TTTTTTTTTTTTTTTTTTTT",
      "T,,,,,,,,D,,,,,,,,,T",
      "T,,TT,,,,,,,,,,TT,,T",
      "T,,TT,,GGGG,,,,TT,,T",
      "T,,,,,,GGGG,,,,,,,,T",
      "T,,TT,,,,,,,,,,TT,,T",
      "T,,TT,,GG,,GG,,TT,,T",
      "T,,,,,,GG,,GG,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,T",
      "T,,GGGG,,,,,,GGGG,,T",
      "T,,GGGG,,,,,,GGGG,,T",
      "T,,,,,,,,,,,,,,,,,,T",
      "T,,TT,,,,~~,,,,TT,,T",
      "T,,TT,,,,~~,,,,TT,,T",
      "T,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,GGGG,,,,,,,,T",
      "T,,,,,,,,D,,,,,,,,,T",
      "TTTTTTTTTTTTTTTTTTTT",
    ],
    warps: [
      { x: 9, y: 1, to: "route2", tx: 8, ty: 12, facing: "up" },
      { x: 9, y: 16, to: "pewter", tx: 10, ty: 2, facing: "down" },
    ],
    npcs: [
      { x: 4, y: 2, name: "告示牌", solid: true, lines: ["常青森林", "迷路时沿着小路走。南出森林即尼比市。"] },
      {
        x: 14,
        y: 8,
        name: "捕虫少年",
        id: "trainer-forest",
        solid: true,
        trainer: {
          name: "捕虫少年·阿虫",
          beatenFlag: "beatForestBug",
          party: [
            { species: "metapod", level: 6 },
            { species: "kakuna", level: 6 },
            { species: "paras", level: 7 },
          ],
          intro: ["阿虫：森林是我的主场！"],
          win: ["阿虫：你可以去尼比市了……"],
          lose: ["阿虫：再来挑战呀！"],
        },
        lines: ["你看到皮卡丘了吗？好少见……"],
      },
      {
        x: 6,
        y: 14,
        name: "研究员",
        solid: true,
        lines: ["森林深处有时能遇到皮卡丘。", "把见到的宝可梦都记进图鉴吧！"],
      },
    ],
    spawns: [
      { species: "caterpie", weight: 25, levels: [4, 6] },
      { species: "metapod", weight: 15, levels: [5, 6] },
      { species: "weedle", weight: 25, levels: [4, 6] },
      { species: "kakuna", weight: 15, levels: [5, 6] },
      { species: "pikachu", weight: 8, levels: [5, 7] },
      { species: "oddish", weight: 7, levels: [5, 6] },
      { species: "paras", weight: 5, levels: [5, 6] },
    ],
    spawn: { x: 9, y: 2, facing: "down" },
  },

  pewter: {
    name: "尼比市",
    w: 22,
    h: 16,
    tiles: [
      "TTTTTTTTTTTTTTTTTTTTTT",
      "T,,,,,,,,,,D,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,BBBB,,,,,,,,BBBB,T",
      "T,,,BFFB,,,,,,,,BFFB,T",
      "T,,,BFDB,,, ,, ,,BFDB,T".replace(/ /g, ","),
      "T,,,BBBB,,,,,,,,BBBB,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,BBBBBB,,,,,,,,T",
      "T,,,,,,BFFFFB,,,GG,,,T",
      "T,,,,,,BFFDFB,,,GG,,,T",
      "T,,,,,,BBBBBB,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "T,,,,,,,,,,,,,,,,,,,,T",
      "TTTTTTTTTTTTTTTTTTTTTT",
    ],
    warps: [
      { x: 11, y: 1, to: "forest", tx: 9, ty: 15, facing: "up" },
      { x: 6, y: 5, to: "pewter_center", tx: 5, ty: 7, facing: "up" },
      { x: 18, y: 5, to: "pewter_mart", tx: 4, ty: 6, facing: "up" },
      { x: 10, y: 11, to: "gym", tx: 5, ty: 10, facing: "up" },
    ],
    npcs: [
      { x: 8, y: 7, name: "告示牌", solid: true, lines: ["尼比市", "道馆馆主：小刚　属性：岩石"] },
      { x: 14, y: 8, name: "游客", solid: true, lines: ["博物馆暂时闭馆整修。", "先去挑战道馆吧！"] },
      {
        x: 3,
        y: 10,
        name: "路人",
        solid: true,
        lines: ["小刚的大岩蛇防御超高……", "用草系或水系会轻松一些。"],
      },
    ],
    spawn: { x: 11, y: 3, facing: "down" },
  },

  pewter_center: {
    name: "尼比·宝可梦中心",
    w: 12,
    h: 9,
    tiles: [
      "BBBBBBBBBBBB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFF==FFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFDFFFFFB",
      "BBBBBBBBBBBB",
    ],
    warps: [{ x: 5, y: 7, to: "pewter", tx: 6, ty: 6, facing: "down" }],
    npcs: [{ x: 5, y: 3, name: "护士", id: "nurse", solid: true, lines: [] }],
    spawn: { x: 5, y: 6, facing: "up" },
  },

  pewter_mart: {
    name: "尼比·友好商店",
    w: 10,
    h: 8,
    tiles: [
      "BBBBBBBBBB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BF===FFFFB",
      "BFFFFFFFFB",
      "BFFFFFFFFB",
      "BFFFDFFFFB",
      "BBBBBBBBBB",
    ],
    warps: [{ x: 4, y: 6, to: "pewter", tx: 18, ty: 6, facing: "down" }],
    npcs: [
      {
        x: 3,
        y: 3,
        name: "店员",
        id: "pewter-clerk",
        solid: true,
        lines: ["欢迎！今天精灵球买一送……算了还是原价。", "（此处暂不开放购物，中心可以恢复体力。）"],
      },
    ],
    spawn: { x: 4, y: 5, facing: "up" },
  },

  gym: {
    name: "尼比道馆",
    w: 12,
    h: 12,
    tiles: [
      "BBBBBBBBBBBB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFF==FFFFB",
      "BFFFFFFFFFFB",
      "BFF######FFB",
      "BFF######FFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFFFFFFFB",
      "BFFFFDFFFFFB",
      "BBBBBBBBBBBB",
    ],
    warps: [{ x: 5, y: 10, to: "pewter", tx: 10, ty: 12, facing: "down" }],
    npcs: [
      {
        x: 5,
        y: 3,
        name: "小刚",
        id: "brock",
        solid: true,
        trainer: {
          name: "道馆馆主·小刚",
          beatenFlag: "beatBrock",
          party: [
            { species: "geodude", level: 12 },
            { species: "onix", level: 14 },
          ],
          intro: ["小刚：我是岩石般坚硬的男人！", "小刚：用你的宝可梦，打碎我的岩石吧！"],
          win: ["小刚：我输了……这块灰色徽章给你！", "小刚：继续向下一座城市前进吧。"],
          lose: ["小刚：岩石不会轻易碎裂。再练练！"],
        },
        lines: [],
      },
      {
        x: 3,
        y: 7,
        name: "武者",
        id: "trainer-gym",
        solid: true,
        trainer: {
          name: "武者·阿岩",
          beatenFlag: "beatGymGuide",
          party: [{ species: "diglett", level: 9 }, { species: "geodude", level: 10 }],
          intro: ["想挑战馆主，先过我这关！"],
          win: ["你可以去找小刚了。"],
          lose: ["还早呢！"],
        },
        lines: ["道馆里尽是岩石属性！"],
      },
    ],
    spawn: { x: 5, y: 9, facing: "up" },
  },
};

// Fix pewter row that had a botched replace - rewrite tiles cleanly
MAPS.pewter.tiles = [
  "TTTTTTTTTTTTTTTTTTTTTT",
  "T,,,,,,,,,,D,,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,T",
  "T,,,BBBB,,,,,,,,BBBB,T",
  "T,,,BFFB,,,,,,,,BFFB,T",
  "T,,,BFDB,,,,,,,,BFDB,T",
  "T,,,BBBB,,,,,,,,BBBB,T",
  "T,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,,,BBBBBB,,,,,,,,T",
  "T,,,,,,BFFFFB,,,GG,,,T",
  "T,,,,,,BFFDFB,,,GG,,,T",
  "T,,,,,,BBBBBB,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,T",
  "T,,,,,,,,,,,,,,,,,,,,T",
  "TTTTTTTTTTTTTTTTTTTTTT",
];

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

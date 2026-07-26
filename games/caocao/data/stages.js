/**
 * 关卡数据
 * tiles: 二维数组，地形 key
 * units: { generalId, team: 'player'|'enemy', x, y, level }
 */
export const STAGES = [
  {
    id: "s01_yingchuan",
    name: "颍川扫荡",
    chapter: "第一章 · 黄巾之乱",
    objective: "歼灭全部黄巾军，或击破张角",
    fail: "曹操阵亡则败",
    width: 12,
    height: 10,
    intro: [
      { speaker: "曹操", text: "黄巾作乱，州郡烽烟。今日便以此战立威！" },
      { speaker: "夏侯惇", text: "兄长下令，惇愿为先锋！" },
      { speaker: "张角", text: "苍天已死，黄天当立……尔等官军，安敢犯我！" },
    ],
    victoryTalk: [
      { speaker: "曹操", text: "初战告捷。乱世英雄，当由此始。" },
      { speaker: "荀彧", text: "主公英武，天下可图。" },
    ],
    // P=plain F=forest H=hill R=road W=water T=fort
    map: [
      "PPPPPPPPPPPP",
      "PPFFFPPPPPFP",
      "PPRRRRPPPPPP",
      "PPRWWRRPPPFP",
      "PPRRRRPPHHPP",
      "PPPPPPPPHHPP",
      "PPFFFPPPPPPP",
      "PPPPPPRRRRPP",
      "PPPPPPTTTTPP",
      "PPPPPPTTTTPP",
    ],
    player: [
      { generalId: "caocao", x: 2, y: 7, level: 3 },
      { generalId: "xiahou_dun", x: 1, y: 8, level: 3 },
      { generalId: "dianwei", x: 3, y: 8, level: 2 },
      { generalId: "xunyu", x: 2, y: 9, level: 2 },
    ],
    enemy: [
      { generalId: "zhangjiao", x: 9, y: 1, level: 4, boss: true },
      { generalId: "yellow_spear", x: 7, y: 2, level: 2 },
      { generalId: "yellow_spear", x: 8, y: 3, level: 2 },
      { generalId: "yellow_archer", x: 6, y: 1, level: 2 },
      { generalId: "yellow_archer", x: 10, y: 2, level: 2 },
      { generalId: "yellow_rider", x: 5, y: 3, level: 2 },
    ],
    win: { type: "rout_or_boss", bossId: "zhangjiao" },
  },
  {
    id: "s02_sishui",
    name: "汜水关前",
    chapter: "第一章 · 讨董序章",
    objective: "击破敌方主将华雄（黄巾余部头目）",
    fail: "曹操阵亡则败",
    width: 14,
    height: 10,
    intro: [
      { speaker: "曹操", text: "董卓乱政，天下共讨。先扫关前余孽！" },
      { speaker: "典韦", text: "谁敢拦路，便叫他知道我手中双戟！" },
    ],
    victoryTalk: [
      { speaker: "曹操", text: "关前初定。来日洛阳，再较雌雄。" },
    ],
    map: [
      "HHHHPPPPPPHHHH",
      "HHPPPRRRRPPPHH",
      "HPPPPRWWRRPPPH",
      "PPPPPRRRRRPPPP",
      "PPFFFPRRRRPFFF",
      "PPPPPPRRRRPPPP",
      "PPPPPPRRRRPPPP",
      "PPFFFPPPPPPFFF",
      "PPPPPTTTTPPPPP",
      "PPPPPTTTTPPPPP",
    ],
    player: [
      { generalId: "caocao", x: 6, y: 8, level: 5 },
      { generalId: "xiahou_dun", x: 5, y: 9, level: 5 },
      { generalId: "dianwei", x: 7, y: 9, level: 4 },
      { generalId: "xunyu", x: 4, y: 8, level: 4 },
    ],
    enemy: [
      { generalId: "zhangjiao", x: 6, y: 1, level: 6, boss: true, nameOverride: "华雄" },
      { generalId: "yellow_spear", x: 4, y: 2, level: 3 },
      { generalId: "yellow_spear", x: 8, y: 2, level: 3 },
      { generalId: "yellow_rider", x: 3, y: 3, level: 3 },
      { generalId: "yellow_rider", x: 9, y: 3, level: 3 },
      { generalId: "yellow_archer", x: 5, y: 2, level: 3 },
      { generalId: "yellow_archer", x: 7, y: 2, level: 3 },
      { generalId: "yellow_spear", x: 6, y: 4, level: 3 },
    ],
    win: { type: "boss", bossId: "zhangjiao" },
    unlockAfter: "s01_yingchuan",
  },
];

const CHAR_MAP = {
  P: "plain",
  F: "forest",
  H: "hill",
  R: "road",
  W: "water",
  T: "fort",
};

export function parseStageMap(stage) {
  return stage.map.map((row) =>
    [...row].map((ch) => CHAR_MAP[ch] || "plain")
  );
}

export function getStage(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

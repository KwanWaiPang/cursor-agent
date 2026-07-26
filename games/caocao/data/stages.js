/**
 * 由战役目录生成可玩关卡列表（原作关名 + 自研地图/敌军布局）
 */
import { CAMPAIGN, orderedStageIds } from "./campaign.js";
import { MAP_BUILDERS, parseMapRows } from "./mapgen.js";
import { minionIdsForTheme, bossTemplateForClass } from "./generals.js";

const CHAPTER_NAMES = Object.fromEntries(
  CAMPAIGN.chapters.map((c) => [c.id, c.name])
);

const PLAYER_ROSTER = [
  "caocao",
  "xiahou_dun",
  "dianwei",
  "xunyu",
  "xiahou_yuan",
  "xuchu",
  "guojia",
  "zhangliao",
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function playerSlots(w, h, count) {
  const slots = [];
  const baseY = h - 2;
  const startX = Math.max(1, Math.floor(w / 2) - Math.ceil(count / 2));
  for (let i = 0; i < count; i++) {
    slots.push({
      x: clamp(startX + i, 0, w - 1),
      y: clamp(baseY - (i % 2), 0, h - 1),
    });
  }
  return slots;
}

function enemySlots(w, h, count) {
  const slots = [];
  const startX = Math.max(1, Math.floor(w / 2) - Math.ceil(count / 2));
  for (let i = 0; i < count; i++) {
    const row = i < 3 ? 1 : 2 + Math.floor((i - 3) / 3);
    const col = i < 3 ? startX + i : startX + ((i - 3) % 3);
    slots.push({
      x: clamp(col + (i % 2), 0, w - 1),
      y: clamp(row, 0, Math.floor(h / 2) - 1),
    });
  }
  return slots;
}

function buildDialogs(meta) {
  const boss = meta.bossName || "敌军主将";
  return {
    intro: [
      { speaker: "曹操", text: meta.brief || `出征：${meta.name}` },
      { speaker: "夏侯惇", text: "兄长下令，惇愿为先锋！" },
      { speaker: boss, text: `${boss}在此！曹军休得猖狂！` },
    ],
    victoryTalk: [
      { speaker: "曹操", text: `${meta.name}已定。乱世方起，不可懈怠。` },
      { speaker: "荀彧", text: "主公英武，此战胜矣。" },
    ],
  };
}

function normalizeWin(meta) {
  const win = { ...(meta.win || { type: "rout" }) };
  if (win.type === "boss_or_rout" && meta.bossName) {
    win.bossName = meta.bossName;
  }
  return win;
}

function buildStageFromMeta(id, meta, prevId, index) {
  const w = meta.w || 14;
  const h = meta.h || 12;
  const builder = MAP_BUILDERS[meta.map] || MAP_BUILDERS.field;
  const mapRows = builder(w, h, index + 1);
  const baseLevel = 2 + Math.floor((meta.no || index + 1) * 0.6);
  const playerCount = Math.min(4 + Math.floor(index / 8), PLAYER_ROSTER.length);
  const pSlots = playerSlots(w, h, playerCount);
  const player = PLAYER_ROSTER.slice(0, playerCount).map((gid, i) => ({
    generalId: gid,
    x: pSlots[i].x,
    y: pSlots[i].y,
    level: baseLevel + (gid === "caocao" ? 1 : 0),
  }));

  const minions = minionIdsForTheme(meta.enemyTheme);
  const enemyCount = 5 + Math.min(4, Math.floor(index / 5));
  const eSlots = enemySlots(w, h, enemyCount);
  const bossTpl = bossTemplateForClass(meta.bossClass || "cavalry");
  const enemy = [
    {
      generalId: bossTpl,
      x: eSlots[0].x,
      y: eSlots[0].y,
      level: baseLevel + 2 + (meta.bossLevelBonus || 0),
      boss: true,
      nameOverride: meta.bossName || "敌军主将",
    },
  ];
  for (let i = 1; i < enemyCount; i++) {
    enemy.push({
      generalId: minions[(i - 1) % minions.length],
      x: eSlots[i].x,
      y: eSlots[i].y,
      level: baseLevel + (i % 3 === 0 ? 1 : 0),
    });
  }

  const talks = buildDialogs(meta);
  return {
    id,
    no: meta.no,
    name: meta.name,
    chapter: CHAPTER_NAMES[meta.chapter] || meta.chapter,
    chapterId: meta.chapter,
    route: meta.chapter === "blue" ? "blue" : meta.chapter === "red" ? "red" : null,
    status: meta.status,
    brief: meta.brief,
    objective: meta.objective,
    fail: "曹操阵亡则败",
    width: w,
    height: h,
    map: mapRows,
    player,
    enemy,
    intro: talks.intro,
    victoryTalk: talks.victoryTalk,
    win: normalizeWin(meta),
    loot: meta.loot || [],
    battleChoice: meta.battleChoice || null,
    branchAfter: !!meta.branchAfter,
    ending: meta.ending || null,
    optional: !!meta.optional,
    unlockAfter: prevId,
  };
}

function buildAllStages() {
  const common = orderedStageIds(null);
  const blue = orderedStageIds("blue");
  const red = orderedStageIds("red");
  const sequence = [...common, ...blue, ...red];
  const stages = [];
  let prevCommon = null;
  let prevBlue = "machao";
  let prevRed = "machao";

  for (let i = 0; i < sequence.length; i++) {
    const id = sequence[i];
    const meta = CAMPAIGN.stages[id];
    if (!meta) continue;
    let prev = null;
    if (meta.chapter === "blue") {
      prev = prevBlue;
    } else if (meta.chapter === "red") {
      prev = prevRed;
    } else {
      prev = prevCommon;
    }

    // 可选关不挡主线：挂在前一主线关之后
    if (id === "chibi_escape") prev = "chibi";
    if (id === "red_hanshui" || id === "red_xiegu") prev = "red_dingjun";

    stages.push(buildStageFromMeta(id, meta, prev, i));

    // 可选关不推进主线解锁指针
    if (meta.optional) continue;
    if (meta.chapter === "blue") prevBlue = id;
    else if (meta.chapter === "red") prevRed = id;
    else prevCommon = id;
  }
  return stages;
}

export const STAGES = buildAllStages();

export function parseStageMap(stage) {
  if (Array.isArray(stage.map) && typeof stage.map[0] === "string") {
    return parseMapRows(stage.map);
  }
  // 已是地形 id 二维数组
  return stage.map;
}

export function getStage(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0];
}

export function stagesForMenu(route) {
  return STAGES.filter((s) => {
    if (!s.route) return true;
    if (!route) return false;
    return s.route === route;
  });
}

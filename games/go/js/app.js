import { measureBoardBox } from "../../../js/fit-board.js";
import { BLACK, WHITE, GoEngine, colorName, opponent, stoneOrderNumbers } from "./engine.js";
import { GoAI } from "./ai.js";
import {
  DrillSession,
  drillCatalogReady,
  drillFaceText,
  levelCleared,
  loadDrillCatalog,
  loadPosition,
  loadProgress,
  problemsOf,
  saveProgress,
  trackById,
} from "./drill.js";
import {
  KifuSession,
  coordName,
  gameById,
  getKifu,
  kifuLibraryReady,
  loadKifuLibrary,
  stoneMoveIndex,
  stoneNumbers,
} from "./kifu-play.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const els = {
  turnLabel: document.getElementById("turnLabel"),
  turnDot: document.getElementById("turnDot"),
  phaseBadge: document.getElementById("phaseBadge"),
  captures: document.getElementById("captures"),
  moveCount: document.getElementById("moveCount"),
  message: document.getElementById("message"),
  liveAnnounce: document.getElementById("liveAnnounce"),
  scorePreview: document.getElementById("scorePreview"),
  result: document.getElementById("result"),
  sizeSelect: document.getElementById("sizeSelect"),
  komiSelect: document.getElementById("komiSelect"),
  modeSelect: document.getElementById("modeSelect"),
  humanColorSelect: document.getElementById("humanColorSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  aiOptions: document.getElementById("aiOptions"),
  drillOptions: document.getElementById("drillOptions"),
  matchFields: document.getElementById("matchFields"),
  trackSelect: document.getElementById("trackSelect"),
  levelSelect: document.getElementById("levelSelect"),
  drillIntro: document.getElementById("drillIntro"),
  drillProgress: document.getElementById("drillProgress"),
  drillSource: document.getElementById("drillSource"),
  btnDrillPrev: document.getElementById("btnDrillPrev"),
  btnDrillNext: document.getElementById("btnDrillNext"),
  btnDrillRetry: document.getElementById("btnDrillRetry"),
  btnDrillHint: document.getElementById("btnDrillHint"),
  btnDrillUndo: document.getElementById("btnDrillUndo"),
  btnDrillSolve: document.getElementById("btnDrillSolve"),
  difficultyField: document.getElementById("difficultyField"),
  kifuOptions: document.getElementById("kifuOptions"),
  kifuFilter: document.getElementById("kifuFilter"),
  kifuPlayer: document.getElementById("kifuPlayer"),
  kifuLevel: document.getElementById("kifuLevel"),
  kifuEra: document.getElementById("kifuEra"),
  kifuSelectLabel: document.querySelector("label[for='kifuSelect']"),
  kifuSelect: document.getElementById("kifuSelect"),
  kifuBlurb: document.getElementById("kifuBlurb"),
  kifuStudy: document.getElementById("kifuStudy"),
  kifuSideField: document.getElementById("kifuSideField"),
  kifuSide: document.getElementById("kifuSide"),
  kifuProgress: document.getElementById("kifuProgress"),
  kifuNote: document.getElementById("kifuNote"),
  btnKifuStart: document.getElementById("btnKifuStart"),
  btnKifuPrev: document.getElementById("btnKifuPrev"),
  btnKifuNext: document.getElementById("btnKifuNext"),
  btnKifuEnd: document.getElementById("btnKifuEnd"),
  btnKifuReveal: document.getElementById("btnKifuReveal"),
  btnKifuReturn: document.getElementById("btnKifuReturn"),
  btnKifuNote: document.getElementById("btnKifuNote"),
  btnKifuMiss: document.getElementById("btnKifuMiss"),
  btnKifuJump: document.getElementById("btnKifuJump"),
  kifuJump: document.getElementById("kifuJump"),
  kifuNumbersToggle: document.getElementById("kifuNumbersToggle"),
  setupHeading: document.getElementById("setupHeading"),
  difficultyLabel: document.querySelector("label[for='difficultySelect']"),
  btnPass: document.getElementById("btnPass"),
  btnResign: document.getElementById("btnResign"),
  btnUndo: document.getElementById("btnUndo"),
  btnAutoDead: document.getElementById("btnAutoDead"),
  btnClearDead: document.getElementById("btnClearDead"),
  btnScore: document.getElementById("btnScore"),
  btnCoord: document.getElementById("btnCoord"),
  coordInput: document.getElementById("coordInput"),
  autoDeadToggle: document.getElementById("autoDeadToggle"),
  aiEngineNote: document.getElementById("aiEngineNote"),
  btnNew: document.getElementById("btnNew"),
  actionCard: document.getElementById("actionCard"),
  teachToggle: document.getElementById("teachToggle"),
  teachField: document.getElementById("teachField"),
  teachNote: document.getElementById("teachNote"),
  btnKifuTeach: document.getElementById("btnKifuTeach"),
  btnKifuPlay: document.getElementById("btnKifuPlay"),
  kifuSlider: document.getElementById("kifuSlider"),
  kifuPace: document.getElementById("kifuPace"),
};

let engine = new GoEngine(
  Number(document.getElementById("sizeSelect").value) || 19,
  Number(document.getElementById("komiSelect").value) || 7.5
);
let ai = new GoAI(document.getElementById("difficultySelect").value || "medium");
let hover = null;
let dpr = Math.max(1, window.devicePixelRatio || 1);
let aiThinking = false;
let aiToken = 0;
let lastTouchAt = 0;
let drill = null;
let drillToken = 0;
let drillHint = null;
let drillFlash = null;
let flashToken = 0;
let uiLock = 0;
let kifu = null;
let kifuToken = 0;
let kifuNumbers = null;
let kifuAiThinking = false;
let kifuTimer = null;
let kifuPlaying = false;
let kifuSliderHold = false;
let teachOverlay = null;
let teachArmed = null;
let teachBusy = false;
let touchPreview = null;
let longPressTimer = 0;
let keyboardPoint = null;
let scoreOverlay = null;
let kataAbort = null;
const DIFFICULTY_KEY = "go-hub-difficulty";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function drillSelected() {
  return els.modeSelect.value === "drill";
}

function isDrill() {
  return drillSelected() && !!drill;
}

function kifuSelected() {
  return els.modeSelect.value === "kifu";
}

function isKifu() {
  return kifuSelected() && !!kifu;
}

function playSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (_) {
    /* autoplay may be blocked until user gesture */
  }
}

function isAiMode() {
  return els.modeSelect.value === "ai";
}

function isRecordMode() {
  return els.modeSelect.value === "record";
}

function humanColor() {
  return els.humanColorSelect.value === "white" ? WHITE : BLACK;
}

function aiColor() {
  return opponent(humanColor());
}

function isHumanTurn() {
  if (isDrill()) return !drill.busy && !drill.solvedFlag && engine.phase === "playing";
  if (isKifu()) return kifuCanClick();
  if (!isAiMode()) return true;
  return engine.phase === "playing" && engine.toPlay === humanColor();
}

function kifuCanClick() {
  if (!kifu || kifuAiThinking || engine.phase !== "playing") return false;
  if (kifu.mode === "replay") return false;
  if (kifu.deviated) return engine.toPlay === kifu.userSide;
  if (kifu.mode === "guess") return true;
  return engine.toPlay === kifu.userSide;
}

function announce(text) {
  if (!els.liveAnnounce || !text) return;
  els.liveAnnounce.textContent = "";
  const next = text;
  requestAnimationFrame(() => {
    if (els.liveAnnounce) els.liveAnnounce.textContent = next;
  });
}

function showMessage(text, info = false) {
  els.message.textContent = text || "";
  els.message.classList.toggle("info", Boolean(info && text));
  if (text) announce(text);
}

function weakDevice() {
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const saveData = navigator.connection && navigator.connection.saveData;
  return Boolean(saveData || cores <= 4 || memory <= 4);
}

function initDifficultyDefault() {
  let saved = null;
  try {
    saved = localStorage.getItem(DIFFICULTY_KEY);
  } catch {
    /* private mode */
  }
  const known = saved && [...els.difficultySelect.options].some((opt) => opt.value === saved);
  if (known) els.difficultySelect.value = saved;
  else if (weakDevice()) els.difficultySelect.value = "k15";
  if (!known && danSelected()) els.difficultySelect.value = weakDevice() ? "k15" : "k6";
}

function rememberDifficulty() {
  try {
    localStorage.setItem(DIFFICULTY_KEY, els.difficultySelect.value);
  } catch {
    /* private mode */
  }
}

function syncEngineNote() {
  if (!els.aiEngineNote) return;
  const show = isAiMode() || kifuSelected();
  if (!show) {
    els.aiEngineNote.textContent = "";
    return;
  }
  els.aiEngineNote.textContent = danSelected()
    ? "这一档是 KataGo 模型，在浏览器里计算。高段可能要等一会儿。"
    : "这一档是本地搜索，不下载、也不运行 KataGo。";
}

function syncAutoDead() {
  engine.autoDead = !els.autoDeadToggle || els.autoDeadToggle.checked;
}

function phaseText() {
  if (isDrill()) {
    if (drill.busy) return "看答案";
    if (drill.solvedFlag) return "过关";
    return "练习中";
  }
  if (isKifu()) {
    if (kifuAiThinking) return "AI应手";
    if (kifu.deviated) return "离谱";
    if (kifu.mode === "guess") return "猜下一手";
    if (kifu.mode === "play") return "跟谱对练";
    return "打谱";
  }
  if (aiThinking) return "AI思考中";
  if (engine.phase === "playing") return isRecordMode() ? "打谱" : "对局中";
  if (engine.phase === "scoring") return "点目中";
  return "已结束";
}

function syncAiOptionVisibility() {
  const aiOn = isAiMode();
  const drillOn = drillSelected();
  const kifuOn = kifuSelected();
  els.aiOptions.hidden = !aiOn && !kifuOn;
  els.aiOptions.setAttribute("aria-hidden", aiOn || kifuOn ? "false" : "true");
  if (els.humanColorSelect) {
    els.humanColorSelect.closest(".field").hidden = !aiOn;
  }
  if (els.difficultyField) els.difficultyField.hidden = !(aiOn || kifuOn);
  els.drillOptions.hidden = !drillOn;
  els.drillOptions.setAttribute("aria-hidden", drillOn ? "false" : "true");
  els.kifuOptions.hidden = !kifuOn;
  els.kifuOptions.setAttribute("aria-hidden", kifuOn ? "false" : "true");
  els.matchFields.hidden = drillOn || kifuOn;
  els.btnNew.textContent = drillOn ? "进入本题" : kifuOn ? "打开这局" : "开始新对局";
  if (els.setupHeading) els.setupHeading.textContent = kifuOn ? "棋谱" : drillOn ? "练习" : "新对局";
  if (els.difficultyLabel) els.difficultyLabel.textContent = kifuOn ? "偏离棋谱后的 AI" : "AI 强度";
  if (els.teachField) els.teachField.hidden = drillOn;
  if (drillOn) {
    if (drillCatalogReady()) fillLevelSelect();
    else {
      showMessage("正在载入练习题…", true);
      void loadDrillCatalog()
        .then(() => {
          if (drillSelected()) fillLevelSelect();
        })
        .catch(() => showMessage("练习题没有载入。"));
    }
  }
  if (kifuOn) {
    if (kifuLibraryReady()) fillKifuSelect();
    else {
      showMessage("正在载入棋谱…", true);
      void loadKifuLibrary()
        .then(() => {
          if (kifuSelected()) fillKifuSelect();
        })
        .catch(() => showMessage("棋谱没有载入。"));
    }
  }
  syncEngineNote();
}

function updatePanel() {
  const turn = engine.toPlay;
  els.turnDot.className = `stone-dot ${turn === BLACK ? "black" : "white"}`;
  if (isDrill()) {
    if (drill.solvedFlag) els.turnLabel.textContent = "本题已过关";
    else if (drill.busy) els.turnLabel.textContent = "正在演示答案…";
    else els.turnLabel.textContent = `${colorName(engine.toPlay)}方行棋 · 你`;
  } else if (isKifu()) {
    const who = kifu.deviated
      ? engine.toPlay === kifu.userSide
        ? "你"
        : "AI"
      : kifu.mode === "replay"
        ? "打谱"
        : "你";
    els.turnLabel.textContent = kifuAiThinking
      ? `AI（${colorName(engine.toPlay)}）思考中…`
      : `${colorName(engine.toPlay)}方 · ${who}`;
  } else if (aiThinking) {
    els.turnLabel.textContent = `AI（${colorName(aiColor())}）思考中…`;
  } else if (engine.phase === "playing") {
    if (isAiMode()) {
      const who = turn === humanColor() ? "你" : "AI";
      els.turnLabel.textContent = `${colorName(turn)}方行棋 · ${who}`;
    } else {
      els.turnLabel.textContent = `${colorName(turn)}方行棋`;
    }
  } else if (engine.phase === "scoring") {
    els.turnLabel.textContent = "点击棋子标记死子";
  } else {
    els.turnLabel.textContent = "对局结束";
  }
  els.phaseBadge.textContent = phaseText();
  els.captures.textContent = `黑提 ${engine.captures[BLACK]} · 白提 ${engine.captures[WHITE]}（只作记录，不计进结果）`;
  const plays = engine.moveHistory.filter((m) => m.type === "play").length;
  const passes = engine.moveHistory.filter((m) => m.type === "pass").length;
  els.moveCount.textContent = `手数 ${plays} · 停着 ${passes}`;

  const humanCanAct =
    engine.phase === "playing" && isHumanTurn() && !aiThinking && !isDrill() && !isKifu();
  const kifuPass =
    isKifu() &&
    !kifuAiThinking &&
    kifu.mode === "guess" &&
    !kifu.deviated &&
    kifu.nextMove()?.pass;
  els.btnPass.disabled = !humanCanAct && !kifuPass;
  if (els.actionCard) els.actionCard.hidden = isKifu() || isDrill();
  els.btnPass.hidden = isDrill() || (isKifu() && !kifuPass);
  els.btnResign.hidden = isDrill() || isKifu();
  els.btnAutoDead.hidden = isDrill() || isKifu();
  els.btnScore.hidden = isDrill() || isKifu();
  els.btnResign.disabled = engine.phase !== "playing" || aiThinking || isDrill() || isKifu();
  const canScoreNow =
    !aiThinking && (engine.phase === "playing" || engine.phase === "scoring");
  els.btnAutoDead.disabled = !canScoreNow;
  els.btnScore.disabled = !canScoreNow;
  if (els.btnClearDead) els.btnClearDead.disabled = engine.phase !== "scoring";
  if (els.btnScore) els.btnScore.textContent = engine.phase === "scoring" ? "确认结果" : "确认点目";
  if (els.scorePreview) {
    if (engine.phase === "scoring" && scoreOverlay) {
      const area = scoreOverlay;
      els.scorePreview.textContent = `预览：黑 ${area.blackScore.toFixed(1)} · 白 ${area.whiteScore.toFixed(1)}（含贴目 ${engine.komi}）。深色空点计黑，浅色空点计白，没着色的是单官或双活。半透明棋子是死子，点一下可以改，清除标记则全部撤销。提子不另加。`;
    } else {
      els.scorePreview.textContent = "";
    }
  }
  els.btnUndo.disabled = isDrill()
    ? !drill || drill.busy || drill.log.length === 0
    : isKifu()
      ? kifuAiThinking || (kifu.cursor === 0 && !kifu.deviated && engine.moveHistory.length === 0)
      : aiThinking ||
        (engine.moveHistory.length === 0 &&
          engine.phase !== "scoring" &&
          !(engine.phase === "finished" && engine.result));
  if (isDrill()) {
    const total = problemsOf(drill.problem.track, drill.problem.level).length;
    els.btnDrillPrev.disabled = drill.busy || drill.index <= 0;
    els.btnDrillNext.disabled = drill.busy || drill.index >= total - 1;
    els.btnDrillRetry.disabled = drill.busy;
    if (els.btnDrillHint) els.btnDrillHint.disabled = drill.busy || drill.solvedFlag;
    if (els.btnDrillUndo) els.btnDrillUndo.disabled = drill.busy || drill.log.length === 0;
    els.btnDrillSolve.disabled = drill.busy;
  }
  if (isKifu()) {
    const atEnd = !kifu.nextMove();
    els.btnKifuPrev.disabled = kifuAiThinking || (kifu.cursor === 0 && !kifu.deviated);
    els.btnKifuNext.disabled = kifuAiThinking || kifu.deviated || atEnd || kifu.mode !== "replay";
    els.btnKifuEnd.disabled = kifuAiThinking || kifu.deviated || atEnd;
    els.btnKifuReveal.disabled = kifuAiThinking || kifu.deviated || atEnd || kifu.mode === "replay";
    els.btnKifuReturn.disabled = kifuAiThinking || !kifu.deviated;
    if (els.btnKifuNote) els.btnKifuNote.disabled = kifuAiThinking || !kifu.game.moves.some((move) => move.note);
    if (els.btnKifuMiss) els.btnKifuMiss.disabled = kifuAiThinking || kifu.misses.length === 0;
    if (els.btnKifuJump) els.btnKifuJump.disabled = kifuAiThinking;
    if (els.btnKifuPlay) els.btnKifuPlay.disabled = kifuAiThinking || kifu.deviated || kifu.mode !== "replay";
    syncKifuPlayButton();
    if (els.kifuSlider) {
      els.kifuSlider.disabled = kifuAiThinking || kifu.deviated;
      els.kifuSlider.max = String(kifu.total);
      els.kifuSlider.setAttribute("aria-valuetext", `第 ${kifu.cursor} 手，共 ${kifu.total} 手`);
      if (!kifuSliderHold) els.kifuSlider.value = String(kifu.cursor);
    }
    els.kifuSideField.hidden = kifu.mode !== "play";
    syncKifuStudyNote();
  } else if (els.kifuNote) {
    els.kifuNote.textContent = "";
  }
  canvas.style.cursor = aiThinking || kifuAiThinking ? "wait" : "crosshair";

  if (isDrill() && drill.solvedFlag) {
    const p = drill.problem;
    const cleared = levelCleared(p.track, p.level, drill.progress);
    const next = trackById(p.track).levels.find((l) => l.level === p.level + 1);
    els.result.textContent = cleared
      ? next
        ? `过关。本级 ${problemsOf(p.track, p.level).length} 题都走通了，可以换下一级。`
        : `过关。这一科的题目都练过了。`
      : `过关：${p.title}`;
    els.result.classList.add("show");
  } else if (engine.result) {
    els.result.textContent = engine.result.text;
    if (engine.result.type === "score") {
      els.result.textContent += `（黑 ${engine.result.blackScore.toFixed(1)} · 白 ${engine.result.whiteScore.toFixed(1)}，含贴目 ${engine.komi}。提子没有另加。）`;
    }
    els.result.classList.add("show");
  } else {
    els.result.classList.remove("show");
    els.result.textContent = "";
  }
}

function boardMetrics() {
  const cssSize = canvas.clientWidth;
  const view = isDrill() ? drill.view : null;
  const x0 = view ? view.x0 : 0;
  const y0 = view ? view.y0 : 0;
  const x1 = view ? view.x1 : engine.size - 1;
  const y1 = view ? view.y1 : engine.size - 1;
  const span = Math.max(x1 - x0, y1 - y0, 1);
  // 边上的棋子会盖住坐标。间距至少要容得下半颗棋和一行字。
  const gutter = 0.98;
  const pad = Math.max(cssSize * 0.078, (gutter * cssSize) / (span + 2 * gutter));
  const grid = (cssSize - pad * 2) / span;
  return {
    cssSize,
    pad,
    grid,
    view,
    x0,
    y0,
    x1,
    y1,
    offX: (span - (x1 - x0)) / 2,
    offY: (span - (y1 - y0)) / 2,
  };
}

function pointToXY(x, y, m) {
  return {
    sx: m.pad + (x - m.x0 + m.offX) * m.grid,
    sy: m.pad + (y - m.y0 + m.offY) * m.grid,
  };
}

function resizeCanvas() {
  const wrap = canvas.parentElement;
  const { width: cssSize } = measureBoardBox(wrap, { aspect: 1, min: 240 });
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function stoneRadius(grid) {
  return grid * 0.46;
}

function drawBoardWood(cssSize) {
  const g = ctx.createLinearGradient(0, 0, cssSize, cssSize);
  g.addColorStop(0, "#e8c078");
  g.addColorStop(0.45, "#d19a45");
  g.addColorStop(1, "#b57930");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cssSize, cssSize);

  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < cssSize; i += 3) {
    ctx.fillStyle = i % 9 === 0 ? "#5a3010" : "#fff3d0";
    ctx.fillRect(0, i, cssSize, 1);
  }
  ctx.restore();
}

function draw() {
  const m = boardMetrics();
  const { cssSize, grid, x0, y0, x1, y1 } = m;
  ctx.clearRect(0, 0, cssSize, cssSize);
  drawBoardWood(cssSize);

  ctx.strokeStyle = "rgba(40, 24, 12, 0.78)";
  ctx.lineWidth = Math.max(1, grid * 0.04);
  ctx.beginPath();
  for (let i = x0; i <= x1; i += 1) {
    const top = pointToXY(i, y0, m);
    const bot = pointToXY(i, y1, m);
    ctx.moveTo(top.sx, top.sy);
    ctx.lineTo(bot.sx, bot.sy);
  }
  for (let j = y0; j <= y1; j += 1) {
    const left = pointToXY(x0, j, m);
    const right = pointToXY(x1, j, m);
    ctx.moveTo(left.sx, left.sy);
    ctx.lineTo(right.sx, right.sy);
  }
  ctx.stroke();

  const tl = pointToXY(x0, y0, m);
  const tr = pointToXY(x1, y0, m);
  const bl = pointToXY(x0, y1, m);
  const br = pointToXY(x1, y1, m);
  const edge = (real, a, b) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.strokeStyle = "rgba(40, 24, 12, 0.92)";
    ctx.lineWidth = real ? Math.max(2.2, grid * 0.09) : Math.max(1, grid * 0.045);
    if (!real) ctx.setLineDash([grid * 0.22, grid * 0.16]);
    ctx.stroke();
    ctx.restore();
  };
  const view = m.view;
  edge(!view || view.edgeT, tl, tr);
  edge(!view || view.edgeB, bl, br);
  edge(!view || view.edgeL, tl, bl);
  edge(!view || view.edgeR, tr, br);

  ctx.fillStyle = "rgba(40, 24, 12, 0.85)";
  for (const [x, y] of engine.starPoints()) {
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const p = pointToXY(x, y, m);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, Math.max(2.2, grid * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }

  const GO_FILES = "ABCDEFGHJKLMNOPQRST";
  ctx.save();
  ctx.fillStyle = "rgba(50, 32, 16, 0.78)";
  ctx.font = `600 ${Math.max(10, grid * 0.28)}px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lift = Math.min(m.pad * 0.62, grid * 0.78);
  for (let i = x0; i <= x1; i += 1) {
    const letter = GO_FILES[i] || String(i + 1);
    const top = pointToXY(i, y0, m);
    const bot = pointToXY(i, y1, m);
    ctx.fillText(letter, top.sx, top.sy - lift);
    ctx.fillText(letter, bot.sx, bot.sy + lift);
  }
  for (let j = y0; j <= y1; j += 1) {
    const rank = String(engine.size - j);
    const left = pointToXY(x0, j, m);
    const right = pointToXY(x1, j, m);
    ctx.fillText(rank, left.sx - lift, left.sy);
    ctx.fillText(rank, right.sx + lift, right.sy);
  }
  ctx.restore();

  if (scoreOverlay?.territoryMap) {
    const map = scoreOverlay.territoryMap;
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const owner = map[y]?.[x];
        if (!owner) continue;
        const p = pointToXY(x, y, m);
        ctx.fillStyle = owner === BLACK ? "rgba(28, 22, 16, 0.34)" : "rgba(255, 250, 240, 0.62)";
        const half = grid * 0.46;
        ctx.fillRect(p.sx - half, p.sy - half, half * 2, half * 2);
      }
    }
  }

  const r = stoneRadius(grid);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const c = engine.board[y][x];
      if (!c) continue;
      const dead = engine.deadMarks.has(`${x},${y}`);
      const p = pointToXY(x, y, m);
      drawStone(p.sx, p.sy, r, c, dead);
    }
  }

  if (!kifuNumbers && engine.lastMove && !engine.lastMove.pass && engine.phase !== "scoring") {
    const { x, y } = engine.lastMove;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && engine.board[y] && engine.board[y][x]) {
      const p = pointToXY(x, y, m);
      ctx.beginPath();
      ctx.fillStyle = engine.board[y][x] === BLACK ? "#f2d38a" : "#2a6d5c";
      ctx.arc(p.sx, p.sy, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const ring = (pt, color, scale = 0.78) => {
    if (!pt || pt.x < x0 || pt.x > x1 || pt.y < y0 || pt.y > y1) return;
    const p = pointToXY(pt.x, pt.y, m);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.arc(p.sx, p.sy, r * scale, 0, Math.PI * 2);
    ctx.stroke();
  };
  if (kifuNumbers) drawMoveNumbers(kifuNumbers, m, r, x0, x1, y0, y1);

  if (teachOverlay?.territory?.length === engine.size) {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (engine.board[y][x]) continue;
        const value = teachOverlay.territory[y]?.[x] || 0;
        if (Math.abs(value) < 0.62) continue;
        const p = pointToXY(x, y, m);
        const alpha = 0.035 + Math.min(0.06, Math.abs(value) * 0.04);
        ctx.fillStyle = value > 0 ? `rgba(42, 32, 24, ${alpha})` : `rgba(70, 118, 150, ${alpha})`;
        const half = grid * 0.2;
        ctx.fillRect(p.sx - half, p.sy - half, half * 2, half * 2);
      }
    }
  }
  if ((isKifu() || isRecordMode()) && engine.lastMove && !engine.lastMove.pass && engine.phase !== "scoring") {
    ring(engine.lastMove, "#8a3d12", 1.08);
  }
  const recordNext = isKifu() && kifu?.mode === "replay" && !kifu.deviated && !kifuPlaying ? kifu.nextMove() : null;
  const hinted = teachOverlay?.best;
  const sameAsRecord = recordNext && hinted && !recordNext.pass && recordNext.x === hinted.x && recordNext.y === hinted.y;
  if (!sameAsRecord) ring(hinted, "#c45c26");

  ring(drillHint, "#0f5c4c");
  ring(drillFlash, "#8b2e2e");
  if (recordNext && !recordNext.pass) ring(recordNext, "rgba(15,92,76,0.55)");

  if (
    hover &&
    !aiThinking &&
    isHumanTurn() &&
    engine.phase === "playing" &&
    hover.x >= x0 &&
    hover.x <= x1 &&
    hover.y >= y0 &&
    hover.y <= y1 &&
    engine.board[hover.y][hover.x] === 0 &&
    engine.isLegal(hover.x, hover.y)
  ) {
    const p = pointToXY(hover.x, hover.y, m);
    ctx.globalAlpha = 0.38;
    drawStone(p.sx, p.sy, r, engine.toPlay, false);
    ctx.globalAlpha = 1;
  }
}

function moveNumberFont(size) {
  return `700 ${size}px "Noto Sans", "DejaVu Sans", "Liberation Sans", sans-serif`;
}

function moveNumberSize(radius, label) {
  const digits = label.length;
  let size = radius * (digits >= 3 ? 0.78 : digits === 2 ? 0.92 : 1.05);
  ctx.font = moveNumberFont(size);
  const width = ctx.measureText(label).width;
  const maxWidth = radius * 1.82;
  if (width > maxWidth && width > 0) size *= maxWidth / width;
  return size;
}

function drawMoveNumbers(numbers, m, radius, x0, x1, y0, y1) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const num = numbers[y]?.[x];
      if (!num || !engine.board[y][x]) continue;
      const label = String(num);
      const size = moveNumberSize(radius, label);
      const p = pointToXY(x, y, m);
      const black = engine.board[y][x] === BLACK;
      ctx.globalAlpha = engine.deadMarks.has(`${x},${y}`) ? 0.42 : 1;
      ctx.font = moveNumberFont(size);
      ctx.lineWidth = Math.max(1.4, size * 0.18);
      ctx.strokeStyle = black ? "rgba(0,0,0,0.78)" : "rgba(255,252,246,0.96)";
      ctx.fillStyle = black ? "#fff8ec" : "#1b120c";
      ctx.strokeText(label, p.sx, p.sy);
      ctx.fillText(label, p.sx, p.sy);
    }
  }
  ctx.restore();
}

function drawStone(cx, cy, r, color, dead) {
  ctx.save();
  if (dead) ctx.globalAlpha = 0.35;

  const grad = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.4,
    r * 0.1,
    cx,
    cy,
    r
  );
  if (color === BLACK) {
    grad.addColorStop(0, "#666");
    grad.addColorStop(0.55, "#222");
    grad.addColorStop(1, "#0a0a0a");
  } else {
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.55, "#f3ebe0");
    grad.addColorStop(1, "#d9d0c2");
  }
  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (color === WHITE) {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.fillStyle =
    color === BLACK ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)";
  ctx.ellipse(
    cx - r * 0.25,
    cy - r * 0.28,
    r * 0.35,
    r * 0.22,
    -0.5,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function eventToCoord(evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
  const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
  const xPos = clientX - rect.left;
  const yPos = clientY - rect.top;
  const m = boardMetrics();
  const x = Math.round((xPos - m.pad) / m.grid - m.offX + m.x0);
  const y = Math.round((yPos - m.pad) / m.grid - m.offY + m.y0);
  if (x < m.x0 || x > m.x1 || y < m.y0 || y > m.y1) return null;
  if (!engine.inBounds(x, y)) return null;
  const { sx, sy } = pointToXY(x, y, m);
  const dist = Math.hypot(xPos - sx, yPos - sy);
  if (dist > m.grid * 0.45) return null;
  return { x, y };
}

function showKifuNumbers() {
  return !els.kifuNumbersToggle || els.kifuNumbersToggle.checked;
}

function refreshScoreOverlay() {
  const show =
    engine.phase === "scoring" || (engine.phase === "finished" && engine.result?.type === "score");
  scoreOverlay = show ? engine.scorePreview() : null;
}

function refresh(msg, info = false) {
  kifuNumbers =
    isKifu() && showKifuNumbers()
      ? stoneNumbers(kifu.game, engine)
      : isRecordMode()
        ? stoneOrderNumbers(engine)
        : null;
  refreshScoreOverlay();
  updatePanel();
  draw();
  if (msg !== undefined) showMessage(msg, info);
}

function abortKataSearch() {
  kataAbort?.abort();
  kataAbort = null;
}

function armKataSearch() {
  abortKataSearch();
  if (!danSelected()) return undefined;
  kataAbort = new AbortController();
  return kataAbort.signal;
}

function isKataCanceled(err) {
  return Boolean(err && (err.canceled || err.name === "KataGoCanceledError"));
}

function danSelected() {
  return /^d[1-9]$/.test(els.difficultySelect?.value || "");
}

function clearTeachDisplay() {
  teachOverlay = null;
  teachArmed = null;
  if (els.teachNote) els.teachNote.textContent = "";
}

function teachOn() {
  return Boolean(els.teachToggle?.checked) && danSelected() && !isDrill();
}

function teachKey() {
  return `${engine.size}|${engine.toPlay}|${engine.moveHistory.length}|${engine.serialize()}`;
}

function humanToReceiveTeach() {
  if (!teachOn() || teachBusy || aiThinking || kifuAiThinking || engine.phase !== "playing") return false;
  if (isKifu()) {
    if (!kifu || kifu.mode === "replay") return false;
    if (kifu.deviated) return engine.toPlay === kifu.userSide;
    if (kifu.mode === "guess") return true;
    return engine.toPlay === kifu.userSide;
  }
  if (isAiMode()) return engine.toPlay === humanColor();
  return true;
}

function armTeach() {
  if (!humanToReceiveTeach()) return;
  const key = teachKey();
  if (teachArmed?.key === key) return;
  const snap = engine.clone();
  const promise = import("./katago-bridge.js").then((bridge) =>
    bridge.kataReview(snap, (text) => {
      if (teachArmed?.key !== key || !teachOn()) return;
      if (els.teachNote && !teachBusy) els.teachNote.textContent = text;
    }),
  );
  teachArmed = { key, promise };
}

async function explainPlayed(played, beforeKey, beforeSnap) {
  if (!teachOn() || !beforeSnap) return;
  teachBusy = true;
  if (els.teachNote) els.teachNote.textContent = "模型在看这一手…";
  try {
    const bridge = await import("./katago-bridge.js");
    const review = teachArmed?.key === beforeKey ? await teachArmed.promise : await bridge.kataReview(beforeSnap);
    if (!teachOn()) return;
    const verdict = bridge.teachVerdict(review, played, beforeSnap.size);
    teachOverlay = verdict.overlay;
    if (els.teachNote) els.teachNote.textContent = verdict.text;
    draw();
  } catch (err) {
    console.error(err);
    if (els.teachNote) els.teachNote.textContent = "模型这次没看完，这手先照常走。";
  } finally {
    teachBusy = false;
  }
}

async function afterUserMove(played, beforeKey, beforeSnap) {
  await explainPlayed(played, beforeKey, beforeSnap);
  if (isKifu()) await maybeKifuAi();
  else await maybeAiMove();
  armTeach();
}

function captureTeachPoint() {
  if (!teachOn()) return null;
  return { key: teachKey(), snap: engine.clone() };
}

async function reviewPreviousMove() {
  stopKifuPlay();
  if (teachBusy || aiThinking || kifuAiThinking) return;
  if (!engine.moveHistory.length) {
    if (els.teachNote) els.teachNote.textContent = "还没有可以看的一手。";
    return;
  }
  const snap = engine.clone();
  const last = snap.moveHistory[snap.moveHistory.length - 1];
  if (!snap.undo().ok) return;
  const played = last.type === "pass" ? { pass: true } : { pass: false, x: last.x, y: last.y };
  teachBusy = true;
  if (els.teachNote) els.teachNote.textContent = "模型在看上一手…";
  try {
    const bridge = await import("./katago-bridge.js");
    const review = await bridge.kataReview(snap, (text) => {
      if (els.teachNote) els.teachNote.textContent = text;
    });
    const verdict = bridge.teachVerdict(review, played, snap.size);
    teachOverlay = verdict.overlay;
    if (els.teachNote) els.teachNote.textContent = verdict.text;
    draw();
  } catch (err) {
    console.error(err);
    if (els.teachNote) els.teachNote.textContent = "模型这次没看完。";
  } finally {
    teachBusy = false;
    armTeach();
  }
}

function applyDifficulty() {
  const id = els.difficultySelect.value;
  if (!danSelected()) ai.setDifficulty(id || "k6");
}

async function chooseAiMove(signal) {
  const id = els.difficultySelect.value;
  if (danSelected()) {
    const bridge = await import("./katago-bridge.js");
    return bridge.kataChooseMove(engine, id, (text) => showMessage(text, true), signal);
  }
  ai.setDifficulty(id || "k6");
  return ai.chooseMove(engine);
}

async function maybeAiMove() {
  if (isDrill() || isKifu() || !isAiMode() || engine.phase !== "playing") return;
  if (engine.toPlay !== aiColor()) return;
  if (aiThinking) return;

  const token = ++aiToken;
  aiThinking = true;
  const signal = armKataSearch();
  refresh(danSelected() ? "KataGo 模型思考中…" : "本地搜索思考中…", true);

  try {
    const move = await chooseAiMove(signal);
    if (token !== aiToken) return;
    if (engine.phase !== "playing" || engine.toPlay !== aiColor()) return;

    if (move.type === "pass") {
      const res = engine.pass();
      if (!res.ok) {
        refresh(res.reason || "AI 停着失败");
        return;
      }
      if (res.scoring) {
        const n = engine.deadMarks.size;
        refresh(
          `AI 停着，进入点目预览：已标 ${n} 个死子。看着色，可点棋子修改后再确认。`,
          true
        );
      } else {
        refresh("AI 停着", true);
      }
      return;
    }

    const res = engine.play(move.x, move.y);
    if (!res.ok) {
      // 避免非法着法被改成停着，导致误进入点目
      refresh("AI 着法无效，请悔棋或新开一局");
      return;
    }
    playSound("clickAudio");
    const cap = res.captured?.length || 0;
    const where = coordName(move.x, move.y, engine.size);
    const who = colorName(opponent(engine.toPlay));
    refresh(cap ? `${who} ${where}，提子 ${cap}` : `${who} ${where}`, true);
  } catch (err) {
    if (isKataCanceled(err)) return;
    console.error(err);
    const detail = err instanceof Error ? err.message : "";
    refresh(detail ? `AI 出错：${detail}` : "AI 出错，请悔棋或新开一局");
  } finally {
    if (token === aiToken) {
      aiThinking = false;
      updatePanel();
      draw();
      armTeach();
    }
  }
}

async function onBoardClick(evt) {
  evt.preventDefault?.();
  if (aiThinking || teachBusy || kifuAiThinking) return;
  const coord = evt.coord || eventToCoord(evt);
  if (!coord) return;

  if (isDrill()) {
    onDrillMove(coord);
    return;
  }
  if (isKifu()) {
    onKifuMove(coord);
    return;
  }

  if (engine.phase === "scoring") {
    const res = engine.toggleDead(coord.x, coord.y);
    if (!res.ok) showMessage(res.reason || "");
    else showMessage("已手动更新死子。可再点「自动标死子」重算，或确认点目。", true);
    refresh();
    return;
  }

  if (engine.phase !== "playing") return;
  if (!isHumanTurn()) {
    showMessage("当前是 AI 行棋，请稍候", true);
    return;
  }

  const taught = captureTeachPoint();
  const res = engine.play(coord.x, coord.y);
  if (!res.ok) {
    showMessage(res.reason);
    draw();
    return;
  }
  playSound("clickAudio");
  const cap = res.captured?.length || 0;
  const who = colorName(opponent(engine.toPlay));
  const where = coordName(coord.x, coord.y, engine.size);
  refresh(cap ? `${who} ${where}，提子 ${cap}` : "", true);
  announce(`${who} ${where}${cap ? `，提子 ${cap}` : ""}`);
  await afterUserMove({ pass: false, x: coord.x, y: coord.y }, taught?.key, taught?.snap);
}

function onMove(evt) {
  const coord = eventToCoord(evt);
  const next = coord ? `${coord.x},${coord.y}` : null;
  const prev = hover ? `${hover.x},${hover.y}` : null;
  if (next !== prev) {
    hover = coord;
    draw();
  }
}

function cropNote() {
  const view = drill?.view;
  if (!view) return "";
  if (view.edgeL && view.edgeR && view.edgeT && view.edgeB) return "";
  return " 虚线那边棋盘还在延续，不是边线。";
}

function nextDrillCue() {
  const node = drill?.options()?.[0];
  if (!node) return "";
  return "请接下一手。拿不准按「提示」。";
}

function updateDrillMeta() {
  if (!drill) return;
  const p = drill.problem;
  const total = problemsOf(p.track, p.level).length;
  const done = drill.solvedCount();
  els.drillIntro.textContent = trackById(p.track).intro;
  let text = `${p.title} · 第 ${drill.index + 1}/${total} 题 · 本级已过 ${done}/${total}`;
  if (levelCleared(p.track, p.level, drill.progress)) text += " · 本级已全部走通";
  els.drillProgress.textContent = text;
  els.drillSource.textContent = p.source || "";
}

function fillLevelSelect() {
  if (!drillCatalogReady()) return;
  uiLock += 1;
  const trackId = els.trackSelect.value || "tactic";
  const track = trackById(trackId);
  const wanted = drill && drill.track === trackId ? drill.level : Number(els.levelSelect.value) || 1;
  const previous = els.levelSelect.value;
  els.levelSelect.innerHTML = "";
  for (const lv of track.levels) {
    const opt = document.createElement("option");
    opt.value = String(lv.level);
    opt.textContent = lv.name;
    els.levelSelect.appendChild(opt);
  }
  const choice = track.levels.some((lv) => lv.level === wanted) ? wanted : 1;
  els.levelSelect.value = String(choice);
  if (!els.levelSelect.value) els.levelSelect.value = previous || "1";
  if (!drill) {
    els.drillIntro.textContent = track.intro;
  }
  uiLock -= 1;
}

function startDrill() {
  if (!drill) drill = new DrillSession(loadProgress());
  drill.resetAttempt();
  engine = loadPosition(drill.problem);
  aiToken += 1;
  aiThinking = false;
  hover = null;
  drillHint = null;
  drillFlash = null;
  uiLock += 1;
  els.trackSelect.value = drill.track;
  fillLevelSelect();
  els.levelSelect.value = String(drill.level);
  uiLock -= 1;
  updateDrillMeta();
  const p = drill.problem;
  const total = problemsOf(p.track, p.level).length;
  const face = drillFaceText(p.prompt);
  refresh(`${p.title}（${drill.index + 1}/${total}）。${face} 拿不准按「提示」。${cropNote()}`, true);
}

function replayDrillLog() {
  engine = loadPosition(drill.problem);
  for (const m of drill.log) {
    const res = engine.play(m.x, m.y);
    if (!res.ok) break;
  }
}

function onDrillMove(coord) {
  if (!drill || drill.busy || drill.solvedFlag) return;
  if (engine.board[coord.y][coord.x]) {
    showMessage("此处已有棋子");
    return;
  }
  const hit = drill.classify(coord.x, coord.y);
  if (!hit.ok) {
    drill.misses += 1;
    flashWrong(coord);
    showMessage(
      drill.misses >= 2
        ? "还不对。可以看答案，看完再重试，自己走通才算过关。"
        : "不是正解，再想想。"
    );
    return;
  }
  const res = engine.play(coord.x, coord.y);
  if (!res.ok) {
    showMessage(res.reason || "这里不能下");
    return;
  }
  playSound("clickAudio");
  const step = drill.commitUser(hit.node);
  if (step.defense) {
    const d = engine.play(step.defense.x, step.defense.y);
    if (!d.ok) {
      showMessage("这步变化走不下去，请重试本题");
      return;
    }
    const after = drill.commitDefense(step.defense);
    if (after.solved) finishDrillSolve();
    else {
      const reply = step.defense.why || "对方应了一手。";
      refresh(`${reply} ${nextDrillCue()}`, true);
    }
    return;
  }
  if (step.solved) finishDrillSolve();
  else refresh(`${hit.node.why || "这一手是对的。"} ${nextDrillCue()}`, true);
}

function finishDrillSolve() {
  drill.markSolved();
  saveProgress(drill.progress);
  updateDrillMeta();
  fillLevelSelect();
  els.levelSelect.value = String(drill.level);
  const review = drill.problem.lesson ? `走通了。${drill.problem.lesson}` : "走通了。";
  refresh(review, true);
}

function flashWrong(coord) {
  drillFlash = coord;
  draw();
  const token = ++flashToken;
  setTimeout(() => {
    if (token !== flashToken) return;
    drillFlash = null;
    draw();
  }, 700);
}

async function showDrillSolution() {
  if (!drill || drill.busy) return;
  const token = ++drillToken;
  drill.busy = true;
  drill.resetAttempt();
  drill.busy = true;
  engine = loadPosition(drill.problem);
  hover = null;
  refresh("看答案：下面是谱上的主变化。看完请重试，自己走通才算过关。", true);
  for (const m of drill.mainLine()) {
    if (token !== drillToken) return;
    drillHint = { x: m.x, y: m.y };
    refresh(m.why || "谱上的下一手。", true);
    draw();
    await sleep(700);
    if (token !== drillToken) return;
    const res = engine.play(m.x, m.y);
    drillHint = null;
    if (!res.ok) break;
    playSound("clickAudio");
    draw();
    await sleep(260);
  }
  if (token !== drillToken) return;
  await sleep(500);
  if (token !== drillToken) return;
  drill.busy = false;
  drill.resetAttempt();
  engine = loadPosition(drill.problem);
  refresh("演示结束。请自己再走一遍。", true);
}

function shiftDrill(delta) {
  if (!drill || drill.busy) return;
  drillToken += 1;
  if (!drill.step(delta)) {
    showMessage(delta > 0 ? "已经是本级最后一题" : "已经是本级第一题");
    return;
  }
  saveProgress(drill.progress);
  startDrill();
}

const KIFU_ERAS = ["唐", "宋", "明", "清", "近代"];
const KIFU_LEVELS = ["初级", "中级", "高级"];
let kifuPlayersReady = false;

function fillKifuPlayers() {
  if (!els.kifuPlayer || kifuPlayersReady) return;
  const counts = new Map();
  for (const game of getKifu()) {
    counts.set(game.blackName, (counts.get(game.blackName) || 0) + 1);
    counts.set(game.whiteName, (counts.get(game.whiteName) || 0) + 1);
  }
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"));
  for (const [name, count] of names) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = `${name}（${count}）`;
    els.kifuPlayer.appendChild(opt);
  }
  kifuPlayersReady = true;
}

function kifuBucket(game, player) {
  if (player) return game.level || "未分级";
  return game.era || "其他";
}

function fillKifuSelect() {
  if (!els.kifuSelect || !kifuLibraryReady()) return;
  fillKifuPlayers();
  const query = (els.kifuFilter?.value || "").trim();
  const player = els.kifuPlayer?.value || "";
  const level = els.kifuLevel?.value || "";
  const era = els.kifuEra?.value || "";
  const current = els.kifuSelect.value;
  const games = getKifu().filter((game) => {
    if (player && game.blackName !== player && game.whiteName !== player) return false;
    if (level && game.level !== level) return false;
    if (era && game.era !== era) return false;
    if (!query) return true;
    const hay = `${game.group} ${game.title} ${game.blackName} ${game.whiteName} ${game.date} ${game.result} ${game.level || ""} ${game.era || ""} ${game.rankText || ""}`;
    return hay.includes(query);
  });
  const order = player ? KIFU_LEVELS : KIFU_ERAS;
  games.sort((a, b) => {
    const ia = order.indexOf(kifuBucket(a, player));
    const ib = order.indexOf(kifuBucket(b, player));
    const oa = ia < 0 ? order.length : ia;
    const ob = ib < 0 ? order.length : ib;
    return oa - ob || String(a.date).localeCompare(String(b.date)) || a.title.localeCompare(b.title, "zh");
  });
  if (els.kifuSelectLabel) els.kifuSelectLabel.textContent = `棋谱（${games.length} 局）`;
  uiLock += 1;
  els.kifuSelect.innerHTML = "";
  if (!games.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "没有对上的棋谱";
    els.kifuSelect.appendChild(opt);
    uiLock -= 1;
    return;
  }
  let bucket = "";
  for (const game of games) {
    const nextBucket = kifuBucket(game, player);
    if (nextBucket !== bucket) {
      const optg = document.createElement("optgroup");
      optg.label = nextBucket;
      els.kifuSelect.appendChild(optg);
      bucket = nextBucket;
    }
    const opt = document.createElement("option");
    opt.value = game.id;
    const named = game.title.includes(game.blackName) || game.title.includes("对");
    const players = named ? "" : ` · ${game.blackName} 对 ${game.whiteName}`;
    const mark = player ? game.era : game.level;
    opt.textContent = `${mark || ""} · ${game.title}${players} · ${game.result}`.replace(/^ · /, "");
    els.kifuSelect.lastElementChild.appendChild(opt);
  }
  if (games.some((game) => game.id === current)) els.kifuSelect.value = current;
  uiLock -= 1;
}

function kifuHeadline(game) {
  const seat = game.seat ? "座子局，白先。" : "空枰黑先。";
  const rank = game.rankText ? `${game.rankText}。` : "";
  const level = game.level ? `${game.level}打谱。` : "";
  const era = game.era ? `${game.era}。` : "";
  return `${level}${era}${rank}${game.blackName} 执黑 · ${game.whiteName} 执白 · ${game.date || "年代不详"} · ${game.result}。${seat}${game.summary}`;
}

function startKifu() {
  if (els.kifuSelect && !els.kifuSelect.value) {
    showMessage("没有对上的棋谱");
    return;
  }
  const library = getKifu();
  const id = els.kifuSelect?.value || library[0]?.id;
  const game = gameById(id);
  if (!game) {
    showMessage("没有对上的棋谱");
    return;
  }
  if (!kifu || kifu.game.id !== game.id) kifu = new KifuSession(game);
  kifu.game = game;
  kifu.mode = els.kifuStudy?.value || "replay";
  kifu.userSide = els.kifuSide?.value === "white" ? 2 : 1;
  kifu.resetStudy();
  engine = kifu.mount();
  if (kifu.mode === "play") kifu.autoOpponent(engine);
  aiToken += 1;
  aiThinking = false;
  kifuAiThinking = false;
  hover = null;
  drillHint = null;
  drillFlash = null;
  stopKifuPlay();
  els.kifuBlurb.textContent = kifuHeadline(game);
  teachOverlay = null;
  teachArmed = null;
  if (els.teachNote) els.teachNote.textContent = "";
  refresh(kifuStatusLine(), true);
  armTeach();
}

function playedMoveText() {
  const played = kifu.playedMove();
  if (!played) return "";
  const who = colorName(played.color);
  if (played.pass) return `上一手 ${who}停着。`;
  return `上一手 ${who} ${coordName(played.x, played.y, kifu.game.size)}。`;
}

function kifuStatusLine() {
  const game = kifu.game;
  const nxt = kifu.nextMove();
  const played = kifu.playedMove();
  const at = `第 ${kifu.cursor} / ${kifu.total} 手`;
  const just = playedMoveText();
  if (kifu.deviated) return `${game.title}。已经离开棋谱，AI 会接着应。要回到分岔前，按「回到谱上」。`;
  if (played?.note) {
    const extra = kifu.mode === "guess" && nxt ? " 请继续猜下一手。" : "";
    return `${game.title} · ${at}。${just}${played.note}${extra}`;
  }
  if (!nxt) return `${game.title} · ${at}。${just}谱已结束。${game.result}`;
  if (kifu.mode === "guess") return `${game.title} · ${at}。${just}请猜${colorName(engine.toPlay)}的下一手。`;
  if (kifu.mode === "play") {
    return `${game.title} · ${at}。${just}你执${colorName(kifu.userSide)}。下在谱上就继续，下到别处则改由 AI 应手。`;
  }
  if (kifuPlaying) return `${game.title} · ${at}。${just || "连续打谱中。"}`;
  const where = nxt.pass ? "停着" : coordName(nxt.x, nxt.y, game.size);
  return `${game.title} · ${at}。${just}下一手 ${colorName(nxt.color)} ${where}。`;
}

function syncKifuStudyNote() {
  if (!els.kifuNote) return;
  if (!isKifu() || !kifu) {
    els.kifuNote.textContent = "";
    return;
  }
  const notes = kifu.game.moves.filter((move) => move.note).length;
  const played = kifu.playedMove();
  if (els.kifuProgress) {
    els.kifuProgress.textContent = `${kifu.game.title} · 第 ${kifu.cursor} / ${kifu.total} 手 · 批注 ${notes} 处`;
  }
  els.kifuNote.textContent = played?.note
    ? played.note
    : notes
      ? `本局有 ${notes} 处批注。拖进度条、点盘上的子，或按「下一处批注」。说明出现在刚落下的那一手上。`
      : "这局还没有逐手批注。";
}

function kifuPlayLabel() {
  if (kifu && kifu.mode === "replay" && !kifu.deviated && kifu.cursor > 0 && kifu.nextMove()) return "继续";
  return "连续打谱";
}

function syncKifuPlayButton() {
  if (!els.btnKifuPlay) return;
  els.btnKifuPlay.textContent = kifuPlaying ? "暂停" : kifuPlayLabel();
}

function stopKifuPlay() {
  if (kifuTimer) {
    clearInterval(kifuTimer);
    kifuTimer = null;
  }
  kifuPlaying = false;
  syncKifuPlayButton();
}

function kifuPaceMs() {
  if (els.kifuPace?.value === "slow") return 1100;
  if (els.kifuPace?.value === "fast") return 280;
  return 620;
}

function startKifuPlay() {
  if (!kifu || kifu.mode !== "replay" || kifu.deviated || kifuAiThinking) {
    showMessage("连续打谱只在「打谱」里使用。", true);
    return;
  }
  if (!kifu.nextMove()) {
    showMessage("已经是终局。", true);
    return;
  }
  clearTeachDisplay();
  if (kifuTimer) {
    clearInterval(kifuTimer);
    kifuTimer = null;
  }
  kifuPlaying = true;
  syncKifuPlayButton();
  refresh(kifuStatusLine(), true);
  kifuTimer = setInterval(() => {
    if (!kifuPlaying || !isKifu() || !kifu || kifu.mode !== "replay" || kifu.deviated || !kifu.nextMove()) {
      stopKifuPlay();
      return;
    }
    stepKifu(1, true);
    if (kifu.playedMove()?.note || !kifu.nextMove()) stopKifuPlay();
  }, kifuPaceMs());
}

function toggleKifuPlay() {
  if (kifuTimer) stopKifuPlay();
  else startKifuPlay();
}

function seekKifu(target) {
  stopKifuPlay();
  if (!kifu || kifuAiThinking || kifu.deviated) return;
  const dest = Math.max(0, Math.min(Math.round(Number(target)) || 0, kifu.total));
  if (dest === kifu.cursor) return;
  clearTeachDisplay();
  kifuToken += 1;
  kifu.jumpTo(dest);
  engine = kifu.mount();
  if (kifu.mode === "play") kifu.autoOpponent(engine);
  refresh(kifuStatusLine(), true);
}

function stepKifu(dir, silent = false) {
  if (!kifu || kifuAiThinking) return;
  if (!silent) stopKifuPlay();
  clearTeachDisplay();
  kifuToken += 1;
  if (kifu.deviated) {
    if (dir < 0 && engine.undo().ok) {
      if (engine.moveHistory.length === kifu.cursor) kifu.deviated = false;
      refresh(kifuStatusLine(), true);
    }
    return;
  }
  if (dir > 0) {
    const res = kifu.advance(engine);
    if (!res.ok) {
      showMessage(res.reason || "不能继续");
      stopKifuPlay();
      return;
    }
    if (!silent) playSound("clickAudio");
  } else if (kifu.cursor > 0 && engine.undo().ok) {
    kifu.cursor -= 1;
  }
  refresh(kifuStatusLine(), true);
}

function remountKifu(message) {
  kifuToken += 1;
  kifuAiThinking = false;
  teachOverlay = null;
  if (els.teachNote) els.teachNote.textContent = "";
  engine = kifu.mount();
  if (kifu.mode === "play") kifu.autoOpponent(engine);
  refresh(message, true);
}

function jumpKifuNote() {
  stopKifuPlay();
  if (!kifu || kifuAiThinking) return;
  const index = kifu.nextNoteIndex();
  if (index < 0) {
    showMessage("这局没有逐手批注");
    return;
  }
  kifu.jumpTo(index + 1);
  remountKifu(kifuStatusLine());
}

function practiceKifuMiss() {
  if (!kifu || kifuAiThinking) return;
  const index = kifu.nextMissIndex();
  if (index < 0) {
    showMessage("还没有记错过的手。猜错两次才会记下来。");
    return;
  }
  kifu.jumpTo(index);
  remountKifu(`回到第 ${index + 1} 手之前，再猜这一手。错过 ${kifu.misses.length} 处。`);
}

function jumpKifuNumber() {
  stopKifuPlay();
  if (!kifu || kifuAiThinking || !els.kifuJump) return;
  const raw = Number(els.kifuJump.value);
  if (!Number.isFinite(raw)) {
    showMessage("请填写手数");
    return;
  }
  kifu.jumpTo(raw);
  remountKifu(kifuStatusLine());
}

function hintDrill() {
  if (!drill || drill.busy || drill.solvedFlag) return;
  const node = drill.options()[0];
  if (!node) return;
  drillHint = { x: node.x, y: node.y };
  draw();
  showMessage(node.why ? `提示：${node.why}` : "棋盘上标出的就是下一手。", true);
}

function revealKifuMove() {
  stopKifuPlay();
  if (!kifu || kifu.deviated || kifu.mode === "replay") return;
  const move = kifu.nextMove();
  if (!move) return;
  const res = kifu.advance(engine);
  if (!res.ok) {
    showMessage(res.reason || "不能揭示");
    return;
  }
  playSound("clickAudio");
  if (kifu.mode === "play") kifu.autoOpponent(engine);
  const where = move.pass ? "停着" : coordName(move.x, move.y, kifu.game.size);
  refresh(`谱上是 ${colorName(move.color)} ${where}。${kifuStatusLine()}`, true);
}

function returnToRecord() {
  if (!kifu || !kifu.deviated) return;
  kifuToken += 1;
  kifuAiThinking = false;
  kifu.deviated = false;
  engine = kifu.mount();
  if (kifu.mode === "play") kifu.autoOpponent(engine);
  refresh(`已回到谱上。${kifuStatusLine()}`, true);
}

function jumpKifuEnd() {
  if (!kifu || kifu.deviated || kifuAiThinking) return;
  seekKifu(kifu.total);
}

async function onKifuMove(coord) {
  if (!kifu || kifuAiThinking) return;
  if (kifu.mode === "replay") {
    if (engine.board[coord.y][coord.x]) {
      const index = stoneMoveIndex(engine, coord.x, coord.y);
      if (index) {
        seekKifu(index);
        return;
      }
      showMessage("这是座子，开局就在盘上。", true);
      return;
    }
    showMessage("这个交叉点还没有棋子。用「下一手」或进度条往后看。", true);
    return;
  }
  if (engine.board[coord.y][coord.x]) {
    showMessage("此处已有棋子");
    return;
  }
  if (kifu.deviated) {
    if (engine.toPlay !== kifu.userSide) return;
    const taught = captureTeachPoint();
    const res = engine.play(coord.x, coord.y);
    if (!res.ok) {
      showMessage(res.reason || "这里不能下");
      return;
    }
    playSound("clickAudio");
    refresh("已离开棋谱。", true);
    await afterUserMove({ pass: false, x: coord.x, y: coord.y }, taught?.key, taught?.snap);
    return;
  }
  const expect = kifu.nextMove();
  if (!expect) {
    showMessage("谱已经结束");
    return;
  }
  if (kifu.mode === "play" && engine.toPlay !== kifu.userSide) return;
  if (!kifu.matches(coord.x, coord.y)) {
    if (kifu.mode === "guess") {
      flashWrong(coord);
      const tries = kifu.recordGuessMiss();
      const where = expect.pass ? "停着" : coordName(expect.x, expect.y, kifu.game.size);
      if (tries < 2) {
        showMessage("不是谱上这一手。再试一次，或按「揭示此手」。");
      } else {
        showMessage(`谱上是 ${where}。这一手已记入错过，可以用「再练错过」回来。`);
      }
      updatePanel();
      return;
    }
    const taught = captureTeachPoint();
    const res = engine.play(coord.x, coord.y);
    if (!res.ok) {
      showMessage(res.reason || "这里不能下");
      return;
    }
    kifu.deviated = true;
    playSound("clickAudio");
    refresh("这手不在谱上，接下来由 AI 应。", true);
    await afterUserMove({ pass: false, x: coord.x, y: coord.y }, taught?.key, taught?.snap);
    return;
  }
  const taught = captureTeachPoint();
  const res = kifu.advance(engine);
  if (!res.ok) {
    showMessage(res.reason || "不能落子");
    return;
  }
  playSound("clickAudio");
  if (kifu.mode === "play") kifu.autoOpponent(engine);
  refresh(expect.note ? expect.note : "对了。", true);
  if (taught && !expect.pass) await explainPlayed({ pass: false, x: expect.x, y: expect.y }, taught.key, taught.snap);
  else if (taught && expect.pass) await explainPlayed({ pass: true }, taught.key, taught.snap);
  armTeach();
}

async function maybeKifuAi() {
  if (!isKifu() || !kifu.deviated || kifu.mode !== "play") return;
  if (engine.phase !== "playing" || engine.toPlay === kifu.userSide) return;
  if (kifuAiThinking) return;
  const token = ++kifuToken;
  kifuAiThinking = true;
  const signal = armKataSearch();
  refresh(danSelected() ? "KataGo 模型正在应手…" : "本地搜索正在应手…", true);
  try {
    const move = await chooseAiMove(signal);
    if (token !== kifuToken || !kifu?.deviated) return;
    if (move.type === "pass") engine.pass();
    else {
      const res = engine.play(move.x, move.y);
      if (!res.ok) {
        refresh("AI 这步无效，请悔棋或回到谱上");
        return;
      }
      playSound("clickAudio");
    }
    const placed = move.type === "pass" ? "停着" : coordName(move.x, move.y, engine.size);
    refresh(`AI 已应 ${placed}。可以继续探索，或回到谱上。`, true);
  } catch (err) {
    if (isKataCanceled(err)) return;
    console.error(err);
    refresh("AI 出错，请回到谱上");
  } finally {
    if (token === kifuToken) {
      kifuAiThinking = false;
      updatePanel();
      draw();
      armTeach();
    }
  }
}

async function newGame() {
  stopKifuPlay();
  abortKataSearch();
  touchPreview = null;
  keyboardPoint = null;
  if (kifuSelected()) {
    if (!kifuLibraryReady()) {
      showMessage("正在载入棋谱…", true);
      try {
        await loadKifuLibrary();
      } catch {
        showMessage("棋谱没有载入。");
        return;
      }
      if (!kifuSelected()) return;
      fillKifuSelect();
    }
    kifuToken += 1;
    drill = null;
    startKifu();
    return;
  }
  kifu = null;
  kifuNumbers = null;
  if (drillSelected()) {
    if (!drillCatalogReady()) {
      showMessage("正在载入练习题…", true);
      try {
        await loadDrillCatalog();
      } catch {
        showMessage("练习题没有载入。");
        return;
      }
      if (!drillSelected()) return;
      fillLevelSelect();
    }
    if (!drill) drill = new DrillSession(loadProgress());
    const track = els.trackSelect.value || "tactic";
    const level = Number(els.levelSelect.value) || 1;
    const keepIndex = drill.track === track && drill.level === level;
    if (!drill.setPlace(track, level, keepIndex ? drill.index : 0)) {
      showMessage("这一级还没解锁。先把上一级全部走通。");
      fillLevelSelect();
      return;
    }
    drillToken += 1;
    saveProgress(drill.progress);
    startDrill();
    return;
  }
  drill = null;
  drillToken += 1;
  aiToken += 1;
  aiThinking = false;
  const size = Number(els.sizeSelect.value);
  const komi = Number(els.komiSelect.value);
  engine = new GoEngine(size, komi, {
    autoDead: !els.autoDeadToggle || els.autoDeadToggle.checked,
  });
  applyDifficulty();
  hover = null;
  syncAiOptionVisibility();

  let tip = isRecordMode()
    ? "打谱开始，黑先。每颗落下的棋子标着序号，提掉的不再标。随时可以标死子或确认点目。"
    : "新对局开始，黑先。";
  if (isAiMode()) {
    const you = colorName(humanColor());
    const pace = size >= 19 ? "19 路思考会稍久。" : "";
    tip = `人机对战开始：你执${you}，AI 执${colorName(aiColor())}（${els.difficultySelect.selectedOptions[0].text} · ${size}路）。${pace}`;
  }
  teachOverlay = null;
  if (els.teachNote) els.teachNote.textContent = "";
  teachArmed = null;
  refresh(tip, true);
  void maybeAiMove().finally(() => armTeach());
}

els.btnPass.addEventListener("click", async () => {
  if (isKifu() && kifu.mode === "guess" && !kifu.deviated && kifu.nextMove()?.pass) {
    const res = kifu.advance(engine);
    if (!res.ok) showMessage(res.reason || "不能停着");
    else refresh("对了，谱上是停着。", true);
    return;
  }
  if (aiThinking || teachBusy || !isHumanTurn()) return;
  const taught = captureTeachPoint();
  const res = engine.pass();
  if (!res.ok) {
    showMessage(res.reason);
    return;
  }
  if (res.scoring) {
    const n = engine.deadMarks.size;
    refresh(
      `双方停着，进入点目预览：已标 ${n} 个死子。深色空点计黑，浅色计白。可点棋子修改后再确认。`,
      true
    );
    if (taught) await explainPlayed({ pass: true }, taught.key, taught.snap);
  } else {
    refresh(`${colorName(opponent(engine.toPlay))}方停着`, true);
    await afterUserMove({ pass: true }, taught?.key, taught?.snap);
  }
});

els.btnAutoDead.addEventListener("click", () => {
  if (aiThinking) return;
  if (engine.phase !== "playing" && engine.phase !== "scoring") return;
  aiToken += 1;
  const res = engine.autoMarkDead();
  if (!res.ok) {
    showMessage(res.reason || "");
    return;
  }
  refresh(
    res.entered
      ? `已进入点目，自动标记 ${res.count} 个死子。可点击棋子修改，再确认点目。`
      : `已重新自动标记 ${res.count} 个死子，可手动微调后确认点目。`,
    true
  );
});

els.btnResign.addEventListener("click", () => {
  if (aiThinking) return;
  const loser = isAiMode() ? humanColor() : engine.toPlay;
  if (!confirm(`${colorName(loser)}方确认认输？`)) return;
  engine.resign(loser);
  refresh(engine.result.text, true);
});

els.btnUndo.addEventListener("click", () => {
  clearTeachDisplay();
  if (isKifu()) {
    stepKifu(-1);
    return;
  }
  if (isDrill()) {
    if (drill.busy) return;
    if (!drill.undo()) {
      showMessage("没有可悔的棋");
      return;
    }
    replayDrillLog();
    refresh("已悔棋", true);
    return;
  }
  if (aiThinking) return;
  if (isAiMode()) {
    // 回到轮到你下棋的状态：通常撤销 AI 一手 + 你一手
    if (engine.phase === "scoring" || engine.phase === "finished") {
      let undos = 0;
      const res = engine.undo();
      if (!res.ok) {
        showMessage(res.reason);
        return;
      }
      undos += 1;
      if (engine.phase === "playing" && engine.toPlay === aiColor() && engine.undo().ok) undos += 1;
      refresh(undos >= 2 ? "已悔棋，你和 AI 的上一手都拿掉了。" : "已悔棋", true);
      void maybeAiMove();
      armTeach();
      return;
    }
    if (engine.toPlay === aiColor()) {
      // AI 尚未落下时：优先撤销你的上一手；否则让 AI 重走
      if (engine.undo().ok) {
        refresh("已悔棋", true);
        if (engine.toPlay === aiColor()) void maybeAiMove();
      } else {
        refresh("AI 重新思考…", true);
        void maybeAiMove();
      }
      armTeach();
      return;
    }

    let undos = 0;
    // 刚轮到你：撤销 AI 应手 + 你的上一手
    if (engine.undo().ok) undos += 1;
    if (engine.undo().ok) undos += 1;
    if (!undos) {
      showMessage("没有可悔的棋");
      return;
    }
    // 若仍轮到 AI（例如你执白、撤销了开局），让 AI 重新走
    refresh(undos >= 2 ? "已悔棋，你和 AI 的上一手都拿掉了。" : "已悔棋", true);
    void maybeAiMove();
    armTeach();
    return;
  }

  const res = engine.undo();
  if (!res.ok) showMessage(res.reason);
  else refresh("已悔棋", true);
  armTeach();
});

els.btnScore.addEventListener("click", () => {
  if (aiThinking) return;
  if (engine.phase === "playing") {
    aiToken += 1;
    abortKataSearch();
    syncAutoDead();
    const res = engine.beginScoring();
    if (!res.ok) {
      showMessage(res.reason || "");
      return;
    }
    const n = engine.deadMarks.size;
    refresh(
      engine.autoDead
        ? `点目预览：自动标了 ${n} 个死子。看着色改完，再按「确认结果」。提子不另加。`
        : "点目预览：没有自动标死子。点棋子自己标，再按「确认结果」。",
      true
    );
    return;
  }
  if (engine.phase !== "scoring") return;
  aiToken += 1;
  const res = engine.score();
  if (!res.ok) showMessage(res.reason);
  else refresh(`${engine.result.text} 提子没有另加。`, true);
});

els.btnClearDead?.addEventListener("click", () => {
  if (engine.phase !== "scoring") return;
  engine.clearDeadMarks();
  refresh("已清除死子标记。可以点棋子重标，或再按「自动标死子」。", true);
});

function parseCoord(text) {
  const raw = String(text || "").trim().toUpperCase();
  const match = raw.match(/^([A-HJ-T])\s*(\d{1,2})$/);
  if (!match) return null;
  const files = "ABCDEFGHJKLMNOPQRST";
  const x = files.indexOf(match[1]);
  const rank = Number(match[2]);
  const y = engine.size - rank;
  if (x < 0 || y < 0 || y >= engine.size || x >= engine.size) return null;
  return { x, y };
}

function submitCoord() {
  const coord = parseCoord(els.coordInput?.value);
  if (!coord) {
    showMessage("坐标写成字母加数字，例如 D4。I 不用。");
    return;
  }
  keyboardPoint = coord;
  hover = coord;
  if (els.coordInput) els.coordInput.value = "";
  void onBoardClick({ coord });
}

els.btnCoord?.addEventListener("click", () => submitCoord());
els.coordInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    submitCoord();
  }
});

function nudgeKeyboard(dx, dy) {
  const size = engine.size;
  const view = isDrill() && drill?.view ? drill.view : null;
  const x0 = view ? view.x0 : 0;
  const y0 = view ? view.y0 : 0;
  const x1 = view ? view.x1 : size - 1;
  const y1 = view ? view.y1 : size - 1;
  if (!keyboardPoint) {
    keyboardPoint = { x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2) };
  } else {
    keyboardPoint = {
      x: Math.max(x0, Math.min(x1, keyboardPoint.x + dx)),
      y: Math.max(y0, Math.min(y1, keyboardPoint.y + dy)),
    };
  }
  hover = keyboardPoint;
  touchPreview = null;
  announce(`选中 ${coordName(keyboardPoint.x, keyboardPoint.y, size)}`);
  draw();
}

function placeKeyboard() {
  if (!keyboardPoint) nudgeKeyboard(0, 0);
  if (!keyboardPoint) return;
  hover = keyboardPoint;
  void onBoardClick({ coord: keyboardPoint });
}

els.btnNew.addEventListener("click", () => {
  const dirty = isDrill() ? drill && drill.log.length > 0 : engine.moveHistory.length > 0;
  const ask = isDrill() ? "重开本题？当前尝试会清空。" : "开始新对局？当前棋谱将清空。";
  if (dirty && !confirm(ask)) return;
  newGame();
});

els.btnDrillPrev?.addEventListener("click", () => shiftDrill(-1));
els.btnDrillNext?.addEventListener("click", () => shiftDrill(1));
els.btnDrillRetry?.addEventListener("click", () => {
  if (!drill) return;
  drillToken += 1;
  startDrill();
});
els.btnDrillSolve?.addEventListener("click", () => {
  showDrillSolution();
});

els.btnKifuStart?.addEventListener("click", () => startKifu());
els.btnKifuPrev?.addEventListener("click", () => stepKifu(-1));
els.btnKifuNext?.addEventListener("click", () => stepKifu(1));
els.btnKifuEnd?.addEventListener("click", () => jumpKifuEnd());
els.btnKifuReveal?.addEventListener("click", () => revealKifuMove());
els.btnKifuReturn?.addEventListener("click", () => returnToRecord());
els.btnKifuNote?.addEventListener("click", () => jumpKifuNote());
els.btnKifuMiss?.addEventListener("click", () => practiceKifuMiss());
els.btnKifuJump?.addEventListener("click", () => jumpKifuNumber());
els.btnKifuPlay?.addEventListener("click", () => toggleKifuPlay());
els.kifuPace?.addEventListener("change", () => {
  try {
    localStorage.setItem("go-hub-kifu-pace", els.kifuPace.value);
  } catch {
    /* private mode */
  }
  if (kifuPlaying) startKifuPlay();
});
els.kifuSlider?.addEventListener("pointerdown", () => {
  kifuSliderHold = true;
});
const releaseKifuSlider = () => {
  if (!kifuSliderHold) return;
  kifuSliderHold = false;
  if (isKifu() && els.kifuSlider) els.kifuSlider.value = String(kifu.cursor);
};
els.kifuSlider?.addEventListener("pointerup", releaseKifuSlider);
els.kifuSlider?.addEventListener("pointercancel", releaseKifuSlider);
els.kifuSlider?.addEventListener("input", () => {
  seekKifu(Number(els.kifuSlider.value));
});
els.btnDrillHint?.addEventListener("click", () => hintDrill());
els.btnDrillUndo?.addEventListener("click", () => els.btnUndo.click());

els.kifuFilter?.addEventListener("input", () => {
  fillKifuSelect();
});
els.kifuPlayer?.addEventListener("change", () => fillKifuSelect());
els.kifuLevel?.addEventListener("change", () => fillKifuSelect());
els.kifuEra?.addEventListener("change", () => fillKifuSelect());
els.kifuSelect?.addEventListener("change", () => {
  if (uiLock || !kifuSelected()) return;
  kifu = null;
  startKifu();
});

els.kifuStudy?.addEventListener("change", () => {
  if (!kifu || !kifuSelected()) return;
  stopKifuPlay();
  kifu.mode = els.kifuStudy.value;
  if (kifu.mode === "play" && !kifu.deviated) {
    kifu.autoOpponent(engine);
  }
  refresh(kifuStatusLine(), true);
});

els.kifuSide?.addEventListener("change", () => {
  if (!kifu || kifu.mode !== "play") return;
  kifu.userSide = els.kifuSide.value === "white" ? 2 : 1;
  if (!kifu.deviated) {
    engine = kifu.mount();
    kifu.autoOpponent(engine);
    refresh(kifuStatusLine(), true);
  }
});

window.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  const typing = tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA";
  if (isKifu() && kifu.mode === "replay" && !kifu.deviated && !typing) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stepKifu(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepKifu(-1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      seekKifu(kifu.cursor + 10);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      seekKifu(kifu.cursor - 10);
    } else if (e.key === "Home") {
      e.preventDefault();
      seekKifu(0);
    } else if (e.key === "End") {
      e.preventDefault();
      seekKifu(kifu.total);
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      toggleKifuPlay();
    }
    return;
  }
  if (typing || tag === "BUTTON" || tag === "A" || tag === "SUMMARY") return;
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    nudgeKeyboard(-1, 0);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    nudgeKeyboard(1, 0);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    nudgeKeyboard(0, -1);
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    nudgeKeyboard(0, 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    placeKeyboard();
  }
});

els.trackSelect?.addEventListener("change", () => {
  if (uiLock) return;
  fillLevelSelect();
  if (!drill || !drillSelected()) {
    showMessage("科目已选好，点击「进入本题」开始。", true);
    return;
  }
  if (drill.log.length && !confirm("换科目会离开当前题，确定吗？")) {
    els.trackSelect.value = drill.track;
    fillLevelSelect();
    els.levelSelect.value = String(drill.level);
    return;
  }
  newGame();
});

els.levelSelect?.addEventListener("change", () => {
  if (uiLock) return;
  if (!drill || !drillSelected()) return;
  const level = Number(els.levelSelect.value) || 1;
  if (level === drill.level && els.trackSelect.value === drill.track) return;
  if (drill.log.length && !confirm("换等级会离开当前题，确定吗？")) {
    els.levelSelect.value = String(drill.level);
    return;
  }
  newGame();
});

els.modeSelect.addEventListener("change", () => {
  if (uiLock) return;
  if (aiThinking) {
    uiLock += 1;
    els.modeSelect.value = "ai";
    uiLock -= 1;
    showMessage("请等这一手走完再换模式。", true);
    return;
  }
  if ((drill && !drillSelected()) || (kifu && !kifuSelected())) {
    const dirty = (drill && drill.log.length) || (kifu && (kifu.cursor > 0 || kifu.deviated));
    if (dirty && !confirm("离开当前练习或棋谱？进度里这一手会丢掉。")) {
      uiLock += 1;
      els.modeSelect.value = drill ? "drill" : "kifu";
      uiLock -= 1;
      syncAiOptionVisibility();
      return;
    }
    drillToken += 1;
    kifuToken += 1;
    drill = null;
    kifu = null;
    if (!drillSelected() && !kifuSelected()) {
      newGame();
      return;
    }
  }
  syncAiOptionVisibility();
  if (drillSelected() || kifuSelected()) {
    if (!drill && !kifu && engine.moveHistory.length && !confirm("进入练习或棋谱会清空当前对局，确定吗？")) {
      uiLock += 1;
      els.modeSelect.value = "ai";
      uiLock -= 1;
      syncAiOptionVisibility();
      return;
    }
    newGame();
    return;
  }
  if (isRecordMode()) {
    refresh("打谱：两人轮流下。棋子上标着落子序号。随时可以标死子或确认点目。", true);
    return;
  }
  if (els.modeSelect.value === "human") {
    refresh("人人对战。棋子不标序号。", true);
    return;
  }
  refresh();
  showMessage("设置已更新，点击「开始新对局」生效。", true);
});

for (const el of [
  els.sizeSelect,
  els.komiSelect,
  els.humanColorSelect,
  els.difficultySelect,
].filter(Boolean)) {
  el.addEventListener("change", () => {
    if (el === els.difficultySelect) {
      rememberDifficulty();
      syncEngineNote();
      if (!danSelected()) teachArmed = null;
      else armTeach();
    }
    if (isDrill() || isKifu()) {
      if (el === els.difficultySelect) {
        applyDifficulty();
        showMessage("AI 强度已记下。棋谱对练里，只有离开谱之后才会用到。", true);
      }
      return;
    }
    if (engine.moveHistory.length || aiThinking) {
      showMessage("新设置将在下一局生效，请点击「开始新对局」", true);
      return;
    }
    // 尚未落子：立即同步棋盘规格/贴目，避免界面与内部状态不一致
    engine = new GoEngine(Number(els.sizeSelect.value), Number(els.komiSelect.value), {
      autoDead: !els.autoDeadToggle || els.autoDeadToggle.checked,
    });
    applyDifficulty();
    hover = null;
    refresh("设置已同步。人机对战请点击「开始新对局」。", true);
    resizeCanvas();
  });
}

canvas.addEventListener("click", (e) => {
  // 忽略 touch 后合成的 click，避免移动端连下两手
  if (Date.now() - lastTouchAt < 600) return;
  onBoardClick(e);
});
canvas.addEventListener("mousemove", onMove);
canvas.addEventListener("mouseleave", () => {
  if (touchPreview) return;
  hover = null;
  draw();
});

function clearLongPress() {
  if (!longPressTimer) return;
  clearTimeout(longPressTimer);
  longPressTimer = 0;
}

function placeNeedsSecondTap(coord) {
  if (!coord) return false;
  if (engine.phase === "scoring") return false;
  if (isKifu() && kifu?.mode === "replay") return false;
  if (engine.board[coord.y]?.[coord.x]) return false;
  return true;
}

function onTouchStart(e) {
  lastTouchAt = Date.now();
  if (e.cancelable) e.preventDefault();
  const coord = eventToCoord(e);
  if (!coord || !placeNeedsSecondTap(coord)) {
    touchPreview = null;
    clearLongPress();
    void onBoardClick(e);
    return;
  }
  const same = touchPreview && touchPreview.x === coord.x && touchPreview.y === coord.y;
  hover = { x: coord.x, y: coord.y };
  keyboardPoint = hover;
  const place = () => onBoardClick({ coord, preventDefault() {} });
  if (same) {
    clearLongPress();
    touchPreview = null;
    void place();
    return;
  }
  touchPreview = { x: coord.x, y: coord.y };
  draw();
  showMessage("再点一次，或按住，确认落子。", true);
  clearLongPress();
  longPressTimer = window.setTimeout(() => {
    longPressTimer = 0;
    if (!touchPreview || touchPreview.x !== coord.x || touchPreview.y !== coord.y) return;
    touchPreview = null;
    void place();
  }, 520);
}

canvas.addEventListener("touchstart", onTouchStart, { passive: false });
canvas.addEventListener("touchend", () => {
  clearLongPress();
  lastTouchAt = Date.now();
});
canvas.addEventListener("touchcancel", () => {
  clearLongPress();
  touchPreview = null;
});

window.addEventListener("resize", () => {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  resizeCanvas();
});

try {
  if (localStorage.getItem("go-hub-kifu-numbers") === "0" && els.kifuNumbersToggle) {
    els.kifuNumbersToggle.checked = false;
  }
  const pace = localStorage.getItem("go-hub-kifu-pace");
  if (els.kifuPace && (pace === "slow" || pace === "mid" || pace === "fast")) els.kifuPace.value = pace;
} catch {
  /* private mode */
}
els.kifuNumbersToggle?.addEventListener("change", () => {
  try {
    localStorage.setItem("go-hub-kifu-numbers", els.kifuNumbersToggle.checked ? "1" : "0");
  } catch {
    /* private mode */
  }
  if (isKifu()) refresh();
});

try {
  const savedTeach = localStorage.getItem("go-hub-teach");
  if (els.teachToggle) {
    const dan = /^d[1-9]$/.test(els.difficultySelect.value);
    els.teachToggle.checked = savedTeach === "1" || (savedTeach !== "0" && dan);
  }
} catch {
  /* private mode */
}
els.teachToggle?.addEventListener("change", () => {
  try {
    localStorage.setItem("go-hub-teach", els.teachToggle.checked ? "1" : "0");
  } catch {
    /* private mode */
  }
  if (!els.teachToggle.checked) {
    clearTeachDisplay();
    draw();
    return;
  }
  if (!danSelected()) {
    teachArmed = null;
    if (els.teachNote) els.teachNote.textContent = "自动讲解从初段开始。低段对局请用棋谱里的「模型看上一手」。";
    return;
  }
  armTeach();
});
els.btnKifuTeach?.addEventListener("click", () => {
  void reviewPreviousMove();
});

try {
  if (localStorage.getItem("go-hub-auto-dead") === "0" && els.autoDeadToggle) {
    els.autoDeadToggle.checked = false;
    engine.autoDead = false;
  }
} catch {
  /* private mode */
}
els.autoDeadToggle?.addEventListener("change", () => {
  syncAutoDead();
  try {
    localStorage.setItem("go-hub-auto-dead", els.autoDeadToggle.checked ? "1" : "0");
  } catch {
    /* private mode */
  }
});

initDifficultyDefault();
syncEngineNote();
syncAiOptionVisibility();
resizeCanvas();
refresh("可选「人机对战」与 AI 下棋 · 中国规则。提子只作记录。", true);

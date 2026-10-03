import { BLACK, WHITE, GoEngine, colorName, opponent } from "./engine.js";
import { GoAI } from "./ai.js";
import {
  DrillSession,
  isLevelUnlocked,
  levelCleared,
  loadPosition,
  loadProgress,
  problemsOf,
  saveProgress,
  trackById,
} from "./drill.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const els = {
  turnLabel: document.getElementById("turnLabel"),
  turnDot: document.getElementById("turnDot"),
  phaseBadge: document.getElementById("phaseBadge"),
  captures: document.getElementById("captures"),
  moveCount: document.getElementById("moveCount"),
  message: document.getElementById("message"),
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
  btnDrillSolve: document.getElementById("btnDrillSolve"),
  btnPass: document.getElementById("btnPass"),
  btnResign: document.getElementById("btnResign"),
  btnUndo: document.getElementById("btnUndo"),
  btnAutoDead: document.getElementById("btnAutoDead"),
  btnScore: document.getElementById("btnScore"),
  btnNew: document.getElementById("btnNew"),
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function drillSelected() {
  return els.modeSelect.value === "drill";
}

function isDrill() {
  return drillSelected() && !!drill;
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

function humanColor() {
  return els.humanColorSelect.value === "white" ? WHITE : BLACK;
}

function aiColor() {
  return opponent(humanColor());
}

function isHumanTurn() {
  if (isDrill()) return !drill.busy && !drill.solvedFlag && engine.phase === "playing";
  if (!isAiMode()) return true;
  return engine.phase === "playing" && engine.toPlay === humanColor();
}

function showMessage(text, info = false) {
  els.message.textContent = text || "";
  els.message.classList.toggle("info", Boolean(info && text));
}

function phaseText() {
  if (isDrill()) {
    if (drill.busy) return "看答案";
    if (drill.solvedFlag) return "过关";
    return "练习中";
  }
  if (aiThinking) return "AI思考中";
  if (engine.phase === "playing") return "对局中";
  if (engine.phase === "scoring") return "点目中";
  return "已结束";
}

function syncAiOptionVisibility() {
  const aiOn = isAiMode();
  const drillOn = drillSelected();
  els.aiOptions.hidden = !aiOn;
  els.aiOptions.setAttribute("aria-hidden", aiOn ? "false" : "true");
  els.drillOptions.hidden = !drillOn;
  els.drillOptions.setAttribute("aria-hidden", drillOn ? "false" : "true");
  els.matchFields.hidden = drillOn;
  els.btnNew.textContent = drillOn ? "进入本题" : "开始新对局";
  if (drillOn) fillLevelSelect();
}

function updatePanel() {
  const turn = engine.toPlay;
  els.turnDot.className = `stone-dot ${turn === BLACK ? "black" : "white"}`;
  if (isDrill()) {
    if (drill.solvedFlag) els.turnLabel.textContent = "本题已过关";
    else if (drill.busy) els.turnLabel.textContent = "正在演示答案…";
    else els.turnLabel.textContent = `${colorName(engine.toPlay)}方行棋 · 你`;
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
  els.captures.textContent = `黑提 ${engine.captures[BLACK]} · 白提 ${engine.captures[WHITE]}`;
  const plays = engine.moveHistory.filter((m) => m.type === "play").length;
  const passes = engine.moveHistory.filter((m) => m.type === "pass").length;
  els.moveCount.textContent = `手数 ${plays} · 停着 ${passes}`;

  const humanCanAct =
    engine.phase === "playing" && isHumanTurn() && !aiThinking && !isDrill();
  els.btnPass.disabled = !humanCanAct;
  els.btnResign.disabled = engine.phase !== "playing" || aiThinking || isDrill();
  els.btnAutoDead.disabled = engine.phase !== "scoring" || aiThinking;
  els.btnScore.disabled = engine.phase !== "scoring" || aiThinking;
  els.btnUndo.disabled = isDrill()
    ? !drill || drill.busy || drill.log.length === 0
    : aiThinking ||
      (engine.moveHistory.length === 0 &&
        !(engine.phase === "finished" && engine.result?.type === "resign"));
  if (isDrill()) {
    const total = problemsOf(drill.problem.track, drill.problem.level).length;
    els.btnDrillPrev.disabled = drill.busy || drill.index <= 0;
    els.btnDrillNext.disabled = drill.busy || drill.index >= total - 1;
    els.btnDrillRetry.disabled = drill.busy;
    els.btnDrillSolve.disabled = drill.busy;
  }
  canvas.style.cursor = aiThinking ? "wait" : "crosshair";

  if (isDrill() && drill.solvedFlag) {
    const p = drill.problem;
    const cleared = levelCleared(p.track, p.level, drill.progress);
    const next = trackById(p.track).levels.find((l) => l.level === p.level + 1);
    els.result.textContent = cleared
      ? next
        ? `过关。本级完成，下一级已解锁。`
        : `过关。这一科的六级都练过了。`
      : `过关：${p.title}`;
    els.result.classList.add("show");
  } else if (engine.result) {
    els.result.textContent = engine.result.text;
    if (engine.result.type === "score") {
      els.result.textContent += `（黑 ${engine.result.blackScore.toFixed(1)} · 白 ${engine.result.whiteScore.toFixed(1)}，含贴目 ${engine.komi}）`;
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
  const cssSize = Math.min(wrap.clientWidth - 2, 720);
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

  if (engine.lastMove && !engine.lastMove.pass && engine.phase !== "scoring") {
    const { x, y } = engine.lastMove;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && engine.board[y] && engine.board[y][x]) {
      const p = pointToXY(x, y, m);
      ctx.beginPath();
      ctx.fillStyle = engine.board[y][x] === BLACK ? "#f2d38a" : "#2a6d5c";
      ctx.arc(p.sx, p.sy, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const ring = (pt, color) => {
    if (!pt || pt.x < x0 || pt.x > x1 || pt.y < y0 || pt.y > y1) return;
    const p = pointToXY(pt.x, pt.y, m);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.12);
    ctx.arc(p.sx, p.sy, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  };
  ring(drillHint, "#0f5c4c");
  ring(drillFlash, "#8b2e2e");

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

function refresh(msg, info = false) {
  updatePanel();
  draw();
  if (msg !== undefined) showMessage(msg, info);
}

async function maybeAiMove() {
  if (isDrill() || !isAiMode() || engine.phase !== "playing") return;
  if (engine.toPlay !== aiColor()) return;
  if (aiThinking) return;

  const token = ++aiToken;
  aiThinking = true;
  refresh("AI 思考中…", true);

  try {
    ai.setDifficulty(els.difficultySelect.value);
    const move = await ai.chooseMove(engine);
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
          `AI 停着，进入点目：已自动标记 ${n} 个死子，可手动调整后确认点目。`,
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
    refresh(cap ? `AI 落子，提子 ${cap}` : "AI 已落子", true);
  } catch (err) {
    console.error(err);
    refresh("AI 出错，请悔棋或新开一局");
  } finally {
    if (token === aiToken) {
      aiThinking = false;
      updatePanel();
      draw();
    }
  }
}

function onBoardClick(evt) {
  evt.preventDefault();
  if (aiThinking) return;
  const coord = eventToCoord(evt);
  if (!coord) return;

  if (isDrill()) {
    onDrillMove(coord);
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

  const res = engine.play(coord.x, coord.y);
  if (!res.ok) {
    showMessage(res.reason);
    draw();
    return;
  }
  playSound("clickAudio");
  const cap = res.captured?.length || 0;
  refresh(cap ? `提子 ${cap}` : "", true);
  maybeAiMove();
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

function updateDrillMeta() {
  if (!drill) return;
  const p = drill.problem;
  const total = problemsOf(p.track, p.level).length;
  const done = drill.solvedCount();
  els.drillIntro.textContent = trackById(p.track).intro;
  let text = `${p.title} · 第 ${drill.index + 1}/${total} 题 · 本级已过 ${done}/${total}`;
  if (levelCleared(p.track, p.level, drill.progress)) text += " · 下一级已解锁";
  els.drillProgress.textContent = text;
  els.drillSource.textContent = p.source || "";
}

function fillLevelSelect() {
  uiLock += 1;
  const trackId = els.trackSelect.value || "tactic";
  const track = trackById(trackId);
  const progress = drill?.progress || loadProgress();
  const wanted = drill && drill.track === trackId ? drill.level : Number(els.levelSelect.value) || 1;
  const previous = els.levelSelect.value;
  els.levelSelect.innerHTML = "";
  for (const lv of track.levels) {
    const opt = document.createElement("option");
    opt.value = String(lv.level);
    const open = isLevelUnlocked(trackId, lv.level, progress);
    opt.textContent = open ? lv.name : `${lv.name}（未解锁）`;
    opt.disabled = !open;
    els.levelSelect.appendChild(opt);
  }
  const choice = isLevelUnlocked(trackId, wanted, progress) ? wanted : 1;
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
  refresh(`${p.title}（${drill.index + 1}/${total}）。${p.prompt}${cropNote()}`, true);
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
    else refresh(d.captured?.length ? "对方应了一手，轮到你。" : "对方应了一手。", true);
    return;
  }
  if (step.solved) finishDrillSolve();
  else refresh("继续。", true);
}

function finishDrillSolve() {
  drill.markSolved();
  saveProgress(drill.progress);
  updateDrillMeta();
  fillLevelSelect();
  els.levelSelect.value = String(drill.level);
  refresh("走通了。", true);
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
    draw();
    await sleep(420);
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

function newGame() {
  if (drillSelected()) {
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
  engine = new GoEngine(size, komi);
  ai.setDifficulty(els.difficultySelect.value);
  hover = null;
  syncAiOptionVisibility();

  let tip = "新对局开始，黑先。";
  if (isAiMode()) {
    const you = colorName(humanColor());
    tip = `人机对战开始：你执${you}，AI 执${colorName(aiColor())}（${els.difficultySelect.selectedOptions[0].text} · ${size}路）。大棋盘 AI 思考会稍久。`;
  }
  refresh(tip, true);
  maybeAiMove();
}

els.btnPass.addEventListener("click", () => {
  if (aiThinking || !isHumanTurn()) return;
  const res = engine.pass();
  if (!res.ok) {
    showMessage(res.reason);
    return;
  }
  if (res.scoring) {
    const n = engine.deadMarks.size;
    refresh(
      `双方停着，进入点目：已自动标记 ${n} 个死子，可点击棋子修改，或按「自动标死子」重算。`,
      true
    );
  } else {
    refresh(`${colorName(opponent(engine.toPlay))}方停着`, true);
    maybeAiMove();
  }
});

els.btnAutoDead.addEventListener("click", () => {
  if (engine.phase !== "scoring") return;
  const res = engine.autoMarkDead();
  if (!res.ok) {
    showMessage(res.reason || "");
    return;
  }
  refresh(`已重新自动标记 ${res.count} 个死子，可手动微调后确认点目。`, true);
});

els.btnResign.addEventListener("click", () => {
  if (aiThinking) return;
  const loser = isAiMode() ? humanColor() : engine.toPlay;
  if (!confirm(`${colorName(loser)}方确认认输？`)) return;
  engine.resign(loser);
  refresh(engine.result.text, true);
});

els.btnUndo.addEventListener("click", () => {
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
      const res = engine.undo();
      if (!res.ok) {
        showMessage(res.reason);
        return;
      }
      if (engine.phase === "playing" && engine.toPlay === aiColor()) {
        engine.undo();
      }
      refresh("已悔棋", true);
      maybeAiMove();
      return;
    }
    if (engine.toPlay === aiColor()) {
      // AI 尚未落下时：优先撤销你的上一手；否则让 AI 重走
      if (engine.undo().ok) {
        refresh("已悔棋", true);
        if (engine.toPlay === aiColor()) maybeAiMove();
      } else {
        refresh("AI 重新思考…", true);
        maybeAiMove();
      }
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
    refresh("已悔棋", true);
    maybeAiMove();
    return;
  }

  const res = engine.undo();
  if (!res.ok) showMessage(res.reason);
  else refresh("已悔棋", true);
});

els.btnScore.addEventListener("click", () => {
  const res = engine.score();
  if (!res.ok) showMessage(res.reason);
  else refresh(engine.result.text, true);
});

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
  if (!drillSelected() && drill) {
    if (drill.log.length && !confirm("离开练习？这一题的尝试会丢掉。")) {
      uiLock += 1;
      els.modeSelect.value = "drill";
      uiLock -= 1;
      syncAiOptionVisibility();
      return;
    }
    drillToken += 1;
    drill = null;
    newGame();
    return;
  }
  syncAiOptionVisibility();
  if (drillSelected()) {
    if (engine.moveHistory.length && !confirm("进入练习会清空当前对局，确定吗？")) {
      uiLock += 1;
      els.modeSelect.value = "ai";
      uiLock -= 1;
      syncAiOptionVisibility();
      return;
    }
    newGame();
    return;
  }
  showMessage("设置已更新，点击「开始新对局」生效。", true);
  updatePanel();
});

for (const el of [
  els.sizeSelect,
  els.komiSelect,
  els.humanColorSelect,
  els.difficultySelect,
]) {
  el.addEventListener("change", () => {
    if (engine.moveHistory.length || aiThinking) {
      showMessage("新设置将在下一局生效，请点击「开始新对局」", true);
      return;
    }
    // 尚未落子：立即同步棋盘规格/贴目，避免界面与内部状态不一致
    engine = new GoEngine(
      Number(els.sizeSelect.value),
      Number(els.komiSelect.value)
    );
    ai.setDifficulty(els.difficultySelect.value);
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
  hover = null;
  draw();
});
canvas.addEventListener(
  "touchstart",
  (e) => {
    lastTouchAt = Date.now();
    if (e.cancelable) e.preventDefault();
    onBoardClick(e);
  },
  { passive: false }
);

window.addEventListener("resize", () => {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  resizeCanvas();
});

syncAiOptionVisibility();
resizeCanvas();
refresh("可选「人机对战」与 AI 下棋 · 中国规则", true);

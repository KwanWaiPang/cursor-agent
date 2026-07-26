import { BLACK, WHITE, GoEngine, colorName, opponent } from "./engine.js";
import { GoAI } from "./ai.js";

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
  btnPass: document.getElementById("btnPass"),
  btnResign: document.getElementById("btnResign"),
  btnUndo: document.getElementById("btnUndo"),
  btnScore: document.getElementById("btnScore"),
  btnNew: document.getElementById("btnNew"),
};

let engine = new GoEngine(19, 7.5);
let ai = new GoAI("medium");
let hover = null;
let dpr = Math.max(1, window.devicePixelRatio || 1);
let aiThinking = false;
let aiToken = 0;

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
  if (!isAiMode()) return true;
  return engine.phase === "playing" && engine.toPlay === humanColor();
}

function showMessage(text, info = false) {
  els.message.textContent = text || "";
  els.message.classList.toggle("info", Boolean(info && text));
}

function phaseText() {
  if (aiThinking) return "AI思考中";
  if (engine.phase === "playing") return "对局中";
  if (engine.phase === "scoring") return "点目中";
  return "已结束";
}

function syncAiOptionVisibility() {
  const aiOn = isAiMode();
  els.aiOptions.hidden = !aiOn;
  els.aiOptions.setAttribute("aria-hidden", aiOn ? "false" : "true");
}

function updatePanel() {
  const turn = engine.toPlay;
  els.turnDot.className = `stone-dot ${turn === BLACK ? "black" : "white"}`;
  if (aiThinking) {
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

  const humanCanAct = engine.phase === "playing" && isHumanTurn() && !aiThinking;
  els.btnPass.disabled = !humanCanAct;
  els.btnResign.disabled = engine.phase !== "playing" || aiThinking;
  els.btnScore.disabled = engine.phase !== "scoring" || aiThinking;
  els.btnUndo.disabled =
    aiThinking ||
    (engine.moveHistory.length === 0 &&
      !(engine.phase === "finished" && engine.result?.type === "resign"));
  canvas.style.cursor = aiThinking ? "wait" : "crosshair";

  if (engine.result) {
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
  const pad = cssSize * 0.045;
  const grid = (cssSize - pad * 2) / (engine.size - 1);
  return { cssSize, pad, grid };
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
  const { cssSize, pad, grid } = boardMetrics();
  ctx.clearRect(0, 0, cssSize, cssSize);
  drawBoardWood(cssSize);

  ctx.strokeStyle = "rgba(40, 24, 12, 0.78)";
  ctx.lineWidth = Math.max(1, grid * 0.04);
  ctx.beginPath();
  for (let i = 0; i < engine.size; i++) {
    const p = pad + i * grid;
    ctx.moveTo(pad, p);
    ctx.lineTo(pad + (engine.size - 1) * grid, p);
    ctx.moveTo(p, pad);
    ctx.lineTo(p, pad + (engine.size - 1) * grid);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(40, 24, 12, 0.85)";
  for (const [x, y] of engine.starPoints()) {
    ctx.beginPath();
    ctx.arc(pad + x * grid, pad + y * grid, Math.max(2.2, grid * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }

  const r = stoneRadius(grid);
  for (let y = 0; y < engine.size; y++) {
    for (let x = 0; x < engine.size; x++) {
      const c = engine.board[y][x];
      if (!c) continue;
      const dead = engine.deadMarks.has(`${x},${y}`);
      drawStone(pad + x * grid, pad + y * grid, r, c, dead);
    }
  }

  if (engine.lastMove && !engine.lastMove.pass && engine.phase !== "scoring") {
    const { x, y } = engine.lastMove;
    ctx.beginPath();
    ctx.fillStyle = engine.board[y][x] === BLACK ? "#f2d38a" : "#2a6d5c";
    ctx.arc(pad + x * grid, pad + y * grid, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  if (
    hover &&
    !aiThinking &&
    isHumanTurn() &&
    engine.phase === "playing" &&
    engine.board[hover.y][hover.x] === 0 &&
    engine.isLegal(hover.x, hover.y)
  ) {
    ctx.globalAlpha = 0.38;
    drawStone(pad + hover.x * grid, pad + hover.y * grid, r, engine.toPlay, false);
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
  const { pad, grid } = boardMetrics();
  const x = Math.round((xPos - pad) / grid);
  const y = Math.round((yPos - pad) / grid);
  if (!engine.inBounds(x, y)) return null;
  const sx = pad + x * grid;
  const sy = pad + y * grid;
  const dist = Math.hypot(xPos - sx, yPos - sy);
  if (dist > grid * 0.45) return null;
  return { x, y };
}

function refresh(msg, info = false) {
  updatePanel();
  draw();
  if (msg !== undefined) showMessage(msg, info);
}

async function maybeAiMove() {
  if (!isAiMode() || engine.phase !== "playing") return;
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
        refresh("AI 停着。双方停着，请标记死子后确认点目。", true);
      } else {
        refresh("AI 停着", true);
      }
      return;
    }

    const res = engine.play(move.x, move.y);
    if (!res.ok) {
      // 极端情况下回退为停着
      engine.pass();
      refresh("AI 改判停着", true);
      return;
    }
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

  if (engine.phase === "scoring") {
    const res = engine.toggleDead(coord.x, coord.y);
    if (!res.ok) showMessage(res.reason || "");
    else showMessage("已更新死子标记。确认后请点击「确认点目」。", true);
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

function newGame() {
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
    tip = `人机对战开始：你执${you}，AI 执${colorName(aiColor())}（${els.difficultySelect.selectedOptions[0].text}）。专家级在 9 路上更强，思考也会稍久。`;
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
    refresh("双方停着，进入点目：点击棋子标记死子，再确认点目。", true);
  } else {
    refresh(`${colorName(opponent(engine.toPlay))}方停着`, true);
    maybeAiMove();
  }
});

els.btnResign.addEventListener("click", () => {
  if (aiThinking) return;
  const loser = isAiMode() ? humanColor() : engine.toPlay;
  if (!confirm(`${colorName(loser)}方确认认输？`)) return;
  engine.resign(loser);
  refresh(engine.result.text, true);
});

els.btnUndo.addEventListener("click", () => {
  if (aiThinking) return;
  if (isAiMode()) {
    // 回到到轮到你下棋的状态：通常撤销 AI 一手 + 你一手
    if (engine.phase === "scoring" || engine.phase === "finished") {
      const res = engine.undo();
      if (!res.ok) showMessage(res.reason);
      else refresh("已回到对局", true);
      // 若回到 AI 行棋，再撤一步
      if (engine.phase === "playing" && engine.toPlay === aiColor()) {
        engine.undo();
      }
      refresh("已悔棋", true);
      return;
    }
    let undos = 0;
    if (engine.toPlay === humanColor()) {
      // 刚轮到你：撤销 AI 应手 + 你的上一手
      if (engine.undo().ok) undos += 1;
      if (engine.undo().ok) undos += 1;
    } else {
      // 理论上 AI 思考中不会进这里；若轮到 AI，撤你上一手
      if (engine.undo().ok) undos += 1;
    }
    if (!undos) showMessage("没有可悔的棋");
    else refresh("已悔棋", true);
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
  if (engine.moveHistory.length && !confirm("开始新对局？当前棋谱将清空。")) {
    return;
  }
  newGame();
});

els.modeSelect.addEventListener("change", () => {
  syncAiOptionVisibility();
});

canvas.addEventListener("click", onBoardClick);
canvas.addEventListener("mousemove", onMove);
canvas.addEventListener("mouseleave", () => {
  hover = null;
  draw();
});
canvas.addEventListener(
  "touchstart",
  (e) => {
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

import { BLACK, WHITE, GoEngine, colorName, opponent } from "./engine.js";

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
  btnPass: document.getElementById("btnPass"),
  btnResign: document.getElementById("btnResign"),
  btnUndo: document.getElementById("btnUndo"),
  btnScore: document.getElementById("btnScore"),
  btnNew: document.getElementById("btnNew"),
};

let engine = new GoEngine(19, 7.5);
let hover = null;
let dpr = Math.max(1, window.devicePixelRatio || 1);

function showMessage(text, info = false) {
  els.message.textContent = text || "";
  els.message.classList.toggle("info", Boolean(info && text));
}

function phaseText() {
  if (engine.phase === "playing") return "对局中";
  if (engine.phase === "scoring") return "点目中";
  return "已结束";
}

function updatePanel() {
  const turn = engine.toPlay;
  els.turnDot.className = `stone-dot ${turn === BLACK ? "black" : "white"}`;
  if (engine.phase === "playing") {
    els.turnLabel.textContent = `${colorName(turn)}方行棋`;
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

  els.btnPass.disabled = engine.phase !== "playing";
  els.btnResign.disabled = engine.phase !== "playing";
  els.btnScore.disabled = engine.phase !== "scoring";
  els.btnUndo.disabled =
    engine.moveHistory.length === 0 &&
    !(engine.phase === "finished" && engine.result?.type === "resign");

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

  // subtle grain
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

  // grid
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

  // star points
  ctx.fillStyle = "rgba(40, 24, 12, 0.85)";
  for (const [x, y] of engine.starPoints()) {
    ctx.beginPath();
    ctx.arc(pad + x * grid, pad + y * grid, Math.max(2.2, grid * 0.1), 0, Math.PI * 2);
    ctx.fill();
  }

  // stones
  const r = stoneRadius(grid);
  for (let y = 0; y < engine.size; y++) {
    for (let x = 0; x < engine.size; x++) {
      const c = engine.board[y][x];
      if (!c) continue;
      const cx = pad + x * grid;
      const cy = pad + y * grid;
      const dead = engine.deadMarks.has(`${x},${y}`);
      drawStone(cx, cy, r, c, dead);
    }
  }

  // last move marker
  if (engine.lastMove && !engine.lastMove.pass && engine.phase !== "scoring") {
    const { x, y } = engine.lastMove;
    ctx.beginPath();
    ctx.fillStyle = engine.board[y][x] === BLACK ? "#f2d38a" : "#2a6d5c";
    ctx.arc(pad + x * grid, pad + y * grid, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // hover ghost
  if (
    hover &&
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

  // soft highlight
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
  // snap tolerance
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

function onBoardClick(evt) {
  evt.preventDefault();
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

  const res = engine.play(coord.x, coord.y);
  if (!res.ok) {
    showMessage(res.reason);
    draw();
    return;
  }
  const cap = res.captured?.length || 0;
  refresh(cap ? `提子 ${cap}` : "", true);
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
  const size = Number(els.sizeSelect.value);
  const komi = Number(els.komiSelect.value);
  engine = new GoEngine(size, komi);
  hover = null;
  refresh("新对局开始，黑先。", true);
}

els.btnPass.addEventListener("click", () => {
  const res = engine.pass();
  if (!res.ok) {
    showMessage(res.reason);
    return;
  }
  if (res.scoring) {
    refresh("双方停着，进入点目：点击棋子标记死子，再确认点目。", true);
  } else {
    refresh(`${colorName(opponent(engine.toPlay))}方停着`, true);
  }
});

els.btnResign.addEventListener("click", () => {
  if (!confirm(`${colorName(engine.toPlay)}方确认认输？`)) return;
  engine.resign();
  refresh(engine.result.text, true);
});

els.btnUndo.addEventListener("click", () => {
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

resizeCanvas();
refresh("中国规则 · 黑先 · 禁止自杀与同形再现", true);

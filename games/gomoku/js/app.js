import {
  BLACK,
  WHITE,
  EMPTY,
  SIZE,
  createBoard,
  place,
  isWin,
  isBoardFull,
  opponent,
} from "./engine.js";
import { think } from "./ai.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const turnDot = document.getElementById("turnDot");
const turnLabel = document.getElementById("turnLabel");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");
const modeSelect = document.getElementById("modeSelect");
const aiOptions = document.getElementById("aiOptions");
const humanColorSelect = document.getElementById("humanColorSelect");
const difficultySelect = document.getElementById("difficultySelect");
const btnNew = document.getElementById("btnNew");
const btnUndo = document.getElementById("btnUndo");
const btnResign = document.getElementById("btnResign");
const clickAudio = document.getElementById("clickAudio");
const selectAudio = document.getElementById("selectAudio");

const state = {
  board: createBoard(),
  turn: BLACK,
  mode: "ai",
  humanColor: BLACK,
  difficulty: "normal",
  over: false,
  winner: null,
  history: [],
  lastMove: null,
  aiThinking: false,
};

function play(audio) {
  try {
    audio.currentTime = 0;
    audio.play();
  } catch (_) {}
}

function syncModeUi() {
  aiOptions.hidden = modeSelect.value !== "ai";
}

function setMessage(text, warn = false) {
  messageEl.textContent = text;
  messageEl.classList.toggle("warn", warn);
}

function colorName(c) {
  return c === BLACK ? "黑" : "白";
}

function updateHud() {
  turnDot.className = `stone-dot ${state.turn === BLACK ? "black" : "white"}`;
  if (state.over) {
    turnLabel.textContent = "对局结束";
  } else if (state.mode === "ai" && state.turn !== state.humanColor) {
    turnLabel.textContent = `AI（${colorName(state.turn)}）思考中…`;
  } else {
    turnLabel.textContent = `${colorName(state.turn)}方行棋`;
  }
}

function draw() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const css = Math.min(canvas.parentElement.clientWidth - 8, 720);
  canvas.style.width = `${css}px`;
  canvas.width = Math.floor(css * dpr);
  canvas.height = Math.floor(css * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pad = css * 0.06;
  const span = css - pad * 2;
  const cell = span / (SIZE - 1);

  ctx.fillStyle = "#e2b56a";
  ctx.fillRect(0, 0, css, css);

  ctx.strokeStyle = "rgba(40, 24, 12, 0.78)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < SIZE; i++) {
    const p = pad + i * cell;
    ctx.beginPath();
    ctx.moveTo(pad, p);
    ctx.lineTo(pad + span, p);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p, pad);
    ctx.lineTo(p, pad + span);
    ctx.stroke();
  }

  // 星位
  for (const [sx, sy] of [
    [3, 3],
    [3, 11],
    [11, 3],
    [11, 11],
    [7, 7],
  ]) {
    ctx.beginPath();
    ctx.fillStyle = "#1c1410";
    ctx.arc(pad + sx * cell, pad + sy * cell, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = state.board[y][x];
      if (v === EMPTY) continue;
      const cx = pad + x * cell;
      const cy = pad + y * cell;
      const r = cell * 0.42;
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      if (v === BLACK) {
        g.addColorStop(0, "#555");
        g.addColorStop(1, "#111");
      } else {
        g.addColorStop(0, "#fff");
        g.addColorStop(1, "#d8d0c4");
      }
      ctx.beginPath();
      ctx.fillStyle = g;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (v === WHITE) {
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.stroke();
      }
    }
  }

  if (state.lastMove) {
    const { x, y } = state.lastMove;
    ctx.beginPath();
    ctx.strokeStyle = "#8b2e2e";
    ctx.lineWidth = 2;
    ctx.arc(pad + x * cell, pad + y * cell, cell * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  canvas._geom = { pad, cell, css };
}

function posFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX ?? e.touches?.[0]?.clientX;
  const clientY = e.clientY ?? e.touches?.[0]?.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { pad, cell } = canvas._geom;
  const gx = Math.round((x - pad) / cell);
  const gy = Math.round((y - pad) / cell);
  if (gx < 0 || gy < 0 || gx >= SIZE || gy >= SIZE) return null;
  return { x: gx, y: gy };
}

function endGame(winner, text) {
  state.over = true;
  state.winner = winner;
  resultEl.textContent = text;
  setMessage(text);
  updateHud();
  draw();
}

function applyMove(x, y) {
  if (state.over || state.aiThinking) return false;
  if (!place(state.board, x, y, state.turn)) {
    setMessage("此处不能落子", true);
    return false;
  }
  play(clickAudio);
  state.history.push({ x, y, color: state.turn });
  state.lastMove = { x, y };
  if (isWin(state.board, x, y, state.turn)) {
    endGame(state.turn, `${colorName(state.turn)}方五子连珠，获胜！`);
    return true;
  }
  if (isBoardFull(state.board)) {
    endGame(null, "棋盘已满，和棋");
    return true;
  }
  state.turn = opponent(state.turn);
  setMessage(`${colorName(state.turn)}方行棋`);
  updateHud();
  draw();
  maybeAi();
  return true;
}

async function maybeAi() {
  if (state.over || state.mode !== "ai") return;
  if (state.turn === state.humanColor) return;
  state.aiThinking = true;
  updateHud();
  await new Promise((r) => setTimeout(r, state.difficulty === "hard" ? 280 : 120));
  const move = think(state.board, state.turn, state.difficulty);
  state.aiThinking = false;
  if (!move) return;
  applyMove(move.x, move.y);
}

function newGame() {
  state.board = createBoard();
  state.turn = BLACK;
  state.mode = modeSelect.value;
  state.humanColor = humanColorSelect.value === "white" ? WHITE : BLACK;
  state.difficulty = difficultySelect.value;
  state.over = false;
  state.winner = null;
  state.history = [];
  state.lastMove = null;
  state.aiThinking = false;
  resultEl.textContent = "";
  setMessage(
    state.mode === "ai"
      ? `人机对战 · 你执${colorName(state.humanColor)}`
      : "双人对战 · 黑先白后"
  );
  updateHud();
  draw();
  play(selectAudio);
  maybeAi();
}

function undo() {
  if (state.aiThinking || state.history.length === 0) return;
  // 人机：悔两手；双人：悔一手
  const steps = state.mode === "ai" ? 2 : 1;
  for (let i = 0; i < steps && state.history.length; i++) state.history.pop();
  state.board = createBoard();
  for (const h of state.history) state.board[h.y][h.x] = h.color;
  if (state.history.length) {
    const last = state.history[state.history.length - 1];
    state.turn = opponent(last.color);
    state.lastMove = { x: last.x, y: last.y };
  } else {
    state.turn = BLACK;
    state.lastMove = null;
  }
  state.over = false;
  state.winner = null;
  resultEl.textContent = "";
  setMessage("已悔棋");
  updateHud();
  draw();
}

canvas.addEventListener("click", (e) => {
  if (state.over || state.aiThinking) return;
  if (state.mode === "ai" && state.turn !== state.humanColor) return;
  const p = posFromEvent(e);
  if (!p) return;
  applyMove(p.x, p.y);
});

btnNew.addEventListener("click", newGame);
btnUndo.addEventListener("click", undo);
btnResign.addEventListener("click", () => {
  if (state.over) return;
  if (state.mode === "ai") {
    endGame(opponent(state.humanColor), "你已认输");
  } else {
    endGame(opponent(state.turn), `${colorName(state.turn)}方认输，${colorName(opponent(state.turn))}方胜`);
  }
});
modeSelect.addEventListener("change", syncModeUi);
window.addEventListener("resize", draw);

syncModeUi();
newGame();

import {
  ROWS,
  COLS,
  SIDE,
  autoDeploy,
  mergeBoards,
  listMoves,
  applyMove,
  isCamp,
  isRail,
  isHQ,
  hasMovable,
} from "./engine.js";
import { think } from "./ai.js";

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const messageEl = document.getElementById("message");
const resultEl = document.getElementById("result");
const turnLabel = document.getElementById("turnLabel");
const phaseBadge = document.getElementById("phaseBadge");
const sideDot = document.querySelector(".side-dot");
const combatLog = document.getElementById("combatLog");
const btnNew = document.getElementById("btnNew");
const btnRedeploy = document.getElementById("btnRedeploy");
const btnStart = document.getElementById("btnStart");
const btnResign = document.getElementById("btnResign");
const clickAudio = document.getElementById("clickAudio");
const selectAudio = document.getElementById("selectAudio");

const state = {
  phase: "deploy", // deploy | play | over
  board: null,
  turn: SIDE.SOUTH,
  selected: null,
  legal: [],
  winner: null,
  log: [],
  busy: false,
};

function play(a) {
  try {
    a.currentTime = 0;
    a.play();
  } catch (_) {}
}

function setMsg(t, warn = false) {
  messageEl.textContent = t;
  messageEl.className = warn ? "message warn" : "message info";
}

function updatePhaseUi(label, badge) {
  turnLabel.textContent = label;
  if (phaseBadge) phaseBadge.textContent = badge;
  if (sideDot) {
    const north =
      state.phase === "play" && state.turn === SIDE.NORTH;
    sideDot.className = `side-dot ${north ? "north" : "south"}`;
  }
}

function pushLog(line) {
  state.log.unshift(line);
  state.log = state.log.slice(0, 40);
  combatLog.innerHTML = state.log.map((l) => `<div>${l}</div>`).join("");
}

function newDeploy() {
  const north = autoDeploy(SIDE.NORTH);
  const south = autoDeploy(SIDE.SOUTH);
  state.board = mergeBoards(north, south);
  state.phase = "deploy";
  state.turn = SIDE.SOUTH;
  state.selected = null;
  state.legal = [];
  state.winner = null;
  state.busy = false;
  state.log = [];
  combatLog.innerHTML = "";
  resultEl.textContent = "";
  resultEl.classList.remove("show");
  setMsg("已自动布阵。可「打乱重排」，确认后「开始作战」。你执南方红方。");
  updatePhaseUi("南方（你）· 布阵", "布阵");
  draw();
  play(selectAudio);
}

function startBattle() {
  if (state.phase !== "deploy") return;
  state.phase = "play";
  state.turn = SIDE.SOUTH;
  setMsg("作战开始 · 轮到你行动：先点己方棋子，再点目标格。");
  updatePhaseUi("南方（你）行动", "对局中");
  draw();
}

function cellGeom() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = Math.min(canvas.parentElement.clientWidth - 4, 520);
  const cssH = cssW * (ROWS / COLS) * 0.92;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = 8;
  const cw = (cssW - pad * 2) / COLS;
  const ch = (cssH - pad * 2) / ROWS;
  return { pad, cw, ch, cssW, cssH };
}

function draw() {
  if (!state.board) return;
  const { pad, cw, ch, cssW, cssH } = cellGeom();
  canvas._geom = { pad, cw, ch };

  ctx.fillStyle = "#b9a87a";
  ctx.fillRect(0, 0, cssW, cssH);

  // 铁路底色
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = pad + c * cw;
      const y = pad + r * ch;
      if (isRail(r, c)) {
        ctx.fillStyle = "rgba(90, 90, 100, 0.22)";
        ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
      }
      if (isCamp(r, c)) {
        ctx.fillStyle = "rgba(30, 100, 70, 0.28)";
        ctx.beginPath();
        ctx.arc(x + cw / 2, y + ch / 2, Math.min(cw, ch) * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
      if (isHQ(r, c, SIDE.NORTH) || isHQ(r, c, SIDE.SOUTH)) {
        ctx.strokeStyle = "rgba(140, 40, 40, 0.55)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);
      }
    }
  }

  // 格线
  ctx.strokeStyle = "rgba(40, 28, 16, 0.55)";
  ctx.lineWidth = 1;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(pad, pad + r * ch);
    ctx.lineTo(pad + COLS * cw, pad + r * ch);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(pad + c * cw, pad);
    ctx.lineTo(pad + c * cw, pad + ROWS * ch);
    ctx.stroke();
  }

  // 河界
  ctx.fillStyle = "rgba(40, 80, 140, 0.2)";
  ctx.fillRect(pad, pad + 6 * ch - 3, COLS * cw, 6);

  // 合法着点
  for (const m of state.legal) {
    const [r, c] = m.to;
    const x = pad + c * cw;
    const y = pad + r * ch;
    ctx.fillStyle = m.attack ? "rgba(180,40,40,0.35)" : "rgba(40,120,80,0.35)";
    ctx.fillRect(x + 3, y + 3, cw - 6, ch - 6);
  }

  // 棋子
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const x = pad + c * cw + cw / 2;
      const y = pad + r * ch + ch / 2;
      const rw = cw * 0.4;
      const rh = ch * 0.36;
      const isSouth = p.side === SIDE.SOUTH;
      const showFace =
        p.revealed || p.side === SIDE.SOUTH || state.phase === "deploy";

      ctx.beginPath();
      ctx.fillStyle = isSouth ? "#c62828" : "#1565c0";
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, x - rw, y - rh, rw * 2, rh * 2, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff8e8";
      ctx.font = `600 ${Math.floor(Math.min(cw, ch) * 0.28)}px "Noto Serif SC", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(showFace ? p.name : "？", x, y);

      if (
        state.selected &&
        state.selected[0] === r &&
        state.selected[1] === c
      ) {
        ctx.strokeStyle = "#ffeb3b";
        ctx.lineWidth = 2.5;
        roundRect(ctx, x - rw - 2, y - rh - 2, rw * 2 + 4, rh * 2 + 4, 7);
        ctx.stroke();
      }
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function posFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
  const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
  const { pad, cw, ch } = canvas._geom;
  const c = Math.floor((x - pad) / cw);
  const r = Math.floor((y - pad) / ch);
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
  return [r, c];
}

function selectPiece(r, c) {
  const p = state.board[r][c];
  if (!p || p.side !== SIDE.SOUTH) {
    state.selected = null;
    state.legal = [];
    draw();
    return;
  }
  if (p.immovable) {
    setMsg("军旗与地雷不能移动", true);
    state.selected = null;
    state.legal = [];
    draw();
    return;
  }
  state.selected = [r, c];
  state.legal = listMoves(state.board, SIDE.SOUTH).filter(
    (m) => m.from[0] === r && m.from[1] === c
  );
  setMsg(`已选择 ${p.name} · 高亮格可走${state.legal.some((m) => m.attack) ? " / 可攻击" : ""}`);
  draw();
}

function doMove(move, byAi = false) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const atk = state.board[fr][fc];
  const def = state.board[tr][tc];
  const { board, combat, winSide } = applyMove(state.board, move);
  state.board = board;
  state.selected = null;
  state.legal = [];

  if (combat) {
    const a = atk.name;
    const d = def.name;
    const who = byAi ? "蓝方" : "红方";
    if (combat.winSide) {
      pushLog(`${who}${a} 夺旗成功！`);
    } else if (!combat.survivor) {
      pushLog(`${who}${a} vs ${d} → 同归于尽`);
    } else if (combat.removed.some((x) => x.id === def.id) && !combat.removed.some((x) => x.id === atk.id)) {
      pushLog(`${who}${a} 攻击 ${d} → 获胜`);
    } else if (combat.removed.some((x) => x.id === atk.id) && !combat.removed.some((x) => x.id === def.id)) {
      pushLog(`${who}${a} 攻击 ${d} → 败退`);
    } else {
      pushLog(`${who}${a} 与 ${d} 交锋`);
    }
  } else {
    pushLog(`${byAi ? "蓝方" : "红方"}移动 ${atk.name}`);
  }

  play(clickAudio);

  if (winSide) {
    endGame(winSide, winSide === SIDE.SOUTH ? "你夺得军旗，胜利！" : "AI 夺旗，你失败了");
    return;
  }

  // 无棋可走判负
  const next = byAi ? SIDE.SOUTH : SIDE.NORTH;
  if (!hasMovable(state.board, next) && !hasFlag(next)) {
    // continue
  }
  if (!hasMovable(state.board, SIDE.NORTH) && findAlive(SIDE.NORTH) === 0) {
    endGame(SIDE.SOUTH, "蓝方全灭，你获胜！");
    return;
  }
  if (!hasMovable(state.board, SIDE.SOUTH) && findAlive(SIDE.SOUTH) === 0) {
    endGame(SIDE.NORTH, "红方全灭，AI 获胜");
    return;
  }

  state.turn = next;
  updatePhaseUi(
    state.turn === SIDE.SOUTH ? "南方（你）行动" : "北方（AI）行动",
    "对局中"
  );
  setMsg(state.turn === SIDE.SOUTH ? "轮到你了" : "AI 思考中…");
  draw();

  if (state.turn === SIDE.NORTH) {
    scheduleAi();
  }
}

function findAlive(side) {
  let n = 0;
  for (const row of state.board) {
    for (const p of row) if (p && p.side === side) n++;
  }
  return n;
}

function hasFlag(side) {
  for (const row of state.board) {
    for (const p of row) if (p && p.side === side && p.type === "flag") return true;
  }
  return false;
}

function endGame(side, text) {
  state.phase = "over";
  state.winner = side;
  state.busy = false;
  resultEl.textContent = text;
  resultEl.classList.add("show");
  setMsg(text);
  updatePhaseUi("对局结束", "已结束");
  draw();
}

async function scheduleAi() {
  if (state.phase !== "play" || state.busy) return;
  state.busy = true;
  await new Promise((r) => setTimeout(r, 380));
  const move = think(state.board, SIDE.NORTH);
  state.busy = false;
  if (!move) {
    endGame(SIDE.SOUTH, "AI 无棋可走，你获胜！");
    return;
  }
  doMove(move, true);
}

canvas.addEventListener("click", (e) => {
  if (state.phase === "deploy") {
    setMsg("布阵阶段请先点击「开始作战」。可用「打乱重排」换阵。");
    return;
  }
  if (state.phase !== "play" || state.busy || state.turn !== SIDE.SOUTH) return;
  const pos = posFromEvent(e);
  if (!pos) return;
  const [r, c] = pos;

  if (state.selected) {
    const hit = state.legal.find((m) => m.to[0] === r && m.to[1] === c);
    if (hit) {
      doMove(hit, false);
      return;
    }
  }
  selectPiece(r, c);
});

btnNew.addEventListener("click", newDeploy);
btnRedeploy.addEventListener("click", () => {
  if (state.phase === "deploy" || state.phase === "over") newDeploy();
});
btnStart.addEventListener("click", startBattle);
btnResign.addEventListener("click", () => {
  if (state.phase !== "play") return;
  endGame(SIDE.NORTH, "你已认输");
});
window.addEventListener("resize", draw);

newDeploy();

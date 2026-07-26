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
  highwayNeighbors,
  railNeighbors,
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
    const north = state.phase === "play" && state.turn === SIDE.NORTH;
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
  combatLog.innerHTML = "尚无交锋";
  resultEl.textContent = "";
  resultEl.classList.remove("show");
  setMsg("暗棋人机对决。已自动布阵：敌子立起不可见，可「打乱重排」后开战。");
  updatePhaseUi("南方（你）· 布阵", "布阵");
  draw();
  play(selectAudio);
}

function startBattle() {
  if (state.phase !== "deploy") return;
  state.phase = "play";
  state.turn = SIDE.SOUTH;
  setMsg("开战 · 先点己方棋子，再点目标。敌子立起，碰撞后亮明。");
  updatePhaseUi("南方（你）行动", "对局中");
  draw();
}

function cellGeom() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const parentW = canvas.parentElement.clientWidth - 4;
  // 经典棋纸偏竖长，接近实物比例
  const cssW = Math.min(parentW, 480);
  const cssH = cssW * 1.85;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const padX = cssW * 0.1;
  const padY = cssH * 0.05;
  const spanX = cssW - padX * 2;
  const spanY = cssH - padY * 2;
  const mountainGap = spanY * 0.07;
  const cw = spanX / (COLS - 1);
  const ch = (spanY - mountainGap) / (ROWS - 1);
  return { padX, padY, cw, ch, cssW, cssH, mountainGap };
}

function nodeXY(r, c, geom) {
  const yExtra = r >= 6 ? geom.mountainGap : 0;
  return {
    x: geom.padX + c * geom.cw,
    y: geom.padY + r * geom.ch + yExtra,
  };
}

/** 经典铁路：粗黑轨 + 白虚线中心 */
function drawRailSegment(x1, y1, x2, y2, width) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#222";
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = "#f7efd8";
  ctx.lineWidth = width * 0.38;
  ctx.setLineDash([width * 1.1, width * 0.9]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawBoardBase(geom) {
  const { cssW, cssH, padX, cw } = geom;

  // 棋纸底色
  const paper = ctx.createLinearGradient(0, 0, 0, cssH);
  paper.addColorStop(0, "#f8edd0");
  paper.addColorStop(0.5, "#f3e4c2");
  paper.addColorStop(1, "#edd8b0");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, cssW, cssH);

  // 轻微纸纹
  ctx.fillStyle = "rgba(120, 80, 40, 0.03)";
  for (let i = 0; i < cssH; i += 3) {
    ctx.fillRect(0, i, cssW, 1);
  }

  // 朱红双框（棋纸外框）
  ctx.strokeStyle = "#b33a2e";
  ctx.lineWidth = Math.max(3, cssW * 0.012);
  ctx.strokeRect(5, 5, cssW - 10, cssH - 10);
  ctx.lineWidth = Math.max(1.2, cssW * 0.004);
  ctx.strokeRect(11, 11, cssW - 22, cssH - 22);

  // 山界带（中间加宽）
  const y5 = nodeXY(5, 0, geom).y;
  const y6 = nodeXY(6, 0, geom).y;
  const midY = (y5 + y6) / 2;
  const bandH = Math.max(18, (y6 - y5) * 0.72);
  ctx.fillStyle = "rgba(90, 120, 70, 0.16)";
  ctx.fillRect(padX - 6, midY - bandH / 2, cw * 4 + 12, bandH);
  // 山丘示意
  ctx.fillStyle = "rgba(70, 100, 55, 0.22)";
  ctx.beginPath();
  ctx.moveTo(padX + cw * 0.7, midY + bandH * 0.2);
  ctx.quadraticCurveTo(padX + cw * 1.3, midY - bandH * 0.45, padX + cw * 1.9, midY + bandH * 0.15);
  ctx.quadraticCurveTo(padX + cw * 2.5, midY - bandH * 0.35, padX + cw * 3.3, midY + bandH * 0.2);
  ctx.lineTo(padX + cw * 3.3, midY + bandH * 0.35);
  ctx.lineTo(padX + cw * 0.7, midY + bandH * 0.35);
  ctx.fill();

  ctx.fillStyle = "#6a3a1e";
  ctx.font = `600 ${Math.floor(cw * 0.28)}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("山　界", padX + cw * 2, midY);

  // 公路（细朱红线）——跳过纯铁路段，避免与粗轨叠成乱线
  const hwyDrawn = new Set();
  ctx.strokeStyle = "#8a3a28";
  ctx.lineWidth = Math.max(1.2, cssW * 0.0035);
  ctx.lineCap = "round";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = nodeXY(r, c, geom);
      for (const [nr, nc] of highwayNeighbors(r, c)) {
        const ek = keyEdge(r, c, nr, nc);
        if (hwyDrawn.has(ek)) continue;
        hwyDrawn.add(ek);
        // 两侧跨山界只画铁路，不画公路
        if ((r === 5 && nr === 6) || (r === 6 && nr === 5)) continue;
        const b = nodeXY(nr, nc, geom);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // 铁路粗轨
  const railW = Math.max(5, cssW * 0.014);
  const railDrawn = new Set();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isRail(r, c)) continue;
      const a = nodeXY(r, c, geom);
      for (const [nr, nc] of railNeighbors(r, c)) {
        const ek = keyEdge(r, c, nr, nc);
        if (railDrawn.has(ek)) continue;
        railDrawn.add(ek);
        const b = nodeXY(nr, nc, geom);
        drawRailSegment(a.x, a.y, b.x, b.y, railW);
      }
    }
  }

  // 落点：兵站胶囊 / 行营双红圈 / 大本营方框
  const unit = Math.min(geom.cw, geom.ch);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const { x, y } = nodeXY(r, c, geom);
      if (isCamp(r, c)) {
        const R = unit * 0.3;
        ctx.beginPath();
        ctx.fillStyle = "#f8edd0";
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = Math.max(2, unit * 0.045);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, R * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isHQ(r, c)) {
        const w = geom.cw * 0.38;
        const h = geom.ch * 0.32;
        ctx.fillStyle = "#f3d9a8";
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = Math.max(1.8, unit * 0.04);
        roundRect(ctx, x - w, y - h, w * 2, h * 2, 3);
        ctx.fill();
        ctx.stroke();
        // 无子时标「大本营」
        if (!state.board?.[r]?.[c]) {
          ctx.fillStyle = "rgba(160, 50, 30, 0.55)";
          ctx.font = `600 ${Math.floor(unit * 0.18)}px "Noto Serif SC", serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("大本营", x, y);
        }
      } else {
        const w = geom.cw * 0.2;
        const h = geom.ch * 0.14;
        ctx.fillStyle = "#fff8e8";
        ctx.strokeStyle = "#7a4a2e";
        ctx.lineWidth = 1.1;
        roundRect(ctx, x - w, y - h, w * 2, h * 2, unit * 0.08);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function keyEdge(r1, c1, r2, c2) {
  if (r1 < r2 || (r1 === r2 && c1 < c2)) return `${r1},${c1}-${r2},${c2}`;
  return `${r2},${c2}-${r1},${c1}`;
}

/** 己方平放亮面；敌方立起暗面（仅交锋后亮明） */
function isFaceUp(p) {
  if (p.side === SIDE.SOUTH) return true;
  return !!p.revealed;
}

function drawStandingPiece(x, y, isSouth, selected, geom) {
  const w = geom.cw * 0.24;
  const h = geom.ch * 0.3;
  const depth = Math.min(geom.cw, geom.ch) * 0.06;
  const base = isSouth ? "#a82828" : "#1e4f9a";
  const side = isSouth ? "#7a1c1c" : "#14366e";
  const top = isSouth ? "#d25555" : "#3d74c4";

  // 右侧厚度
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x + w, y - h);
  ctx.lineTo(x + w + depth, y - h - depth * 0.4);
  ctx.lineTo(x + w + depth, y + h - depth * 0.4);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // 顶面
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x - w, y - h);
  ctx.lineTo(x - w + depth, y - h - depth * 0.4);
  ctx.lineTo(x + w + depth, y - h - depth * 0.4);
  ctx.lineTo(x + w, y - h);
  ctx.closePath();
  ctx.fill();

  // 正面（暗面）
  const grad = ctx.createLinearGradient(x - w, y, x + w, y);
  grad.addColorStop(0, base);
  grad.addColorStop(0.5, isSouth ? "#c43a3a" : "#2a63b8");
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.4;
  roundRect(ctx, x - w, y - h, w * 2, h * 2, 3);
  ctx.fill();
  ctx.stroke();

  // 立起纹理
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.55, y - h * 0.7);
  ctx.lineTo(x - w * 0.55, y + h * 0.7);
  ctx.moveTo(x + w * 0.55, y - h * 0.7);
  ctx.lineTo(x + w * 0.55, y + h * 0.7);
  ctx.stroke();

  if (selected) {
    ctx.strokeStyle = "#f0c040";
    ctx.lineWidth = 2.4;
    roundRect(ctx, x - w - 3, y - h - 3, w * 2 + 6, h * 2 + 6, 4);
    ctx.stroke();
  }
}

function drawFlatPiece(x, y, p, selected, geom) {
  const isSouth = p.side === SIDE.SOUTH;
  const w = geom.cw * 0.28;
  const h = geom.ch * 0.22;
  const grad = ctx.createLinearGradient(x - w, y - h, x + w, y + h);
  if (isSouth) {
    grad.addColorStop(0, "#e07070");
    grad.addColorStop(1, "#a82828");
  } else {
    grad.addColorStop(0, "#6a9ad8");
    grad.addColorStop(1, "#1e4f9a");
  }
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x - w, y - h, w * 2, h * 2, 5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff8e8";
  ctx.font = `600 ${Math.floor(Math.min(geom.cw, geom.ch) * 0.26)}px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.name, x, y);

  if (p.flagExposed) {
    ctx.strokeStyle = "#f0c040";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    roundRect(ctx, x - w - 2, y - h - 2, w * 2 + 4, h * 2 + 4, 6);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (selected) {
    ctx.strokeStyle = "#f0c040";
    ctx.lineWidth = 2.5;
    roundRect(ctx, x - w - 3, y - h - 3, w * 2 + 6, h * 2 + 6, 6);
    ctx.stroke();
  }
}

function draw() {
  if (!state.board) return;
  const geom = cellGeom();
  canvas._geom = geom;
  drawBoardBase(geom);

  // 合法着点
  for (const m of state.legal) {
    const [r, c] = m.to;
    const { x, y } = nodeXY(r, c, geom);
    ctx.beginPath();
    ctx.fillStyle = m.attack ? "rgba(180,40,40,0.4)" : "rgba(30,120,70,0.35)";
    ctx.arc(x, y, Math.min(geom.cw, geom.ch) * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // 棋子：暗棋敌子立起
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const { x, y } = nodeXY(r, c, geom);
      const selected =
        state.selected && state.selected[0] === r && state.selected[1] === c;
      if (isFaceUp(p)) drawFlatPiece(x, y, p, selected, geom);
      else drawStandingPiece(x, y, p.side === SIDE.SOUTH, selected, geom);
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
  const geom = canvas._geom;
  let best = null;
  let bestD = Infinity;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = nodeXY(r, c, geom);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = [r, c];
      }
    }
  }
  const thresh = Math.min(geom.cw, geom.ch) * 0.42;
  if (bestD > thresh * thresh) return null;
  return best;
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
    setMsg(p.type === "flag" ? "军旗不可移动" : "地雷与大本营内棋子不可移动", true);
    state.selected = null;
    state.legal = [];
    draw();
    return;
  }
  state.selected = [r, c];
  state.legal = listMoves(state.board, SIDE.SOUTH).filter(
    (m) => m.from[0] === r && m.from[1] === c
  );
  setMsg(
    `已选择 ${p.name} · 高亮点可走${state.legal.some((m) => m.attack) ? " / 可攻击" : ""}`
  );
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
    } else if (
      combat.removed.some((x) => x.id === def.id) &&
      !combat.removed.some((x) => x.id === atk.id)
    ) {
      pushLog(`${who}${a} 攻击 ${d} → 获胜`);
    } else if (
      combat.removed.some((x) => x.id === atk.id) &&
      !combat.removed.some((x) => x.id === def.id)
    ) {
      pushLog(`${who}${a} 攻击 ${d} → 败退`);
    } else {
      pushLog(`${who}${a} 与 ${d} 交锋`);
    }
    if (combat.removed.some((x) => x.type === "commander")) {
      pushLog("司令阵亡 · 军旗位置亮明");
    }
  } else {
    const label = byAi ? "蓝方棋子" : atk.name;
    pushLog(`${byAi ? "蓝方" : "红方"}移动 ${byAi ? "立起棋子" : label}`);
  }

  play(clickAudio);

  if (winSide) {
    endGame(
      winSide,
      winSide === SIDE.SOUTH ? "你夺得军旗，胜利！" : "AI 夺旗，你失败了"
    );
    return;
  }

  const next = byAi ? SIDE.SOUTH : SIDE.NORTH;
  if (!hasMovable(state.board, SIDE.NORTH) && findAlive(SIDE.NORTH) === 0) {
    endGame(SIDE.SOUTH, "蓝方全灭，你获胜！");
    return;
  }
  if (!hasMovable(state.board, SIDE.SOUTH) && findAlive(SIDE.SOUTH) === 0) {
    endGame(SIDE.NORTH, "红方全灭，AI 获胜");
    return;
  }
  if (!hasMovable(state.board, next)) {
    endGame(
      next === SIDE.NORTH ? SIDE.SOUTH : SIDE.NORTH,
      next === SIDE.NORTH ? "AI 无棋可走，你获胜！" : "你无棋可走，AI 获胜"
    );
    return;
  }

  state.turn = next;
  updatePhaseUi(
    state.turn === SIDE.SOUTH ? "南方（你）行动" : "北方（AI）行动",
    "对局中"
  );
  setMsg(state.turn === SIDE.SOUTH ? "轮到你了" : "AI 思考中…");
  draw();

  if (state.turn === SIDE.NORTH) scheduleAi();
}

function findAlive(side) {
  let n = 0;
  for (const row of state.board) {
    for (const p of row) if (p && p.side === side) n++;
  }
  return n;
}

function endGame(side, text) {
  state.phase = "over";
  state.winner = side;
  state.busy = false;
  // 终局亮明敌方
  for (const row of state.board) {
    for (const p of row) if (p) p.revealed = true;
  }
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

let lastTouchAt = 0;

function onBoardPointer(e) {
  if (state.phase === "deploy") {
    setMsg("布阵阶段请先「开始作战」。敌子始终立起（暗棋）。");
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
}

canvas.addEventListener("click", (e) => {
  if (Date.now() - lastTouchAt < 600) return;
  onBoardPointer(e);
});
canvas.addEventListener(
  "touchstart",
  (e) => {
    lastTouchAt = Date.now();
    e.preventDefault();
    onBoardPointer(e);
  },
  { passive: false }
);

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

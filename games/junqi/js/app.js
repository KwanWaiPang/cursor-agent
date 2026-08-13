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
  CAMPS,
  canMoveDeploy,
  moveDeploy,
  cloneBoard,
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
const btnUndo = document.getElementById("btnUndo");
const difficultySelect = document.getElementById("difficultySelect");
const clickAudio = document.getElementById("clickAudio");
const selectAudio = document.getElementById("selectAudio");

const state = {
  phase: "deploy",
  board: null,
  turn: SIDE.SOUTH,
  selected: null,
  legal: [],
  winner: null,
  log: [],
  busy: false,
  difficulty: "normal",
  swapFrom: null,
  lastMove: null,
  history: [],
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
  combatLog.innerHTML = state.log.map((l) => `<div>${l}</div>`).join("") || "尚无交锋";
}

function newGame() {
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
  state.swapFrom = null;
  state.lastMove = null;
  state.history = [];
  state.difficulty = difficultySelect?.value || "normal";
  combatLog.innerHTML = "尚无交锋";
  resultEl.textContent = "";
  resultEl.classList.remove("show");
  setMsg("布阵阶段：点两枚己方棋子交换位置，再点「确认开局」。地雷须在最后两排，军旗须在大本营。");
  updatePhaseUi("南方布阵", "布阵中");
  if (btnStart) btnStart.textContent = "确认开局";
  draw();
  play(selectAudio);
}

function beginPlay() {
  if (state.phase !== "deploy") return;
  state.phase = "play";
  state.swapFrom = null;
  state.selected = null;
  state.legal = [];
  state.turn = SIDE.SOUTH;
  if (btnStart) btnStart.textContent = "提示操作";
  setMsg("已开战（暗棋）。点己方棋子再点高亮目标。");
  updatePhaseUi("南方（你）行动", "对局中");
  draw();
  play(selectAudio);
}

function cellGeom() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const parentW = Math.max(canvas.parentElement.clientWidth - 4, 280);
  const cssW = Math.min(parentW, 460);
  const cssH = cssW * 1.9;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padX = cssW * 0.12;
  const padY = cssH * 0.075;
  const cw = (cssW - padX * 2) / (COLS - 1);
  const ch = (cssH - padY * 2) / (ROWS - 1);
  return { padX, padY, cw, ch, cssW, cssH };
}

function nodeXY(r, c, geom) {
  return {
    x: geom.padX + c * geom.cw,
    y: geom.padY + r * geom.ch,
  };
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

function drawBoardBase(geom) {
  const { cssW, cssH, padX, padY, cw, ch } = geom;
  const getX = (c) => padX + c * cw;
  const getY = (r) => padY + r * ch;

  // 棋纸
  ctx.fillStyle = "#f6e7c4";
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.fillStyle = "rgba(120,70,30,0.035)";
  for (let i = 0; i < cssH; i += 3) ctx.fillRect(0, i, cssW, 1);

  // 朱红双框
  ctx.strokeStyle = "#a91d22";
  ctx.lineWidth = Math.max(5, cssW * 0.012);
  ctx.strokeRect(8, 8, cssW - 16, cssH - 16);
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, cssW - 32, cssH - 32);

  ctx.fillStyle = "#a91d22";
  ctx.font = `bold ${Math.floor(cssW * 0.045)}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("军　　棋", cssW / 2, padY * 0.45);
  ctx.fillText("军　　棋", cssW / 2, cssH - padY * 0.4);

  // 公路：南北半区竖线 + 各行横线 + 前线三路
  ctx.strokeStyle = "#4a5568";
  ctx.lineWidth = Math.max(1.5, cssW * 0.004);
  for (let c = 0; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(getX(c), getY(0));
    ctx.lineTo(getX(c), getY(5));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(getX(c), getY(6));
    ctx.lineTo(getX(c), getY(11));
    ctx.stroke();
    if (c === 0 || c === 2 || c === 4) {
      ctx.beginPath();
      ctx.moveTo(getX(c), getY(5));
      ctx.lineTo(getX(c), getY(6));
      ctx.stroke();
    }
  }
  for (let r = 0; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(r));
    ctx.lineTo(getX(4), getY(r));
    ctx.stroke();
  }

  // 行营 X 通道
  CAMPS.forEach((k) => {
    const [r, c] = k.split(",").map(Number);
    const cx = getX(c);
    const cy = getY(r);
    ctx.beginPath();
    ctx.moveTo(cx - cw, cy - ch);
    ctx.lineTo(cx + cw, cy + ch);
    ctx.moveTo(cx + cw, cy - ch);
    ctx.lineTo(cx - cw, cy + ch);
    ctx.stroke();
  });

  // 前线斜线
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(5));
  ctx.lineTo(getX(2), getY(6));
  ctx.moveTo(getX(2), getY(5));
  ctx.lineTo(getX(0), getY(6));
  ctx.moveTo(getX(2), getY(5));
  ctx.lineTo(getX(4), getY(6));
  ctx.moveTo(getX(4), getY(5));
  ctx.lineTo(getX(2), getY(6));
  ctx.stroke();

  // 铁路（虚线矩形 + 两侧跨线）
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = Math.max(3.5, cssW * 0.01);
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(getX(0), getY(1), cw * 4, ch * 3);
  ctx.strokeRect(getX(0), getY(7), cw * 4, ch * 3);
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(4));
  ctx.lineTo(getX(0), getY(7));
  ctx.moveTo(getX(4), getY(4));
  ctx.lineTo(getX(4), getY(7));
  ctx.stroke();
  ctx.setLineDash([]);

  // 前线字
  const riverY = (getY(5) + getY(6)) / 2;
  ctx.fillStyle = "#a91d22";
  ctx.font = `bold ${Math.floor(cssW * 0.04)}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
  ctx.fillText("前　　线", cssW * 0.28, riverY);
  ctx.fillText("前　　线", cssW * 0.72, riverY);

  // 落点标注
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = getX(c);
      const cy = getY(r);
      const occupied = !!(state.board && state.board[r][c]);
      if (isCamp(r, c)) {
        const R = Math.min(cw, ch) * 0.32;
        ctx.fillStyle = "#fffdf6";
        ctx.strokeStyle = "#a91d22";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        if (!occupied) {
          ctx.fillStyle = "#a91d22";
          ctx.font = `bold ${Math.floor(Math.min(cw, ch) * 0.2)}px "Noto Serif SC", serif`;
          ctx.fillText("行营", cx, cy);
        }
      } else if (isHQ(r, c)) {
        const w = cw * 0.42;
        const h = ch * 0.34;
        ctx.fillStyle = "#fffdf6";
        ctx.strokeStyle = "#a91d22";
        ctx.lineWidth = 2.5;
        roundRect(ctx, cx - w, cy - h, w * 2, h * 2, 8);
        ctx.fill();
        ctx.stroke();
        if (!occupied) {
          ctx.fillStyle = "#a91d22";
          ctx.font = `bold ${Math.floor(Math.min(cw, ch) * 0.2)}px "Noto Serif SC", serif`;
          ctx.fillText("大本营", cx, cy);
        }
      } else {
        const w = cw * 0.24;
        const h = ch * 0.18;
        ctx.fillStyle = "#fffdf6";
        ctx.strokeStyle = isRail(r, c) ? "#0f172a" : "#334155";
        ctx.lineWidth = isRail(r, c) ? 2.2 : 1.5;
        roundRect(ctx, cx - w, cy - h, w * 2, h * 2, 6);
        ctx.fill();
        ctx.stroke();
        if (!occupied) {
          ctx.fillStyle = "#475569";
          ctx.font = `bold ${Math.floor(Math.min(cw, ch) * 0.16)}px "Noto Serif SC", serif`;
          ctx.fillText("兵站", cx, cy);
        }
      }
    }
  }
}

function isFaceUp(p) {
  if (p.side === SIDE.SOUTH) return true;
  return !!p.revealed;
}

function drawStandingPiece(x, y, isSouth, selected, geom) {
  const w = geom.cw * 0.22;
  const h = geom.ch * 0.28;
  const base = isSouth ? "#b91c1c" : "#1d4ed8";
  const grad = ctx.createLinearGradient(x - w, y, x + w, y);
  grad.addColorStop(0, base);
  grad.addColorStop(0.5, isSouth ? "#ef4444" : "#3b82f6");
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1.4;
  roundRect(ctx, x - w, y - h, w * 2, h * 2, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y - h * 0.65);
  ctx.lineTo(x - w * 0.5, y + h * 0.65);
  ctx.moveTo(x + w * 0.5, y - h * 0.65);
  ctx.lineTo(x + w * 0.5, y + h * 0.65);
  ctx.stroke();
  if (selected) {
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 2.5;
    roundRect(ctx, x - w - 3, y - h - 3, w * 2 + 6, h * 2 + 6, 4);
    ctx.stroke();
  }
}

function drawFlatPiece(x, y, p, selected, geom) {
  const isSouth = p.side === SIDE.SOUTH;
  const w = geom.cw * 0.3;
  const h = geom.ch * 0.24;
  const grad = ctx.createLinearGradient(x - w, y - h, x + w, y + h);
  if (isSouth) {
    grad.addColorStop(0, "#f87171");
    grad.addColorStop(1, "#b91c1c");
  } else {
    grad.addColorStop(0, "#60a5fa");
    grad.addColorStop(1, "#1d4ed8");
  }
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x - w, y - h, w * 2, h * 2, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff8e8";
  ctx.font = `600 ${Math.floor(Math.min(geom.cw, geom.ch) * 0.24)}px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.name, x, y);
  if (p.flagExposed || selected) {
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 2.4;
    roundRect(ctx, x - w - 3, y - h - 3, w * 2 + 6, h * 2 + 6, 6);
    ctx.stroke();
  }
}

function draw() {
  if (!state.board) return;
  const geom = cellGeom();
  canvas._geom = geom;
  drawBoardBase(geom);

  for (const m of state.legal) {
    const [r, c] = m.to;
    const { x, y } = nodeXY(r, c, geom);
    ctx.beginPath();
    ctx.fillStyle = m.attack ? "rgba(220,38,38,0.55)" : "rgba(14,165,233,0.55)";
    ctx.strokeStyle = m.attack ? "#b91c1c" : "#0369a1";
    ctx.lineWidth = 3.2;
    ctx.arc(x, y, Math.min(geom.cw, geom.ch) * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (state.lastMove) {
    const { from, to } = state.lastMove;
    for (const pos of [from, to]) {
      if (!pos) continue;
      const { x, y } = nodeXY(pos[0], pos[1], geom);
      ctx.beginPath();
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 3;
      ctx.arc(x, y, Math.min(geom.cw, geom.ch) * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = state.board[r][c];
      if (!p) continue;
      const { x, y } = nodeXY(r, c, geom);
      const selected =
        (state.selected && state.selected[0] === r && state.selected[1] === c) ||
        (state.swapFrom && state.swapFrom[0] === r && state.swapFrom[1] === c);
      if (isFaceUp(p)) drawFlatPiece(x, y, p, selected, geom);
      else drawStandingPiece(x, y, false, selected, geom);
    }
  }
}

/** 兼容 CSS 拉伸：把屏幕坐标换算回绘制坐标 */
function posFromEvent(e) {
  const geom = canvas._geom;
  if (!geom) return null;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches?.[0] || e.changedTouches?.[0];
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;
  const x = ((clientX - rect.left) * geom.cssW) / Math.max(rect.width, 1);
  const y = ((clientY - rect.top) * geom.cssH) / Math.max(rect.height, 1);

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
  const thresh = Math.min(geom.cw, geom.ch) * 0.5;
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
    setMsg(
      p.type === "flag"
        ? "军旗不可移动"
        : p.type === "mine"
          ? "地雷不可移动"
          : "大本营内棋子不可移动",
      true
    );
    state.selected = null;
    state.legal = [];
    draw();
    return;
  }
  state.selected = [r, c];
  state.legal = listMoves(state.board, SIDE.SOUTH).filter(
    (m) => m.from[0] === r && m.from[1] === c
  );
  if (!state.legal.length) {
    setMsg(`${p.name} 当前无路可走`, true);
  } else {
    setMsg(
      `已选择 ${p.name} · 蓝点可走${state.legal.some((m) => m.attack) ? " · 红点可攻" : ""}`
    );
  }
  draw();
}

function pushHistory() {
  state.history.push({
    board: cloneBoard(state.board),
    turn: state.turn,
    log: state.log.slice(),
    lastMove: state.lastMove ? { from: [...state.lastMove.from], to: [...state.lastMove.to] } : null,
  });
  if (state.history.length > 80) state.history.shift();
}

function undoMove() {
  if (state.phase !== "play" || state.busy) {
    setMsg("现在不能悔棋", true);
    return;
  }
  if (!state.history.length) {
    setMsg("没有可悔的棋", true);
    return;
  }
  const snap = state.history.pop();
  state.board = snap.board;
  state.turn = snap.turn;
  state.log = snap.log;
  state.lastMove = snap.lastMove;
  state.selected = null;
  state.legal = [];
  state.winner = null;
  combatLog.innerHTML = state.log.map((l) => `<div>${l}</div>`).join("") || "尚无交锋";
  updatePhaseUi(
    state.turn === SIDE.SOUTH ? "南方（你）行动" : "北方（AI）行动",
    "对局中"
  );
  setMsg("已悔棋");
  draw();
}

function doMove(move, byAi = false) {
  if (!byAi) pushHistory();
  const [fr, fc] = move.from;
  const atk = state.board[fr][fc];
  const def = state.board[move.to[0]][move.to[1]];
  const { board, combat, winSide } = applyMove(state.board, move);
  state.board = board;
  state.selected = null;
  state.legal = [];
  state.lastMove = { from: [...move.from], to: [...move.to] };

  if (combat) {
    // 暗棋战报：只报结果，不公布敌子兵种
    const myName = byAi ? def.name : atk.name;
    const atkLabel = byAi ? "敌子" : atk.name;
    const defLabel = byAi ? myName : "敌子";
    if (combat.winSide) {
      pushLog(byAi ? "敌子夺旗，你失败了" : `${atk.name} 夺旗成功！`);
    } else if (!combat.survivor) {
      pushLog(`${atkLabel} vs ${defLabel} → 同归于尽`);
    } else if (
      combat.removed.some((x) => x.id === def.id) &&
      !combat.removed.some((x) => x.id === atk.id)
    ) {
      pushLog(
        byAi
          ? `敌子吃掉你的${def.name}`
          : `${atk.name} 吃掉敌子`
      );
    } else if (
      combat.removed.some((x) => x.id === atk.id) &&
      !combat.removed.some((x) => x.id === def.id)
    ) {
      pushLog(
        byAi
          ? `敌子撞上你的${def.name}后败退`
          : `${atk.name} 攻击敌子后败退`
      );
    } else {
      pushLog(`${atkLabel} 与 ${defLabel} 交锋`);
    }
    // 仅当己方司令阵亡时提示亮旗；敌方司令阵亡也只提示，不亮明吃子的是谁
    if (combat.removed.some((x) => x.type === "commander" && x.side === SIDE.SOUTH)) {
      pushLog("你的司令阵亡 · 军旗位置已暴露给对方");
    } else if (combat.removed.some((x) => x.type === "commander" && x.side === SIDE.NORTH)) {
      pushLog("敌方司令阵亡 · 敌方军旗位置亮明");
    }
  } else {
    pushLog(byAi ? "敌子移动" : `红方移动 ${atk.name}`);
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

function endGame(side, text) {
  state.phase = "over";
  state.winner = side;
  state.busy = false;
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
  await new Promise((r) => setTimeout(r, 320));
  const move = think(state.board, SIDE.NORTH, state.difficulty);
  state.busy = false;
  if (!move) {
    endGame(SIDE.SOUTH, "AI 无棋可走，你获胜！");
    return;
  }
  doMove(move, true);
}

let lastTouchAt = 0;

function onDeployPointer(r, c) {
  const p = state.board[r][c];
  if (!state.swapFrom) {
    if (!p || p.side !== SIDE.SOUTH) {
      setMsg("请先点己方（南）棋子", true);
      return;
    }
    state.swapFrom = [r, c];
    setMsg(`已选 ${p.name}，再点另一枚交换，或点空位放置`);
    draw();
    return;
  }
  const [fr, fc] = state.swapFrom;
  if (fr === r && fc === c) {
    state.swapFrom = null;
    setMsg("已取消选择");
    draw();
    return;
  }
  if (!canMoveDeploy(state.board, [fr, fc], [r, c], SIDE.SOUTH)) {
    setMsg("不能放到这里：军旗须留大本营，地雷须在最后两排，炸弹不能上最前排，行营不能布子", true);
    return;
  }
  const fromName = state.board[fr][fc]?.name || "棋";
  moveDeploy(state.board, [fr, fc], [r, c], SIDE.SOUTH);
  state.swapFrom = null;
  setMsg(`已调整 ${fromName}。可继续微调，或点「确认开局」。`);
  draw();
  play(clickAudio);
}

function onBoardPointer(e) {
  if (state.phase === "over") {
    setMsg("对局已结束，请点「开始新对局」");
    return;
  }
  const pos = posFromEvent(e);
  if (!pos) return;
  const [r, c] = pos;
  if (state.phase === "deploy") {
    onDeployPointer(r, c);
    return;
  }
  if (state.phase !== "play" || state.busy || state.turn !== SIDE.SOUTH) return;

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
    if (e.cancelable) e.preventDefault();
    onBoardPointer(e);
  },
  { passive: false }
);

btnNew.addEventListener("click", newGame);
btnRedeploy.addEventListener("click", () => {
  if (state.phase === "over") {
    newGame();
    return;
  }
  if (state.phase !== "deploy") {
    setMsg("对局中不能重排，请先结束或开新局", true);
    return;
  }
  newGame();
});
btnStart.addEventListener("click", () => {
  if (state.phase === "deploy") {
    beginPlay();
    return;
  }
  setMsg("已在对局中。请直接点棋盘上的红方棋子行动。");
});
btnResign.addEventListener("click", () => {
  if (state.phase !== "play") return;
  endGame(SIDE.NORTH, "你已认输");
});
btnUndo?.addEventListener("click", undoMove);
window.addEventListener("resize", draw);

newGame();

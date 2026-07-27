import {
  BOARD,
  GROUP_COLORS,
  rentOf,
  isDeed,
  buildLevelLabel,
  MAX_BUILD_LEVEL,
} from "./data.js";
import {
  createInitialState,
  currentPlayer,
  rollAndMove,
  confirmDialog,
  shouldAutoAct,
  autoAct,
  setAllHumanAuto,
} from "./engine.js";

const clickAudio = document.getElementById("clickAudio");
const selectAudio = document.getElementById("selectAudio");

const els = {
  board: document.getElementById("board"),
  turnLabel: document.getElementById("turnLabel"),
  turnDot: document.getElementById("turnDot"),
  phaseBadge: document.getElementById("phaseBadge"),
  dayCount: document.getElementById("dayCount"),
  message: document.getElementById("message"),
  result: document.getElementById("result"),
  players: document.getElementById("playerList"),
  log: document.getElementById("logList"),
  dice: null,
  diceFace: null,
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogText: document.getElementById("dialogText"),
  dialogOk: document.getElementById("dialogOk"),
  dialogCancel: document.getElementById("dialogCancel"),
  tip: document.getElementById("cellTip"),
  startMoney: document.getElementById("startMoney"),
  humanCount: document.getElementById("humanCount"),
  aiCount: document.getElementById("aiCount"),
  btnNew: document.getElementById("btnNew"),
  btnSpeed: document.getElementById("btnSpeed"),
  btnAuto: document.getElementById("btnAuto"),
};

let state = null;
let busy = false;
let fast = false;
let autoHumans = false;
let cellNodes = [];

function play(el) {
  if (!el) return;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  } catch (_) {}
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function speed() {
  return fast ? Math.max(220, (state?.speedMs || 700) * 0.45) : state?.speedMs || 700;
}

/** 起点在右下角，顺时针 */
function cellGridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i, side: "bottom" }; // 右→左
  if (i <= 19) return { row: 11 - (i - 10), col: 1, side: "left" }; // 下→上
  if (i <= 30) return { row: 1, col: i - 19, side: "top" }; // 左→右
  return { row: i - 29, col: 11, side: "right" }; // 上→下  i=31→row2, i=39→row10
}

function cellInnerHTML(def) {
  const price =
    def.type === "property" || def.type === "station" || def.type === "utility"
      ? `$${def.value}`
      : def.subtitle || "";
  const mark =
    def.type === "chance"
      ? "？"
      : def.type === "fate"
        ? "！"
        : def.icon || "";

  return `
    <span class="cell-band" aria-hidden="true"></span>
    <span class="cell-body">
      <span class="cell-icon">${mark}</span>
      <span class="cell-name">${def.name}</span>
      <span class="cell-price">${price}</span>
      <span class="cell-houses" aria-hidden="true"></span>
      <span class="cell-tokens"></span>
    </span>
  `;
}

function buildBoard() {
  els.board.innerHTML = "";
  cellNodes = [];

  const center = document.createElement("div");
  center.className = "board-center";
  center.style.gridColumn = "2 / 11";
  center.style.gridRow = "2 / 11";
  center.innerHTML = `
    <div class="center-sky" aria-hidden="true"></div>
    <div class="center-landmarks" aria-hidden="true">
      <span>🗽</span><span>🗼</span><span>🏛️</span><span>🏯</span>
    </div>
    <div class="center-title">
      <div class="center-brand">大富翁</div>
      <div class="center-sub">世界之旅</div>
    </div>
    <div class="center-cards" aria-hidden="true">
      <span class="fake-card chance">机会</span>
      <span class="fake-card fate">命运</span>
    </div>
    <button type="button" class="dice-btn" id="diceBtnInner" aria-label="掷骰子">
      <span class="dice-face" id="diceFaceInner">?</span>
      <span>掷骰前进</span>
    </button>
  `;
  els.board.appendChild(center);

  const innerBtn = center.querySelector("#diceBtnInner");
  const innerFace = center.querySelector("#diceFaceInner");
  els.dice = innerBtn;
  els.diceFace = innerFace;
  innerBtn.addEventListener("click", onDice);

  BOARD.forEach((def, i) => {
    const pos = cellGridPos(i);
    const node = document.createElement("button");
    node.type = "button";
    node.className = `cell cell-${def.type} side-${pos.side}`;
    if (i === 0 || i === 10 || i === 20 || i === 30) {
      node.classList.add("cell-corner");
    }
    node.style.gridRow = String(pos.row);
    node.style.gridColumn = String(pos.col);
    if (def.group) {
      node.style.setProperty("--group", GROUP_COLORS[def.group] || "#888");
    }
    node.dataset.index = String(i);
    node.innerHTML = cellInnerHTML(def);
    node.addEventListener("mouseenter", () => showTip(i, node));
    node.addEventListener("mouseleave", hideTip);
    node.addEventListener("focus", () => showTip(i, node));
    node.addEventListener("blur", hideTip);
    els.board.appendChild(node);
    cellNodes[i] = node;
  });
}

function showTip(i, anchor) {
  if (!state) return;
  const cell = state.cells[i];
  if (!isDeed(cell)) {
    hideTip();
    return;
  }
  const owner =
    cell.owner == null ? "无" : state.players[cell.owner]?.name || "—";
  els.tip.hidden = false;
  els.tip.innerHTML = `
    <strong>${cell.icon || ""} ${cell.name}</strong>
    <div>地主：${owner}</div>
    <div>价格：$${cell.value}</div>
    ${
      cell.type === "property"
        ? `<div>建筑：${buildLevelLabel(cell.level)}（最多酒店）</div>`
        : ""
    }
    <div>租金：$${rentOf(cell, state)}</div>
  `;
  const rect = anchor.getBoundingClientRect();
  els.tip.style.left = `${Math.min(window.innerWidth - 200, Math.max(8, rect.left))}px`;
  els.tip.style.top = `${Math.max(8, rect.top - 8)}px`;
}

function hideTip() {
  els.tip.hidden = true;
}

/** 地图上盖房：1–3 栋小房子，第 4 级换成酒店 */
function renderHouses(level) {
  const n = Math.max(0, Math.min(level || 0, MAX_BUILD_LEVEL));
  if (n <= 0) return "";
  if (n >= MAX_BUILD_LEVEL) {
    return `<span class="house hotel" title="酒店"></span>`;
  }
  return Array.from({ length: n }, () => `<span class="house" title="房子"></span>`).join("");
}

function render() {
  if (!state) return;
  const p = currentPlayer(state);

  els.turnLabel.textContent =
    state.phase === "ended" ? "对局结束" : `${p.name} 行动`;
  els.turnDot.style.background = p?.color || "#888";
  els.dayCount.textContent = `第 ${state.day} 天`;
  els.message.textContent = state.message || "";
  els.message.className = "message info";

  const phaseMap = {
    ready: "待掷骰",
    moving: "行进中",
    event: "结算中",
    dialog: "决策中",
    ended: "已结束",
  };
  els.phaseBadge.textContent = phaseMap[state.phase] || state.phase;

  if (state.phase === "ended" && state.winner) {
    els.result.hidden = false;
    els.result.textContent = `${state.winner.name} 获胜`;
  } else {
    els.result.hidden = true;
    els.result.textContent = "";
  }

  els.players.innerHTML = state.players
    .map((pl) => {
      const props = state.cells.filter((c) => c.owner === pl.id).length;
      return `<li class="${pl.bankrupt ? "bankrupt" : ""} ${
        pl.id === state.turn ? "current" : ""
      }">
        <span class="token" style="background:${pl.color}"></span>
        <span class="name">${pl.name}${pl.isHuman ? "" : " · AI"}${
        pl.auto ? " · 托管" : ""
      }</span>
        <span class="money">$${pl.bankrupt ? 0 : pl.money}</span>
        <span class="props">${props}处产业</span>
      </li>`;
    })
    .join("");

  els.log.innerHTML = state.log
    .slice(0, 12)
    .map((t) => `<li>${t}</li>`)
    .join("");

  state.cells.forEach((cell, i) => {
    const node = cellNodes[i];
    if (!node) return;
    const housesEl = node.querySelector(".cell-houses");
    const priceEl = node.querySelector(".cell-price");
    const tokens = node.querySelector(".cell-tokens");
    node.classList.toggle("owned", cell.owner != null);
    if (cell.owner != null) {
      node.style.setProperty("--owner", state.players[cell.owner].color);
    } else {
      node.style.removeProperty("--owner");
    }
    if (cell.type === "property") {
      priceEl.textContent = `$${cell.value}`;
      housesEl.innerHTML = renderHouses(cell.level || 0);
      node.classList.toggle("has-houses", (cell.level || 0) > 0);
      node.classList.toggle("has-hotel", (cell.level || 0) >= MAX_BUILD_LEVEL);
    } else if (cell.type === "station" || cell.type === "utility") {
      housesEl.innerHTML = "";
      priceEl.textContent = `$${cell.value}`;
      node.classList.remove("has-houses", "has-hotel");
    } else {
      housesEl.innerHTML = "";
      node.classList.remove("has-houses", "has-hotel");
    }
    const here = state.players.filter(
      (pl) => !pl.bankrupt && pl.position === i
    );
    tokens.innerHTML = here
      .map(
        (pl) =>
          `<span class="pawn" style="background:${pl.color}" title="${pl.name}"></span>`
      )
      .join("");
  });

  if (els.diceFace && state.lastDice) {
    els.diceFace.textContent = String(state.lastDice);
  }

  const canRoll =
    !busy &&
    state.phase === "ready" &&
    p &&
    p.isHuman &&
    !p.auto &&
    state.phase !== "ended";
  if (els.dice) els.dice.disabled = !canRoll;

  if (state.phase === "dialog" && state.pendingDialog) {
    els.dialog.hidden = false;
    els.dialogTitle.textContent = state.pendingDialog.title;
    els.dialogText.textContent = state.pendingDialog.text;
    els.dialogOk.disabled = !state.pendingDialog.canConfirm;
  } else {
    els.dialog.hidden = true;
  }
}

async function runAutoLoop() {
  while (state && shouldAutoAct(state) && state.phase !== "ended") {
    busy = true;
    render();
    await delay(speed());
    state = autoAct(state);
    play(clickAudio);
    busy = false;
    render();
    await delay(speed() * 0.6);
  }
  busy = false;
  render();
}

async function onDice() {
  if (!state || busy || state.phase !== "ready") return;
  const p = currentPlayer(state);
  if (!p.isHuman || p.auto) return;
  busy = true;
  play(selectAudio);
  render();
  await delay(120);
  state = rollAndMove(state);
  play(clickAudio);
  busy = false;
  render();
  await runAutoLoop();
}

function onDialog(yes) {
  if (!state || state.phase !== "dialog") return;
  play(selectAudio);
  state = confirmDialog(state, yes);
  render();
  runAutoLoop();
}

function startNew() {
  const startMoney = Number(els.startMoney.value) || 15000;
  const humanCount = Number(els.humanCount.value) || 1;
  const aiCount = Number(els.aiCount.value) || 1;
  state = createInitialState({ startMoney, humanCount, aiCount });
  if (autoHumans) setAllHumanAuto(state, true);
  busy = false;
  buildBoard();
  play(clickAudio);
  render();
  runAutoLoop();
}

els.btnNew.addEventListener("click", startNew);
els.dialogOk.addEventListener("click", () => onDialog(true));
els.dialogCancel.addEventListener("click", () => onDialog(false));
els.btnSpeed.addEventListener("click", () => {
  fast = !fast;
  els.btnSpeed.textContent = fast ? "正常速度" : "加快速度";
});
els.btnAuto.addEventListener("click", () => {
  autoHumans = !autoHumans;
  els.btnAuto.textContent = autoHumans ? "取消托管" : "开启托管";
  if (state) {
    setAllHumanAuto(state, autoHumans);
    render();
    runAutoLoop();
  }
});

function syncCounts() {
  const h = Number(els.humanCount.value);
  if (h + Number(els.aiCount.value) > 4) {
    els.aiCount.value = String(Math.max(0, 4 - h));
  }
  if (h + Number(els.aiCount.value) < 2) {
    els.aiCount.value = "1";
  }
}
els.humanCount.addEventListener("change", syncCounts);
els.aiCount.addEventListener("change", syncCounts);

buildBoard();
startNew();

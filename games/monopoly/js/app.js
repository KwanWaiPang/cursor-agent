import {
  BOARD,
  GROUP_COLORS,
  rentOf,
  isDeed,
  buildLevelLabel,
  MAX_BUILD_LEVEL,
  getDeedCard,
} from "./data.js";
import {
  createInitialState,
  currentPlayer,
  rollDicePair,
  applyDiceMove,
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
  diceTray: null,
  dieA: null,
  dieB: null,
  diceSum: null,
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogText: document.getElementById("dialogText"),
  dialogOk: document.getElementById("dialogOk"),
  dialogCancel: document.getElementById("dialogCancel"),
  tip: document.getElementById("cellTip"),
  deedOverlay: document.getElementById("deedOverlay"),
  deedBand: document.getElementById("deedBand"),
  deedKind: document.getElementById("deedKind"),
  deedTitle: document.getElementById("deedTitle"),
  deedOwner: document.getElementById("deedOwner"),
  deedRentTable: document.querySelector("#deedRentTable tbody"),
  deedCostTable: document.querySelector("#deedCostTable tbody"),
  deedNote: document.getElementById("deedNote"),
  deedClose: document.getElementById("deedClose"),
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
  // 国家地产不放图标；特殊格用文字记号（不用国旗）
  const mark = def.type === "property" ? "" : def.mark || "";

  return `
    <span class="cell-band" aria-hidden="true">
      <span class="cell-houses" aria-hidden="true"></span>
    </span>
    <span class="cell-body">
      ${mark ? `<span class="cell-icon">${mark}</span>` : `<span class="cell-icon cell-icon-empty"></span>`}
      <span class="cell-name">${def.name}</span>
      <span class="cell-price">${price}</span>
    </span>
    <span class="cell-tokens" aria-hidden="true"></span>
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
    <div class="dice-tray" id="diceTray" aria-live="polite">
      <div class="die" id="dieA" data-value="0" role="img" aria-label="骰子一"></div>
      <div class="die" id="dieB" data-value="0" role="img" aria-label="骰子二"></div>
    </div>
    <p class="dice-sum" id="diceSum">点击下方掷骰</p>
    <button type="button" class="dice-btn" id="diceBtnInner" aria-label="掷骰子">
      掷双骰前进
    </button>
  `;
  els.board.appendChild(center);

  const innerBtn = center.querySelector("#diceBtnInner");
  els.dice = innerBtn;
  els.diceTray = center.querySelector("#diceTray");
  els.dieA = center.querySelector("#dieA");
  els.dieB = center.querySelector("#dieB");
  els.diceSum = center.querySelector("#diceSum");
  paintDie(els.dieA, 0);
  paintDie(els.dieB, 0);
  setDiceSumText("点击下方掷骰");
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
    node.addEventListener("click", (ev) => {
      if (!state || !isDeed(state.cells[i])) return;
      ev.preventDefault();
      openDeed(i);
    });
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
    <strong>${cell.name}</strong>
    <div>地主：${owner}</div>
    <div>现租金：$${rentOf(cell, state)}</div>
    <div class="tip-hint">点击查看地契</div>
  `;
  const rect = anchor.getBoundingClientRect();
  els.tip.style.left = `${Math.min(window.innerWidth - 200, Math.max(8, rect.left))}px`;
  els.tip.style.top = `${Math.max(8, rect.top - 8)}px`;
}

function hideTip() {
  els.tip.hidden = true;
}

function openDeed(index) {
  if (!state) return;
  const cell = state.cells[index];
  const deed = getDeedCard(cell, state);
  if (!deed) return;

  hideTip();
  play(selectAudio);

  els.deedKind.textContent = deed.kindLabel;
  els.deedTitle.textContent = deed.name;
  els.deedBand.style.background = deed.groupColor || (
    deed.type === "station" ? "#43a047" : deed.type === "utility" ? "#0288d1" : "#8d6e63"
  );

  const ownerName =
    deed.ownerId == null
      ? "尚未出售"
      : state.players[deed.ownerId]?.name || "—";
  let status = "";
  if (deed.type === "property") {
    status = `当前建筑：${buildLevelLabel(deed.level)}`;
  } else if (deed.type === "station") {
    status = deed.ownerId == null
      ? "当前无人持有"
      : `持有者已有 ${deed.stationOwned} 座车站`;
  }
  els.deedOwner.textContent = `地主：${ownerName}${status ? ` · ${status}` : ""}`;

  const activeLevel =
    deed.type === "property"
      ? deed.level
      : deed.type === "station"
        ? deed.stationOwned || 0
        : 0;

  els.deedRentTable.innerHTML = deed.rows
    .map((row) => {
      const active =
        (deed.type === "property" && row.level === activeLevel) ||
        (deed.type === "station" && row.level === activeLevel);
      return `<tr class="${active ? "is-current" : ""}">
        <th scope="row">${row.label}</th>
        <td>$${row.value}</td>
      </tr>`;
    })
    .join("");

  els.deedCostTable.innerHTML = deed.costs
    .map(
      (row) => `<tr>
        <th scope="row">${row.label}</th>
        <td>$${row.value}</td>
      </tr>`
    )
    .join("");

  els.deedNote.textContent = deed.note || "";
  els.deedOverlay.hidden = false;
}

function closeDeed() {
  els.deedOverlay.hidden = true;
}

/** 骰子点数面（圆点） */
function paintDie(el, value) {
  if (!el) return;
  const n = Math.max(0, Math.min(6, value | 0));
  el.dataset.value = String(n);
  el.classList.toggle("die-blank", n === 0);
  const map = {
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  el.innerHTML = Array.from({ length: 9 }, (_, i) =>
    map[n].includes(i) ? '<span class="pip"></span>' : "<span></span>"
  ).join("");
}

function setDiceSumText(text) {
  if (els.diceSum) els.diceSum.textContent = text;
}

function randFace() {
  return 1 + Math.floor(Math.random() * 6);
}

async function animateDice(a, b) {
  try {
    if (els.diceTray) {
      els.diceTray.classList.remove("is-landed");
      els.diceTray.classList.add("is-rolling");
    }
    setDiceSumText("骰子滚动中…");
    const spins = fast ? 10 : 18;
    for (let i = 0; i < spins; i++) {
      paintDie(els.dieA, randFace());
      paintDie(els.dieB, randFace());
      await delay(fast ? 40 : 70);
    }
    paintDie(els.dieA, a);
    paintDie(els.dieB, b);
    setDiceSumText(`${a} + ${b} = ${a + b}`);
    if (els.diceTray) {
      els.diceTray.classList.remove("is-rolling");
      els.diceTray.classList.add("is-landed");
      await delay(fast ? 220 : 420);
    }
  } finally {
    if (els.diceTray) {
      els.diceTray.classList.remove("is-rolling");
      els.diceTray.classList.remove("is-landed");
    }
    setDiceSumText(`${a} + ${b} = ${a + b}`);
  }
}

/** 棋子逐格走动（视觉），不结算路过起点奖金 */
async function animateWalk(playerId, from, steps) {
  const pl = state.players[playerId];
  if (!pl || steps <= 0) return;
  const total = BOARD.length;
  for (let i = 1; i <= steps; i++) {
    pl.position = (from + i) % total;
    renderTokensOnly();
    const node = cellNodes[pl.position];
    if (node) {
      node.classList.add("is-stepping");
      await delay(fast ? 90 : 160);
      node.classList.remove("is-stepping");
    } else {
      await delay(fast ? 90 : 160);
    }
  }
}

function renderTokensOnly() {
  if (!state) return;
  state.cells.forEach((_, i) => {
    const node = cellNodes[i];
    if (!node) return;
    const tokens = node.querySelector(".cell-tokens");
    if (!tokens) return;
    const here = state.players.filter(
      (pl) => !pl.bankrupt && pl.position === i
    );
    tokens.innerHTML = here.map((pl) => meepleHTML(pl)).join("");
  });
}

async function playTurnRoll() {
  const p = currentPlayer(state);
  const from = p.position;
  const pair = rollDicePair();
  play(selectAudio);
  await animateDice(pair.a, pair.b);
  await animateWalk(p.id, from, pair.sum);
  // 走动已到终点，先复位再交给引擎做正式位移与结算
  p.position = from;
  state = applyDiceMove(state, pair);
  play(clickAudio);
  render();
}

function meepleHTML(pl) {
  return `<span class="meeple" data-id="${pl.id}" style="--piece:${pl.color};--piece-light:${pl.accent || "#fff"}" title="${pl.name}">
    <span class="meeple-head"></span>
    <span class="meeple-body"></span>
    <span class="meeple-base"></span>
  </span>`;
}

/** 地图上盖房：1–3 栋小房子，第 4 级换成酒店；颜色随地主 */
function renderHouses(level, ownerName = "") {
  const n = Math.max(0, Math.min(level || 0, MAX_BUILD_LEVEL));
  if (n <= 0) return "";
  const who = ownerName ? `${ownerName}的` : "";
  if (n >= MAX_BUILD_LEVEL) {
    return `<span class="house hotel" title="${who}酒店"></span>`;
  }
  return Array.from(
    { length: n },
    () => `<span class="house" title="${who}房子"></span>`
  ).join("");
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
        <span class="token-wrap">${meepleHTML(pl)}</span>
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
      const owner = state.players[cell.owner];
      node.style.setProperty("--owner", owner.color);
      node.style.setProperty("--owner-light", owner.accent || "#fff");
    } else {
      node.style.removeProperty("--owner");
      node.style.removeProperty("--owner-light");
    }
    if (cell.type === "property") {
      priceEl.textContent = `$${cell.value}`;
      const ownerName =
        cell.owner != null ? state.players[cell.owner]?.name || "" : "";
      housesEl.innerHTML = renderHouses(cell.level || 0, ownerName);
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
    tokens.innerHTML = here.map((pl) => meepleHTML(pl)).join("");
  });

  if (state.lastDiceA > 0 && state.lastDiceB > 0) {
    paintDie(els.dieA, state.lastDiceA);
    paintDie(els.dieB, state.lastDiceB);
    // 滚动动画进行中保留「滚动中」文案；其余时候始终回显上次点数
    if (!els.diceTray?.classList.contains("is-rolling")) {
      setDiceSumText(
        `${state.lastDiceA} + ${state.lastDiceB} = ${state.lastDiceA + state.lastDiceB}`
      );
    }
  } else if (!els.diceTray?.classList.contains("is-rolling")) {
    setDiceSumText("点击下方掷骰");
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
    if (state.phase === "ready") {
      await delay(speed() * 0.35);
      await playTurnRoll();
    } else {
      await delay(speed());
      state = autoAct(state);
      play(clickAudio);
      render();
    }
    await delay(speed() * 0.45);
  }
  busy = false;
  render();
}

async function onDice() {
  if (!state || busy || state.phase !== "ready") return;
  const p = currentPlayer(state);
  if (!p.isHuman || p.auto) return;
  busy = true;
  render();
  await playTurnRoll();
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
  const humanCount = Math.max(1, Number(els.humanCount.value) || 1);
  const aiCount = Math.max(0, Number(els.aiCount.value) || 0);
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
els.deedClose.addEventListener("click", closeDeed);
els.deedOverlay.addEventListener("click", (ev) => {
  if (ev.target === els.deedOverlay) closeDeed();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") closeDeed();
});
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

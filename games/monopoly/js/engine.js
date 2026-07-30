/**
 * 环线大富翁核心规则（本地人机）
 * 回合节奏参考 HumanSean/javascript-monopoly（ISC）
 */

import {
  BOARD,
  CARDS,
  CELL_COUNT,
  TOKEN_PRESETS,
  rentOf,
  upgradeCost,
  canUpgrade,
  MAX_BUILD_LEVEL,
  buildLevelLabel,
  buildingSellPrice,
  landSellPrice,
  listBankSellActions,
  isDeed,
} from "./data.js";

export function createInitialState(opts) {
  const {
    startMoney = 15000,
    humanCount = 1,
    aiCount = 1,
    speedMs = 700,
  } = opts;

  const total = Math.min(4, Math.max(2, humanCount + aiCount));
  // 允许全人类对局（aiCount=0）；否则尽量尊重人数配置
  const humans = Math.min(Math.max(0, humanCount), total);
  const ais = total - humans;

  const players = [];
  let humanSeq = 0;
  let aiSeq = 0;
  for (let i = 0; i < humans + ais; i++) {
    const token = TOKEN_PRESETS[i];
    const isHuman = i < humans;
    const name = isHuman ? `玩家${++humanSeq}` : `AI${++aiSeq}`;
    players.push({
      id: i,
      name,
      color: token.color,
      accent: token.accent || "#fff",
      tokenId: token.id,
      money: startMoney,
      position: 0,
      stop: 0,
      bankrupt: false,
      isHuman,
      auto: false,
    });
  }

  const cells = BOARD.map((c, index) => ({
    ...c,
    index,
    owner: null,
    level: 0,
  }));

  return {
    players,
    cells,
    turn: 0,
    day: 1,
    phase: "ready", // ready | moving | event | dialog | raise | ended
    speedMs,
    winner: null,
    lastDice: 0,
    lastDiceA: 0,
    lastDiceB: 0,
    message: "点击骰子开始旅行",
    log: [],
    pendingDialog: null,
    /** 欠款待变卖凑钱：{ amount, creditorId, label, sideEffects? } */
    pendingDebt: null,
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function currentPlayer(state) {
  return state.players[state.turn];
}

export function activePlayers(state) {
  return state.players.filter((p) => !p.bankrupt);
}

function pushLog(state, text) {
  state.log.unshift(text);
  if (state.log.length > 40) state.log.length = 40;
}

function rand(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

export function nextAliveTurn(state, from) {
  let i = from;
  for (let n = 0; n < state.players.length; n++) {
    i = (i + 1) % state.players.length;
    if (!state.players[i].bankrupt) return i;
  }
  return from;
}

export function advanceTurn(state, _guard = 0) {
  if (_guard > state.players.length + 2) {
    state.phase = "ready";
    state.message = "等待下一位旅行者";
    return state;
  }
  const next = nextAliveTurn(state, state.turn);
  if (next <= state.turn) state.day += 1;
  state.turn = next;
  state.phase = "ready";
  state.pendingDialog = null;
  state.pendingDebt = null;

  const p = currentPlayer(state);
  if (p.stop > 0) {
    const where =
      state.cells[p.position].type === "jail" ? "暂停中" : "度假中";
    state.message = `${p.name}仍在${where}，剩余 ${p.stop} 天`;
    pushLog(state, state.message);
    p.stop -= 1;
    return advanceTurn(state, _guard + 1);
  }

  state.message = `轮到 ${p.name}`;
  return state;
}

export function passGoBonus(state, player, stepsCrossedGo) {
  if (!stepsCrossedGo) return;
  player.money += 2000;
  pushLog(state, `${player.name} 路过起点，领取 $2000`);
}

export function applyMove(state, steps) {
  const player = currentPlayer(state);
  if (player.bankrupt || state.phase === "ended") return state;

  state.lastDice = steps;
  state.phase = "moving";

  const from = player.position;
  const to = (from + steps) % CELL_COUNT;
  const crossed = from + steps >= CELL_COUNT;
  player.position = to;
  passGoBonus(state, player, crossed);

  const diceText =
    state.lastDiceA > 0 && state.lastDiceB > 0
      ? `${state.lastDiceA}+${state.lastDiceB}=${steps}`
      : String(steps);
  state.message = `${player.name} 掷出 ${diceText}，前往「${state.cells[to].name}」`;
  pushLog(state, state.message);
  return resolveLanding(state);
}

/** 掷两枚骰子 */
export function rollDicePair() {
  const a = rand(1, 6);
  const b = rand(1, 6);
  return { a, b, sum: a + b };
}

export function applyDiceMove(state, pair) {
  state.lastDiceA = pair.a;
  state.lastDiceB = pair.b;
  return applyMove(state, pair.sum);
}

export function rollAndMove(state) {
  return applyDiceMove(state, rollDicePair());
}

function resolveLanding(state) {
  const player = currentPlayer(state);
  const cell = state.cells[player.position];
  state.phase = "event";

  switch (cell.type) {
    case "go": {
      const bonus = 500 * rand(0, 4);
      player.money += bonus;
      state.message = `停在起点，额外获得 $${bonus}`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "property":
    case "station":
    case "utility":
      return resolveProperty(state, cell);
    case "chance":
    case "fate":
      return resolveCard(state);
    case "tax": {
      const pay = cell.value || 1000;
      return requirePayment(state, {
        amount: pay,
        creditorId: null,
        label: `缴纳「${cell.name}」$${pay}`,
      });
    }
    case "jail": {
      state.message = `${player.name} 路过暂停格，继续旅程`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "gotojail": {
      player.position = 10;
      player.stop = rand(1, 3);
      state.message = `${player.name} 强制暂停 ${player.stop} 天`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "park": {
      state.message = `${player.name} 在停车场稍作休息`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "casino": {
      const n = rand(1, 6);
      const win = n * 500;
      player.money += win;
      state.message = `赌场幸运骰 ${n}，赢得 $${win}`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "trip": {
      const days = rand(1, 3);
      const cost = days * 1000;
      return requirePayment(state, {
        amount: cost,
        creditorId: null,
        label: `度假 ${days} 天，花费 $${cost}`,
        sideEffects: { stop: days },
      });
    }
    case "bonus": {
      const gain = 500 * rand(1, 6);
      player.money += gain;
      state.message = `${player.name} 意外收获 $${gain}`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    default:
      return finishEvent(state);
  }
}

function resolveProperty(state, cell) {
  const player = currentPlayer(state);

  if (cell.owner == null) {
    const canBuy = player.money >= cell.value;
    state.pendingDialog = {
      kind: "buy",
      title: "购买地产",
      text: `是否花费 $${cell.value} 购买「${cell.name}」？`,
      canConfirm: canBuy,
      cellIndex: cell.index,
    };
    if (player.isHuman && !player.auto) {
      state.phase = "dialog";
      state.message = state.pendingDialog.text;
      return state;
    }
    // AI / 托管：保留约 2000 才买（须先写入 pendingDialog，否则 confirmDialog 会空操作）
    const buy = canBuy && player.money - cell.value >= 2000;
    return confirmDialog(state, buy);
  }

  if (cell.owner === player.id) {
    if (!canUpgrade(cell, state) || cell.level >= MAX_BUILD_LEVEL) {
      state.message =
        cell.level >= MAX_BUILD_LEVEL
          ? `「${cell.name}」已是酒店，无法再建`
          : `停在自己的「${cell.name}」`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    const cost = upgradeCost(cell);
    const canUp = player.money >= cost;
    state.pendingDialog = {
      kind: "upgrade",
      title: "升级地产",
      text: `是否花费 $${cost} 在「${cell.name}」再建一级？（当前 ${buildLevelLabel(cell.level)}，满级为酒店）`,
      canConfirm: canUp,
      cellIndex: cell.index,
    };
    if (player.isHuman && !player.auto) {
      state.phase = "dialog";
      state.message = state.pendingDialog.text;
      return state;
    }
    const up = canUp && player.money - cost >= 1500;
    return confirmDialog(state, up);
  }

  // 付租
  const owner = state.players[cell.owner];
  if (owner.bankrupt) {
    cell.owner = null;
    cell.level = 0;
    return resolveProperty(state, cell);
  }
  // 房东暂停仍收租（避免故意躲在暂停格逃租、拖长残局）
  const rent = rentOf(cell, state);
  return requirePayment(state, {
    amount: rent,
    creditorId: owner.id,
    label: `支付「${cell.name}」租金 $${rent} 给 ${owner.name}`,
  });
}

function resolveCard(state) {
  const player = currentPlayer(state);
  const card = CARDS[rand(0, CARDS.length - 1)];
  state.message = card.text;
  pushLog(state, `${player.name}：${card.text}`);
  const sideEffects = {};
  if (card.jail > 0) {
    sideEffects.position = 10;
    sideEffects.stop = card.jail;
  }
  if (card.money >= 0) {
    player.money += card.money;
    applySideEffects(player, sideEffects);
    return afterMoneyChange(state);
  }
  return requirePayment(state, {
    amount: -card.money,
    creditorId: null,
    label: card.text,
    sideEffects,
  });
}

function applySideEffects(player, sideEffects) {
  if (!sideEffects) return;
  if (sideEffects.position != null) player.position = sideEffects.position;
  if (sideEffects.stop != null) player.stop = sideEffects.stop;
}

/**
 * 需要支付一笔费用：现金足够则直接付；否则进入变卖凑钱（可自选产业）
 */
function requirePayment(state, debt) {
  const player = currentPlayer(state);
  if (player.money >= debt.amount) {
    return settlePayment(state, debt);
  }
  state.pendingDebt = {
    amount: debt.amount,
    creditorId: debt.creditorId ?? null,
    label: debt.label,
    sideEffects: debt.sideEffects || null,
  };
  state.message = `${player.name} 现金不足，需凑齐 $${debt.amount}（${debt.label}）。可向银行半价变卖房子/地产。`;
  pushLog(state, state.message);

  if (player.isHuman && !player.auto) {
    state.phase = "raise";
    return state;
  }
  return autoRaiseFunds(state);
}

function settlePayment(state, debt) {
  const player = currentPlayer(state);
  const amount = debt.amount;
  if (player.money < amount) return state;
  player.money -= amount;
  if (debt.creditorId != null) {
    const owner = state.players[debt.creditorId];
    if (owner && !owner.bankrupt) owner.money += amount;
  }
  applySideEffects(player, debt.sideEffects);
  state.pendingDebt = null;
  state.message = `${player.name} ${debt.label}`;
  pushLog(state, state.message);
  return afterMoneyChange(state);
}

/** 尝试用当前现金结清欠款 */
export function trySettleDebt(state) {
  const debt = state.pendingDebt;
  if (!debt || state.phase !== "raise") return state;
  const player = currentPlayer(state);
  if (player.money >= debt.amount) {
    return settlePayment(state, debt);
  }
  return state;
}

function canManageAssets(state, playerId) {
  if (!state || state.phase === "ended") return false;
  const p = state.players[playerId];
  if (!p || p.bankrupt) return false;
  if (state.phase === "raise") return state.turn === playerId;
  if (state.phase === "ready") return state.turn === playerId;
  return false;
}

/** 卖掉一级建筑给银行（半价） */
export function sellBuildingToBank(state, cellIndex) {
  const player = currentPlayer(state);
  if (!canManageAssets(state, player.id)) return state;
  const cell = state.cells[cellIndex];
  if (!cell || cell.owner !== player.id || cell.type !== "property") return state;
  if ((cell.level || 0) <= 0) return state;
  const price = buildingSellPrice(cell);
  cell.level -= 1;
  player.money += price;
  const what = cell.level + 1 >= MAX_BUILD_LEVEL ? "酒店" : "1 栋房子";
  state.message = `${player.name} 向银行卖掉「${cell.name}」的${what}，回收 $${price}`;
  pushLog(state, state.message);
  return trySettleDebt(state);
}

/** 卖掉空地/车站/水电给银行（半价；须无建筑） */
export function sellLandToBank(state, cellIndex) {
  const player = currentPlayer(state);
  if (!canManageAssets(state, player.id)) return state;
  const cell = state.cells[cellIndex];
  if (!cell || cell.owner !== player.id || !isDeed(cell)) return state;
  if ((cell.level || 0) > 0) return state;
  const price = landSellPrice(cell);
  cell.owner = null;
  cell.level = 0;
  player.money += price;
  state.message = `${player.name} 向银行卖掉「${cell.name}」，回收 $${price}`;
  pushLog(state, state.message);
  return trySettleDebt(state);
}

export function sellActionToBank(state, action) {
  if (!action) return state;
  if (action.kind === "building") return sellBuildingToBank(state, action.cellIndex);
  if (action.kind === "land") return sellLandToBank(state, action.cellIndex);
  return state;
}

/** 欠款时主动宣告破产 */
export function giveUpAndBankrupt(state) {
  if (state.phase !== "raise" || !state.pendingDebt) return state;
  const player = currentPlayer(state);
  const creditorId = state.pendingDebt.creditorId;
  state.pendingDebt = null;
  declareBankrupt(state, player, creditorId);
  return state.phase === "ended" ? state : finishEvent(state);
}

/** AI/托管：自动半价变卖直到凑齐或破产 */
export function autoRaiseFunds(state) {
  if (!state.pendingDebt) return state;
  state.phase = "raise";
  const player = currentPlayer(state);
  let guard = 0;
  while (
    state.pendingDebt &&
    player.money < state.pendingDebt.amount &&
    guard++ < 40
  ) {
    const actions = listBankSellActions(state, player.id);
    if (!actions.length) break;
    // 优先卖建筑，其次卖最便宜的地（少拆家业）
    const buildings = actions.filter((a) => a.kind === "building");
    const lands = actions.filter((a) => a.kind === "land");
    const pick =
      buildings.sort((a, b) => a.price - b.price)[0] ||
      lands.sort((a, b) => a.price - b.price)[0];
    if (!pick) break;
    state = sellActionToBank(state, pick);
  }
  if (state.phase === "ended") return state;
  if (state.pendingDebt && player.money < state.pendingDebt.amount) {
    return giveUpAndBankrupt(state);
  }
  return trySettleDebt(state);
}

export { listBankSellActions };

export function confirmDialog(state, yes) {
  const dlg = state.pendingDialog;
  state.pendingDialog = null;
  if (!dlg) return finishEvent(state);

  const player = currentPlayer(state);
  const cell = state.cells[dlg.cellIndex];

  if (!yes) {
    state.message = `${player.name} 放弃了操作`;
    pushLog(state, state.message);
    return finishEvent(state);
  }

  if (dlg.kind === "buy") {
    if (player.money < cell.value) {
      state.message = "现金不足，无法购买";
      return finishEvent(state);
    }
    player.money -= cell.value;
    cell.owner = player.id;
    cell.level = 0;
    state.message = `${player.name} 购入「${cell.name}」`;
    pushLog(state, state.message);
    return finishEvent(state);
  }

  if (dlg.kind === "upgrade") {
    const cost = upgradeCost(cell);
    if (
      !canUpgrade(cell, state) ||
      player.money < cost ||
      cell.level >= MAX_BUILD_LEVEL
    ) {
      state.message = "无法升级";
      return finishEvent(state);
    }
    player.money -= cost;
    cell.level += 1;
    state.message = `${player.name} 在「${cell.name}」建了${buildLevelLabel(cell.level)}`;
    pushLog(state, state.message);
    return finishEvent(state);
  }

  return finishEvent(state);
}

function afterMoneyChange(state) {
  checkBankrupt(state);
  if (state.phase === "ended") return state;
  return finishEvent(state);
}

function finishEvent(state) {
  checkBankrupt(state);
  if (state.phase === "ended") return state;
  return advanceTurn(state);
}

/** 现金为负时破产；税费/卡牌等无债权人则地产充公 */
function checkBankrupt(state) {
  const player = currentPlayer(state);
  if (!player || player.bankrupt) return;
  if (player.money >= 0) return;
  declareBankrupt(state, player, null);
}

/**
 * 宣告破产。
 * @param {number|null} creditorId 债权人（付不起租金时地产过户给对方）；null 则充公
 */
function declareBankrupt(state, player, creditorId) {
  if (!player || player.bankrupt) return;
  player.bankrupt = true;
  player.stop = 0;
  player.money = 0;

  const creditor =
    creditorId != null && !state.players[creditorId]?.bankrupt
      ? state.players[creditorId]
      : null;
  let transferred = 0;
  state.cells.forEach((c) => {
    if (c.owner !== player.id) return;
    if (creditor) {
      c.owner = creditor.id;
      transferred += 1;
    } else {
      c.owner = null;
      c.level = 0;
    }
  });

  state.message = creditor
    ? `${player.name} 破产，${transferred} 处地产归 ${creditor.name}`
    : `${player.name} 破产，地产充公`;
  pushLog(state, state.message);

  const alive = activePlayers(state);
  if (alive.length <= 1) {
    state.phase = "ended";
    state.winner = alive[0] || null;
    state.message = state.winner
      ? `${state.winner.name} 成为世界之旅大富翁！`
      : "对局结束";
    pushLog(state, state.message);
  }
}

export function shouldAutoAct(state) {
  const p = currentPlayer(state);
  if (!p || p.bankrupt || state.phase === "ended") return false;
  if (state.phase === "dialog") return !p.isHuman || p.auto;
  if (state.phase === "raise") return !p.isHuman || p.auto;
  if (state.phase === "ready") return !p.isHuman || p.auto;
  return false;
}

export function autoAct(state) {
  if (state.phase === "raise") {
    return autoRaiseFunds(state);
  }
  if (state.phase === "dialog") {
    const dlg = state.pendingDialog;
    if (!dlg) return finishEvent(state);
    const p = currentPlayer(state);
    const cell = state.cells[dlg.cellIndex];
    if (dlg.kind === "buy") {
      return confirmDialog(
        state,
        dlg.canConfirm && p.money - cell.value >= 2000
      );
    }
    if (dlg.kind === "upgrade") {
      const cost = upgradeCost(cell);
      return confirmDialog(
        state,
        dlg.canConfirm && p.money - cost >= 1500
      );
    }
    return confirmDialog(state, false);
  }
  if (state.phase === "ready") {
    // 由界面侧播放双骰动画后再走子
    return state;
  }
  return state;
}

export function setAllHumanAuto(state, on) {
  state.players.forEach((p) => {
    if (p.isHuman) p.auto = on;
  });
  return state;
}

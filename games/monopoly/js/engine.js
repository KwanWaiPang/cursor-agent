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
} from "./data.js";

export function createInitialState(opts) {
  const {
    startMoney = 15000,
    humanCount = 1,
    aiCount = 1,
    speedMs = 700,
  } = opts;

  const total = Math.min(4, Math.max(2, humanCount + aiCount));
  const humans = Math.min(humanCount, total - 1) || 1;
  const ais = total - humans;

  const players = [];
  for (let i = 0; i < humans + ais; i++) {
    const token = TOKEN_PRESETS[i];
    players.push({
      id: i,
      name: token.name,
      color: token.color,
      tokenId: token.id,
      money: startMoney,
      position: 0,
      stop: 0,
      bankrupt: false,
      isHuman: i < humans,
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
    phase: "ready", // ready | moving | event | dialog | ended
    speedMs,
    winner: null,
    lastDice: 0,
    message: "点击骰子开始旅行",
    log: [],
    pendingDialog: null,
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

  const p = currentPlayer(state);
  if (p.stop > 0) {
    const where =
      state.cells[p.position].type === "jail" ? "狱中" : "度假中";
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

  state.message = `${player.name} 掷出 ${steps}，前往「${state.cells[to].name}」`;
  pushLog(state, state.message);
  return resolveLanding(state);
}

export function rollAndMove(state) {
  const steps = rand(1, 6);
  return applyMove(state, steps);
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
      return resolveProperty(state, cell);
    case "airport":
      return resolveAirport(state, cell);
    case "chance":
    case "fate":
      return resolveCard(state);
    case "tax": {
      const pay = cell.value || 1000;
      player.money -= pay;
      state.message = `${player.name} 缴纳「${cell.name}」$${pay}`;
      pushLog(state, state.message);
      return afterMoneyChange(state);
    }
    case "jail": {
      state.message = `${player.name} 只是路过监狱探视`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "gotojail": {
      player.position = 10;
      player.stop = rand(1, 3);
      state.message = `${player.name} 被送进监狱，关押 ${player.stop} 天`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    case "park": {
      state.message = `${player.name} 在免费停车区稍作休息`;
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
      player.money -= cost;
      player.stop = days;
      state.message = `${player.name} 赴阿尔卑斯度假 ${days} 天，花费 $${cost}`;
      pushLog(state, state.message);
      return afterMoneyChange(state);
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
    if (player.isHuman && !player.auto) {
      state.phase = "dialog";
      state.pendingDialog = {
        kind: "buy",
        title: "购买地产",
        text: `是否花费 $${cell.value} 购买「${cell.name}」？`,
        canConfirm: canBuy,
        cellIndex: cell.index,
      };
      state.message = state.pendingDialog.text;
      return state;
    }
    // AI / 托管：保留约 3000 才买
    const buy = canBuy && player.money - cell.value >= 3000;
    return confirmDialog(state, buy);
  }

  if (cell.owner === player.id) {
    if (cell.level >= 3) {
      state.message = `「${cell.name}」已是酒店，无需升级`;
      pushLog(state, state.message);
      return finishEvent(state);
    }
    const cost = upgradeCost(cell);
    const canUp = player.money >= cost;
    if (player.isHuman && !player.auto) {
      state.phase = "dialog";
      state.pendingDialog = {
        kind: "upgrade",
        title: "升级地产",
        text: `是否花费 $${cost} 升级「${cell.name}」？`,
        canConfirm: canUp,
        cellIndex: cell.index,
      };
      state.message = state.pendingDialog.text;
      return state;
    }
    const up = canUp && player.money - cost >= 2000;
    return confirmDialog(state, up);
  }

  // 付租
  const owner = state.players[cell.owner];
  if (owner.bankrupt) {
    cell.owner = null;
    cell.level = 0;
    return resolveProperty(state, cell);
  }
  if (owner.stop > 0) {
    state.message = `房东 ${owner.name} 不在家，免费过夜`;
    pushLog(state, state.message);
    return finishEvent(state);
  }
  const rent = rentOf(cell);
  player.money -= rent;
  owner.money += rent;
  state.message = `${player.name} 在「${cell.name}」付给 ${owner.name} 租金 $${rent}`;
  pushLog(state, state.message);
  return afterMoneyChange(state);
}

function resolveAirport(state, cell) {
  const player = currentPlayer(state);
  const fee = 800;
  const dest = cell.twin ?? 0;
  player.money -= fee;
  player.position = dest;
  state.message = `${player.name} 花费 $${fee} 搭乘「${cell.name}」飞往「${state.cells[dest].name}」`;
  pushLog(state, state.message);
  // 落地后再结算目的地（避免无限飞机连环：若目的地是机场则只路过）
  const landed = state.cells[dest];
  if (landed.type === "property") return resolveProperty(state, landed);
  return afterMoneyChange(state);
}

function resolveCard(state) {
  const player = currentPlayer(state);
  const card = CARDS[rand(0, CARDS.length - 1)];
  player.money += card.money;
  state.message = card.text;
  pushLog(state, `${player.name}：${card.text}`);
  if (card.jail > 0) {
    player.position = 10;
    player.stop = card.jail;
  }
  return afterMoneyChange(state);
}

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
    if (player.money < cost || cell.level >= 3) {
      state.message = "无法升级";
      return finishEvent(state);
    }
    player.money -= cost;
    cell.level += 1;
    const names = ["小屋", "别墅", "酒店"];
    state.message = `${player.name} 将「${cell.name}」升级为${names[cell.level - 1]}`;
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

function checkBankrupt(state) {
  const player = currentPlayer(state);
  if (!player || player.bankrupt) return;
  if (player.money >= 0) return;

  player.bankrupt = true;
  player.stop = 0;
  player.money = 0;
  state.cells.forEach((c) => {
    if (c.owner === player.id) {
      c.owner = null;
      c.level = 0;
    }
  });
  state.message = `${player.name} 破产，地产充公`;
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
  if (state.phase === "ready") return !p.isHuman || p.auto;
  return false;
}

export function autoAct(state) {
  if (state.phase === "dialog") {
    const dlg = state.pendingDialog;
    if (!dlg) return finishEvent(state);
    const p = currentPlayer(state);
    const cell = state.cells[dlg.cellIndex];
    if (dlg.kind === "buy") {
      return confirmDialog(
        state,
        dlg.canConfirm && p.money - cell.value >= 3000
      );
    }
    if (dlg.kind === "upgrade") {
      const cost = upgradeCost(cell);
      return confirmDialog(
        state,
        dlg.canConfirm && p.money - cost >= 2000
      );
    }
    return confirmDialog(state, false);
  }
  if (state.phase === "ready") {
    return rollAndMove(state);
  }
  return state;
}

export function setAllHumanAuto(state, on) {
  state.players.forEach((p) => {
    if (p.isHuman) p.auto = on;
  });
  return state;
}

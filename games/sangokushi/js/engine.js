/**
 * 战略回合引擎：涂色扩张、占府、攻城
 */

import { CITIES, cityById } from "../data/cities.js";
import { buildMap } from "../data/mapgen.js";
import { SCENARIO_190 } from "../data/factions.js";
import { officerById, officerPower, describeOfficerTraits } from "../data/officers.js";

let uid = 1;

export function createGame(playerFactionId = "caocao") {
  const scenario = SCENARIO_190;
  const map = buildMap();
  const factions = {};

  for (const [id, def] of Object.entries(scenario.factions)) {
    factions[id] = {
      id,
      name: def.name,
      color: def.color,
      ruler: def.ruler,
      cities: [...def.cities],
      officers: def.officers.map((oid) => makeOfficerState(oid, id)).filter(Boolean),
      gold: 2000 + def.cities.length * 800,
      food: 5000 + def.cities.length * 1500,
      alive: true,
    };
  }

  // 初始涂色：大色块占田（整座都市势力范围）
  for (const f of Object.values(factions)) {
    for (const cid of f.cities) {
      claimCityTerritory(map, cid, f.id);
      const reg = map.regions.filter((r) => r.cityId === cid);
      for (const r of reg) {
        map.cells[r.cell].owner = f.id;
        map.cells[r.cell].hasFort = true;
      }
    }
  }

  const state = {
    scenario,
    map,
    factions,
    playerId: playerFactionId,
    year: scenario.year,
    month: 1,
    turn: 1,
    armies: [],
    selectedCityId: null,
    selectedArmyId: null,
    mode: "select", // select | march | info
    log: [],
    result: null,
  };

  // 玩家初始城
  const pc = factions[playerFactionId]?.cities[0];
  state.selectedCityId = pc || null;

  pushLog(state, `${scenario.name}开始。汝为「${factions[playerFactionId].name}」。`);
  return state;
}

function makeOfficerState(oid, factionId) {
  const tpl = officerById(oid);
  if (!tpl) return null;
  return {
    id: oid,
    factionId,
    loyalty: 90 + Math.floor(Math.random() * 10),
    exp: 0,
    cityId: null,
    status: "idle", // idle | army | assign
  };
}

function claimCityTerritory(map, cityId, factionId) {
  const idx = map.cityCells[cityId];
  if (idx == null) return;
  // 大色块：整座都市势力范围（最近城归属）一次性染色
  for (const c of map.cells) {
    if (!c.land || c.cityId !== cityId) continue;
    c.owner = factionId;
  }
  map.cells[idx].owner = factionId;
  // 再向无主邻格扩散数步，形成三国志14式连片色块（不吞他城城心）
  expandOwnedBlob(map, factionId, 5);
}

/** 从势力已有领地向无主陆地曼扩张（曼哈顿邻接） */
function expandOwnedBlob(map, factionId, steps) {
  const cols = map.cols;
  const rows = map.rows;
  const idxOf = (x, y) => y * cols + x;
  let frontier = [];
  for (const c of map.cells) {
    if (c.land && c.owner === factionId) frontier.push(c);
  }
  for (let s = 0; s < steps; s++) {
    const next = [];
    for (const c of frontier) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = c.x + dx;
        const ny = c.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = map.cells[idxOf(nx, ny)];
        if (!n?.land || n.owner) continue;
        if (n.isCity && n.cityId) continue;
        n.owner = factionId;
        next.push(n);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
}

function paintEmptyAroundCity(map, cityId, factionId, radius) {
  const idx = map.cityCells[cityId];
  if (idx == null) return;
  const c0 = map.cells[idx];
  for (const c of map.cells) {
    if (!c.land || c.owner) continue;
    if (c.isCity && c.cityId !== cityId) continue;
    const d = Math.abs(c.x - c0.x) + Math.abs(c.y - c0.y);
    if (d <= radius) c.owner = factionId;
  }
}

function paintAroundCity(map, cityId, factionId, radius) {
  const idx = map.cityCells[cityId];
  if (idx == null) return;
  const c0 = map.cells[idx];
  for (const c of map.cells) {
    if (!c.land) continue;
    // 不覆盖他城城心
    if (c.isCity && c.cityId !== cityId) continue;
    const d = Math.abs(c.x - c0.x) + Math.abs(c.y - c0.y);
    if (d <= radius) c.owner = factionId;
  }
  c0.owner = factionId;
}

export function pushLog(state, text) {
  state.log.unshift({ turn: state.turn, text });
  if (state.log.length > 80) state.log.length = 80;
}

export function playerFaction(state) {
  return state.factions[state.playerId];
}

export function cityOwner(state, cityId) {
  for (const f of Object.values(state.factions)) {
    if (f.alive && f.cities.includes(cityId)) return f.id;
  }
  return null;
}

export function citiesOf(state, factionId) {
  return state.factions[factionId]?.cities || [];
}

export function landCount(state, factionId) {
  return state.map.cells.filter((c) => c.land && c.owner === factionId).length;
}

export function regionControl(state, cityId, factionId) {
  const regs = state.map.regions.filter((r) => r.cityId === cityId);
  if (!regs.length) return 0;
  let owned = 0;
  for (const r of regs) {
    if (state.map.cells[r.cell].owner === factionId) owned++;
  }
  return owned / regs.length;
}

export function incomeOf(state, factionId) {
  const f = state.factions[factionId];
  if (!f) return { gold: 0, food: 0 };
  let gold = 0;
  let food = 0;
  const lands = landCount(state, factionId);
  gold += Math.floor(lands * 2.2);
  food += Math.floor(lands * 4.5);
  for (const cid of f.cities) {
    const city = cityById(cid);
    if (!city) continue;
    const ctrl = regionControl(state, cid, factionId);
    gold += Math.floor(city.gold * 0.08 * ctrl);
    food += Math.floor(city.food * 0.08 * ctrl);
  }
  return { gold, food };
}

/** 从己方都市出征 */
export function formArmy(state, cityId, officerIds, troops) {
  const f = playerFaction(state);
  if (!f.cities.includes(cityId)) return null;
  const available = officerIds.filter((id) => {
    const o = f.officers.find((x) => x && x.id === id);
    return o && o.status === "idle";
  });
  if (!available.length) return null;
  const maxTroops = Math.min(troops || 3000, 8000, Math.floor(f.food / 2));
  if (maxTroops < 500) return null;

  const leadOff = available
    .map((id) => officerById(id))
    .sort((a, b) => b.lead - a.lead)[0];

  const paintBonus = available.reduce((sum, id) => {
    const t = describeOfficerTraits(officerById(id));
    return sum + t.reduce((s, tr) => s + (tr.effects?.paintBonus || 0), 0);
  }, 0);

  const army = {
    id: uid++,
    factionId: f.id,
    cityId,
    officers: available,
    leaderId: leadOff.id,
    troops: maxTroops,
    morale: 100,
    x: state.map.cells[state.map.cityCells[cityId]].x,
    y: state.map.cells[state.map.cityCells[cityId]].y,
    path: [],
    order: null, // {type:'paint'|'siege', targetCity?, tx, ty}
    paintBonus,
    moveLeft: 0,
  };

  f.food -= Math.floor(maxTroops * 0.5);
  for (const id of available) {
    const o = f.officers.find((x) => x.id === id);
    if (o) o.status = "army";
  }
  state.armies.push(army);
  state.selectedArmyId = army.id;
  pushLog(
    state,
    `${officerById(leadOff.id).name} 率 ${maxTroops} 兵自${cityById(cityId).name}出征。`
  );
  return army;
}

export function setMarchTarget(state, cellX, cellY) {
  const army = state.armies.find((a) => a.id === state.selectedArmyId);
  if (!army || army.factionId !== state.playerId) return false;
  const cell = cellAt(state, cellX, cellY);
  if (!cell?.land) return false;

  // 若点到敌城 → 攻城
  if (cell.isCity) {
    const owner = cityOwner(state, cell.cityId);
    if (owner && owner !== army.factionId) {
      army.order = { type: "siege", targetCity: cell.cityId, tx: cellX, ty: cellY };
      pushLog(state, `目标：攻略${cityById(cell.cityId).name}`);
      return true;
    }
  }

  army.order = { type: "paint", tx: cellX, ty: cellY };
  pushLog(state, `目标：进军涂色（${cellX}, ${cellY}）`);
  return true;
}

function cellAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.map.cols || y >= state.map.rows) return null;
  return state.map.cells[y * state.map.cols + x];
}

export function endTurn(state) {
  // 玩家军队行动
  resolveArmies(state, state.playerId);
  // AI
  for (const f of Object.values(state.factions)) {
    if (!f.alive || f.id === state.playerId) continue;
    aiFaction(state, f.id);
    resolveArmies(state, f.id);
  }
  // 结算收入
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue;
    const inc = incomeOf(state, f.id);
    f.gold += inc.gold;
    f.food += inc.food;
    // 粮耗：每城驻军象征消耗
    f.food -= f.cities.length * 40;
    if (f.food < 0) f.food = 0;
  }

  state.month += 1;
  if (state.month > 12) {
    state.month = 1;
    state.year += 1;
  }
  state.turn += 1;
  checkVictory(state);
  pushLog(state, `—— 第 ${state.turn} 旬 · ${state.year}年${state.month}月 ——`);
}

function resolveArmies(state, factionId) {
  const list = state.armies.filter((a) => a.factionId === factionId);
  for (const army of list) {
    if (!army.order) continue;
    stepArmy(state, army);
  }
}

function stepArmy(state, army) {
  const speed = 3 + (army.paintBonus > 2 ? 1 : 0);
  let steps = speed;
  while (steps-- > 0) {
    const dx = Math.sign(army.order.tx - army.x);
    const dy = Math.sign(army.order.ty - army.y);
    if (dx === 0 && dy === 0) {
      arrive(state, army);
      break;
    }
    // 优先减少较大轴差
    const adx = Math.abs(army.order.tx - army.x);
    const ady = Math.abs(army.order.ty - army.y);
    if (adx >= ady && dx) army.x += dx;
    else if (dy) army.y += dy;
    else army.x += dx;

    paintTrail(state, army);
  }
}

function paintTrail(state, army) {
  const radius = 1 + Math.min(2, Math.floor(army.paintBonus / 3));
  for (let y = army.y - radius; y <= army.y + radius; y++) {
    for (let x = army.x - radius; x <= army.x + radius; x++) {
      const c = cellAt(state, x, y);
      if (!c?.land) continue;
      if (Math.abs(x - army.x) + Math.abs(y - army.y) > radius + 1) continue;
      // 敌城核心格不可直接涂走
      if (c.isCity) {
        const owner = cityOwner(state, c.cityId);
        if (owner && owner !== army.factionId) continue;
      }
      c.owner = army.factionId;
    }
  }
  // 占领府
  for (const r of state.map.regions) {
    if (Math.abs(r.x - army.x) + Math.abs(r.y - army.y) <= 1) {
      const cell = state.map.cells[r.cell];
      const cityOwn = cityOwner(state, r.cityId);
      if (cityOwn && cityOwn !== army.factionId && r.isCapital) continue;
      cell.owner = army.factionId;
      cell.hasFort = true;
    }
  }
}

function arrive(state, army) {
  if (army.order.type === "siege") {
    trySiege(state, army, army.order.targetCity);
  } else {
    paintTrail(state, army);
    if (army.factionId === state.playerId) {
      pushLog(state, `${officerById(army.leaderId).name} 部队完成进军涂色。`);
    }
  }
  army.order = null;
}

function trySiege(state, army, cityId) {
  const defenderId = cityOwner(state, cityId);
  if (!defenderId || defenderId === army.factionId) {
    army.order = null;
    return;
  }
  const ctrl = regionControl(state, cityId, army.factionId);
  const city = cityById(cityId);
  const atk = siegePower(state, army);
  const defBase = 40 + (city?.scale === "巨大" ? 40 : city?.scale === "大" ? 25 : 10);
  const def = defBase * (1.2 - ctrl * 0.5);

  if (ctrl < 0.35) {
    // 先削弱：涂掉外围并小幅伤亡
    army.troops = Math.max(200, army.troops - 200);
    paintAroundCityPartial(state, cityId, army.factionId, 3);
    if (army.factionId === state.playerId) {
      pushLog(
        state,
        `攻打${city.name}：周边控制不足（${Math.floor(ctrl * 100)}%），继续围城涂色。`
      );
    }
    return;
  }

  if (atk > def) {
    captureCity(state, cityId, army.factionId, defenderId);
    army.troops = Math.max(300, Math.floor(army.troops * 0.85));
    if (army.factionId === state.playerId) {
      pushLog(state, `克复${city.name}！`);
    } else {
      pushLog(state, `${state.factions[army.factionId].name} 攻占了${city.name}`);
    }
  } else {
    army.troops = Math.max(0, army.troops - 400);
    if (army.troops < 300) {
      disbandArmy(state, army, true);
      pushLog(state, `${officerById(army.leaderId).name} 攻城失利，部队溃散。`);
    } else if (army.factionId === state.playerId) {
      pushLog(state, `强攻${city.name}未下，兵损四成营。`);
    }
  }
}

function siegePower(state, army) {
  let p = army.troops / 80;
  for (const id of army.officers) {
    const o = officerById(id);
    if (!o) continue;
    p += o.lead * 0.35 + o.force * 0.2;
    for (const t of describeOfficerTraits(o)) {
      if (t.effects?.forceMul) p *= 0.5 + t.effects.forceMul * 0.5;
      if (t.effects?.atkAura) p += t.effects.atkAura * 20;
    }
  }
  return p;
}

function paintAroundCityPartial(state, cityId, factionId, radius) {
  const idx = state.map.cityCells[cityId];
  const c0 = state.map.cells[idx];
  for (const c of state.map.cells) {
    if (!c.land || c.isCity) continue;
    const d = Math.abs(c.x - c0.x) + Math.abs(c.y - c0.y);
    if (d > 0 && d <= radius) c.owner = factionId;
  }
}

function captureCity(state, cityId, winnerId, loserId) {
  const loser = state.factions[loserId];
  const winner = state.factions[winnerId];
  loser.cities = loser.cities.filter((c) => c !== cityId);
  if (!winner.cities.includes(cityId)) winner.cities.push(cityId);
  // 先清掉该城旧归属格，再整块重涂（含连片扩散）
  for (const c of state.map.cells) {
    if (c.land && c.cityId === cityId) c.owner = null;
  }
  claimCityTerritory(state.map, cityId, winnerId);
  for (const r of state.map.regions.filter((r) => r.cityId === cityId)) {
    state.map.cells[r.cell].owner = winnerId;
  }
  if (!loser.cities.length) {
    loser.alive = false;
    pushLog(state, `${loser.name} 灭亡！`);
  }
}

function disbandArmy(state, army, survivorsReturn) {
  const f = state.factions[army.factionId];
  for (const id of army.officers) {
    const o = f.officers.find((x) => x.id === id);
    if (o) o.status = "idle";
  }
  state.armies = state.armies.filter((a) => a.id !== army.id);
  if (state.selectedArmyId === army.id) state.selectedArmyId = null;
}

function aiFaction(state, factionId) {
  const f = state.factions[factionId];
  if (!f.cities.length) return;
  // 已有军队则下令朝最近敌城
  let armies = state.armies.filter((a) => a.factionId === factionId);
  if (armies.length < Math.min(2, f.cities.length) && f.food > 2000) {
    const cityId = f.cities[0];
    const idle = f.officers.filter((o) => o && o.status === "idle").slice(0, 2);
    if (idle.length) {
      const lead = idle.map((o) => officerById(o.id)).sort((a, b) => officerPower(b) - officerPower(a))[0];
      const troops = Math.min(4000, Math.floor(f.food / 3));
      f.food -= Math.floor(troops * 0.5);
      for (const o of idle) o.status = "army";
      const cell = state.map.cells[state.map.cityCells[cityId]];
      const paintBonus = idle.reduce((sum, o) => {
        const t = describeOfficerTraits(officerById(o.id));
        return sum + t.reduce((s, tr) => s + (tr.effects?.paintBonus || 0), 0);
      }, 0);
      state.armies.push({
        id: uid++,
        factionId,
        cityId,
        officers: idle.map((o) => o.id),
        leaderId: lead.id,
        troops,
        morale: 100,
        x: cell.x,
        y: cell.y,
        order: null,
        paintBonus,
      });
    }
  }
  armies = state.armies.filter((a) => a.factionId === factionId);
  for (const army of armies) {
    if (army.order) continue;
    const target = nearestEnemyCity(state, factionId, army.x, army.y);
    if (!target) continue;
    const cell = state.map.cells[state.map.cityCells[target]];
    army.order = { type: "siege", targetCity: target, tx: cell.x, ty: cell.y };
  }
}

function nearestEnemyCity(state, factionId, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const c of CITIES) {
    const owner = cityOwner(state, c.id);
    if (!owner || owner === factionId) continue;
    const cell = state.map.cells[state.map.cityCells[c.id]];
    const d = Math.abs(cell.x - x) + Math.abs(cell.y - y);
    if (d < bestD) {
      bestD = d;
      best = c.id;
    }
  }
  return best;
}

function checkVictory(state) {
  const p = playerFaction(state);
  if (!p.alive || !p.cities.length) {
    state.result = { win: false, text: "君之城池尽失，大业成空……" };
    return;
  }
  const enemies = Object.values(state.factions).filter((f) => f.alive && f.id !== p.id);
  if (!enemies.length) {
    state.result = { win: true, text: "海内归一，君已涂满中华大地！" };
    return;
  }
  // 软性胜利：占领约三成要城
  const need = Math.max(28, Math.ceil(CITIES.length * 0.28));
  if (p.cities.length >= need) {
    state.result = {
      win: true,
      text: `已掌控天下要冲（${p.cities.length}/${CITIES.length}），大势在握！`,
    };
  }
}

export function recallArmy(state, armyId) {
  const army = state.armies.find((a) => a.id === armyId);
  if (!army || army.factionId !== state.playerId) return;
  disbandArmy(state, army, true);
  pushLog(state, "部队归城休整。");
}

export function getOfficerView(oid) {
  const tpl = officerById(oid);
  if (!tpl) return null;
  return {
    ...tpl,
    traitDetails: describeOfficerTraits(tpl),
    power: Math.round(officerPower(tpl)),
  };
}

export { CITIES, cityById };

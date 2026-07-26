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

  // 初始涂色：先各城吃满势力圈，再轮转连片扩散（公平大色块）
  paintOpeningTerritories(map, factions);

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
    paintVersion: 1,
    landByFaction: null,
  };
  recomputeLandCounts(state);
  stationOfficers(state);

  // 玩家初始城
  const pc = factions[playerFactionId]?.cities[0];
  state.selectedCityId = pc || null;

  pushLog(state, `${scenario.name}开始。汝为「${factions[playerFactionId].name}」。`);
  pushLog(state, "提示：可攻占无主城池；点选部队后点击敌城/空城即可进军。");
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

/** 武将分驻各城（君主优先首都） */
function stationOfficers(state) {
  for (const f of Object.values(state.factions)) {
    if (!f.cities.length) continue;
    const capital = f.cities[0];
    let i = 0;
    for (const o of f.officers) {
      if (!o) continue;
      if (o.id === f.ruler) {
        o.cityId = capital;
        continue;
      }
      o.cityId = f.cities[i % f.cities.length];
      i++;
    }
  }
}

function markPaintDirty(state) {
  if (state) state.paintVersion = (state.paintVersion || 0) + 1;
}

function recomputeLandCounts(state) {
  const counts = Object.create(null);
  for (const id of Object.keys(state.factions)) counts[id] = 0;
  for (const c of state.map.cells) {
    if (c.land && c.owner && counts[c.owner] != null) counts[c.owner]++;
  }
  state.landByFaction = counts;
}

function paintOpeningTerritories(map, factions) {
  const jobs = [];
  for (const f of Object.values(factions)) {
    for (const cid of f.cities) {
      // 开局只涂城周势力圈，边陲远端留白供行军涂色（更接近三志14）
      paintCityVoronoi(map, cid, f.id, 12);
      for (const r of map.regions.filter((r) => r.cityId === cid)) {
        map.cells[r.cell].owner = f.id;
        map.cells[r.cell].hasFort = true;
      }
      jobs.push({ cityId: cid, factionId: f.id });
    }
  }
  const byFaction = Object.create(null);
  for (const job of jobs) {
    (byFaction[job.factionId] ||= []).push(job.cityId);
  }
  // 轮转扩散至目标色块；硬顶防止边陲势力淹没整图
  for (let guard = 0; guard < 55; guard++) {
    let grew = false;
    for (const job of jobs) {
      const city = cityById(job.cityId);
      const fids = byFaction[job.factionId];
      // 小势力每城目标略高，开局色块更可读
      const target = (fids.length <= 2 ? 120 : 90) + (city?.regionCount || 2) * 3;
      const hardCap = 145;
      const before = countAttributed(map, job.cityId, job.factionId, fids);
      if (before >= target || before >= hardCap) continue;
      expandFromCity(map, job.cityId, job.factionId, 1, fids);
      if (countAttributed(map, job.cityId, job.factionId, fids) > before) grew = true;
    }
    if (!grew) break;
  }
}

/** 将势力领地按最近己城归属后计数（避免同势力多城共享额度） */
function countAttributed(map, cityId, factionId, factionCityIds) {
  const homes = factionCityIds.map((id) => ({
    id,
    cell: map.cells[map.cityCells[id]],
  }));
  let n = 0;
  for (const c of map.cells) {
    if (!c.land || c.owner !== factionId) continue;
    let best = null;
    let bestD = Infinity;
    for (const h of homes) {
      if (!h.cell) continue;
      const d = Math.abs(h.cell.x - c.x) + Math.abs(h.cell.y - c.y);
      if (d < bestD) {
        bestD = d;
        best = h.id;
      }
    }
    if (best === cityId) n++;
  }
  return n;
}

function paintCityVoronoi(map, cityId, factionId, maxRadius = null) {
  const idx = map.cityCells[cityId];
  if (idx == null) return;
  const c0 = map.cells[idx];
  for (const c of map.cells) {
    if (!c.land || c.cityId !== cityId) continue;
    if (maxRadius != null) {
      const d = Math.abs(c.x - c0.x) + Math.abs(c.y - c0.y);
      if (d > maxRadius) continue;
    }
    c.owner = factionId;
  }
  map.cells[idx].owner = factionId;
}

function claimCityTerritory(map, cityId, factionId, state = null) {
  const idx = map.cityCells[cityId];
  if (idx == null) return;
  // 攻占后吃满整座势力圈
  paintCityVoronoi(map, cityId, factionId, null);
  const city = cityById(cityId);
  const steps =
    city?.scale === "巨大" ? 8 : city?.scale === "大" ? 7 : city?.scale === "中" ? 6 : 5;
  const fids = state?.factions?.[factionId]?.cities || [cityId];
  expandFromCity(map, cityId, factionId, steps, fids);
  ensureMinTerritory(map, cityId, factionId, city?.scale === "巨大" ? 100 : 70, fids);
  markPaintDirty(state);
}

/** 自本城归属色块边缘向无主格扩散（不吞其他城心） */
function expandFromCity(map, cityId, factionId, steps, factionCityIds = null) {
  const idx = map.cityCells[cityId];
  if (idx == null || steps <= 0) return;
  const cols = map.cols;
  const rows = map.rows;
  const idxOf = (x, y) => y * cols + x;
  const homes = (factionCityIds || [cityId]).map((id) => ({
    id,
    cell: map.cells[map.cityCells[id]],
  }));
  const attributed = (c) => {
    let best = cityId;
    let bestD = Infinity;
    for (const h of homes) {
      if (!h.cell) continue;
      const d = Math.abs(h.cell.x - c.x) + Math.abs(h.cell.y - c.y);
      if (d < bestD) {
        bestD = d;
        best = h.id;
      }
    }
    return best === cityId;
  };
  let frontier = [];
  for (const c of map.cells) {
    if (c.land && c.owner === factionId && attributed(c)) frontier.push(c);
  }
  if (!frontier.length) frontier = [map.cells[idx]];
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
        if (n.isCity && n.cityId && n.cityId !== cityId) continue;
        n.owner = factionId;
        next.push(n);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
}

function ensureMinTerritory(map, cityId, factionId, minCells, factionCityIds = null) {
  const idx = map.cityCells[cityId];
  if (idx == null) return;
  const city = cityById(cityId);
  const fids = factionCityIds || [cityId];
  const target = minCells + (city?.regionCount || 2) * 3;
  let owned = countAttributed(map, cityId, factionId, fids);
  let guard = 0;
  while (owned < target && guard++ < 30) {
    const before = owned;
    expandFromCity(map, cityId, factionId, 1, fids);
    owned = countAttributed(map, cityId, factionId, fids);
    if (owned === before) break;
  }
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
  if (state.landByFaction && state.landByFaction[factionId] != null) {
    return state.landByFaction[factionId];
  }
  return state.map.cells.filter((c) => c.land && c.owner === factionId).length;
}

function regionsOfCity(state, cityId) {
  if (!state.regionsByCity) {
    state.regionsByCity = Object.create(null);
    for (const r of state.map.regions) {
      (state.regionsByCity[r.cityId] ||= []).push(r);
    }
  }
  return state.regionsByCity[cityId] || [];
}

export function regionControl(state, cityId, factionId) {
  const regs = regionsOfCity(state, cityId);
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
    if (!o || o.status !== "idle") return false;
    // 未分驻或驻本城才可出征
    return !o.cityId || o.cityId === cityId;
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

  // 敌城或无主城 → 攻城/取城
  if (cell.isCity) {
    const owner = cityOwner(state, cell.cityId);
    if (owner !== army.factionId) {
      army.order = { type: "siege", targetCity: cell.cityId, tx: cellX, ty: cellY };
      const label = owner ? "攻略" : "夺取无主";
      pushLog(state, `目标：${label}${cityById(cell.cityId).name}`);
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
  recomputeLandCounts(state);
  markPaintDirty(state);
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

    paintTrail(state, army, { dirty: false });
  }
  markPaintDirty(state);
}

function paintTrail(state, army, opts = {}) {
  const radius = 1 + Math.min(2, Math.floor(army.paintBonus / 3));
  for (let y = army.y - radius; y <= army.y + radius; y++) {
    for (let x = army.x - radius; x <= army.x + radius; x++) {
      const c = cellAt(state, x, y);
      if (!c?.land) continue;
      if (Math.abs(x - army.x) + Math.abs(y - army.y) > radius + 1) continue;
      // 敌城/无主城核心格不可直接涂走
      if (c.isCity) {
        const owner = cityOwner(state, c.cityId);
        if (owner !== army.factionId) continue;
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
  if (opts.dirty !== false) markPaintDirty(state);
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
  if (defenderId === army.factionId) {
    army.order = null;
    return;
  }
  const ctrl = regionControl(state, cityId, army.factionId);
  const city = cityById(cityId);
  const neutral = !defenderId;
  const atk = siegePower(state, army);
  const defBase =
    (neutral ? 18 : 40) +
    (city?.scale === "巨大" ? 40 : city?.scale === "大" ? 25 : 10);
  const def = defBase * (1.2 - ctrl * 0.5);
  const needCtrl = neutral ? 0.22 : 0.35;

  if (ctrl < needCtrl) {
    army.troops = Math.max(200, army.troops - (neutral ? 80 : 200));
    paintAroundCityPartial(state, cityId, army.factionId, neutral ? 4 : 3);
    if (army.factionId === state.playerId) {
      pushLog(
        state,
        `${neutral ? "夺取" : "攻打"}${city.name}：周边控制不足（${Math.floor(ctrl * 100)}%），继续围城涂色。`
      );
    }
    return;
  }

  if (neutral || atk > def) {
    captureCity(state, cityId, army.factionId, defenderId);
    army.troops = Math.max(300, Math.floor(army.troops * (neutral ? 0.95 : 0.85)));
    if (army.factionId === state.playerId) {
      pushLog(state, `${neutral ? "占据" : "克复"}${city.name}！`);
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
    // 围城时优先涂本城势力圈，加快取空城手感
    if (c.cityId === cityId && d <= radius + 6) c.owner = factionId;
    else if (d > 0 && d <= radius) c.owner = factionId;
  }
  for (const r of regionsOfCity(state, cityId)) {
    if (r.isCapital) continue;
    const cell = state.map.cells[r.cell];
    const d = Math.abs(cell.x - c0.x) + Math.abs(cell.y - c0.y);
    if (d <= radius + 2) {
      cell.owner = factionId;
      cell.hasFort = true;
    }
  }
  markPaintDirty(state);
}

function captureCity(state, cityId, winnerId, loserId) {
  const winner = state.factions[winnerId];
  if (loserId && state.factions[loserId]) {
    const loser = state.factions[loserId];
    loser.cities = loser.cities.filter((c) => c !== cityId);
    if (!loser.cities.length) {
      loser.alive = false;
      pushLog(state, `${loser.name} 灭亡！`);
    }
  }
  if (!winner.cities.includes(cityId)) winner.cities.push(cityId);
  // 先清掉该城旧归属格，再整块重涂（含连片扩散）
  for (const c of state.map.cells) {
    if (c.land && c.cityId === cityId) c.owner = null;
  }
  claimCityTerritory(state.map, cityId, winnerId, state);
  for (const r of regionsOfCity(state, cityId)) {
    state.map.cells[r.cell].owner = winnerId;
  }
  // 新占城分驻几名闲置武将
  const idle = winner.officers.filter((o) => o && o.status === "idle" && o.cityId !== cityId);
  for (const o of idle.slice(0, 2)) o.cityId = cityId;
  recomputeLandCounts(state);
}

function disbandArmy(state, army, survivorsReturn) {
  const f = state.factions[army.factionId];
  for (const id of army.officers) {
    const o = f.officers.find((x) => x.id === id);
    if (o) {
      o.status = "idle";
      if (survivorsReturn !== false) o.cityId = army.cityId || f.cities[0] || o.cityId;
    }
  }
  state.armies = state.armies.filter((a) => a.id !== army.id);
  if (state.selectedArmyId === army.id) state.selectedArmyId = null;
}

function aiFaction(state, factionId) {
  const f = state.factions[factionId];
  if (!f.cities.length) return;
  let armies = state.armies.filter((a) => a.factionId === factionId);
  const armyCap = Math.min(3, Math.max(1, Math.ceil(f.cities.length / 2)));
  if (armies.length < armyCap && f.food > 1800) {
    // 优先从边境城出兵
    const cityId = pickBorderCity(state, factionId) || f.cities[0];
    const idle = f.officers
      .filter((o) => o && o.status === "idle" && (!o.cityId || o.cityId === cityId))
      .slice(0, 2);
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
    const target = pickAiTarget(state, factionId, army.x, army.y);
    if (!target) continue;
    const cell = state.map.cells[state.map.cityCells[target]];
    army.order = { type: "siege", targetCity: target, tx: cell.x, ty: cell.y };
  }
}

function pickBorderCity(state, factionId) {
  let best = null;
  let bestScore = -Infinity;
  for (const cid of state.factions[factionId].cities) {
    const cell = state.map.cells[state.map.cityCells[cid]];
    if (!cell) continue;
    let enemyNear = 0;
    for (const c of CITIES) {
      const owner = cityOwner(state, c.id);
      if (owner === factionId) continue;
      const oc = state.map.cells[state.map.cityCells[c.id]];
      const d = Math.abs(oc.x - cell.x) + Math.abs(oc.y - cell.y);
      if (d < 28) enemyNear += owner ? 1 : 1.4;
    }
    if (enemyNear > bestScore) {
      bestScore = enemyNear;
      best = cid;
    }
  }
  return best;
}

/** 优先近距无主城，其次弱小敌城；过远目标忽略以防雪球乱飞 */
function pickAiTarget(state, factionId, x, y) {
  let best = null;
  let bestScore = Infinity;
  for (const c of CITIES) {
    const owner = cityOwner(state, c.id);
    if (owner === factionId) continue;
    const cell = state.map.cells[state.map.cityCells[c.id]];
    if (!cell) continue;
    const d = Math.abs(cell.x - x) + Math.abs(cell.y - y);
    if (d > 42) continue;
    const neutralBonus = owner ? 0 : -12;
    const scalePenalty =
      c.scale === "巨大" ? 10 : c.scale === "大" ? 5 : c.scale === "中" ? 2 : 0;
    // 略偏向攻击玩家边境，增加压迫感
    const vsPlayer = owner === state.playerId ? -4 : 0;
    const score = d + neutralBonus + scalePenalty + vsPlayer;
    if (score < bestScore) {
      bestScore = score;
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
  // 软性胜利：约四分之一城池（空城可攻占后可达）
  const need = Math.max(24, Math.ceil(CITIES.length * 0.25));
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

/** 供 UI 显示围城进度 */
export function siegeControlOf(state, cityId, factionId) {
  return regionControl(state, cityId, factionId);
}

/** 推荐最近的可攻略目标（无主优先） */
export function suggestTargetCity(state, factionId) {
  const f = state.factions[factionId];
  if (!f?.cities?.length) return null;
  const home = state.map.cells[state.map.cityCells[f.cities[0]]];
  if (!home) return null;
  return pickAiTarget(state, factionId, home.x, home.y);
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

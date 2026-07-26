import { GENERALS, statsAtLevel } from "../data/generals.js";
import { CLASSES } from "../data/classes.js";
import { parseStageMap } from "../data/stages.js";
import {
  computeMoveRange,
  computeAttackTargets,
  calcDamage,
  inRange,
} from "./battle.js";
import { enemyTurn } from "./ai.js";

let uid = 1;

function spawnUnit(def, team) {
  const tpl = GENERALS[def.generalId];
  if (!tpl) throw new Error("unknown general " + def.generalId);
  const level = def.level || 1;
  const st = statsAtLevel(tpl, level);
  return {
    id: uid++,
    generalId: tpl.id,
    name: def.nameOverride || tpl.name,
    classId: tpl.classId,
    team,
    x: def.x,
    y: def.y,
    level,
    hp: st.hpMax,
    hpMax: st.hpMax,
    atk: st.atk,
    def: st.def,
    skl: st.skl,
    spd: st.spd,
    portrait: tpl.portrait,
    lord: !!tpl.lord && team === "player",
    boss: !!def.boss,
    alive: true,
    done: false,
  };
}

export function createBattleState(stage) {
  uid = 1;
  const tiles = parseStageMap(stage);
  const units = [
    ...stage.player.map((u) => spawnUnit(u, "player")),
    ...stage.enemy.map((u) => spawnUnit(u, "enemy")),
  ];
  return {
    stage,
    tiles,
    width: stage.width,
    height: stage.height,
    units,
    turn: 1,
    phase: "player", // player | enemy | talk | result
    selectedId: null,
    mode: "select", // select | move | action | attack
    moveCells: [],
    attackTargets: [],
    origin: null,
    log: [],
    result: null,
  };
}

export function getUnit(state, id) {
  return state.units.find((u) => u.id === id);
}

export function unitAt(state, x, y) {
  return state.units.find((u) => u.alive && u.x === x && u.y === y);
}

export function selectUnit(state, unit) {
  if (state.phase !== "player") return;
  if (!unit || !unit.alive || unit.team !== "player" || unit.done) {
    clearSelection(state);
    return;
  }
  state.selectedId = unit.id;
  state.mode = "move";
  state.origin = { x: unit.x, y: unit.y };
  state.moveCells = computeMoveRange(
    unit,
    state.tiles,
    state.units,
    state.width,
    state.height
  );
  state.attackTargets = [];
}

export function clearSelection(state) {
  state.selectedId = null;
  state.mode = "select";
  state.moveCells = [];
  state.attackTargets = [];
  state.origin = null;
}

export function tryMove(state, x, y) {
  const unit = getUnit(state, state.selectedId);
  if (!unit || state.mode !== "move") return false;
  if (!state.moveCells.some((c) => c.x === x && c.y === y)) return false;
  unit.x = x;
  unit.y = y;
  state.mode = "action";
  state.moveCells = [];
  state.attackTargets = computeAttackTargets(unit, state.units);
  return true;
}

export function cancelMove(state) {
  const unit = getUnit(state, state.selectedId);
  if (!unit || !state.origin) return;
  unit.x = state.origin.x;
  unit.y = state.origin.y;
  selectUnit(state, unit);
}

export function waitUnit(state) {
  const unit = getUnit(state, state.selectedId);
  if (!unit) return;
  unit.done = true;
  clearSelection(state);
  maybeEndPlayerTurn(state);
}

export function beginAttack(state) {
  const unit = getUnit(state, state.selectedId);
  if (!unit) return;
  state.attackTargets = computeAttackTargets(unit, state.units);
  if (!state.attackTargets.length) return;
  state.mode = "attack";
}

export function confirmAttack(state, target) {
  const unit = getUnit(state, state.selectedId);
  if (!unit || state.mode !== "attack") return null;
  if (!target || !target.alive || !inRange(unit, target.x, target.y)) return null;
  const terrain = state.tiles[target.y][target.x];
  const result = calcDamage(unit, target, terrain);
  target.hp = Math.max(0, target.hp - result.damage);
  const evt = {
    type: "attack",
    attacker: unit,
    defender: target,
    damage: result.damage,
    crit: result.crit,
  };
  if (target.hp <= 0) {
    target.alive = false;
    // 经验：简化，击败给经验升级
    gainExp(unit, 40 + target.level * 5);
  } else {
    gainExp(unit, 12 + target.level);
  }
  unit.done = true;
  clearSelection(state);
  checkResult(state);
  if (!state.result) maybeEndPlayerTurn(state);
  return evt;
}

function gainExp(unit, amount) {
  unit.exp = (unit.exp || 0) + amount;
  while (unit.exp >= 100) {
    unit.exp -= 100;
    unit.level += 1;
    const tpl = GENERALS[unit.generalId];
    const st = statsAtLevel(tpl, unit.level);
    const ratio = unit.hp / unit.hpMax;
    unit.hpMax = st.hpMax;
    unit.hp = Math.max(1, Math.round(st.hpMax * ratio));
    unit.atk = st.atk;
    unit.def = st.def;
    unit.skl = st.skl;
    unit.spd = st.spd;
  }
}

export function maybeEndPlayerTurn(state) {
  const pending = state.units.some((u) => u.alive && u.team === "player" && !u.done);
  if (pending) return;
  runEnemyPhase(state);
}

export function endPlayerTurnManual(state) {
  for (const u of state.units) {
    if (u.team === "player") u.done = true;
  }
  clearSelection(state);
  runEnemyPhase(state);
}

function runEnemyPhase(state) {
  state.phase = "enemy";
  state.log.push({ turn: state.turn, text: "敌军行动" });
  const events = [];
  enemyTurn(state, (e) => events.push(e));
  checkResult(state);
  if (!state.result) {
    for (const u of state.units) u.done = false;
    state.turn += 1;
    state.phase = "player";
    state.log.push({ turn: state.turn, text: `第 ${state.turn} 回合` });
  }
  return events;
}

export function checkResult(state) {
  const cao = state.units.find((u) => u.lord);
  if (!cao || !cao.alive) {
    state.result = { win: false, text: "曹操阵亡，大业中断……" };
    state.phase = "result";
    return;
  }
  const enemies = state.units.filter((u) => u.alive && u.team === "enemy");
  const winRule = state.stage.win || { type: "rout" };
  if (winRule.type === "boss" || winRule.type === "rout_or_boss") {
    const boss = state.units.find(
      (u) => u.boss || u.generalId === winRule.bossId
    );
    if (boss && !boss.alive) {
      state.result = { win: true, text: "敌方主将已破，我军大胜！" };
      state.phase = "result";
      return;
    }
  }
  if (winRule.type === "rout" || winRule.type === "rout_or_boss") {
    if (!enemies.length) {
      state.result = { win: true, text: "敌军全灭，胜利！" };
      state.phase = "result";
    }
  }
}

export function classNameOf(unit) {
  return CLASSES[unit.classId]?.name || "";
}

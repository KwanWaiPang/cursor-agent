import { GENERALS, statsAtLevel, isFriendlyTeam } from "../data/generals.js";
import { CLASSES } from "../data/classes.js";
import { parseStageMap } from "../data/stages.js";
import { magicsForUnit } from "../data/magics.js";
import {
  computeMoveRange,
  computeAttackTargets,
  computeMagicTargets,
  calcDamage,
  calcMagicDamage,
  inRange,
  computeExp,
} from "./battle.js";
import { enemyTurn, allyTurn } from "./ai.js";
import {
  buildDefaultScript,
  evalEndCondition,
  tickEvents,
  tickConditions,
  Status,
} from "./script.js";
import { assignLoadout } from "../data/equipment.js";
import { onTurnBegin, onActionDone } from "./effects.js";

let uid = 1;

function applyGear(stats, gearList) {
  if (!gearList?.length) return stats;
  const s = { ...stats };
  for (const g of gearList) {
    if (g.atk) s.atk += g.atk;
    if (g.def) s.def += g.def;
    if (g.skl) s.skl += g.skl;
    if (g.spd) s.spd += g.spd;
    if (g.itl) s.itl += g.itl;
    if (g.hp) {
      s.hp += g.hp;
      s.hpMax += g.hp;
    }
  }
  return s;
}

function spawnUnit(def, team, loadout) {
  const tpl = GENERALS[def.generalId];
  if (!tpl) throw new Error("unknown general " + def.generalId);
  const level = def.level || 1;
  let st = statsAtLevel(tpl, level);
  const gear = loadout || def.loadout || [];
  if (team === "player" && gear.length) {
    st = applyGear(st, gear);
  }
  const moveBonus = gear.filter((g) => g.move).reduce((a, g) => a + g.move, 0);
  const classId = def.classOverride || tpl.classId;
  const cls = CLASSES[classId];
  const mpMax = (cls?.mpBase || 10) + (cls?.mpGrowth || 1) * (level - 1);
  return {
    id: uid++,
    generalId: tpl.id,
    name: def.nameOverride || tpl.name,
    classId,
    team,
    x: def.x,
    y: def.y,
    level,
    hp: st.hpMax,
    hpMax: st.hpMax,
    mp: mpMax,
    mpMax,
    atk: st.atk,
    def: st.def,
    skl: st.skl,
    spd: st.spd,
    itl: st.itl,
    mor: st.mor,
    moveBonus,
    loadout: gear,
    portrait: tpl.portrait,
    lord: !!tpl.lord && team === "player",
    boss: !!def.boss,
    aiMode: def.aiMode || null,
    alive: true,
    done: false,
    exp: 0,
    conditions: [],
  };
}

export function createBattleState(stage, options = {}) {
  uid = 1;
  const tiles = parseStageMap(stage);
  const gear = options.gear || [];
  const playerDefs = options.player || stage.player;
  const withLoadout = assignLoadout(playerDefs, gear);
  const units = [
    ...withLoadout.map((u) => spawnUnit(u, "player", u.loadout)),
    ...(stage.ally || []).map((u) => spawnUnit(u, u.team || "ally", null)),
    ...stage.enemy.map((u) => spawnUnit(u, "enemy", null)),
  ];
  const script = stage.script || buildDefaultScript(stage);
  const runtimeScript = {
    ...script,
    events: (script.events || []).map((e) => ({ ...e, done: false })),
  };
  const state = {
    stage,
    script: runtimeScript,
    tiles,
    width: stage.width,
    height: stage.height,
    units,
    turn: 1,
    phase: "player",
    selectedId: null,
    mode: "select",
    moveCells: [],
    attackTargets: [],
    magicList: [],
    pendingMagic: null,
    origin: null,
    log: [],
    result: null,
    lootGained: [],
    speakQueue: [],
  };
  // 开战回合初效果
  for (const u of state.units) {
    if (u.alive && u.team === "player") {
      onTurnBegin(u, (t) => state.log.push({ turn: 1, text: t }));
    }
  }
  return state;
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
  if (unit.conditions?.some((c) => c.id === "stunned")) {
    unit.done = true;
    state.log.push({ turn: state.turn, text: `${unit.name} 混乱中，无法行动` });
    clearSelection(state);
    maybeEndPlayerTurn(state);
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
  state.magicList = [];
  state.pendingMagic = null;
}

export function clearSelection(state) {
  state.selectedId = null;
  state.mode = "select";
  state.moveCells = [];
  state.attackTargets = [];
  state.magicList = [];
  state.pendingMagic = null;
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
  state.magicList = magicsForUnit(unit).filter((m) => unit.mp >= m.mp);
  runScriptChecks(state);
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
  onActionDone(unit, (t) => state.log.push({ turn: state.turn, text: t }));
  unit.done = true;
  clearSelection(state);
  runScriptChecks(state);
  if (!state.result) maybeEndPlayerTurn(state);
}

export function beginAttack(state) {
  const unit = getUnit(state, state.selectedId);
  if (!unit) return;
  state.attackTargets = computeAttackTargets(unit, state.units);
  if (!state.attackTargets.length) return;
  state.mode = "attack";
  state.pendingMagic = null;
}

export function beginMagicPick(state) {
  const unit = getUnit(state, state.selectedId);
  if (!unit) return;
  state.magicList = magicsForUnit(unit).filter((m) => unit.mp >= m.mp);
  if (!state.magicList.length) return;
  state.mode = "magicPick";
}

export function selectMagic(state, magicId) {
  const unit = getUnit(state, state.selectedId);
  if (!unit || state.mode !== "magicPick") return;
  const magic = state.magicList.find((m) => m.id === magicId);
  if (!magic) return;
  state.pendingMagic = magic;
  state.attackTargets = computeMagicTargets(unit, state.units, magic);
  if (!state.attackTargets.length) {
    state.pendingMagic = null;
    state.mode = "action";
    return;
  }
  state.mode = "magic";
}

export function confirmAttack(state, target) {
  const unit = getUnit(state, state.selectedId);
  if (!unit || state.mode !== "attack") return null;
  if (!target || !target.alive || !inRange(unit, target.x, target.y)) return null;
  if (isFriendlyTeam(target.team)) return null;
  const terrain = state.tiles[target.y][target.x];
  const result = calcDamage(unit, target, terrain);
  const evt = {
    type: "attack",
    attacker: unit,
    defender: target,
    damage: result.damage,
    crit: result.crit,
    dual: result.dual,
    miss: result.miss,
  };
  if (!result.miss) {
    target.hp = Math.max(0, target.hp - result.damage);
    if (target.hp <= 0) {
      target.alive = false;
      gainExp(unit, computeExp(unit, target) * 2);
    } else {
      gainExp(unit, computeExp(unit, target));
    }
  }
  onActionDone(unit, (t) => state.log.push({ turn: state.turn, text: t }));
  unit.done = true;
  clearSelection(state);
  runScriptChecks(state);
  if (!state.result) maybeEndPlayerTurn(state);
  return evt;
}

export function confirmMagic(state, target) {
  const unit = getUnit(state, state.selectedId);
  const magic = state.pendingMagic;
  if (!unit || state.mode !== "magic" || !magic) return null;
  if (!target || !target.alive) return null;
  if (unit.mp < magic.mp) return null;

  unit.mp -= magic.mp;
  const result = calcMagicDamage(unit, target, magic);
  const evt = {
    type: "magic",
    caster: unit,
    target,
    magic,
    damage: result.damage,
    heal: result.heal,
    miss: result.miss,
  };

  if (!result.miss) {
    if (result.heal) {
      target.hp = Math.min(target.hpMax, target.hp + result.heal);
    }
    if (result.damage) {
      target.hp = Math.max(0, target.hp - result.damage);
      if (target.hp <= 0) {
        target.alive = false;
        gainExp(unit, computeExp(unit, target) * 2);
      } else {
        gainExp(unit, Math.max(1, Math.floor(computeExp(unit, target) / 2)));
      }
    }
    for (const ef of magic.effects || []) {
      if (ef.type === "condition") {
        target.conditions = target.conditions || [];
        target.conditions.push({ id: ef.condition, turns: ef.turns || 2 });
      }
    }
  }

  onActionDone(unit, (t) => state.log.push({ turn: state.turn, text: t }));
  unit.done = true;
  clearSelection(state);
  runScriptChecks(state);
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
    unit.itl = st.itl;
    unit.mor = st.mor;
    const cls = CLASSES[unit.classId];
    unit.mpMax = (cls?.mpBase || 10) + (cls?.mpGrowth || 1) * (unit.level - 1);
    unit.mp = Math.min(unit.mpMax, unit.mp + 5);
  }
}

export function maybeEndPlayerTurn(state) {
  const pending = state.units.some(
    (u) => u.alive && u.team === "player" && !u.done
  );
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
  state.phase = "ally";
  if (state.units.some((u) => u.alive && u.team === "ally")) {
    state.log.push({ turn: state.turn, text: "友军行动" });
    allyTurn(state, () => {});
    runScriptChecks(state);
    if (state.result) return;
  }
  state.phase = "enemy";
  state.log.push({ turn: state.turn, text: "敌军行动" });
  enemyTurn(state, () => {});
  runScriptChecks(state);
  if (!state.result) {
    tickConditions(state);
    for (const u of state.units) u.done = false;
    state.turn += 1;
    for (const u of state.units) {
      if (!u.alive) continue;
      if (u.classId === "strategist") {
        u.mp = Math.min(u.mpMax, u.mp + 2);
      }
      if (u.team === "player") {
        onTurnBegin(u, (t) => state.log.push({ turn: state.turn, text: t }));
      }
    }
    state.phase = "player";
    state.log.push({ turn: state.turn, text: `第 ${state.turn} 回合` });
    runScriptChecks(state);
  }
}

function grantLoot(state) {
  if (state.lootGained?.length) return;
  const loot = state.stage.loot || [];
  state.lootGained = [...loot];
  if (loot.length && state.result) {
    const names = loot.map((l) => l.name).join("、");
    state.result.text += ` 获得：${names}`;
  }
}

function applyScriptStatus(state, status) {
  if (status === Status.victory) {
    state.result = { win: true, text: "敌军败退，我军大胜！" };
    state.phase = "result";
    grantLoot(state);
  } else if (status === Status.defeat) {
    state.result = { win: false, text: "曹操阵亡或全军覆没……" };
    state.phase = "result";
  }
}

export function runScriptChecks(state) {
  tickEvents(state, state.script, (speaker, text) => {
    state.speakQueue.push({ speaker, text });
  });
  const status = evalEndCondition(state, state.script);
  applyScriptStatus(state, status);
}

/** 兼容旧调用 */
export function checkResult(state) {
  runScriptChecks(state);
}

export function classNameOf(unit) {
  return CLASSES[unit.classId]?.name || "";
}

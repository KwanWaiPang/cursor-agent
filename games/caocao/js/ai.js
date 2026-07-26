/**
 * 敌军/友军 AI（模式参考 mengde：unit_in_range_random / hold_position / random）
 * onStep 可为 async；会 await 其返回的 Promise。
 */
import {
  computeMoveRange,
  computeAttackTargets,
  calcDamage,
  inRange,
} from "./battle.js";
import { isHostile, isFriendlyTeam } from "../data/generals.js";

export const AIMode = {
  random: "random",
  unit_in_range_random: "unit_in_range_random",
  hold_position: "hold_position",
  do_nothing: "do_nothing",
};

export async function enemyTurn(state, onStep) {
  await actFaction(state, "enemy", onStep);
}

export async function allyTurn(state, onStep) {
  await actFaction(state, "ally", onStep);
}

async function actFaction(state, team, onStep) {
  const actors = state.units.filter((u) => u.alive && u.team === team);
  for (const unit of actors) {
    if (!unit.alive) continue;
    if (unit.conditions?.some((c) => c.id === "stunned")) {
      unit.done = true;
      continue;
    }
    const mode = unit.aiMode || defaultMode(unit);
    if (mode === AIMode.do_nothing) {
      unit.done = true;
      continue;
    }
    await playUnit(state, unit, mode, onStep);
    unit.done = true;
  }
}

function defaultMode(unit) {
  if (unit.boss) return AIMode.hold_position;
  if (unit.team === "ally") return AIMode.unit_in_range_random;
  return AIMode.random;
}

async function playUnit(state, unit, mode, onStep) {
  const foes = state.units.filter((u) => u.alive && isHostile(unit, u));
  if (!foes.length) return;

  let targets = computeAttackTargets(unit, state.units);
  if (targets.length) {
    await pickAndAttack(state, unit, targets, onStep);
    return;
  }

  if (mode === AIMode.hold_position) {
    const threat = foes.some(
      (f) => Math.abs(f.x - unit.x) + Math.abs(f.y - unit.y) <= 3
    );
    if (!threat) return;
  }

  const moves = computeMoveRange(
    unit,
    state.tiles,
    state.units,
    state.width,
    state.height
  );

  if (mode === AIMode.unit_in_range_random) {
    const attackMoves = [];
    for (const m of moves) {
      const ox = unit.x;
      const oy = unit.y;
      unit.x = m.x;
      unit.y = m.y;
      const atk = computeAttackTargets(unit, state.units);
      unit.x = ox;
      unit.y = oy;
      if (atk.length) attackMoves.push({ m, atk });
    }
    if (attackMoves.length) {
      const pick = attackMoves[Math.floor(Math.random() * attackMoves.length)];
      await applyMove(unit, pick.m.x, pick.m.y, onStep);
      await pickAndAttack(state, unit, pick.atk, onStep);
      return;
    }
    const best = bestApproach(unit, moves, foes, 0.55);
    if (best) await applyMove(unit, best.x, best.y, onStep);
    return;
  }

  let best = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const ox = unit.x;
    const oy = unit.y;
    unit.x = m.x;
    unit.y = m.y;
    const atkHere = computeAttackTargets(unit, state.units);
    let score = 0;
    if (atkHere.length) {
      atkHere.sort((a, b) => a.hp - b.hp);
      const t = atkHere[0];
      const pred = calcDamage(unit, t, state.tiles[t.y][t.x]);
      score = 1000 + (pred.miss ? 0 : pred.damage * 10) - t.hp;
    } else {
      let minD = Infinity;
      for (const f of foes) {
        const d = Math.abs(f.x - m.x) + Math.abs(f.y - m.y);
        if (d < minD) minD = d;
      }
      score = 100 - minD;
    }
    if (unit.boss) score -= 8;
    if (isFriendlyTeam(unit.team)) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = { x: m.x, y: m.y };
    }
    unit.x = ox;
    unit.y = oy;
  }
  if (best) await applyMove(unit, best.x, best.y, onStep);
  targets = computeAttackTargets(unit, state.units);
  if (targets.length) await pickAndAttack(state, unit, targets, onStep);
}

async function applyMove(unit, x, y, onStep) {
  if (unit.x === x && unit.y === y) return;
  const from = { x: unit.x, y: unit.y };
  const to = { x, y };
  unit.x = x;
  unit.y = y;
  await onStep?.({ type: "move", unit, from, to });
}

function bestApproach(unit, moves, foes, aggression) {
  const maxStep = Math.max(1, Math.floor(moves.length * aggression));
  let best = null;
  let bestD = Infinity;
  const limited = moves.slice(0, Math.min(moves.length, maxStep + 8));
  for (const m of limited) {
    let minD = Infinity;
    for (const f of foes) {
      const d = Math.abs(f.x - m.x) + Math.abs(f.y - m.y);
      if (d < minD) minD = d;
    }
    if (minD < bestD) {
      bestD = minD;
      best = m;
    }
  }
  return best;
}

async function pickAndAttack(state, unit, targets, onStep) {
  targets.sort((a, b) => a.hp - b.hp);
  await resolveAttack(state, unit, targets[0], onStep);
}

async function resolveAttack(state, attacker, defender, onStep) {
  if (!inRange(attacker, defender.x, defender.y)) return;
  if (attacker.conditions?.some((c) => c.id === "stunned")) return;
  const terrain = state.tiles[defender.y][defender.x];
  const result = calcDamage(attacker, defender, terrain);
  if (!result.miss) {
    defender.hp = Math.max(0, defender.hp - result.damage);
  }
  if (defender.hp <= 0) defender.alive = false;
  await onStep?.({
    type: "attack",
    attacker,
    defender,
    damage: result.damage,
    crit: result.crit,
    dual: result.dual,
    miss: result.miss,
  });
}

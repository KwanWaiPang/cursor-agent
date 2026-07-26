/**
 * 敌军/友军 AI（模式参考 mengde：unit_in_range_random / hold_position / random）
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

export function enemyTurn(state, onStep) {
  actFaction(state, "enemy", onStep);
}

export function allyTurn(state, onStep) {
  actFaction(state, "ally", onStep);
}

function actFaction(state, team, onStep) {
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
    playUnit(state, unit, mode, onStep);
    unit.done = true;
  }
}

function defaultMode(unit) {
  if (unit.boss) return AIMode.hold_position;
  if (unit.team === "ally") return AIMode.unit_in_range_random;
  return AIMode.random;
}

function playUnit(state, unit, mode, onStep) {
  const foes = state.units.filter((u) => u.alive && isHostile(unit, u));
  if (!foes.length) return;

  // 已在射程内：直接攻击
  let targets = computeAttackTargets(unit, state.units);
  if (targets.length) {
    pickAndAttack(state, unit, targets, onStep);
    return;
  }

  if (mode === AIMode.hold_position) {
    // 仅当敌军进入威胁圈（曼哈顿距离 <= move+1）才出击，否则原地
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
    // 只走到能攻击的格子；若不能则小幅挪动或待命
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
      unit.x = pick.m.x;
      unit.y = pick.m.y;
      onStep?.({ type: "move", unit });
      pickAndAttack(state, unit, pick.atk, onStep);
      return;
    }
    // 不能打到：向最近敌人靠近一小步（不超过一半移动）
    const best = bestApproach(unit, moves, foes, 0.55);
    if (best) {
      unit.x = best.x;
      unit.y = best.y;
      onStep?.({ type: "move", unit });
    }
    return;
  }

  // random / 被激怒的 hold_position：完整寻敌
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
  if (best) {
    unit.x = best.x;
    unit.y = best.y;
    onStep?.({ type: "move", unit });
  }
  targets = computeAttackTargets(unit, state.units);
  if (targets.length) pickAndAttack(state, unit, targets, onStep);
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

function pickAndAttack(state, unit, targets, onStep) {
  targets.sort((a, b) => a.hp - b.hp);
  resolveAttack(state, unit, targets[0], onStep);
}

function resolveAttack(state, attacker, defender, onStep) {
  if (!inRange(attacker, defender.x, defender.y)) return;
  if (attacker.conditions?.some((c) => c.id === "stunned")) return;
  const terrain = state.tiles[defender.y][defender.x];
  const result = calcDamage(attacker, defender, terrain);
  if (!result.miss) {
    defender.hp = Math.max(0, defender.hp - result.damage);
  }
  onStep?.({
    type: "attack",
    attacker,
    defender,
    damage: result.damage,
    crit: result.crit,
    miss: result.miss,
  });
  if (defender.hp <= 0) {
    defender.alive = false;
    onStep?.({ type: "defeat", unit: defender });
  }
}

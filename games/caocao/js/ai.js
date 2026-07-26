import {
  computeMoveRange,
  computeAttackTargets,
  calcDamage,
  inRange,
} from "./battle.js";
import { isFriendlyTeam, isHostile } from "../data/generals.js";

/** 敌军 AI：靠近最近敌对单位并攻击 */
export function enemyTurn(state, onStep) {
  actFaction(state, "enemy", onStep);
}

/** 友军 AI：自动协助我军 */
export function allyTurn(state, onStep) {
  actFaction(state, "ally", onStep);
}

function actFaction(state, team, onStep) {
  const actors = state.units.filter((u) => u.alive && u.team === team);
  for (const unit of actors) {
    if (!unit.alive) continue;
    const foes = state.units.filter((u) => u.alive && isHostile(unit, u));
    if (!foes.length) break;

    let targets = computeAttackTargets(unit, state.units);
    if (targets.length) {
      targets.sort((a, b) => a.hp - b.hp);
      resolveAttack(state, unit, targets[0], onStep);
      unit.done = true;
      continue;
    }

    const moves = computeMoveRange(
      unit,
      state.tiles,
      state.units,
      state.width,
      state.height
    );
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
        const pred = calcDamage(unit, t, state.tiles[unit.y][unit.x]);
        score = 1000 + pred.damage * 10 - t.hp;
      } else {
        let minD = Infinity;
        for (const f of foes) {
          const d = Math.abs(f.x - m.x) + Math.abs(f.y - m.y);
          if (d < minD) minD = d;
        }
        score = 100 - minD;
      }
      if (unit.boss) score -= 5;
      // 友军略保守，优先靠近血少敌军
      if (isFriendlyTeam(unit.team)) score += 2;
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
    if (targets.length) {
      targets.sort((a, b) => a.hp - b.hp);
      resolveAttack(state, unit, targets[0], onStep);
    }
    unit.done = true;
  }
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

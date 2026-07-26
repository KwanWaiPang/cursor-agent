/**
 * 战斗公式（移植自 wateret/mengde MIT 引擎 formulae.cc，致敬曹操传）
 * damage = max(1, (atk - def) / 3 + level + 25) * force/100
 */

export function applyRatio(value, ratio = 100) {
  return Math.floor((value * ratio) / 100);
}

function damageBase(atk, def, atkLv, force = 100) {
  let damage = Math.floor((atk - def) / 3) + atkLv + 25;
  damage = applyRatio(damage, force);
  return Math.max(1, damage);
}

function doubleCriticalBase(atk, def) {
  if (atk >= def * 3) return 100;
  if (atk >= def * 2) return Math.floor(((atk - def * 2) * 80) / def) + 20;
  if (atk >= def) return Math.floor(((atk - def) * 18) / def) + 2;
  return 1;
}

function accuracyBase(atk, def, cap = 100) {
  let val = 0;
  if (atk >= def / 3) {
    val = Math.min(100, Math.floor(((atk - def) * 10) / Math.max(1, def)) + 90);
  } else if (atk >= def / 2) {
    const tdef = Math.max(1, Math.floor(def / 2));
    val = Math.floor(((atk - tdef) * 30) / tdef) + 60;
  } else {
    const tdef = Math.max(1, Math.floor(def / 3));
    val = Math.floor((Math.max(atk - tdef, 0) * 30) / tdef) + 30;
  }
  return applyRatio(val, cap);
}

/** 地形对攻防的百分比效果（mengde terrain_effect，默认 100） */
export function applyTerrainEffect(value, effectPct = 100) {
  return applyRatio(value, effectPct);
}

export function computeBasicAttackDamage(attacker, defender, atkEff, defEff, force = 100) {
  return damageBase(atkEff, defEff, attacker.level, force);
}

export function computeMagicDamage(attacker, defender, force = 100) {
  const atk = attacker.itl ?? attacker.skl;
  const def = defender.itl ?? defender.skl;
  return damageBase(atk, def, attacker.level, force);
}

export function computeBasicAttackAccuracy(attacker, defender, cap = 100) {
  return accuracyBase(attacker.skl, defender.skl, cap);
}

export function computeMagicAccuracy(attacker, defender, cap = 100) {
  const a = (attacker.itl ?? attacker.skl) + (attacker.mor ?? attacker.spd);
  const d = (defender.itl ?? defender.skl) + (defender.mor ?? defender.spd);
  return accuracyBase(a, d, cap);
}

export function computeDoubleChance(attacker, defender) {
  return doubleCriticalBase(attacker.skl, defender.skl);
}

export function computeCriticalChance(attacker, defender) {
  return doubleCriticalBase(attacker.mor ?? attacker.spd, defender.mor ?? defender.spd);
}

/** mengde exp：等级差决定经验 */
export function computeExp(doer, doee) {
  const levelDiff = doee.level - doer.level;
  if (levelDiff < 0) return Math.max(1, 16 + levelDiff);
  return Math.min(200, 16 + 4 * levelDiff);
}

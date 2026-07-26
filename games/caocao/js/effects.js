/**
 * 装备事件特效（参考 mengde Equipment OnCmd / General events）
 */

function effectsOf(unit) {
  return (unit.loadout || []).flatMap((g) => g.effects || []);
}

export function onTurnBegin(unit, log) {
  for (const ef of effectsOf(unit)) {
    if (ef.event !== "turn_begin") continue;
    if (ef.effect === "restore_hp") {
      const amt = Math.max(1, Math.floor((unit.hpMax * (ef.multiplier || 10)) / 100));
      const before = unit.hp;
      unit.hp = Math.min(unit.hpMax, unit.hp + amt);
      if (unit.hp > before) log?.(`${unit.name} 装备生效，回复 HP ${unit.hp - before}`);
    }
    if (ef.effect === "restore_mp") {
      const amt = ef.addend || 3;
      const before = unit.mp;
      unit.mp = Math.min(unit.mpMax, unit.mp + amt);
      if (unit.mp > before) log?.(`${unit.name} 装备生效，回复 MP ${unit.mp - before}`);
    }
  }
}

export function onActionDone(unit, log) {
  for (const ef of effectsOf(unit)) {
    if (ef.event !== "action_done") continue;
    if (ef.effect === "restore_hp") {
      const amt = Math.max(1, Math.floor((unit.hpMax * (ef.multiplier || 5)) / 100));
      const before = unit.hp;
      unit.hp = Math.min(unit.hpMax, unit.hp + amt);
      if (unit.hp > before) log?.(`${unit.name} 行动后回复 ${unit.hp - before}`);
    }
  }
}

/** 修改普通攻击结算 */
export function modifyAttackRoll(attacker, roll) {
  const out = { ...roll };
  for (const ef of effectsOf(attacker)) {
    if (ef.event !== "on_normal_attack") continue;
    if (ef.effect === "enhance_basic_attack" && !out.miss) {
      out.damage = Math.floor((out.damage * (100 + (ef.multiplier || 0))) / 100);
    }
    if (ef.effect === "critical_boost") {
      out._critBonus = (out._critBonus || 0) + (ef.addend || 0);
    }
    if (ef.effect === "double_boost") {
      out._dualBonus = (out._dualBonus || 0) + (ef.addend || 0);
    }
  }
  return out;
}

export function attackBonusChances(attacker) {
  let crit = 0;
  let dual = 0;
  for (const ef of effectsOf(attacker)) {
    if (ef.event !== "on_normal_attack") continue;
    if (ef.effect === "critical_boost") crit += ef.addend || 0;
    if (ef.effect === "double_boost") dual += ef.addend || 0;
  }
  return { crit, dual };
}

export function modifyIncomingDamage(defender, damage) {
  let d = damage;
  for (const ef of effectsOf(defender)) {
    if (ef.event !== "on_attacked") continue;
    if (ef.effect === "reduce_damage") {
      d = Math.floor((d * (100 - (ef.multiplier || 0))) / 100);
    }
  }
  return Math.max(0, d);
}

export function modifyMagicDamage(caster, damage) {
  let d = damage;
  for (const ef of effectsOf(caster)) {
    if (ef.event !== "on_magic") continue;
    if (ef.effect === "enhance_magic") {
      d = Math.floor((d * (100 + (ef.multiplier || 0))) / 100);
    }
  }
  return d;
}

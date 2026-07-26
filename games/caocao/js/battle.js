import {
  CLASSES,
  TERRAIN,
  classAdvantage,
  terrainMoveCost,
  terrainEffectPct,
  attackOffsets,
  magicOffsets,
} from "../data/classes.js";
import { isHostile, isFriendlyTeam } from "../data/generals.js";
import {
  computeBasicAttackDamage,
  computeMagicDamage,
  computeBasicAttackAccuracy,
  computeMagicAccuracy,
  computeDoubleChance,
  computeCriticalChance,
  applyTerrainEffect,
  computeExp,
} from "../data/formulae.js";

export { computeExp };

export function calcDamage(attacker, defender, terrainId) {
  const atkPct = terrainEffectPct(terrainId, attacker.classId);
  // 防御侧用地形；防方用其所站地形在调用处传入
  const atkEff = applyTerrainEffect(attacker.atk, atkPct);
  const defPct = terrainEffectPct(
    // defender terrain passed as terrainId (defender's tile)
    terrainId,
    defender.classId
  );
  // 攻方地形加成用攻击者所在格更合理；此处简化：攻防都用目标格防效 + 攻方平地
  const defEff = applyTerrainEffect(defender.def, defPct);
  const force = Math.round(100 * classAdvantage(attacker.classId, defender.classId));
  let damage = computeBasicAttackDamage(attacker, defender, atkEff, defEff, force);

  const hitChance = computeBasicAttackAccuracy(attacker, defender);
  const hit = Math.random() * 100 < hitChance;
  if (!hit) {
    return { damage: 0, miss: true, crit: false, dual: false, adv: force / 100, exp: 0 };
  }

  const critChance = computeCriticalChance(attacker, defender);
  const dualChance = computeDoubleChance(attacker, defender);
  const crit = Math.random() * 100 < critChance;
  const dual = Math.random() * 100 < dualChance;
  if (crit) damage = Math.floor(damage * 1.5);
  if (dual) damage *= 2;

  return {
    damage,
    miss: false,
    crit,
    dual,
    adv: force / 100,
    exp: computeExp(attacker, defender),
  };
}

export function calcMagicDamage(attacker, defender, magic) {
  const power = magic.effects?.find((e) => e.type === "hp")?.power ?? -50;
  const force = Math.abs(power);
  const hitChance = computeMagicAccuracy(attacker, defender);
  const hit = Math.random() * 100 < hitChance;
  if (!hit) return { damage: 0, heal: 0, miss: true };

  if (power >= 0) {
    const heal = computeMagicDamage(attacker, defender, power);
    return { damage: 0, heal, miss: false };
  }
  const damage = computeMagicDamage(attacker, defender, force);
  return { damage, heal: 0, miss: false };
}

export function inRange(attacker, tx, ty) {
  const ox = attacker.x;
  const oy = attacker.y;
  return attackOffsets(attacker.classId).some(([dx, dy]) => ox + dx === tx && oy + dy === ty);
}

export function inMagicRange(caster, tx, ty, rangeKey) {
  return magicOffsets(rangeKey).some(
    ([dx, dy]) => caster.x + dx === tx && caster.y + dy === ty
  );
}

/** BFS 可移动格（mengde 式按兵种地形消耗） */
export function computeMoveRange(unit, tiles, units, width, height) {
  if (unit.conditions?.some((c) => c.id === "rooted" || c.id === "stunned")) {
    return [{ x: unit.x, y: unit.y }];
  }
  const cls = CLASSES[unit.classId];
  const maxMove = cls.move + (unit.moveBonus || 0);
  const occupied = new Set(
    units.filter((u) => u.alive && u.id !== unit.id).map((u) => `${u.x},${u.y}`)
  );
  const best = new Map();
  const q = [{ x: unit.x, y: unit.y, left: maxMove }];
  best.set(`${unit.x},${unit.y}`, maxMove);

  while (q.length) {
    const cur = q.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const tid = tiles[ny][nx];
      const t = TERRAIN[tid];
      if (!t || t.block) continue;
      const cost = terrainMoveCost(tid, unit.classId);
      if (cost >= 9) continue;
      const key = `${nx},${ny}`;
      const occ = occupied.has(key);
      const left = cur.left - cost;
      if (left < 0) continue;
      if (occ) {
        const blocker = units.find((u) => u.alive && u.x === nx && u.y === ny);
        if (!blocker || isHostile(unit, blocker)) continue;
      }
      const prev = best.get(key);
      if (prev !== undefined && prev >= left) continue;
      best.set(key, left);
      q.push({ x: nx, y: ny, left });
    }
  }

  const cells = [];
  for (const key of best.keys()) {
    const [x, y] = key.split(",").map(Number);
    const occEnemy = units.some(
      (u) => u.alive && isHostile(unit, u) && u.x === x && u.y === y
    );
    const occFriendOther = units.some(
      (u) =>
        u.alive &&
        u.id !== unit.id &&
        !isHostile(unit, u) &&
        u.x === x &&
        u.y === y
    );
    if (occEnemy || occFriendOther) continue;
    cells.push({ x, y });
  }
  return cells;
}

export function computeAttackTargets(unit, units) {
  return units.filter((u) => u.alive && isHostile(unit, u) && inRange(unit, u.x, u.y));
}

export function computeMagicTargets(unit, units, magic) {
  const wantEnemy = magic.target === "enemy";
  return units.filter((u) => {
    if (!u.alive) return false;
    if (wantEnemy) {
      if (!isHostile(unit, u)) return false;
    } else if (!isFriendlyTeam(u.team)) {
      return false;
    }
    return inMagicRange(unit, u.x, u.y, magic.range);
  });
}

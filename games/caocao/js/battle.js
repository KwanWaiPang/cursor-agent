import { CLASSES, TERRAIN, classAdvantage } from "../data/classes.js";
import { isHostile } from "../data/generals.js";

export function calcDamage(attacker, defender, terrainId) {
  const terrain = TERRAIN[terrainId] || TERRAIN.plain;
  const adv = classAdvantage(attacker.classId, defender.classId);
  const defEff = defender.def * (1 + (terrain.defBonus || 0));
  const raw = (attacker.atk - defEff) / 2 + attacker.level + 18;
  const dmg = Math.floor(Math.max(1, raw) * adv);
  const crit = Math.random() < Math.min(0.25, (attacker.skl - defender.spd) * 0.01 + 0.05);
  return {
    damage: crit ? Math.floor(dmg * 1.4) : dmg,
    crit,
    adv,
  };
}

export function inRange(attacker, tx, ty) {
  const cls = CLASSES[attacker.classId];
  const [minR, maxR] = cls.range;
  const dist = Math.abs(attacker.x - tx) + Math.abs(attacker.y - ty);
  return dist >= minR && dist <= maxR;
}

/** BFS 可移动格 */
export function computeMoveRange(unit, tiles, units, width, height) {
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
      const t = TERRAIN[tiles[ny][nx]];
      if (!t || t.block) continue;
      // 敌方占据不可穿越，友方可穿越但不可停留在终点检查时处理
      const key = `${nx},${ny}`;
      const occ = occupied.has(key);
      const cost = t.moveCost;
      // 骑兵走树林/山地更贵
      let c = cost;
      if (unit.classId === "cavalry" && (tiles[ny][nx] === "forest" || tiles[ny][nx] === "hill")) {
        c += 1;
      }
      const left = cur.left - c;
      if (left < 0) continue;
      if (occ) {
        // 只能穿过友方
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

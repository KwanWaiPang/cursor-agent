/**
 * Headless reachability + battle balance check for 口袋冒险.
 * Usage: node games/pocket/tools/sim-play.mjs
 */
import { MAPS, tileAt, isSolid } from "../js/maps.js";
import { SPECIES, STARTERS, MOVES, makePartyMon, applyXp } from "../js/data.js";
import { Battle } from "../js/battle.js";

const issues = [];
const notes = [];

function walkable(map, x, y) {
  if (y < 0 || x < 0 || y >= map.h || x >= map.w) return false;
  if (isSolid(tileAt(map, x, y))) return false;
  if (map.npcs?.some((n) => n.solid && n.x === x && n.y === y)) return false;
  return true;
}

function bfs(map, sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return true;
  const q = [[sx, sy]];
  const seen = new Set([`${sx},${sy}`]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (seen.has(k) || !walkable(map, nx, ny)) continue;
      if (nx === tx && ny === ty) return true;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

function npcReachable(map, spawn, npc) {
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    const ax = npc.x + dx;
    const ay = npc.y + dy;
    if (walkable(map, ax, ay) && bfs(map, spawn.x, spawn.y, ax, ay)) return true;
  }
  return false;
}

function auditMaps() {
  for (const [id, map] of Object.entries(MAPS)) {
    const sp = map.spawn;
    if (!sp) {
      issues.push(`${id}: 无 spawn`);
      continue;
    }
    if (!walkable(map, sp.x, sp.y)) {
      issues.push(`${id}: spawn 不可站 ${sp.x},${sp.y} '${tileAt(map, sp.x, sp.y)}'`);
    }
    for (const w of map.warps) {
      if (!walkable(map, w.x, w.y)) {
        issues.push(`${id}: warp ${w.to}@${w.x},${w.y} 不可走 '${tileAt(map, w.x, w.y)}'`);
      }
      if (!bfs(map, sp.x, sp.y, w.x, w.y)) {
        issues.push(`${id}: spawn → ${w.to}@${w.x},${w.y} 不可达`);
      }
      const dest = MAPS[w.to];
      if (!dest) issues.push(`${id}: 目标地图缺失 ${w.to}`);
      else if (!walkable(dest, w.tx, w.ty)) {
        issues.push(`${id}: 落点 ${w.to}(${w.tx},${w.ty}) 不可站 '${tileAt(dest, w.tx, w.ty)}'`);
      }
    }
    for (const n of map.npcs || []) {
      if (!npcReachable(map, sp, n)) {
        issues.push(`${id}: NPC ${n.id || n.name}@${n.x},${n.y} 不可接近`);
      }
    }
  }
}

/** Story graph: can the player sequence key flags without softlock? */
function auditStoryGraph() {
  const chain = [
    ["bedroom", "house"],
    ["house", "town"],
    ["town", "lab"],
    ["lab", "town"],
    ["town", "route1"],
    ["route1", "viridian"],
    ["viridian", "mart"],
    ["mart", "viridian"],
    ["viridian", "center"],
    ["center", "viridian"],
    ["viridian", "route1"],
    ["route1", "town"],
    ["town", "lab"],
    ["lab", "town"],
    ["town", "route1"],
    ["route1", "viridian"],
    ["viridian", "route2"],
    ["route2", "forest"],
    ["forest", "pewter"],
    ["pewter", "pewter_center"],
    ["pewter_center", "pewter"],
    ["pewter", "gym"],
    ["gym", "pewter"],
  ];
  for (const [from, to] of chain) {
    const map = MAPS[from];
    const w = map.warps.find((x) => x.to === to);
    if (!w) {
      issues.push(`主线断链: ${from} 无出口到 ${to}`);
      continue;
    }
    if (!bfs(map, map.spawn.x, map.spawn.y, w.x, w.y)) {
      issues.push(`主线不可达: ${from}.spawn → ${to}`);
    }
    // from a typical landing: if any inbound warp exists, also check from that landing
    for (const [srcId, src] of Object.entries(MAPS)) {
      for (const iw of src.warps) {
        if (iw.to === from && !bfs(map, iw.tx, iw.ty, w.x, w.y)) {
          issues.push(`主线不可达: 从 ${srcId} 落入 ${from}(${iw.tx},${iw.ty}) → ${to}`);
        }
      }
    }
  }
  notes.push("主线地图对齐检查完成");
}

function bestMoveIndex(combatant, defender) {
  let best = 0;
  let score = -1;
  combatant.moves.forEach((m, i) => {
    const mv = MOVES[m.id];
    if (!mv || m.pp <= 0) return;
    let s = mv.power || 0;
    if (mv.power) {
      // rough type hint via SPECIES
      const at = SPECIES[combatant.species].types;
      if (at.includes(mv.type)) s *= 1.5;
    }
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return best;
}

function simulateBattle(playerInit, foeInit, trials = 50) {
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const b = new Battle({
      player: {
        species: playerInit.species,
        level: playerInit.level,
        hp: playerInit.hp ?? playerInit.stats?.hp,
        moves: playerInit.moves.map((m) => ({ id: m.id, pp: MOVES[m.id].pp })),
      },
      wild: foeInit,
      canRun: false,
      trainer: true,
      seed: (i * 9973 + 17) | 0,
    });
    let turns = 0;
    while (!b.result && turns++ < 100) {
      b.turn({ type: "fight", index: bestMoveIndex(b.player, b.wild) });
    }
    if (b.result === "victory") wins++;
  }
  return wins / trials;
}

/** Simulate multi-mon trainer with mid-heal optional */
function simulateTrainer(playerMon, party, { healBetween = false, trials = 40 } = {}) {
  let wins = 0;
  for (let t = 0; t < trials; t++) {
    let mon = {
      species: playerMon.species,
      level: playerMon.level,
      hp: playerMon.stats.hp,
      moves: playerMon.moves.map((m) => ({ id: m.id, pp: MOVES[m.id].pp })),
      stats: playerMon.stats,
    };
    let ok = true;
    for (let fi = 0; fi < party.length; fi++) {
      if (healBetween && fi > 0) {
        mon.hp = mon.stats.hp;
        mon.moves = mon.moves.map((m) => ({ id: m.id, pp: MOVES[m.id].pp }));
      }
      const b = new Battle({
        player: {
          species: mon.species,
          level: mon.level,
          hp: mon.hp,
          moves: mon.moves.map((m) => ({ ...m })),
        },
        wild: party[fi],
        canRun: false,
        trainer: true,
        seed: (t * 10007 + fi * 13 + 3) | 0,
      });
      let turns = 0;
      while (!b.result && turns++ < 100) {
        b.turn({ type: "fight", index: bestMoveIndex(b.player, b.wild) });
      }
      if (b.result !== "victory") {
        ok = false;
        break;
      }
      mon.hp = b.player.hp;
      mon.moves = b.player.moves.map((m) => ({ ...m }));
      // tiny xp bump between fights
      const leveled = applyXp(
        {
          ...mon,
          name: SPECIES[mon.species].name,
          xp: 0,
          xpToNext: 20,
        },
        25
      );
      // applyXp mutates party mon shape — keep simple: ignore level-ups in this micro-sim
      void leveled;
    }
    if (ok) wins++;
  }
  return wins / trials;
}

function balanceReport() {
  const brock = [
    { species: "geodude", level: 10 },
    { species: "onix", level: 12 },
  ];
  const gymGuide = [{ species: "diglett", level: 10 }];
  const rivalFor = {
    bulbasaur: { species: "charmander", level: 4, moves: ["scratch", "growl"] },
    charmander: { species: "squirtle", level: 4, moves: ["tackle", "tail-whip"] },
    squirtle: { species: "bulbasaur", level: 4, moves: ["tackle", "growl"] },
  };

  for (const sid of STARTERS) {
    const name = SPECIES[sid].name;
    const r = simulateBattle(makePartyMon(sid, 5), rivalFor[sid], 80);
    notes.push(`${name} Lv5 vs 劲敌(弱化开局): ${(r * 100).toFixed(0)}%`);

    for (const lv of [8, 10, 12, 14]) {
      const mon = makePartyMon(sid, lv);
      const g = simulateTrainer(mon, gymGuide, { healBetween: false, trials: 40 });
      const b = simulateTrainer(mon, brock, { healBetween: false, trials: 40 });
      const bh = simulateTrainer(makePartyMon(sid, lv), brock, { healBetween: true, trials: 40 });
      notes.push(
        `${name} Lv${lv} | 道馆武者连战 ${(g * 100).toFixed(0)}% | 小刚连战 ${(b * 100).toFixed(0)}% | 小刚中场回满 ${(bh * 100).toFixed(0)}%`
      );
    }
    // 火系靠森林抓走路草的备选路线
    if (sid === "charmander") {
      const odd = makePartyMon("oddish", 10);
      const ob = simulateTrainer(odd, brock, { healBetween: true, trials: 40 });
      notes.push(`走路草 Lv10 打小刚(中场恢复): ${(ob * 100).toFixed(0)}%  ← 火系建议抓宠`);
    }
  }
}

function questUxNotes() {
  notes.push(
    "体验: 取包裹后需原路返回真新镇交任务，往返约跨 4 张图——合理但偏跑腿；无快捷传送。"
  );
  notes.push("体验: 道馆武者与小刚之间无恢复点，火系御三家对岩石双抗压力大。");
  notes.push("体验: 商店取包裹前不可买球；图鉴后送 5 球，可接受。");
}

// ---- run ----
auditMaps();
auditStoryGraph();
balanceReport();
questUxNotes();

console.log("=== 问题 ===");
if (!issues.length) console.log("(无结构性软锁)");
for (const i of issues) console.log("- " + i);
console.log("\n=== 观察 ===");
for (const n of notes) console.log("- " + n);
console.log(`\nissues=${issues.length}`);
process.exit(issues.length ? 1 : 0);

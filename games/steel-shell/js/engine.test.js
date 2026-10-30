import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GROUND_Y,
  LEVELS,
  PH,
  VIEW_W,
  beginStage,
  classifyHit,
  createGame,
  pressStart,
  stepGame,
} from "./engine.js";
import { computeFitScale } from "./fit.js";
import { validateSprites } from "./sprites.js";

function pump(state, input, seconds) {
  const n = Math.max(1, Math.round(seconds / (1 / 60)));
  for (let i = 0; i < n; i++) stepGame(state, input, 1 / 60);
}

function bootPlay(seed = 1) {
  const g = createGame(seed);
  pressStart(g);
  pressStart(g);
  assert.equal(g.mode, "play");
  return g;
}

test("sprites are rectangular and use the palette", () => {
  validateSprites();
});

test("fit scale uses the tighter axis and allows phones", () => {
  assert.equal(computeFitScale(1280, 720), 4);
  assert.equal(computeFitScale(1280, 500), 2);
  assert.equal(computeFitScale(320, 180), 1);
  const phone = computeFitScale(200, 120);
  assert.ok(phone < 1 && phone >= 0.45);
  const handset = computeFitScale(390, 700);
  assert.ok(handset > 1 && handset < 2);
});

test("three stages each have troops, a boss and reachable platforms", () => {
  assert.equal(LEVELS.length, 3);
  for (const lv of LEVELS) {
    assert.ok(lv.enemies.length >= 6, lv.id);
    assert.ok(lv.boss && lv.boss.trigger < lv.width - 200, lv.id);
    assert.ok(lv.checkpoints.every((c) => c < lv.boss.trigger), lv.id);
    for (const plat of lv.platforms) assert.ok(plat.y >= 94 && plat.y <= 120, lv.id);
    for (const crate of lv.crates) assert.equal(crate.y + crate.h, GROUND_Y, lv.id);
    for (const e of lv.enemies) {
      for (const s of lv.spikes || []) {
        const hit = e.x + 40 > s.x && e.x - 40 < s.x + s.w;
        assert.equal(hit, false, `${lv.id} troop ${e.x} spike ${s.x}`);
      }
      for (const c of lv.crates) {
        const hit = e.x + 52 > c.x && e.x - 36 < c.x + c.w;
        assert.equal(hit, false, `${lv.id} troop ${e.x} crate ${c.x}`);
      }
    }
  }
});

test("run, jump, and land on a platform", () => {
  const g = bootPlay();
  const x0 = g.player.x;
  pump(g, { right: true }, 0.4);
  assert.ok(g.player.x > x0 + 20);
  assert.equal(g.player.grounded, true);
  const y0 = g.player.y;
  stepGame(g, { jump: true, jumpHeld: true }, 1 / 60);
  pump(g, { jumpHeld: true }, 0.2);
  assert.ok(g.player.y < y0 - 10);
  pump(g, {}, 1.2);
  assert.equal(g.player.grounded, true);
  assert.ok(Math.abs(g.player.y + g.player.h - GROUND_Y) < 1.2);

  const plat = g.oneWay[0];
  g.player.x = plat.x + 6;
  g.player.y = plat.y - PH - 40;
  g.player.vy = 0;
  g.player.grounded = false;
  pump(g, {}, 1.4);
  assert.equal(g.player.grounded, true);
  assert.ok(Math.abs(g.player.y + g.player.h - plat.y) < 1.5);
});

test("crouch keeps the feet planted and ducks under a high shot", () => {
  const g = bootPlay();
  pump(g, {}, 0.2);
  const feet = g.player.y + g.player.h;
  stepGame(g, { down: true }, 1 / 60);
  assert.equal(g.player.crouch, true);
  assert.ok(g.player.h < PH);
  assert.ok(Math.abs(g.player.y + g.player.h - feet) < 0.2);

  g.player.iFrame = 0;
  const hp = g.player.hp;
  g.bullets.push({
    x: g.player.x + 4,
    y: g.player.y - 5,
    vx: 0,
    vy: 0,
    r: 2,
    friendly: false,
    dmg: 1,
    life: 1,
  });
  stepGame(g, { down: true }, 1 / 60);
  assert.equal(g.player.hp, hp);

  g.player.iFrame = 0;
  g.bullets.push({
    x: g.player.x + 4,
    y: g.player.y + 6,
    vx: 0,
    vy: 0,
    r: 2,
    friendly: false,
    dmg: 1,
    life: 1,
  });
  stepGame(g, { down: true }, 1 / 60);
  assert.ok(g.player.hp < hp);
});

test("rifle, shield facing and grenades", () => {
  const g = bootPlay();
  stepGame(g, { fire: true }, 1 / 60);
  assert.equal(g.events.includes("shoot"), true);
  assert.equal(g.bullets.length, 1);

  const shield = { x: 100, y: 100, w: 16, h: 26, alive: true, kind: "shield", dir: -1 };
  assert.equal(
    classifyHit({ x: shield.x - 2, y: shield.y + 8, r: 3, friendly: true }, shield),
    "block",
  );
  assert.equal(
    classifyHit({ x: shield.x + shield.w + 1, y: shield.y + 8, r: 3, friendly: true }, shield),
    "hit",
  );
  shield.kind = "soldier";
  assert.equal(
    classifyHit({ x: shield.x - 2, y: shield.y + 8, r: 3, friendly: true }, shield),
    "hit",
  );

  const e = g.enemies.find((en) => en.kind === "shield");
  e.dir = -1;
  const hp = e.hp;
  g.bullets.push({ x: e.x - 1, y: e.y + 10, vx: 0, vy: 0, r: 8, friendly: true, dmg: 1, life: 1 });
  stepGame(g, {}, 1 / 60);
  assert.equal(e.hp, hp);

  e.dir = 1;
  g.bullets.push({ x: e.x - 1, y: e.y + 10, vx: 0, vy: 0, r: 8, friendly: true, dmg: 1, life: 1 });
  stepGame(g, {}, 1 / 60);
  assert.equal(e.hp, hp - 1);

  const soldier = g.enemies.find((en) => en.alive && en.kind === "soldier");
  const before = g.score;
  g.bullets.push({
    x: soldier.x + soldier.w / 2,
    y: soldier.y + 8,
    vx: 0,
    vy: 0,
    r: 8,
    friendly: true,
    dmg: 8,
    life: 1,
  });
  stepGame(g, {}, 1 / 60);
  assert.equal(soldier.alive, false);
  assert.ok(g.score >= before + soldier.score);

  const other = g.enemies.find((en) => en.alive);
  const nades = g.player.grenades;
  stepGame(g, { grenade: true }, 1 / 60);
  assert.equal(g.player.grenades, nades - 1);
  g.grenades.push({ x: other.x + 4, y: other.y + 8, vx: 0, vy: 0, life: 0.01, r: 3, friendly: true });
  stepGame(g, {}, 1 / 60);
  assert.equal(other.alive, false);
});

test("lives, respawn, game over and pause", () => {
  const g = bootPlay();
  g.lives = 2;
  g.player.hp = 1;
  g.player.iFrame = 0;
  g.bullets.push({
    x: g.player.x + 4,
    y: g.player.y + 8,
    vx: 0,
    vy: 0,
    r: 4,
    friendly: false,
    dmg: 1,
    life: 1,
  });
  stepGame(g, {}, 1 / 60);
  assert.equal(g.mode, "dying");
  assert.equal(g.lives, 1);
  pump(g, {}, 1);
  assert.equal(g.mode, "play");
  assert.equal(g.player.hp, g.player.maxHp);

  g.player.hp = 1;
  g.player.iFrame = 0;
  g.bullets.push({
    x: g.player.x + 4,
    y: g.player.y + 8,
    vx: 0,
    vy: 0,
    r: 4,
    friendly: false,
    dmg: 1,
    life: 1,
  });
  stepGame(g, {}, 1 / 60);
  assert.equal(g.lives, 0);
  pump(g, {}, 1);
  assert.equal(g.mode, "over");

  const g2 = bootPlay(3);
  stepGame(g2, { pause: true }, 1 / 60);
  assert.equal(g2.mode, "pause");
  const x = g2.player.x;
  pump(g2, { right: true }, 0.4);
  assert.equal(g2.player.x, x);
  stepGame(g2, { pause: true }, 1 / 60);
  assert.equal(g2.mode, "play");
});

test("each boss clear advances and the third win screen can restart", () => {
  const g = bootPlay(4);
  for (let i = 0; i < 3; i++) {
    assert.equal(g.mode, "play");
    assert.equal(g.level.id, LEVELS[i].id);
    g.player.x = g.level.boss.trigger + 30;
    stepGame(g, {}, 1 / 60);
    assert.equal(g.boss?.alive, true);
    g.boss.hp = 1;
    g.bullets.push({
      x: g.boss.x + g.boss.w / 2,
      y: g.boss.y + g.boss.h / 2,
      vx: 0,
      vy: 0,
      r: 8,
      friendly: true,
      dmg: 10,
      life: 1,
    });
    stepGame(g, {}, 1 / 60);
    assert.equal(g.mode, "clear");
    pressStart(g);
    if (g.mode === "intro") pressStart(g);
  }
  assert.equal(g.mode, "win");
  assert.ok(g.score >= 12000);
  pressStart(g);
  assert.equal(g.mode, "intro");
  assert.equal(g.stageIndex, 0);
  assert.equal(g.score, 0);
});

test("a runner can reach each boss gate without touching spikes", () => {
  for (const [index, lv] of LEVELS.entries()) {
    const g = createGame(9 + index);
    beginStage(g, index, 8);
    g.mode = "play";
    for (const e of g.enemies) e.alive = false;
    let reached = false;
    const frames = 35 * 60;
    for (let i = 0; i < frames; i++) {
      const p = g.player;
      const front = p.x + p.w;
      const spikeSoon = g.spikes.some((s) => s.x > front - 2 && s.x < front + 32);
      const crate = g.solids.some(
        (s) => s.kind === "crate" && !s.dead && s.x < front + 10 && s.x + s.w > front - 1 && s.y < p.y + p.h,
      );
      stepGame(g, { right: true, jump: spikeSoon || crate, jumpHeld: true }, 1 / 60);
      if (p.x + p.w >= lv.boss.trigger - 8) {
        reached = true;
        break;
      }
      if (g.mode !== "play") break;
    }
    assert.equal(g.player.hp, g.player.maxHp, `${lv.id} hp ${g.player.hp} x ${g.player.x}`);
    assert.equal(reached, true, `${lv.id} stopped at ${g.player.x}`);
    assert.ok(g.camX >= 0 && g.camX <= lv.width - VIEW_W + 0.5);
  }
});

/**
 * 钢壳奇兵模拟层。原创横版跑打，不依赖商业街机素材。
 * 玩法参考（未搬运源码）：rusted-cannon、Blastix，均为 MIT。
 */
import { LEVELS } from "./levels.js";

export { LEVELS };

export const VIEW_W = 256;
export const VIEW_H = 180;
export const GROUND_Y = 148;
export const PW = 12;
export const PH = 26;
export const PCH = 16;

const GRAV = 1000;
const JUMP_V = -360;
const MAX_FALL = 460;
const MOVE = 120;
const CROUCH_MOVE = 48;
const RIFLE_CD = 0.11;
const RIFLE_SPEED = 370;
const GRENADE_R = 46;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function circleHitsRect(cx, cy, rad, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= rad * rad;
}

function centerDist2(x, y, rect) {
  const dx = rect.x + rect.w / 2 - x;
  const dy = rect.y + rect.h / 2 - y;
  return dx * dx + dy * dy;
}

/**
 * 盾兵正面挡步枪。dir 为面朝方向，子弹位于面朝一侧则格挡。
 * @returns {'miss' | 'block' | 'hit'}
 */
export function classifyHit(bullet, enemy) {
  if (!enemy?.alive) return "miss";
  if (!circleHitsRect(bullet.x, bullet.y, bullet.r || 0, enemy)) return "miss";
  if (enemy.kind === "shield" && bullet.friendly) {
    const side = Math.sign(bullet.x - (enemy.x + enemy.w / 2));
    if (side === 0 || side === enemy.dir) return "block";
  }
  return "hit";
}

export function createGame(seed = 1) {
  return {
    mode: "title",
    stageIndex: 0,
    score: 0,
    lives: 3,
    time: 0,
    events: [],
    fx: [],
    popups: [],
    decals: [],
    bullets: [],
    grenades: [],
    hazards: [],
    shake: 0,
    hurtFlash: 0,
    camX: 0,
    rng: mulberry32(seed),
    seed,
    pointerAim: null,
    player: null,
    level: null,
    solids: [],
    oneWay: [],
    spikes: [],
    enemies: [],
    pickups: [],
    boss: null,
    bossEngaged: false,
    introT: 0,
    clearT: 0,
    dyingT: 0,
    pausedFrom: "play",
    lifeGained: false,
  };
}

function makePlayer(spawnX, grenades = 8) {
  return {
    x: spawnX,
    y: GROUND_Y - PH,
    w: PW,
    h: PH,
    vx: 0,
    vy: 0,
    facing: 1,
    aimX: 1,
    aimY: 0,
    hp: 6,
    maxHp: 6,
    grenades: clamp(grenades, 0, 12),
    iFrame: 0.7,
    fireCd: 0,
    grenadeCd: 0,
    coyote: 0.1,
    jumpBuf: 0,
    grounded: true,
    crouch: false,
    kick: 0,
    checkpoint: spawnX,
    dustCd: 0,
    runT: 0,
  };
}

function makeEnemy(spec, id, rng) {
  const kind = spec.kind;
  const h = 26;
  const w = kind === "shield" ? 16 : 14;
  const hp = kind === "shield" ? 6 : kind === "grenadier" ? 4 : 3;
  return {
    id,
    kind,
    x: spec.x,
    y: GROUND_Y - h,
    w,
    h,
    home: spec.x,
    dir: -1,
    vx: 0,
    hp,
    maxHp: hp,
    alive: true,
    fireCd: 0.35 + rng() * 0.7,
    hurtT: 0,
    touchCd: 0,
    aggro: kind === "grenadier" ? 300 : 280,
    score: kind === "shield" ? 220 : kind === "grenadier" ? 180 : 100,
  };
}

function makeBoss(spec, level) {
  const arenaLeft = spec.trigger;
  const boss = {
    kind: spec.kind,
    name: spec.name,
    arenaLeft,
    attackCd: 0.7,
    bombCd: 1.6,
    slamT: 0,
    slamDone: true,
    added: false,
    hurtT: 0,
    alive: true,
    score: 2500,
    t: 0,
    dir: -1,
    phase2: false,
  };
  if (spec.kind === "gunship") {
    boss.w = 58;
    boss.h = 22;
    boss.hp = 28;
    boss.x = arenaLeft + 160;
    boss.y = 84;
  } else if (spec.kind === "crawler") {
    boss.w = 76;
    boss.h = 40;
    boss.hp = 40;
    boss.x = Math.min(level.width - boss.w - 18, arenaLeft + 230);
    boss.y = GROUND_Y - boss.h;
  } else {
    boss.w = 48;
    boss.h = 52;
    boss.hp = 30;
    boss.x = Math.min(level.width - boss.w - 18, arenaLeft + 200);
    boss.y = GROUND_Y - boss.h;
  }
  boss.maxHp = boss.hp;
  return boss;
}

function buildSolids(level) {
  const solids = [
    { x: 0, y: GROUND_Y, w: level.width, h: 90, kind: "ground" },
    { x: -28, y: -80, w: 28, h: GROUND_Y + 80, kind: "wall" },
    { x: level.width, y: -80, w: 28, h: GROUND_Y + 80, kind: "wall" },
  ];
  for (const c of level.crates) {
    solids.push({
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
      kind: "crate",
      hp: 4,
      maxHp: 4,
      alive: true,
      dead: false,
    });
  }
  return solids;
}

export function beginStage(state, index, carryGrenades = 8) {
  const level = LEVELS[index];
  state.stageIndex = index;
  state.level = level;
  state.camX = 0;
  state.solids = buildSolids(level);
  state.oneWay = level.platforms.map((p) => ({ x: p.x, y: p.y, w: p.w, h: 8 }));
  state.spikes = (level.spikes || []).map((s) => ({
    x: s.x,
    y: GROUND_Y - 8,
    w: s.w,
    h: 8,
  }));
  state.enemies = level.enemies.map((e, i) => makeEnemy(e, i, state.rng));
  state.pickups = level.pickups.map((p) => ({
    x: p.x,
    y: p.y,
    w: 12,
    h: 12,
    kind: p.kind,
    alive: true,
  }));
  state.bullets = [];
  state.grenades = [];
  state.hazards = [];
  state.fx = [];
  state.popups = [];
  state.decals = [];
  state.boss = null;
  state.bossEngaged = false;
  state.shake = 0;
  state.hurtFlash = 0;
  state.player = makePlayer(level.spawn, Math.max(6, carryGrenades));
  state.mode = "intro";
  state.introT = 1.35;
  state.lifeGained = false;
}

export function pressStart(state) {
  if (state.mode === "pause") return;
  if (state.mode === "title" || state.mode === "over" || state.mode === "win") {
    state.score = 0;
    state.lives = 3;
    state.time = 0;
    state.rng = mulberry32(state.seed || 1);
    beginStage(state, 0, 8);
    state.events.push("start");
    return;
  }
  if (state.mode === "intro") {
    state.mode = "play";
    return;
  }
  if (state.mode === "clear") goNext(state);
}

export function togglePause(state) {
  if (state.mode === "play" || state.mode === "intro") {
    state.pausedFrom = state.mode;
    state.mode = "pause";
    state.events.push("pause");
    return;
  }
  if (state.mode === "pause") {
    state.mode = state.pausedFrom || "play";
    state.events.push("pause");
  }
}

function goNext(state) {
  if (state.mode !== "clear") return;
  if (state.stageIndex + 1 >= LEVELS.length) {
    state.mode = "win";
    state.events.push("win");
    return;
  }
  const nades = state.player?.grenades ?? 8;
  beginStage(state, state.stageIndex + 1, nades);
}

function activeSolids(state) {
  const list = state.solids.filter((s) => !s.dead);
  const boss = state.boss;
  if (state.bossEngaged && boss?.alive && state.player && state.player.x > boss.arenaLeft + 4) {
    list.push({
      x: boss.arenaLeft - 4,
      y: -40,
      w: 8,
      h: GROUND_Y + 40,
      kind: "wall",
    });
  }
  return list;
}

function burst(state, x, y, color, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = state.rng() * Math.PI * 2;
    const s = 24 + state.rng() * 80;
    state.fx.push({
      kind: "spark",
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 20,
      life: 0.22 + state.rng() * 0.18,
      max: 0.4,
      color,
    });
  }
  if (state.fx.length > 90) state.fx.splice(0, state.fx.length - 90);
}

function popup(state, x, y, text) {
  state.popups.push({ x, y, text, life: 0.7 });
  if (state.popups.length > 14) state.popups.shift();
}

function hurtPlayer(state, dmg, knockDir) {
  const p = state.player;
  if (!p || state.mode !== "play") return;
  if (p.iFrame > 0) return;
  p.hp -= dmg;
  p.iFrame = 0.95;
  p.vy = -150;
  p.vx = (knockDir || 0) * 110;
  state.shake = Math.max(state.shake, 5);
  state.hurtFlash = 0.28;
  state.events.push("hurt");
  if (p.hp <= 0) {
    p.hp = 0;
    state.lives -= 1;
    state.mode = "dying";
    state.dyingT = 0.72;
    state.events.push("die");
    burst(state, p.x + p.w / 2, p.y + p.h / 2, "#e7d3a4", 10);
  }
}

function damageEnemy(state, enemy, dmg) {
  if (!enemy.alive) return;
  enemy.hp -= dmg;
  enemy.hurtT = 0.12;
  state.events.push("hit");
  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.score += enemy.score;
    popup(state, enemy.x, enemy.y - 6, `+${enemy.score}`);
    burst(state, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#d7c39a", 8);
    state.decals.push({ x: enemy.x + enemy.w / 2, y: GROUND_Y, r: 9 });
    if (state.decals.length > 16) state.decals.shift();
    state.events.push("kill");
  }
}

function damageCrate(state, crate, dmg) {
  if (!crate || crate.dead || crate.kind !== "crate") return;
  crate.hp -= dmg;
  if (crate.hp > 0) return;
  crate.dead = true;
  state.score += 30;
  popup(state, crate.x, crate.y - 4, "+30");
  burst(state, crate.x + crate.w / 2, crate.y + crate.h / 2, "#b08960", 7);
  state.events.push("break");
  const roll = state.rng();
  if (roll < 0.62) {
    state.pickups.push({
      x: crate.x + 4,
      y: GROUND_Y - 16,
      w: 12,
      h: 12,
      kind: roll < 0.28 ? "med" : "grenade",
      alive: true,
    });
  }
}

function enterClear(state) {
  if (state.mode === "clear" || state.mode === "win") return;
  const bossScore = state.boss?.score || 2500;
  if (state.boss) state.boss.alive = false;
  state.score += bossScore;
  state.score += 1500;
  const before = state.lives;
  state.lives = Math.min(5, state.lives + 1);
  state.lifeGained = state.lives > before;
  state.mode = "clear";
  state.clearT = 2.5;
  state.bossEngaged = false;
  state.shake = 8;
  popup(state, state.player.x, state.player.y - 10, `+${bossScore}`);
  state.events.push("clear");
  burst(state, state.boss?.x + 20 || state.player.x, state.boss?.y + 10 || state.player.y, "#f0d48a", 14);
}

function damageBoss(state, dmg) {
  const b = state.boss;
  if (!b?.alive) return;
  b.hp -= dmg;
  b.hurtT = 0.1;
  state.events.push("hit");
  if (b.hp <= 0) {
    b.hp = 0;
    enterClear(state);
  }
}

function explode(state, x, y, friendly) {
  state.shake = Math.max(state.shake, 6);
  state.fx.push({ kind: "boom", x, y, life: 0.34, max: 0.34 });
  state.events.push("explode");
  const r2 = GRENADE_R * GRENADE_R;
  if (friendly) {
    for (const e of state.enemies) {
      if (e.alive && centerDist2(x, y, e) <= r2) damageEnemy(state, e, 4);
    }
    if (state.boss?.alive && centerDist2(x, y, state.boss) <= (GRENADE_R + 8) ** 2) {
      damageBoss(state, 5);
    }
  } else if (state.player && centerDist2(x, y, state.player) <= r2) {
    const knock = Math.sign(state.player.x + state.player.w / 2 - x) || 1;
    hurtPlayer(state, 2, knock);
  }
  for (const s of state.solids) {
    if (s.kind === "crate" && !s.dead && centerDist2(x, y, s) <= r2) damageCrate(state, s, 4);
  }
}

function setAim(state, p, input) {
  const aim = state.pointerAim;
  if (aim && Number.isFinite(aim.x) && Number.isFinite(aim.y)) {
    const ox = p.x + p.w / 2;
    const oy = p.y + (p.crouch ? 6 : 10);
    const dx = aim.x - ox;
    const dy = aim.y - oy;
    const m = Math.hypot(dx, dy);
    if (m > 6) {
      p.aimX = dx / m;
      p.aimY = dy / m;
      if (Math.abs(p.aimX) > 0.2) p.facing = p.aimX < 0 ? -1 : 1;
      return;
    }
  }
  let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let ay = 0;
  if (input.up) ay -= 1;
  if (!p.grounded && input.down) ay = 1;
  else if (input.down && !p.crouch) ay += 1;
  if (ax === 0 && ay === 0) ax = p.facing || 1;
  if (ax !== 0) p.facing = ax < 0 ? -1 : 1;
  const m = Math.hypot(ax, ay) || 1;
  p.aimX = ax / m;
  p.aimY = ay / m;
}

function applyStance(p, wantCrouch, solids) {
  if (wantCrouch && !p.crouch) {
    const feet = p.y + p.h;
    p.h = PCH;
    p.y = feet - PCH;
    p.crouch = true;
    return;
  }
  if (!wantCrouch && p.crouch) {
    const feet = p.y + p.h;
    const rect = { x: p.x, y: feet - PH, w: p.w, h: PH };
    const blocked = solids.some((s) => s.kind !== "ground" && rectsOverlap(rect, s));
    if (!blocked) {
      p.h = PH;
      p.y = feet - PH;
      p.crouch = false;
    }
  }
}

function moveBody(body, solids, oneWay, dt) {
  body.x += body.vx * dt;
  for (const s of solids) {
    if (s.kind === "ground") continue;
    if (!rectsOverlap(body, s)) continue;
    if (body.vx > 0 || body.x + body.w / 2 < s.x + s.w / 2) body.x = s.x - body.w;
    else body.x = s.x + s.w;
    body.vx = 0;
  }
  const prevY = body.y;
  body.y += body.vy * dt;
  body.grounded = false;

  let support = null;
  for (const s of solids) {
    if (!rectsOverlap(body, s)) continue;
    const prevBottom = prevY + body.h;
    const landing = body.vy >= 0 && prevBottom <= s.y + 2;
    const head = body.vy < 0 && prevY >= s.y + s.h - 2;
    if (landing) {
      if (!support || s.y < support.y) support = s;
    } else if (head) {
      body.y = s.y + s.h;
      body.vy = 0;
    } else if (body.vy > 0 && s.kind === "ground") {
      if (!support || s.y < support.y) support = s;
    }
  }
  if (support) {
    body.y = support.y - body.h;
    body.vy = 0;
    body.grounded = true;
  }

  if (body.vy >= 0) {
    const prevFeet = prevY + body.h;
    let best = null;
    for (const s of oneWay) {
      if (prevFeet > s.y + 1) continue;
      if (body.y + body.h < s.y) continue;
      if (body.x + body.w <= s.x + 2 || body.x >= s.x + s.w - 2) continue;
      if (!best || s.y < best.y) best = s;
    }
    if (best) {
      body.y = best.y - body.h;
      body.vy = 0;
      body.grounded = true;
    }
  }
}

function updatePlayer(state, input, dt, solids) {
  const p = state.player;
  p.iFrame = Math.max(0, p.iFrame - dt);
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.grenadeCd = Math.max(0, p.grenadeCd - dt);
  p.kick = Math.max(0, p.kick - dt);
  p.dustCd = Math.max(0, p.dustCd - dt);

  setAim(state, p, input);

  if (input.jump) p.jumpBuf = 0.12;
  else p.jumpBuf = Math.max(0, p.jumpBuf - dt);

  const wantCrouch = !!(input.down && (p.grounded || p.coyote > 0) && p.jumpBuf <= 0);
  applyStance(p, wantCrouch, solids);

  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const speed = p.crouch ? CROUCH_MOVE : MOVE;
  const target = move * speed;
  const accel = (p.grounded ? 820 : 480) * dt;
  if (p.vx < target) p.vx = Math.min(target, p.vx + accel);
  else if (p.vx > target) p.vx = Math.max(target, p.vx - accel);

  if (p.grounded) p.coyote = 0.1;
  else p.coyote = Math.max(0, p.coyote - dt);

  if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0)) {
    if (p.crouch) applyStance(p, false, solids);
    p.vy = JUMP_V;
    p.grounded = false;
    p.coyote = 0;
    p.jumpBuf = 0;
    state.events.push("jump");
  }

  const grav = p.vy < 0 && !input.jumpHeld ? GRAV * 2.35 : GRAV;
  p.vy = Math.min(MAX_FALL, p.vy + grav * dt);

  const leftGround = p.grounded;
  moveBody(p, solids, state.oneWay, dt);
  if (p.grounded && !leftGround) {
    state.fx.push({
      kind: "dust",
      x: p.x + p.w / 2,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      life: 0.2,
      max: 0.2,
    });
  }

  if (p.grounded && Math.abs(p.vx) > 28) p.runT += dt;
  else if (p.grounded) p.runT = 0;

  if (p.grounded && Math.abs(p.vx) > 30 && !p.crouch && p.dustCd <= 0) {
    p.dustCd = 0.1;
    state.fx.push({
      kind: "dust",
      x: p.x + (p.facing > 0 ? 0 : p.w),
      y: GROUND_Y,
      vx: -p.facing * 14,
      vy: -10,
      life: 0.28,
      max: 0.28,
    });
  }

  for (const c of state.level.checkpoints) {
    if (p.x >= c && c >= p.checkpoint) p.checkpoint = c;
  }

  if (p.y > VIEW_H + 40) hurtPlayer(state, 99, 0);

  if (state.mode !== "play") return;

  if (input.fire && p.fireCd <= 0) {
    p.fireCd = RIFLE_CD;
    p.kick = 0.05;
    state.bullets.push({
      x: p.x + p.w / 2 + p.aimX * 9,
      y: p.y + (p.crouch ? 7 : 10) + p.aimY * 6,
      vx: p.aimX * RIFLE_SPEED,
      vy: p.aimY * RIFLE_SPEED,
      r: 2,
      friendly: true,
      dmg: 1,
      life: 0.82,
    });
    state.events.push("shoot");
  }

  if (input.grenade && p.grenadeCd <= 0 && p.grenades > 0) {
    p.grenades -= 1;
    p.grenadeCd = 0.42;
    const sp = 165;
    state.grenades.push({
      x: p.x + p.w / 2 + p.aimX * 8,
      y: p.y + 6,
      vx: p.aimX * sp + p.vx * 0.15,
      vy: p.aimY * sp - 155,
      life: 1.05,
      r: 3,
      friendly: true,
    });
    state.events.push("grenade");
  }
}

function aimedShot(state, src, speed, dmg, spread = 0) {
  const p = state.player;
  const sx = src.x + src.w / 2;
  const sy = src.y + src.h * 0.42;
  const dx = p.x + p.w / 2 - sx;
  const dy = p.y + p.h - 18 - sy;
  const ang = Math.atan2(dy, dx) + spread;
  state.bullets.push({
    x: sx + Math.cos(ang) * 8,
    y: sy + Math.sin(ang) * 4,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    r: 2.5,
    friendly: false,
    dmg,
    life: 2.1,
  });
  state.events.push("enemy-shot");
}

function updateEnemies(state, dt, solids) {
  const p = state.player;
  const cam = state.camX;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    e.hurtT = Math.max(0, e.hurtT - dt);
    e.touchCd = Math.max(0, e.touchCd - dt);
    e.fireCd -= dt;
    const dx = p.x + p.w / 2 - (e.x + e.w / 2);
    const dy = p.y + p.h / 2 - (e.y + e.h / 2);
    const dist = Math.hypot(dx, dy);
    const nearView = e.x + e.w > cam - 80 && e.x < cam + VIEW_W + 100;
    const see = nearView && dist < e.aggro && Math.abs(dy) < 56;
    if (see) {
      e.dir = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) > 96) e.vx = Math.sign(dx) * 34;
      else if (Math.abs(dx) < 42) e.vx = -Math.sign(dx || 1) * 20;
      else e.vx = 0;
      if (e.fireCd <= 0) {
        if (e.kind === "grenadier") {
          const vx = clamp(dx * 0.9, -150, 150);
          state.grenades.push({
            x: e.x + e.w / 2,
            y: e.y + 2,
            vx,
            vy: -200,
            life: 1.35,
            r: 3,
            friendly: false,
          });
          state.events.push("enemy-shot");
          e.fireCd = 2.35;
        } else {
          aimedShot(state, e, e.kind === "shield" ? 130 : 148, 1, (state.rng() - 0.5) * 0.06);
          e.fireCd = e.kind === "shield" ? 1.65 : 1.22;
        }
      }
    } else {
      e.vx = e.dir * 26;
      if (e.x < e.home - 36) e.dir = 1;
      if (e.x > e.home + 36) e.dir = -1;
    }
    e.x += e.vx * dt;
    for (const s of solids) {
      if (s.kind !== "crate") continue;
      if (!rectsOverlap(e, s)) continue;
      e.x = e.vx > 0 ? s.x - e.w : s.x + s.w;
      e.dir *= -1;
      e.vx = 0;
    }
    e.y = GROUND_Y - e.h;
    if (rectsOverlap(e, p) && e.touchCd <= 0) {
      const knock = Math.sign(p.x + p.w / 2 - (e.x + e.w / 2)) || -e.dir;
      hurtPlayer(state, 1, knock);
      e.touchCd = 0.7;
    }
  }
}

function maybeSpawnBoss(state) {
  if (state.boss || !state.level) return;
  const spec = state.level.boss;
  if (state.player.x + state.player.w >= spec.trigger) {
    state.boss = makeBoss(spec, state.level);
    state.bossEngaged = true;
    state.events.push("boss");
  }
}

function updateBoss(state, dt) {
  const b = state.boss;
  if (!b?.alive || state.mode !== "play") return;
  b.t += dt;
  b.hurtT = Math.max(0, b.hurtT - dt);
  b.attackCd -= dt;
  b.bombCd -= dt;
  const p = state.player;
  if (p.x + p.w >= b.arenaLeft + 8) state.bossEngaged = true;
  if (!state.bossEngaged) return;

  const minX = b.arenaLeft + 12;
  const maxX = state.level.width - b.w - 10;

  if (b.kind === "gunship") {
    const span = Math.max(48, maxX - minX);
    b.x = minX + (Math.sin(b.t * 0.75) * 0.5 + 0.5) * span;
    b.y = 76 + Math.sin(b.t * 1.55) * 16;
    if (b.attackCd <= 0) {
      aimedShot(state, b, 155, 1, -0.18);
      aimedShot(state, b, 155, 1, 0.18);
      state.bullets.push({
        x: b.x + b.w / 2,
        y: b.y + b.h,
        vx: (state.rng() - 0.5) * 30,
        vy: 150,
        r: 2.4,
        friendly: false,
        dmg: 1,
        life: 2,
      });
      b.attackCd = 1.28;
    }
    if (b.bombCd <= 0) {
      state.grenades.push({
        x: b.x + b.w / 2,
        y: b.y + b.h,
        vx: (state.rng() - 0.5) * 40,
        vy: 30,
        life: 1.6,
        r: 3,
        friendly: false,
      });
      b.bombCd = 2.5;
    }
  } else if (b.kind === "crawler") {
    b.phase2 = b.hp <= b.maxHp * 0.5;
    const dir = Math.sign(p.x - b.x) || -1;
    b.dir = dir;
    const speed = b.phase2 ? 56 : 28;
    b.x = clamp(b.x + dir * speed * dt, minX, maxX);
    b.y = GROUND_Y - b.h;
    if (!b.added && b.phase2) {
      b.added = true;
      state.enemies.push(makeEnemy({ x: b.arenaLeft + 36, kind: "soldier" }, 200, state.rng));
      state.enemies.push(makeEnemy({ x: b.arenaLeft + 92, kind: "soldier" }, 201, state.rng));
      state.events.push("boss");
    }
    if (b.attackCd <= 0) {
      aimedShot(state, b, 165, 2, 0);
      if (b.phase2) aimedShot(state, b, 150, 1, dir > 0 ? -0.35 : 0.35);
      b.attackCd = b.phase2 ? 0.72 : 1.15;
    }
    if (b.bombCd <= 0) {
      const waveDir = Math.sign(p.x + p.w / 2 - (b.x + b.w / 2)) || -1;
      state.hazards.push({
        x: b.x + b.w / 2,
        y: GROUND_Y - 10,
        w: 28,
        h: 10,
        vx: waveDir * 120,
        life: 1.35,
        dmg: 2,
      });
      b.bombCd = b.phase2 ? 2.05 : 3.1;
      state.events.push("explode");
      state.shake = Math.max(state.shake, 4);
    }
  } else {
    const dir = Math.sign(p.x - b.x) || -1;
    b.dir = dir;
    b.x = clamp(b.x + dir * 32 * dt, minX, maxX);
    b.y = GROUND_Y - b.h;
    if (b.slamT > 0) {
      b.slamT -= dt;
      if (b.slamT <= 0 && !b.slamDone) {
        b.slamDone = true;
        state.shake = Math.max(state.shake, 7);
        state.events.push("explode");
        const dx = Math.abs(p.x + p.w / 2 - (b.x + b.w / 2));
        if (dx < 66 && p.y + p.h > GROUND_Y - 36) {
          hurtPlayer(state, 2, Math.sign(p.x + p.w / 2 - (b.x + b.w / 2)) || 1);
        }
      }
    } else if (b.attackCd <= 0) {
      const close = Math.abs(p.x + p.w / 2 - (b.x + b.w / 2)) < 60;
      if (close && state.rng() < 0.6) {
        b.slamT = 0.46;
        b.slamDone = false;
        b.attackCd = 1.45;
      } else {
        aimedShot(state, b, 175, 2, 0);
        if (state.rng() < 0.4) {
          aimedShot(state, b, 160, 1, -0.28);
          aimedShot(state, b, 160, 1, 0.28);
        }
        b.attackCd = 1.12;
      }
    }
  }

  if (b.alive && rectsOverlap(b, p)) {
    const knock = Math.sign(p.x + p.w / 2 - (b.x + b.w / 2)) || 1;
    hurtPlayer(state, b.kind === "gunship" ? 1 : 2, knock);
  }
}

function updateBullets(state, dt, solids) {
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.y > GROUND_Y + 8 || b.y < -30 || b.x < -40 || b.x > state.level.width + 40) {
      b.dead = true;
      continue;
    }
    if (b.friendly) {
      let struck = false;
      for (const e of state.enemies) {
        const hit = classifyHit(b, e);
        if (hit === "miss") continue;
        b.dead = true;
        struck = true;
        if (hit === "block") {
          burst(state, b.x, b.y, "#d5dde4", 3);
          state.events.push("block");
        } else damageEnemy(state, e, b.dmg);
        break;
      }
      if (!struck && state.boss?.alive && circleHitsRect(b.x, b.y, b.r, state.boss)) {
        b.dead = true;
        struck = true;
        damageBoss(state, b.dmg);
        burst(state, b.x, b.y, "#f0d48a", 3);
      }
      if (struck) continue;
    } else if (state.player && circleHitsRect(b.x, b.y, b.r, state.player)) {
      b.dead = true;
      const knock = Math.sign(state.player.x + state.player.w / 2 - b.x) || 1;
      hurtPlayer(state, b.dmg || 1, knock);
      continue;
    }
    for (const s of solids) {
      if (!pointInRect(b.x, b.y, s)) continue;
      if (s.kind === "crate") damageCrate(state, s, b.dmg || 1);
      if (s.kind !== "ground" || b.y >= GROUND_Y) {
        b.dead = true;
        burst(state, b.x, b.y, "#c8b8a0", 2);
      }
      break;
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead);
}

function updateGrenades(state, dt, solids) {
  for (const g of state.grenades) {
    g.vy += 860 * dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.life -= dt;
    let boom = g.life <= 0 || g.y >= GROUND_Y;
    if (!boom) {
      for (const s of solids) {
        if (s.kind === "ground" || s.kind === "wall") continue;
        if (!pointInRect(g.x, g.y, s)) continue;
        boom = true;
        if (s.kind === "crate") damageCrate(state, s, 4);
        break;
      }
    }
    if (!boom && g.friendly) {
      for (const e of state.enemies) {
        if (e.alive && circleHitsRect(g.x, g.y, g.r, e)) {
          boom = true;
          break;
        }
      }
      if (!boom && state.boss?.alive && circleHitsRect(g.x, g.y, g.r + 1, state.boss)) boom = true;
    } else if (!boom && !g.friendly && state.player && circleHitsRect(g.x, g.y, g.r + 1, state.player)) {
      boom = true;
    }
    if (boom) {
      g.dead = true;
      explode(state, g.x, Math.min(g.y, GROUND_Y), g.friendly);
    }
  }
  state.grenades = state.grenades.filter((g) => !g.dead);
}

function updateHazards(state, dt) {
  for (const h of state.hazards) {
    h.x += h.vx * dt;
    h.life -= dt;
    if (state.player && rectsOverlap(h, state.player)) {
      hurtPlayer(state, h.dmg || 2, Math.sign(h.vx) || 1);
    }
  }
  state.hazards = state.hazards.filter((h) => h.life > 0 && h.x > -30 && h.x < state.level.width + 30);
}

function updatePickups(state) {
  const p = state.player;
  for (const it of state.pickups) {
    if (!it.alive) continue;
    if (!rectsOverlap(p, it)) continue;
    if (it.kind === "med") {
      if (p.hp >= p.maxHp) continue;
      p.hp = Math.min(p.maxHp, p.hp + 3);
      popup(state, it.x, it.y - 6, "HP");
    } else {
      if (p.grenades >= 12) continue;
      p.grenades = Math.min(12, p.grenades + 3);
      popup(state, it.x, it.y - 6, "+G");
    }
    it.alive = false;
    state.events.push("pickup");
  }
}

function updateSpikes(state) {
  const p = state.player;
  for (const s of state.spikes) {
    if (!rectsOverlap(p, s)) continue;
    hurtPlayer(state, 2, p.vx >= 0 ? -1 : 1);
    break;
  }
}

function updateCamera(state, dt) {
  const p = state.player;
  const level = state.level;
  let min = 0;
  let max = Math.max(0, level.width - VIEW_W);
  if (state.bossEngaged && state.boss?.alive && p.x > state.boss.arenaLeft) {
    min = clamp(state.boss.arenaLeft - 8, 0, max);
  }
  const target = clamp(p.x + p.w / 2 - VIEW_W * 0.4 + p.facing * 22, min, max);
  const t = 1 - Math.exp(-dt * 6);
  state.camX += (target - state.camX) * t;
  state.camX = clamp(state.camX, min, max);
}

function updateFx(state, dt) {
  for (const f of state.fx) {
    f.life -= dt;
    f.x += (f.vx || 0) * dt;
    f.y += (f.vy || 0) * dt;
    if (f.kind === "spark") f.vy = (f.vy || 0) + 240 * dt;
  }
  state.fx = state.fx.filter((f) => f.life > 0);
  for (const pop of state.popups) {
    pop.life -= dt;
    pop.y -= 18 * dt;
  }
  state.popups = state.popups.filter((pop) => pop.life > 0);
}

function respawn(state) {
  const p = state.player;
  const nades = p.grenades;
  const checkpoint = p.checkpoint;
  const fresh = makePlayer(checkpoint, nades);
  fresh.iFrame = 1.45;
  fresh.checkpoint = checkpoint;
  state.player = fresh;
  state.bullets = [];
  state.grenades = state.grenades.filter((g) => g.friendly);
  state.hazards = [];
  if (state.boss?.alive) {
    const spec = state.level.boss;
    const keptHp = state.boss.hp;
    const added = state.boss.added;
    const reset = makeBoss(spec, state.level);
    reset.hp = Math.max(1, keptHp);
    reset.added = added;
    reset.phase2 = keptHp <= reset.maxHp * 0.5;
    state.boss = reset;
    state.bossEngaged = checkpoint + fresh.w >= spec.trigger;
  }
  state.mode = "play";
}

function stepOnce(state, input, dt) {
  if (input.pause) togglePause(state);
  if (input.start) pressStart(state);
  if (state.mode === "pause") return;

  state.time += dt;
  state.shake = Math.max(0, (state.shake || 0) - dt * 16);
  state.hurtFlash = Math.max(0, (state.hurtFlash || 0) - dt);

  if (state.mode === "title" || state.mode === "over" || state.mode === "win") return;

  updateFx(state, dt);

  if (state.mode === "intro") {
    state.introT -= dt;
    if (state.introT <= 0) state.mode = "play";
    return;
  }
  if (state.mode === "clear") {
    state.clearT -= dt;
    if (state.clearT <= 0) goNext(state);
    return;
  }
  if (state.mode === "dying") {
    state.dyingT -= dt;
    if (state.dyingT <= 0) {
      if (state.lives <= 0) {
        state.mode = "over";
        state.events.push("over");
      } else respawn(state);
    }
    return;
  }

  const solids = activeSolids(state);
  updatePlayer(state, input, dt, solids);
  if (state.mode !== "play") return;
  updateHazards(state, dt);
  if (state.mode !== "play") return;
  updateEnemies(state, dt, solids);
  if (state.mode !== "play") return;
  maybeSpawnBoss(state);
  updateBoss(state, dt);
  if (state.mode !== "play") return;
  updateBullets(state, dt, solids);
  if (state.mode !== "play") return;
  updateGrenades(state, dt, solids);
  if (state.mode !== "play") return;
  updatePickups(state);
  updateSpikes(state);
  if (state.mode !== "play") return;
  updateCamera(state, dt);
}

export function stepGame(state, input = {}, dt = 1 / 60) {
  if (!state.events) state.events = [];
  state.events.length = 0;
  if (!(dt > 0)) return;
  if (dt > 1 / 20) {
    let left = dt;
    let first = true;
    while (left > 1e-8) {
      const h = Math.min(1 / 60, left);
      const slice = first
        ? input
        : { ...input, jump: false, grenade: false, start: false, pause: false };
      stepOnce(state, slice, h);
      first = false;
      left -= h;
    }
    return;
  }
  stepOnce(state, input, dt);
}

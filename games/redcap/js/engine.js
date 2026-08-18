import { TILE, buildAtlas } from "./sprites.js";
import { STAGES, parseLevel } from "./levels.js";
import { audio } from "./audio.js";

const VIEW_W = 256;
const VIEW_H = 240;
const HUD_H = 32;
const SOLID = new Set("#=-Ic{}[]u?!@$Uxh");
const STEP = 1 / 60;
const STOMP_PTS = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
const SMB = {
  walkAcc: 0.037,
  runAcc: 0.056,
  decel: 0.051,
  skid: 0.102,
  maxWalk: 1.5625,
  maxRun: 2.5625,
  gravHold: 0.125,
  gravFall: 0.4375,
  maxFall: 4.0,
  jumpSlow: 4.0,
  jumpFast: 5.0,
};
const ICY = new Set("I");
const HAZARD = new Set("L^");
const WATER = new Set("~");
const QITEM = { "?": "coin", "!": "mushroom", "@": "flower", $: "star", U: "oneup", x: "coin", h: "oneup" };

const keys = new Set();
const tap = new Set();
const padHeld = new Set();
const padTouches = new Map();

function padZone(nx, ny) {
  if (ny > 0.62 && nx < 0.22) return "left";
  if (ny > 0.62 && nx >= 0.22 && nx < 0.44) return "right";
  if (ny > 0.66 && nx > 0.78) return "jump";
  if (ny > 0.66 && nx > 0.58 && nx <= 0.78) return "run";
  if (ny < 0.18 && nx > 0.82) return "pause";
  return "world";
}

function syncPadKeys() {
  padHeld.clear();
  for (const z of padTouches.values()) {
    if (z === "left") padHeld.add("ArrowLeft");
    if (z === "right") padHeld.add("ArrowRight");
    if (z === "jump") padHeld.add("Space");
    if (z === "run") padHeld.add("ShiftLeft");
  }
}

export function bindInput(el, game) {
  const down = (code) => {
    keys.add(code);
    tap.add(code);
  };
  const up = (code) => keys.delete(code);
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    down(e.code);
  });
  window.addEventListener("keyup", (e) => up(e.code));

  const pointerAt = (e, start) => {
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    const mode = game?.mode;
    if (start) {
      const z = padZone(nx, ny);
      padTouches.set(e.pointerId, z);
      if (z === "jump") tap.add("Space");
      if (z === "run") tap.add("ShiftLeft");
      if (z === "pause") tap.add("KeyP");
      if (mode === "title" || mode === "over" || mode === "win" || mode === "intro") {
        tap.add("Space");
        tap.add("Enter");
      }
    } else {
      padTouches.delete(e.pointerId);
    }
    syncPadKeys();
  };

  el.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      pointerAt(e, true);
    },
    { passive: false },
  );
  el.addEventListener(
    "pointermove",
    (e) => {
      if (!padTouches.has(e.pointerId)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      padTouches.set(e.pointerId, padZone(nx, ny));
      syncPadKeys();
    },
    { passive: false },
  );
  const endPtr = (e) => pointerAt(e, false);
  el.addEventListener("pointerup", endPtr);
  el.addEventListener("pointercancel", endPtr);
}

function held(a, b) {
  return keys.has(a) || padHeld.has(a) || (b && (keys.has(b) || padHeld.has(b)));
}

function pressed(code) {
  return tap.has(code);
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.atlas = buildAtlas();
    this.off = document.createElement("canvas");
    this.off.width = VIEW_W;
    this.off.height = VIEW_H;
    this.octx = this.off.getContext("2d");
    this.octx.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
    this.mode = "title";
    this.lives = 3;
    this.coins = 0;
    this.score = 0;
    this.stageIndex = 0;
    this.power = "small";
    this.t = 0;
    this.camX = 0;
    this.ents = [];
    this.pops = [];
    this.level = null;
    this.player = null;
    this.timeLeft = 400;
    this.invuln = 0;
    this.star = 0;
    this.growT = 0;
    this.clearT = 0;
    this.deadT = 0;
    this.introT = 0;
    this.fireballs = [];
    this.paused = false;
    this.msg = "";
    this.acc = 0;
    this.bumps = [];
    this.stompCombo = 0;
    this.clearPhase = "";
    this.hurry = false;
    this.fit();
    window.addEventListener("resize", () => this.fit());
    window.__REDCAP__ = this;
    bindInput(canvas, this);
    this._loop = this.loop.bind(this);
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }

  fit() {
    const p = this.canvas.parentElement;
    const maxW = Math.min(p?.clientWidth || 960, 960);
    const scale = Math.max(1, Math.floor(maxW / VIEW_W) || 1);
    this.canvas.width = VIEW_W * scale;
    this.canvas.height = VIEW_H * scale;
    this.canvas.style.width = `${VIEW_W * scale}px`;
    this.canvas.style.height = `${VIEW_H * scale}px`;
    this.scale = scale;
    this.ctx.imageSmoothingEnabled = false;
  }

  startStage(i = this.stageIndex, keepPower = false) {
    this.stageIndex = i;
    const raw = STAGES[i];
    this.level = parseLevel(raw);
    audio.setTheme(this.level.theme.music);
    this.timeLeft = raw.time;
    this.ents = this.level.entities.map((e) => this.spawn(e));
    this.fireballs = [];
    this.pops = [];
    const pw = keepPower ? this.player?.power || this.power : "small";
    this.power = pw;
    this.player = this.makePlayer(this.level.spawn.x, this.level.spawn.y, pw);
    this.camX = 0;
    this.invuln = 0;
    this.star = 0;
    this.growT = 0;
    this.clearT = 0;
    this.deadT = 0;
    this.introT = 2.4;
    this.mode = "intro";
    this.paused = false;
    this.hurry = false;
    audio._hurry = false;
    this.stompCombo = 0;
    this.bumps = [];
    this.clearPhase = "";
    this.msg = raw.id;
  }

  spawn(e) {
    const base = { ...e, vx: 0, vy: 0, dead: false, t: 0, face: -1 };
    if (e.type === "walker" || e.type === "spiny" || e.type === "turtle") {
      base.w = 14;
      base.h = 14;
      base.vx = -0.5;
      base.y += 2;
    }
    if (e.type === "turtle") {
      base.shell = false;
      base.spin = 0;
    }
    if (e.type === "flyer") {
      base.w = 16;
      base.h = 14;
      base.baseY = e.y;
      base.vx = -0.4;
    }
    if (e.type === "piranha") {
      base.w = 14;
      base.h = 24;
      base.phase = 0;
      base.pipeX = e.pipeX ?? Math.floor(e.x / TILE);
      base.pipeY = e.pipeY ?? Math.floor(e.y / TILE) + 1;
    }
    if (e.type === "fish") {
      base.w = 14;
      base.h = 10;
      base.vx = -0.35;
      base.baseY = e.y;
    }
    if (e.type === "podoboo") {
      base.w = 12;
      base.h = 12;
      base.vy = -3.2;
    }
    if (e.type === "cannon") {
      base.w = 16;
      base.h = 16;
      base.cool = 1.5;
    }
    if (e.type === "coin") {
      base.w = 10;
      base.h = 14;
      base.x += 3;
    }
    if (e.type === "flag") {
      base.w = 8;
      base.h = 144;
    }
    if (e.type === "axe") {
      base.w = 16;
      base.h = 16;
    }
    if (e.type === "platform") {
      base.w = 48;
      base.h = 8;
      base.vx = 0.6;
      base.minX = e.x - 32;
      base.maxX = e.x + 48;
    }
    if (e.type === "spring") {
      base.w = 16;
      base.h = 16;
    }
    if (e.type === "cannonball") {
      base.w = 12;
      base.h = 12;
    }
    if (e.type === "mushroom" || e.type === "oneup" || e.type === "star") {
      base.vx = 0.7;
      base.emerge = 0.55;
    }
    return base;
  }

  makePlayer(x, y, power) {
    const big = power !== "small";
    return {
      x,
      y: y - (big ? 14 : 0),
      vx: 0,
      vy: 0,
      w: 12,
      h: big ? 30 : 15,
      power,
      face: 1,
      onGround: false,
      duck: false,
      skid: false,
      walk: 0,
      coyote: 0,
      buffer: 0,
      dead: false,
      sliding: false,
    };
  }

  addScore(n, x, y) {
    this.score += n;
    if (x != null) this.pops.push({ x, y, text: String(n), t: 0.7 });
  }

  addCoin(n = 1) {
    this.coins += n;
    audio.sfx("coin");
    this.addScore(200);
    while (this.coins >= 100) {
      this.coins -= 100;
      this.lives += 1;
      audio.sfx("oneup");
      this.pops.push({ x: this.player.x, y: this.player.y - 8, text: "1UP", t: 1 });
    }
  }

  tile(tx, ty) {
    const g = this.level.grid;
    if (ty < 0 || ty >= g.length || tx < 0 || tx >= g[0].length) return "#";
    return g[ty][tx];
  }

  solid(tx, ty) {
    return SOLID.has(this.tile(tx, ty));
  }

  setTile(tx, ty, ch) {
    if (this.level.grid[ty] && this.level.grid[ty][tx] !== undefined) this.level.grid[ty][tx] = ch;
  }

  moveSolid(body, dx, dy) {
    body.x += dx;
    const x0 = Math.floor(body.x / TILE);
    const x1 = Math.floor((body.x + body.w - 0.01) / TILE);
    const y0 = Math.floor(body.y / TILE);
    const y1 = Math.floor((body.y + body.h - 0.01) / TILE);
    if (dx > 0) {
      for (let ty = y0; ty <= y1; ty++) {
        if (this.solid(x1, ty)) {
          body.x = x1 * TILE - body.w;
          body.vx = 0;
          return "right";
        }
      }
    } else if (dx < 0) {
      for (let ty = y0; ty <= y1; ty++) {
        if (this.solid(x0, ty)) {
          body.x = (x0 + 1) * TILE;
          body.vx = 0;
          return "left";
        }
      }
    }
    body.y += dy;
    const nx0 = Math.floor(body.x / TILE);
    const nx1 = Math.floor((body.x + body.w - 0.01) / TILE);
    const ny0 = Math.floor(body.y / TILE);
    const ny1 = Math.floor((body.y + body.h - 0.01) / TILE);
    if (dy > 0) {
      for (let tx = nx0; tx <= nx1; tx++) {
        if (this.solid(tx, ny1)) {
          body.y = ny1 * TILE - body.h;
          body.vy = 0;
          body.onGround = true;
          return "down";
        }
      }
    } else if (dy < 0) {
      for (let tx = nx0; tx <= nx1; tx++) {
        if (this.solid(tx, ny0)) {
          body.y = (ny0 + 1) * TILE;
          body.vy = 0;
          this.bump(tx, ny0, body);
          return "up";
        }
      }
    }
    return null;
  }

  bump(tx, ty, who) {
    if (who !== this.player) return;
    const ch = this.tile(tx, ty);
    this.bumps.push({ tx, ty, t: 0.12 });
    if (ch === "=") {
      if (this.player.power === "small") {
        audio.sfx("bump");
      } else {
        this.setTile(tx, ty, ".");
        audio.sfx("break");
        this.addScore(50, tx * TILE, ty * TILE);
        for (let i = 0; i < 4; i++) {
          this.pops.push({
            x: tx * TILE + 4,
            y: ty * TILE + 4,
            vx: (i % 2 ? 1 : -1) * 1.2,
            vy: -2 - (i >> 1),
            debris: true,
            t: 0.5,
          });
        }
      }
      this.bumpEnemyAbove(tx, ty);
      return;
    }
    if (QITEM[ch]) {
      const item = QITEM[ch];
      this.setTile(tx, ty, "u");
      audio.sfx("bump");
      if (item === "coin") {
        this.addCoin();
        this.pops.push({ x: tx * TILE, y: ty * TILE - 8, coin: true, t: 0.45, vy: -3 });
      } else {
        audio.sfx("power");
        this.ents.push(
          this.spawn({
            type: item,
            x: tx * TILE,
            y: ty * TILE,
          }),
        );
        const it = this.ents[this.ents.length - 1];
        it.w = 14;
        it.h = 14;
        it.vx = 0;
        it.vy = 0;
        it.emerge = 0.55;
      }
      this.bumpEnemyAbove(tx, ty);
    }
  }

  bumpEnemyAbove(tx, ty) {
    const box = { x: tx * TILE, y: (ty - 1) * TILE, w: 16, h: 16 };
    for (const e of this.ents) {
      if (e.dead) continue;
      if (["walker", "turtle", "spiny"].includes(e.type) && aabb(e, box)) {
        e.vy = -3;
        e.vx *= -1;
      }
    }
  }

  inWater(body) {
    const tx = Math.floor((body.x + body.w / 2) / TILE);
    const ty = Math.floor((body.y + body.h / 2) / TILE);
    return WATER.has(this.tile(tx, ty));
  }

  hurt() {
    if (this.invuln > 0 || this.star > 0 || this.player.dead) return;
    if (this.player.power !== "small") {
      this.player.power = this.player.power === "fire" ? "big" : "small";
      if (this.player.power === "small") {
        this.player.y += 15;
        this.player.h = 15;
      }
      this.invuln = 2;
      audio.sfx("pipe");
      return;
    }
    this.killPlayer();
  }

  killPlayer() {
    if (this.player.dead) return;
    this.player.dead = true;
    this.player.vy = -4.2;
    this.player.vx = 0;
    this.deadT = 2.4;
    this.mode = "dead";
    audio.sfx("die");
  }

  stomp(e) {
    audio.sfx("stomp");
    this.player.vy = -3.5;
    this.stompCombo += 1;
    const n = STOMP_PTS[Math.min(this.stompCombo - 1, STOMP_PTS.length - 1)];
    if (this.stompCombo >= 8) {
      this.lives += 1;
      audio.sfx("oneup");
      this.pops.push({ x: e.x, y: e.y, text: "1UP", t: 1 });
    } else this.addScore(n, e.x, e.y);
    if (e.type === "turtle" && !e.shell) {
      e.shell = true;
      e.h = 12;
      e.vx = 0;
      e.spin = 0;
      return;
    }
    if (e.type === "turtle" && e.shell) {
      e.spin = this.player.face * 3.5;
      e.vx = e.spin;
      audio.sfx("kick");
      return;
    }
    e.dead = true;
    e.squash = 0.35;
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 5) {
      this.update(STEP);
      this.acc -= STEP;
      n++;
    }
    this.draw();
    tap.clear();
    requestAnimationFrame(this._loop);
  }

  update(dt) {
    audio.tick(dt);
    if (pressed("KeyP") || pressed("Escape")) {
      if (this.mode === "play") {
        this.paused = !this.paused;
        audio.sfx("pause");
      }
    }
    if (this.mode === "title") {
      if (pressed("Space") || pressed("Enter") || pressed("KeyZ")) {
        audio.resume();
        this.lives = 3;
        this.coins = 0;
        this.score = 0;
        this.power = "small";
        this.startStage(0, false);
      }
      return;
    }
    if (this.paused) return;
    if (this.mode === "over" || this.mode === "win") {
      if (pressed("Space") || pressed("Enter")) {
        this.mode = "title";
      }
      return;
    }
    if (this.mode === "intro") {
      this.introT -= dt;
      if (this.introT <= 0 || (this.introT < 1.6 && (pressed("Space") || pressed("Enter") || pressed("KeyZ")))) {
        this.mode = "play";
      }
      return;
    }
    if (this.mode === "dead") {
      this.player.vy += 12 * dt;
      this.player.y += this.player.vy * 60 * dt;
      this.deadT -= dt;
      if (this.deadT <= 0) {
        this.lives -= 1;
        this.power = "small";
        if (this.lives <= 0) {
          this.mode = "over";
          this.msg = "GAME OVER";
        } else this.startStage(this.stageIndex, false);
      }
      return;
    }
    if (this.mode === "clear") {
      this.clearT -= dt;
      const p = this.player;
      p.sliding = true;
      if (this.clearPhase !== "walk" && p.y + p.h < (this.level.h - 2) * TILE) {
        p.y += 2.2;
        p.vy = 0;
      } else {
        this.clearPhase = "walk";
        p.x += 1.35;
        p.face = 1;
        p.onGround = true;
        if (this.timeLeft > 0) {
          const drain = Math.min(this.timeLeft, 2.5);
          this.timeLeft -= drain;
          this.addScore(Math.floor(drain) * 50);
        }
      }
      if (this.clearT <= 0 && this.timeLeft <= 0) {
        if (this.stageIndex >= STAGES.length - 1) {
          this.mode = "win";
          this.msg = "THANK YOU!";
        } else this.startStage(this.stageIndex + 1, true);
      }
      return;
    }

    this.t += dt;
    this.timeLeft -= dt * 2.5;
    if (!this.hurry && this.timeLeft <= 100) {
      this.hurry = true;
      audio._hurry = true;
      audio.sfx("hurry");
    }
    if (this.timeLeft <= 0) this.killPlayer();
    if (this.invuln > 0) this.invuln -= dt;
    if (this.star > 0) this.star -= dt;
    if (this.growT > 0) this.growT -= dt;
    for (const b of this.bumps) b.t -= dt;
    this.bumps = this.bumps.filter((b) => b.t > 0);
    const grounded = this.player.onGround;
    this.updatePlayer(dt);
    if (this.player.onGround && grounded) this.stompCombo = 0;
    this.updateEnts(dt);
    this.updateFire(dt);
    for (const pop of this.pops) {
      pop.t -= dt;
      if (pop.coin) {
        pop.vy += 0.18;
        pop.y += pop.vy;
      } else pop.y -= 0.45;
      if (pop.debris) {
        pop.vy += 0.28;
        pop.x += pop.vx || 0;
        pop.y += pop.vy || 0;
      }
    }
    this.pops = this.pops.filter((p) => p.t > 0);
    const follow = this.player.x - 80;
    if (follow > this.camX) this.camX = Math.min(follow, Math.max(0, this.level.w * TILE - VIEW_W));
    this.camX = Math.max(0, this.camX);
  }

  updatePlayer(dt) {
    const p = this.player;
    if (this.growT > 0) {
      p.vx = 0;
      p.vy = 0;
      return;
    }
    const left = held("ArrowLeft", "KeyA");
    const right = held("ArrowRight", "KeyD");
    const down = held("ArrowDown", "KeyS");
    const jump = held("Space", "KeyZ") || held("KeyK", "ArrowUp");
    const run = held("ShiftLeft", "KeyX") || held("KeyJ");
    const wet = this.inWater(p);
    p.duck = down && p.power !== "small" && p.onGround;
    if (p.duck) p.h = 16;
    else p.h = p.power === "small" ? 15 : 30;

    const max = run ? SMB.maxRun : SMB.maxWalk;
    const acc = (run ? SMB.runAcc : SMB.walkAcc) * (p.onGround ? 1 : 0.65);
    p.skid = false;
    if (!p.duck) {
      if (left) {
        if (p.vx > 0.35 && p.onGround) {
          p.skid = true;
          p.vx -= SMB.skid;
        } else p.vx -= acc;
        p.face = -1;
      } else if (right) {
        if (p.vx < -0.35 && p.onGround) {
          p.skid = true;
          p.vx += SMB.skid;
        } else p.vx += acc;
        p.face = 1;
      } else if (p.onGround) {
        if (p.vx > 0) p.vx = Math.max(0, p.vx - SMB.decel);
        if (p.vx < 0) p.vx = Math.min(0, p.vx + SMB.decel);
      }
    } else if (p.onGround) {
      if (p.vx > 0) p.vx = Math.max(0, p.vx - SMB.decel);
      if (p.vx < 0) p.vx = Math.min(0, p.vx + SMB.decel);
    }
    const iceTile = this.tile(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h + 1) / TILE));
    const ice = ICY.has(iceTile) || (this.level.theme.ground === "ice" && iceTile === "#");
    if (ice && p.onGround) p.vx *= 0.97;
    p.vx = Math.max(-max, Math.min(max, p.vx));
    if (Math.abs(p.vx) > 0.2) p.walk += (run ? 0.22 : 0.16);

    if (p.onGround && (pressed("Space") || pressed("KeyZ") || pressed("KeyK") || pressed("ArrowUp"))) {
      const fast = Math.abs(p.vx) > 1.9;
      p.vy = wet ? -2.3 : fast ? -SMB.jumpFast : -SMB.jumpSlow;
      p.onGround = false;
      audio.sfx(fast ? "jumpRun" : "jump");
    }
    if (!jump && p.vy < 0) p.vy += SMB.gravFall * 0.55;

    const grav = wet ? 0.12 : p.vy < 0 && jump ? SMB.gravHold : SMB.gravFall;
    p.vy += grav;
    if (wet) p.vy = Math.min(p.vy, 1.6);
    else p.vy = Math.min(p.vy, SMB.maxFall);

    p.onGround = false;
    this.moveSolid(p, p.vx, 0);
    this.moveSolid(p, 0, p.vy);

    if (p.y > this.level.h * TILE + 8) this.killPlayer();
    const feet = this.tile(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h + 1) / TILE));
    const mid = this.tile(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h / 2) / TILE));
    if (HAZARD.has(feet) || HAZARD.has(mid)) this.hurt();

    if (p.power === "fire" && (pressed("KeyX") || pressed("KeyJ") || pressed("ShiftLeft"))) {
      if (this.fireballs.length < 2) {
        audio.sfx("fire");
        this.fireballs.push({
          x: p.x + (p.face > 0 ? p.w : -6),
          y: p.y + 8,
          vx: p.face * 4,
          vy: 1.6,
          w: 8,
          h: 8,
          t: 2,
        });
      }
    }
  }

  updateEnts(dt) {
    const p = this.player;
    for (const e of this.ents) {
      if (e.dead && e.squash != null) {
        e.squash -= dt;
        continue;
      }
      if (e.dead) continue;
      e.t += dt;
      if (e.type === "walker" || e.type === "spiny" || (e.type === "turtle" && !e.shell) || (e.type === "turtle" && e.spin)) {
        if (e.type === "turtle" && e.spin) e.vx = e.spin;
        e.vy += SMB.gravFall;
        const hit = this.moveSolid(e, e.vx, 0);
        if (hit) e.vx *= -1;
        this.moveSolid(e, 0, e.vy);
        if (e.y > this.level.h * TILE) e.dead = true;
      }
      if (e.type === "flyer") {
        e.x += e.vx;
        e.y = e.baseY + Math.sin(e.t * 3) * 10;
        if (this.solid(Math.floor(e.x / TILE), Math.floor(e.y / TILE))) e.vx *= -1;
      }
      if (e.type === "fish") {
        e.x += e.vx;
        e.y = e.baseY + Math.sin(e.t * 2) * 6;
      }
      if (e.type === "piranha") {
        e.phase += dt;
        const near = Math.abs(p.x + p.w / 2 - (e.pipeX * TILE + 8)) < 26 && p.y + p.h > (e.pipeY - 4) * TILE;
        if (near) {
          e.hidden = true;
          e.y = e.pipeY * TILE;
        } else {
          const wave = Math.sin(e.phase);
          e.hidden = wave < -0.2;
          e.y = e.pipeY * TILE - 24 + (e.hidden ? 24 : 8 + wave * 8);
        }
      }
      if (e.type === "podoboo") {
        e.vy += 0.28;
        e.y += e.vy;
        if (e.y > (this.level.h - 1) * TILE) {
          e.y = (this.level.h - 1) * TILE;
          e.vy = -4.4;
        }
      }
      if (e.type === "cannon") {
        e.cool -= dt;
        if (e.cool <= 0) {
          e.cool = 2.2;
          const dir = p.x < e.x ? -1 : 1;
          this.ents.push(
            this.spawn({ type: "cannonball", x: e.x + dir * 12, y: e.y }),
          );
          const b = this.ents[this.ents.length - 1];
          b.vx = dir * 1.6;
        }
      }
      if (e.type === "cannonball") {
        e.x += e.vx;
        if (e.x < this.camX - 32 || e.x > this.camX + VIEW_W + 32) e.dead = true;
      }
      if (e.type === "platform") {
        e.x += e.vx;
        if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
        if (p.vy >= 0 && aabb({ x: p.x, y: p.y + p.h - 2, w: p.w, h: 4 }, e)) {
          p.y = e.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.x += e.vx;
        }
      }
      if (e.type === "spring" && p.vy > 0 && aabb(p, e)) {
        p.vy = -6.2;
        audio.sfx("bounce");
      }
      if (e.type === "mushroom" || e.type === "oneup" || e.type === "star") {
        if (e.emerge > 0) {
          e.emerge -= dt;
          e.y -= 0.48;
          e.vx = 0;
        } else {
          e.vy += SMB.gravFall;
          const hit = this.moveSolid(e, e.vx, 0);
          if (hit) e.vx *= -1;
          this.moveSolid(e, 0, e.vy);
          if (e.type === "star" && e.onGround) e.vy = -3.2;
        }
      }
      if (e.type === "flower") {
        /* sits */
      }
      if (e.type === "coin" && aabb(p, e)) {
        e.dead = true;
        this.addCoin();
      }
      if (e.type === "mushroom" && aabb(p, e)) {
        e.dead = true;
        audio.sfx("power");
        if (p.power === "small") {
          p.power = "big";
          p.y -= 15;
          p.h = 30;
          this.growT = 0.75;
        }
        this.power = p.power;
        this.addScore(1000, e.x, e.y);
      }
      if (e.type === "flower" && aabb(p, e)) {
        e.dead = true;
        audio.sfx("power");
        if (p.power === "small") {
          p.power = "big";
          p.y -= 15;
          p.h = 30;
        } else p.power = "fire";
        this.power = p.power;
        this.addScore(1000, e.x, e.y);
      }
      if (e.type === "star" && aabb(p, e)) {
        e.dead = true;
        this.star = 8;
        audio.sfx("power");
      }
      if (e.type === "oneup" && aabb(p, e)) {
        e.dead = true;
        this.lives += 1;
        audio.sfx("oneup");
        this.pops.push({ x: e.x, y: e.y, text: "1UP", t: 1 });
      }
      if (e.type === "flag" && aabb(p, { x: e.x, y: e.y, w: 12, h: e.h })) {
        const top = (p.y - e.y) / 96;
        const pts = top < 0.18 ? 5000 : top < 0.38 ? 2000 : top < 0.58 ? 800 : top < 0.78 ? 400 : 100;
        this.addScore(pts, e.x, p.y);
        this.mode = "clear";
        this.clearT = 7;
        this.clearPhase = "slide";
        this.power = p.power;
        audio.sfx("flag");
      }
      if (e.type === "axe" && aabb(p, e)) {
        this.mode = "clear";
        this.clearT = 7;
        this.clearPhase = "walk";
        this.power = p.power;
        audio.sfx("flag");
      }

      const hostile =
        ["walker", "spiny", "turtle", "flyer", "piranha", "fish", "podoboo", "cannonball"].includes(e.type) &&
        !e.dead &&
        !e.hidden;
      if (hostile && aabb(p, e)) {
        const stomped = p.vy > 0.4 && p.y + p.h - e.y < 10;
        if (this.star > 0) {
          e.dead = true;
          this.addScore(200, e.x, e.y);
          audio.sfx("kick");
        } else if (stomped && e.type !== "spiny" && e.type !== "podoboo" && e.type !== "piranha" && e.type !== "cannonball") {
          this.stomp(e);
        } else if (e.type === "turtle" && e.shell && !e.spin) {
          e.spin = p.face * 4;
          e.vx = e.spin;
          audio.sfx("kick");
          this.invuln = 0.2;
        } else this.hurt();
      }
      if (e.type === "turtle" && e.spin) {
        for (const o of this.ents) {
          if (o === e || o.dead) continue;
          if (["walker", "turtle", "spiny", "flyer"].includes(o.type) && aabb(e, o)) {
            o.dead = true;
            this.addScore(200, o.x, o.y);
          }
        }
      }
    }
    this.ents = this.ents.filter((e) => !e.dead || (e.squash != null && e.squash > 0));
  }

  updateFire(dt) {
    for (const f of this.fireballs) {
      f.t -= dt;
      f.vy += 18 * dt;
      f.x += f.vx * 60 * dt;
      f.y += f.vy * 60 * dt;
      const tx = Math.floor(f.x / TILE);
      const ty = Math.floor(f.y / TILE);
      if (this.solid(tx, ty)) {
        if (f.vy > 0) {
          f.y = ty * TILE - f.h;
          f.vy = -2.4;
        } else f.t = 0;
      }
      for (const e of this.ents) {
        if (e.dead) continue;
        if (["walker", "turtle", "flyer", "piranha", "fish"].includes(e.type) && aabb(f, e)) {
          e.dead = true;
          f.t = 0;
          this.addScore(200, e.x, e.y);
          audio.sfx("kick");
        }
      }
    }
    this.fireballs = this.fireballs.filter((f) => f.t > 0 && f.y < this.level.h * TILE);
  }

  drawImg(img, x, y, flip = false) {
    if (!img) return;
    const ctx = this.octx;
    const sx = Math.round(x - this.camX);
    const sy = Math.round(y);
    if (flip) {
      ctx.save();
      ctx.translate(sx + img.width, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else ctx.drawImage(img, sx, sy);
  }

  tileSprite(ch) {
    const A = this.atlas;
    const th = this.level.theme;
    switch (ch) {
      case "#":
        return th.ground === "ice" ? A.ice : th.ground === "hard" ? A.hard : th.ground === "cloud" ? A.cloud : th.brickBg ? A.dirt : A.grass;
      case "=":
        return A.brick;
      case "-":
      case "u":
        return ch === "u" ? A.used : A.hard;
      case "?":
      case "!":
      case "@":
      case "$":
      case "U":
        return A.qblock;
      case "x":
      case "h":
        return null;
      case "I":
        return A.ice;
      case "c":
        return A.cloud;
      case "L":
        return A.lava;
      case "~":
        return A.water;
      case "^":
        return A.spike;
      case "{":
        return A.pipeTopL;
      case "}":
        return A.pipeTopR;
      case "[":
        return A.pipeL;
      case "]":
        return A.pipeR;
      default:
        return null;
    }
  }

  draw() {
    const ctx = this.octx;
    ctx.imageSmoothingEnabled = false;
    if (this.mode === "title") this.drawTitle();
    else if (this.mode === "intro") this.drawIntro();
    else this.drawWorld();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.off, 0, 0, this.canvas.width, this.canvas.height);
  }

  drawTitle() {
    const ctx = this.octx;
    const A = this.atlas;
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(A.cloud, 20, 32, 48, 20);
    ctx.drawImage(A.cloud, 160, 24, 40, 16);
    ctx.drawImage(A.hill, 0, 168, 80, 32);
    ctx.drawImage(A.hill, 88, 176, 56, 24);
    for (let i = 0; i < 16; i++) {
      ctx.drawImage(A.grass, i * 16, 192);
      ctx.drawImage(A.dirt, i * 16, 208);
    }
    ctx.drawImage(A.bush, 24, 184);
    ctx.drawImage(A.bush, 150, 184);
    ctx.drawImage(A.pipeTopL, 208, 160);
    ctx.drawImage(A.pipeTopR, 224, 160);
    ctx.drawImage(A.pipeL, 208, 176);
    ctx.drawImage(A.pipeR, 224, 176);
    ctx.drawImage(A.big.idle, 36, 160);
    ctx.drawImage(A.walker.a, 92, 176);
    ctx.drawImage(A.turtle.a, 114, 176);
    ctx.fillStyle = "#181818";
    ctx.font = "bold 22px monospace";
    ctx.fillText("红帽奇遇", 71, 64);
    ctx.fillStyle = "#e52521";
    ctx.fillText("红帽奇遇", 70, 62);
    ctx.fillStyle = "#fff8e8";
    ctx.font = "10px monospace";
    ctx.fillText("1 PLAYER GAME", 86, 92);
    if (Math.floor(performance.now() / 400) % 2 === 0) {
      ctx.fillStyle = "#f8d030";
      ctx.fillText("▶", 72, 92);
    }
    ctx.fillStyle = "#203060";
    ctx.font = "8px monospace";
    ctx.fillText("TOP  000000", 98, 112);
    ctx.fillText("非官方粉丝向 · 原创像素", 64, 128);
    ctx.fillStyle = "#fff8e8";
    ctx.fillText("按空格 / 点屏幕", 86, 148);
  }

  drawIntro() {
    const ctx = this.octx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#fff8e8";
    ctx.font = "10px monospace";
    const id = this.level?.id || "1-1";
    ctx.fillText("WORLD", 108, 88);
    ctx.fillText(id, 118, 104);
    const spr = this.atlas.small.idle;
    ctx.drawImage(spr, 96, 128);
    ctx.fillText("×  " + Math.max(0, this.lives), 120, 140);
  }

  drawWorld() {
    const ctx = this.octx;
    const th = this.level.theme;
    ctx.fillStyle = th.sky[0];
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (th.stars) {
      ctx.fillStyle = "#fff8e8";
      for (let i = 0; i < 40; i++) {
        const x = ((i * 73) % VIEW_W) - (this.camX * 0.15) % VIEW_W;
        ctx.fillRect((x + VIEW_W) % VIEW_W, (i * 37) % 120, 1, 1);
      }
    }
    if (th.cloud) {
      const A = this.atlas;
      for (let i = 0; i < 6; i++) {
        const x = i * 90 - ((this.camX * 0.3) % 90);
        ctx.drawImage(A.cloud, x, 18 + (i % 3) * 14, 32, 16);
      }
    }
    if (th.hill) {
      const A = this.atlas;
      const gy = (this.level.h - 2) * TILE;
      for (let i = 0; i < 8; i++) {
        const x = i * 88 - ((this.camX * 0.45) % 88);
        ctx.drawImage(A.hill, x, gy - A.hill.height * 2 + 2, 48, A.hill.height * 2);
      }
    }

    const x0 = Math.max(0, Math.floor(this.camX / TILE) - 1);
    const x1 = Math.min(this.level.w - 1, Math.floor((this.camX + VIEW_W) / TILE) + 1);
    for (let y = 0; y < this.level.h; y++) {
      for (let x = x0; x <= x1; x++) {
        const ch = this.level.grid[y][x];
        const spr = this.tileSprite(ch);
        if (!spr) continue;
        const bump = this.bumps.find((b) => b.tx === x && b.ty === y);
        const yoff = bump ? -Math.sin((1 - bump.t / 0.12) * Math.PI) * 4 : 0;
        ctx.drawImage(spr, Math.round(x * TILE - this.camX), y * TILE + yoff);
      }
    }

    if (th.bush) {
      const A = this.atlas;
      const gy = (this.level.h - 2) * TILE;
      for (let i = 0; i < 10; i++) {
        const x = i * 110 - ((this.camX * 0.7) % 110) + 24;
        ctx.drawImage(A.bush, x, gy - 8);
      }
    }

    if (th.castleEnd) {
      const A = this.atlas;
      const cx = this.level.w * TILE - 72 - this.camX;
      const cy = (this.level.h - 2) * TILE - 48;
      ctx.drawImage(A.castle, cx, cy, 48, 48);
    }

    for (const e of this.ents) this.drawEnt(e);
    for (const f of this.fireballs) {
      const img = this.t % 0.1 < 0.05 ? this.atlas.fireball.a : this.atlas.fireball.b;
      this.drawImg(img, f.x - 4, f.y - 4);
    }
    this.drawPlayer();
    for (const pop of this.pops) {
      if (pop.debris) {
        this.drawImg(this.atlas.debris, pop.x, pop.y);
      } else if (pop.coin) {
        this.drawImg(this.atlas.coin.a, pop.x, pop.y);
      } else {
        ctx.fillStyle = "#fff8e8";
        ctx.font = "8px monospace";
        ctx.fillText(pop.text, pop.x - this.camX, pop.y);
      }
    }

    ctx.fillStyle = "#fff8e8";
    ctx.font = "8px monospace";
    ctx.fillText("阿砖", 24, 16);
    ctx.fillText("WORLD", 148, 16);
    ctx.fillText("TIME", 208, 16);
    ctx.fillText(String(this.score).padStart(6, "0"), 24, 26);
    ctx.drawImage(this.atlas.coin.a, 88, 14);
    ctx.fillText("×" + String(this.coins).padStart(2, "0"), 104, 26);
    ctx.fillText(this.level.id, 156, 26);
    ctx.fillText(String(Math.max(0, Math.ceil(this.timeLeft))).padStart(3, "0"), 214, 26);

    if (this.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#fff";
      ctx.font = "10px monospace";
      ctx.fillText("PAUSED", 108, 120);
    }
    if (this.mode === "over" || this.mode === "win") {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#fff8e8";
      ctx.font = "12px monospace";
      ctx.fillText(this.mode === "over" ? "GAME OVER" : this.msg, 88, 110);
      ctx.font = "8px monospace";
      ctx.fillText("空格返回标题", 96, 132);
    }

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(28, 208, 18, 0, Math.PI * 2);
    ctx.arc(68, 208, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(228, 206, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(188, 210, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(20,24,40,0.7)";
    ctx.font = "7px monospace";
    ctx.fillText("左", 22, 211);
    ctx.fillText("右", 62, 211);
    ctx.fillText("冲", 181, 213);
    ctx.fillText("跳", 221, 210);
  }

  drawEnt(e) {
    if (e.dead && !e.squash) return;
    const A = this.atlas;
    const flip = e.vx > 0 || e.face > 0;
    const frame = Math.floor(this.t * 8) % 2 === 0;
    let img = null;
    if (e.type === "walker") img = e.squash ? A.walker.squish : frame ? A.walker.a : A.walker.b;
    if (e.type === "turtle") {
      const pack = e.color === "red" ? A.redTurtle : A.turtle;
      img = e.shell ? pack.shell : frame ? pack.a : pack.b;
    }
    if (e.type === "spiny") img = frame ? A.spiny.a : A.spiny.b;
    if (e.type === "flyer") img = frame ? A.flyer.a : A.flyer.b;
    if (e.type === "piranha") img = e.hidden ? null : frame ? A.piranha.a : A.piranha.b;
    if (e.type === "fish") img = frame ? A.fish.a : A.fish.b;
    if (e.type === "podoboo") img = frame ? A.lavaBubble.a : A.lavaBubble.b;
    if (e.type === "cannonball") img = A.cannonball;
    if (e.type === "cannon") img = A.hard;
    if (e.type === "coin") img = frame ? A.coin.a : A.coin.b;
    if (e.type === "mushroom") img = A.mushroom;
    if (e.type === "flower") img = A.flower;
    if (e.type === "star") img = A.star;
    if (e.type === "oneup") img = A.oneup;
    if (e.type === "flag") {
      const ctx = this.octx;
      ctx.fillStyle = "#ffffff";
      const px = Math.round(e.x - this.camX + 1);
      const top = Math.round(e.y);
      ctx.fillRect(px, top, 2, (this.level.h - 2) * TILE - e.y);
      ctx.fillStyle = "#3cb043";
      ctx.fillRect(px - 2, top - 3, 6, 6);
      img = A.flag;
    }
    if (e.type === "axe") img = A.castle;
    if (e.type === "spring") img = A.spring;
    if (e.type === "platform") {
      this.octx.fillStyle = "#c48a3a";
      this.octx.fillRect(e.x - this.camX, e.y, e.w, e.h);
      return;
    }
    if (img) this.drawImg(img, e.x - (16 - e.w) / 2, e.y - (img.height - e.h), e.vx > 0);
  }

  drawPlayer() {
    const p = this.player;
    if (this.invuln > 0 && Math.floor(this.t * 20) % 2 === 0 && this.mode === "play") return;
    if (this.growT > 0 && Math.floor(this.t * 16) % 2 === 0) return;
    const fire = p.power === "fire";
    const big = p.power !== "small";
    const pack = fire ? (big ? this.atlas.fireBig : this.atlas.fireSmall) : big ? this.atlas.big : this.atlas.small;
    const packL = fire ? (big ? this.atlas.fireBigL : this.atlas.fireSmallL) : big ? this.atlas.bigL : this.atlas.smallL;
    const use = p.face < 0 ? packL : pack;
    let pose = "idle";
    if (p.dead) pose = "die";
    else if (p.duck && pack.duck) pose = "duck";
    else if (!p.onGround) pose = "jump";
    else if (p.skid) pose = "skid";
    else if (Math.abs(p.vx) > 0.2) pose = Math.floor(p.walk) % 2 === 0 ? "walk0" : "walk1";
    const img = use[pose] || use.idle;
    if (!img) return;
    const y = p.y - (img.height - p.h);
    if (this.star > 0) {
      this.octx.save();
      this.octx.globalAlpha = 0.85 + Math.sin(this.t * 20) * 0.15;
    }
    this.drawImg(img, p.x - (img.width - p.w) / 2, y);
    if (this.star > 0) this.octx.restore();
  }
}

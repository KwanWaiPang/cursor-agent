import { TILE, buildAtlas } from "./sprites.js";
import { STAGES, parseLevel } from "./levels.js";
import { audio } from "./audio.js";

const VIEW_W = 256;
const VIEW_H = 240;
const HUD_H = 16;
const SOLID = new Set("#=-Ic{}[]u?!@$Ux");
const ICY = new Set("I");
const HAZARD = new Set("L^");
const WATER = new Set("~");
const QITEM = { "?": "coin", "!": "mushroom", "@": "flower", $: "star", U: "oneup", x: "coin" };

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
    this.invuln = 1.2;
    this.star = 0;
    this.growT = 0;
    this.clearT = 0;
    this.deadT = 0;
    this.introT = 1.6;
    this.mode = "intro";
    this.paused = false;
    this.msg = `${raw.id}  ${raw.name}`;
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
      base.h = 96;
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
      return;
    }
    if (QITEM[ch]) {
      const item = QITEM[ch];
      this.setTile(tx, ty, "u");
      audio.sfx("bump");
      if (item === "coin") this.addCoin();
      else {
        audio.sfx("power");
        this.ents.push(
          this.spawn({
            type: item,
            x: tx * TILE,
            y: (ty - 1) * TILE,
          }),
        );
        const it = this.ents[this.ents.length - 1];
        it.w = 14;
        it.h = 14;
        it.vx = item === "mushroom" || item === "oneup" || item === "star" ? 0.7 : 0;
        it.vy = item === "star" ? -3 : -1;
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
    this.player.vy = -3.2;
    this.addScore(100, e.x, e.y);
    if (e.type === "turtle" && !e.shell) {
      e.shell = true;
      e.h = 12;
      e.vx = 0;
      e.spin = 0;
      return;
    }
    if (e.type === "turtle" && e.shell) {
      e.spin = this.player.face * 4;
      e.vx = e.spin;
      audio.sfx("kick");
      return;
    }
    e.dead = true;
    e.squash = 0.35;
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
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
      if (this.introT <= 0 || pressed("Space") || pressed("Enter") || pressed("KeyZ")) this.mode = "play";
      return;
    }
    if (this.mode === "dead") {
      this.player.vy += 12 * dt;
      this.player.y += this.player.vy * 60 * dt;
      this.deadT -= dt;
      if (this.deadT <= 0) {
        this.lives -= 1;
        this.power = "small";
        if (this.lives < 0) {
          this.mode = "over";
          this.msg = "游戏结束";
        } else this.startStage(this.stageIndex, false);
      }
      return;
    }
    if (this.mode === "clear") {
      this.clearT -= dt;
      const p = this.player;
      p.sliding = true;
      if (p.y + p.h < (this.level.h - 2) * TILE) p.y += 80 * dt;
      else {
        p.x += 50 * dt;
        p.face = 1;
      }
      if (this.clearT <= 0) {
        if (this.stageIndex >= STAGES.length - 1) {
          this.mode = "win";
          this.msg = "王国光复！";
        } else this.startStage(this.stageIndex + 1, true);
      }
      return;
    }

    this.t += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.killPlayer();
    if (this.invuln > 0) this.invuln -= dt;
    if (this.star > 0) this.star -= dt;
    this.updatePlayer(dt);
    this.updateEnts(dt);
    this.updateFire(dt);
    for (const pop of this.pops) {
      pop.t -= dt;
      pop.y -= 20 * dt;
      if (pop.debris) {
        pop.vy += 12 * dt;
        pop.x += (pop.vx || 0) * 60 * dt;
        pop.y += (pop.vy || 0) * 60 * dt;
      }
    }
    this.pops = this.pops.filter((p) => p.t > 0);
    const target = this.player.x - 80;
    this.camX += (target - this.camX) * Math.min(1, dt * 8);
    this.camX = Math.max(0, Math.min(this.camX, this.level.w * TILE - VIEW_W));
  }

  updatePlayer(dt) {
    const p = this.player;
    const left = held("ArrowLeft", "KeyA");
    const right = held("ArrowRight", "KeyD");
    const down = held("ArrowDown", "KeyS");
    const jump = held("Space", "KeyZ") || held("KeyK", "ArrowUp");
    const run = held("ShiftLeft", "KeyX") || held("KeyJ");
    const wet = this.inWater(p);
    p.duck = down && p.power !== "small" && p.onGround;
    if (p.duck) p.h = 16;
    else p.h = p.power === "small" ? 15 : 30;

    const max = run ? 2.4 : 1.4;
    const acc = (p.onGround ? 10 : 6) * dt;
    p.skid = false;
    if (!p.duck) {
      if (left) {
        if (p.vx > 0.4 && p.onGround) p.skid = true;
        p.vx -= acc * 60 * 0.08;
        p.face = -1;
      } else if (right) {
        if (p.vx < -0.4 && p.onGround) p.skid = true;
        p.vx += acc * 60 * 0.08;
        p.face = 1;
      } else if (p.onGround) {
        p.vx *= Math.pow(0.01, dt);
      }
    } else if (p.onGround) p.vx *= Math.pow(0.01, dt);
    const iceTile = this.tile(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h + 1) / TILE));
    const ice = ICY.has(iceTile) || (this.level.theme.ground === "ice" && iceTile === "#");
    if (ice && p.onGround) p.vx *= 0.995;
    p.vx = Math.max(-max, Math.min(max, p.vx));
    if (Math.abs(p.vx) > 0.2) p.walk += dt * (run ? 14 : 10);

    if (p.onGround) p.coyote = 0.1;
    else p.coyote -= dt;
    if (pressed("Space") || pressed("KeyZ") || pressed("KeyK") || pressed("ArrowUp")) p.buffer = 0.12;
    else p.buffer -= dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = wet ? -2.2 : run && Math.abs(p.vx) > 1.6 ? -5.1 : -4.35;
      p.onGround = false;
      p.coyote = 0;
      p.buffer = 0;
      audio.sfx("jump");
    }
    if (!jump && p.vy < -1.2) p.vy += 18 * dt;

    const grav = wet ? 6 : p.vy < 0 ? 13 : 18;
    p.vy += grav * dt;
    if (wet) p.vy = Math.min(p.vy, 1.6);
    else p.vy = Math.min(p.vy, 6);

    p.onGround = false;
    this.moveSolid(p, p.vx * 60 * dt, 0);
    this.moveSolid(p, 0, p.vy * 60 * dt);

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
          vx: p.face * 3.2,
          vy: 1,
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
        e.vy += 18 * dt;
        const hit = this.moveSolid(e, e.vx * 60 * dt, 0);
        if (hit) e.vx *= -1;
        this.moveSolid(e, 0, e.vy * 60 * dt);
        if (e.y > this.level.h * TILE) e.dead = true;
      }
      if (e.type === "flyer") {
        e.x += e.vx * 60 * dt;
        e.y = e.baseY + Math.sin(e.t * 3) * 10;
        if (this.solid(Math.floor(e.x / TILE), Math.floor(e.y / TILE))) e.vx *= -1;
      }
      if (e.type === "fish") {
        e.x += e.vx * 60 * dt;
        e.y = e.baseY + Math.sin(e.t * 2) * 6;
      }
      if (e.type === "piranha") {
        e.phase += dt;
        const hide = Math.sin(e.phase) < 0;
        e.y = e.pipeY * TILE - 24 + (hide ? 24 : Math.sin(e.phase) * 8);
        e.hidden = hide;
      }
      if (e.type === "podoboo") {
        e.vy += 10 * dt;
        e.y += e.vy * 60 * dt;
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
        e.x += e.vx * 60 * dt;
        if (e.x < this.camX - 32 || e.x > this.camX + VIEW_W + 32) e.dead = true;
      }
      if (e.type === "platform") {
        e.x += e.vx * 60 * dt;
        if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
        if (p.vy >= 0 && aabb({ x: p.x, y: p.y + p.h - 2, w: p.w, h: 4 }, e)) {
          p.y = e.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.x += e.vx * 60 * dt;
        }
      }
      if (e.type === "spring" && p.vy > 0 && aabb(p, e)) {
        p.vy = -6.2;
        audio.sfx("bounce");
      }
      if (e.type === "mushroom" || e.type === "oneup" || e.type === "star") {
        e.vy += 12 * dt;
        const hit = this.moveSolid(e, e.vx * 60 * dt, 0);
        if (hit) e.vx *= -1;
        this.moveSolid(e, 0, e.vy * 60 * dt);
        if (e.type === "star") {
          if (e.onGround) e.vy = -3.2;
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
      if (e.type === "flag" && aabb(p, { x: e.x, y: e.y, w: 12, h: 80 })) {
        this.mode = "clear";
        this.clearT = 2.8;
        this.power = p.power;
        audio.sfx("flag");
        this.addScore(Math.floor(this.timeLeft) * 10);
      }
      if (e.type === "axe" && aabb(p, e)) {
        this.mode = "clear";
        this.clearT = 2.2;
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
    if (this.mode === "title") {
      this.drawTitle();
    } else {
      this.drawWorld();
    }
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.off, 0, 0, this.canvas.width, this.canvas.height);
  }

  drawTitle() {
    const ctx = this.octx;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, "#5c94fc");
    g.addColorStop(1, "#b8e0ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const A = this.atlas;
    for (let i = 0; i < 8; i++) ctx.drawImage(A.hill, 20 + i * 40, 140);
    for (let i = 0; i < 16; i++) ctx.drawImage(A.grass, i * 16, 192);
    for (let i = 0; i < 16; i++) ctx.drawImage(A.dirt, i * 16, 208);
    ctx.drawImage(A.bush, 40, 176);
    ctx.drawImage(A.bush, 180, 176);
    ctx.drawImage(A.cloud, 30, 40);
    ctx.drawImage(A.cloud, 140, 28);
    ctx.drawImage(A.castle, 200, 160);
    ctx.drawImage(A.big.idle, 48, 160);
    ctx.drawImage(A.walker.a, 90, 176);
    ctx.drawImage(A.turtle.a, 120, 176);
    ctx.fillStyle = "#fff8e8";
    ctx.font = "bold 18px monospace";
    ctx.fillText("红帽奇遇", 78, 70);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#203060";
    ctx.fillText("网页平台跳跃 · 致敬超级马里奥", 48, 88);
    ctx.fillStyle = "#fff8e8";
    ctx.fillText("按 空格 / 点屏幕 开始", 64, 118);
    ctx.fillText("方向移动  Z/空格跳  X冲刺/喷火", 42, 132);
  }

  drawWorld() {
    const ctx = this.octx;
    const th = this.level.theme;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g;
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
        const x = i * 90 - (this.camX * 0.3) % 90;
        ctx.drawImage(A.cloud, x, 24 + (i % 3) * 12);
      }
    }
    if (th.hill) {
      const A = this.atlas;
      for (let i = 0; i < 10; i++) {
        const x = i * 70 - (this.camX * 0.45) % 70;
        ctx.drawImage(A.hill, x, 150);
      }
    }

    const x0 = Math.max(0, Math.floor(this.camX / TILE) - 1);
    const x1 = Math.min(this.level.w - 1, Math.floor((this.camX + VIEW_W) / TILE) + 1);
    for (let y = 0; y < this.level.h; y++) {
      for (let x = x0; x <= x1; x++) {
        const ch = this.level.grid[y][x];
        const spr = this.tileSprite(ch);
        if (!spr) continue;
        ctx.drawImage(spr, Math.round(x * TILE - this.camX), y * TILE);
      }
    }

    if (th.bush) {
      const A = this.atlas;
      for (let i = 0; i < 12; i++) {
        const x = i * 96 - (this.camX * 0.7) % 96;
        ctx.drawImage(A.bush, x, (this.level.h - 3) * TILE);
      }
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
      } else {
        ctx.fillStyle = "#fff8e8";
        ctx.font = "8px monospace";
        ctx.fillText(pop.text, pop.x - this.camX, pop.y);
      }
    }

    ctx.fillStyle = "rgba(10,8,20,0.55)";
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = "#fff8e8";
    ctx.font = "8px monospace";
    ctx.fillText(`阿砖 ×${Math.max(0, this.lives)}`, 6, 11);
    ctx.fillText(`金币 ${this.coins}`, 78, 11);
    ctx.fillText(`${this.level.id}`, 140, 11);
    ctx.fillText(`时间 ${Math.max(0, Math.ceil(this.timeLeft))}`, 178, 11);
    ctx.fillText(`${this.score}`.padStart(6, "0"), 6, 228);

    if (this.mode === "intro") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(40, 90, 176, 36);
      ctx.fillStyle = "#fff8e8";
      ctx.font = "10px monospace";
      ctx.fillText(this.msg, 56, 112);
    }
    if (this.paused) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#fff";
      ctx.fillText("暂停", 112, 120);
    }
    if (this.mode === "over" || this.mode === "win") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = "#fff8e8";
      ctx.font = "14px monospace";
      ctx.fillText(this.msg, 86, 110);
      ctx.font = "9px monospace";
      ctx.fillText("空格返回标题", 92, 132);
    }

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(28, 200, 22, 0, Math.PI * 2);
    ctx.arc(70, 200, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(228, 200, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(188, 200, 16, 0, Math.PI * 2);
    ctx.fill();
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
    if (e.type === "flag") img = A.flag;
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
    const y = p.y - (img.height - p.h);
    if (this.star > 0) {
      this.octx.save();
      this.octx.globalAlpha = 0.85 + Math.sin(this.t * 20) * 0.15;
    }
    this.drawImg(img, p.x - (img.width - p.w) / 2, y);
    if (this.star > 0) this.octx.restore();
  }
}

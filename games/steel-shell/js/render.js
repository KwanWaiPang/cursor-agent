import { GROUND_Y, VIEW_H, VIEW_W } from "./engine.js";
import { PAL, SPRITES } from "./sprites.js";

const THEMES = {
  station: {
    skyTop: "#f0b27a",
    skyMid: "#c47d62",
    skyBot: "#6d7c86",
    sun: "#ffe1a8",
    sunX: 250,
    far: "#8a5340",
    mid: "#5c4036",
    ground: "#6a4e3e",
    groundEdge: "#c49a6a",
    rivet: "#3a2a22",
    metal: "#8d979c",
    accent: "#e6b15a",
    platform: "#5d6a70",
  },
  pipe: {
    skyTop: "#163044",
    skyMid: "#245868",
    skyBot: "#1a2428",
    sun: "#b7fff0",
    sunX: 64,
    far: "#143038",
    mid: "#1e464c",
    ground: "#2a3942",
    groundEdge: "#7fbfb4",
    rivet: "#9fd0c8",
    metal: "#6e8084",
    accent: "#7fd0c8",
    platform: "#3d555c",
  },
  fort: {
    skyTop: "#5a261c",
    skyMid: "#3a1c18",
    skyBot: "#140e0c",
    sun: "#ffb089",
    sunX: 200,
    far: "#3a221c",
    mid: "#4a2c28",
    ground: "#3a2c2a",
    groundEdge: "#a86848",
    rivet: "#e0a070",
    metal: "#b08958",
    accent: "#ff8a3d",
    platform: "#5a4038",
  },
};

const cache = new Map();

function bake(rows) {
  if (cache.has(rows)) return cache.get(rows);
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = PAL[rows[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  cache.set(rows, c);
  return c;
}

function blit(ctx, rows, x, y, flip, scale = 2) {
  const c = bake(rows);
  const dw = c.width * scale;
  const dh = c.height * scale;
  const dx = Math.round(x);
  const dy = Math.round(y);
  if (!flip) {
    ctx.drawImage(c, dx, dy, dw, dh);
    return;
  }
  ctx.save();
  ctx.translate(dx + dw, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(c, 0, 0, dw, dh);
  ctx.restore();
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawSky(ctx, theme) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, theme.skyTop);
  g.addColorStop(0.52, theme.skyMid);
  g.addColorStop(1, theme.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = theme.sun;
  ctx.beginPath();
  ctx.arc(theme.sunX, 32, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawFar(ctx, cam, theme) {
  const par = cam * 0.28;
  for (let i = -1; i < 7; i++) {
    const x = Math.round(i * 78 - (par % 78));
    const h = 26 + Math.floor(hash(i + 3) * 42);
    ctx.fillStyle = theme.far;
    ctx.fillRect(x, 118 - h, 40 + Math.floor(hash(i) * 18), h);
    ctx.fillStyle = theme.accent;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(x + 8, 124 - h, 4, 4);
    ctx.fillRect(x + 18, 130 - h, 4, 4);
    ctx.globalAlpha = 1;
  }
}

function drawMid(ctx, cam, themeName, theme) {
  const par = cam * 0.55;
  if (themeName === "pipe") {
    for (let i = -1; i < 8; i++) {
      const x = Math.round(i * 64 - (par % 64));
      ctx.fillStyle = theme.mid;
      ctx.fillRect(x, 0, 12, 36 + (i % 4) * 10);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(x, 28, 12, 3);
    }
    return;
  }
  if (themeName === "fort") {
    for (let i = -1; i < 6; i++) {
      const x = Math.round(i * 90 - (par % 90));
      ctx.fillStyle = theme.mid;
      ctx.fillRect(x, 86, 42, 36);
      ctx.fillRect(x - 4, 82, 50, 5);
      ctx.fillStyle = theme.accent;
      ctx.fillRect(x + 18, 62, 3, 22);
      ctx.fillRect(x + 18, 62, 16, 8);
    }
    return;
  }
  ctx.strokeStyle = "rgba(50, 28, 18, 0.45)";
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(VIEW_W, 60);
  ctx.stroke();
  for (let i = -1; i < 6; i++) {
    const x = Math.round(i * 96 - (par % 96));
    ctx.fillStyle = theme.mid;
    ctx.fillRect(x, 46, 5, 70);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x - 4, 54, 13, 4);
  }
}

function drawGround(ctx, level, theme) {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, GROUND_Y, level.width, 80);
  ctx.fillStyle = theme.groundEdge;
  ctx.fillRect(0, GROUND_Y, level.width, 3);
  ctx.fillStyle = theme.rivet;
  for (let x = 0; x < level.width; x += 16) ctx.fillRect(x + 6, GROUND_Y + 8, 2, 2);
  if (level.theme === "station") {
    ctx.fillStyle = "#2a211c";
    ctx.fillRect(0, GROUND_Y + 14, level.width, 2);
    ctx.fillRect(0, GROUND_Y + 20, level.width, 2);
    for (let x = 0; x < level.width; x += 28) ctx.fillRect(x, GROUND_Y + 14, 3, 8);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  if (p.iFrame > 0 && Math.floor(state.time * 16) % 2 === 0) return;
  let rows = SPRITES.playerStand;
  if (p.crouch) rows = SPRITES.playerCrouch;
  else if (!p.grounded) rows = SPRITES.playerJump;
  else if (Math.abs(p.vx) > 22) rows = Math.floor(p.runT * 10) % 2 === 0 ? SPRITES.playerRunA : SPRITES.playerRunB;
  const sw = rows[0].length * 2;
  const sh = rows.length * 2;
  const kick = p.kick > 0 ? p.facing * 2 : 0;
  blit(ctx, rows, p.x + p.w / 2 - sw / 2 - kick, p.y + p.h - sh, p.facing < 0);
  if (p.kick > 0) {
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(
      Math.round(p.x + p.w / 2 + p.aimX * 12),
      Math.round(p.y + (p.crouch ? 6 : 10) + p.aimY * 6),
      3,
      2,
    );
  }
}

function drawEnemy(ctx, e, time) {
  if (!e.alive) return;
  if (e.hurtT > 0 && Math.floor(time * 24) % 2 === 0) return;
  const walk = Math.abs(e.vx) > 8 && Math.floor(time * 8) % 2 === 0;
  const rows = e.kind === "grenadier" ? SPRITES.grenadier : walk ? SPRITES.soldierWalk : e.kind === "shield" ? SPRITES.shield : SPRITES.soldier;
  const sw = rows[0].length * 2;
  const sh = rows.length * 2;
  blit(ctx, rows, e.x + e.w / 2 - sw / 2, e.y + e.h - sh, e.dir < 0);
  if (e.kind === "shield") {
    const sx = e.dir > 0 ? e.x + e.w - 2 : e.x - 8;
    ctx.fillStyle = "#d7e0e8";
    ctx.fillRect(Math.round(sx), Math.round(e.y + 4), 8, 20);
    ctx.fillStyle = "#7f93a0";
    ctx.fillRect(Math.round(sx), Math.round(e.y + 4), 8, 3);
  }
}

function drawBoss(ctx, b, time) {
  if (!b?.alive) return;
  const flash = b.hurtT > 0;
  ctx.save();
  if (flash) ctx.globalAlpha = 0.65;
  if (b.kind === "gunship") {
    const y = b.y + Math.round(Math.sin(time * 8) * 0);
    ctx.fillStyle = "#22343c";
    ctx.fillRect(b.x, y + 6, b.w, 10);
    ctx.fillStyle = "#3d6e78";
    ctx.fillRect(b.x + 6, y, b.w - 12, 8);
    ctx.fillStyle = "#d7fff6";
    ctx.fillRect(b.x + 10, y + 2, 8, 3);
    ctx.fillRect(b.x + b.w - 18, y + 2, 8, 3);
    ctx.fillStyle = "#101416";
    ctx.beginPath();
    ctx.arc(b.x + 14, y + 4, 6, 0, Math.PI * 2);
    ctx.arc(b.x + b.w - 14, y + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e6b15a";
    ctx.fillRect(b.x + b.w / 2 - 2, y + 14, 4, 8);
  } else if (b.kind === "crawler") {
    const bob = b.phase2 ? Math.sin(time * 18) * 1 : 0;
    ctx.fillStyle = "#2a211c";
    ctx.fillRect(b.x, b.y + 16 + bob, b.w, 18);
    ctx.fillStyle = "#5a4034";
    ctx.fillRect(b.x + 8, b.y + 6 + bob, b.w - 22, 18);
    ctx.fillStyle = b.phase2 ? "#ffd0a0" : "#ff8a3d";
    const mouth = 6 + Math.sin(time * 6) * 2;
    ctx.fillRect(b.x + 14, b.y + 12 + bob, mouth, 8);
    ctx.fillStyle = "#c4a06a";
    ctx.fillRect(b.x + b.w - 18, b.y - 6, 8, 16);
    ctx.fillStyle = "#1a120e";
    for (let i = 0; i < 3; i++) ctx.fillRect(b.x + 8 + i * 22, GROUND_Y - 8, 10, 8);
    ctx.fillStyle = "#e6b15a";
    ctx.fillRect(b.x - 6, b.y + 18, 8, 6);
  } else {
    const step = Math.sin(time * 6) * 2;
    ctx.fillStyle = "#3a4650";
    ctx.fillRect(b.x + 6, GROUND_Y - 16, 8, 16);
    ctx.fillRect(b.x + b.w - 16, GROUND_Y - 16 + step, 8, 16 - step);
    ctx.fillStyle = "#2e6f78";
    ctx.fillRect(b.x + 4, b.y + 10, b.w - 8, 22);
    ctx.fillStyle = "#d7e2e6";
    ctx.fillRect(b.x + 8, b.y + 14, b.w - 16, 8);
    ctx.fillStyle = "#ffc14a";
    ctx.fillRect(b.x + 12, b.y + 16, b.w - 24, 3);
    ctx.fillStyle = "#66727a";
    const barrel = b.dir >= 0 ? b.x + b.w - 6 : b.x - 10;
    ctx.fillRect(barrel, b.y + 20, 16, 4);
    ctx.fillStyle = "#1a120e";
    ctx.fillRect(b.x + b.w / 2, b.y, 2, 12);
    if (b.slamT > 0) {
      ctx.fillStyle = "rgba(255, 120, 60, 0.85)";
      ctx.fillRect(b.x - 6, GROUND_Y - 4, b.w + 12, 4);
    }
  }
  ctx.restore();
}

export function drawGame(ctx, state) {
  ctx.imageSmoothingEnabled = false;
  const theme = THEMES[state.level?.theme] || THEMES.station;
  drawSky(ctx, theme);
  if (!state.level || !state.player) {
    drawFar(ctx, state.time * 18, theme);
    drawMid(ctx, state.time * 28, "station", theme);
    ctx.fillStyle = theme.ground;
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = theme.groundEdge;
    ctx.fillRect(0, GROUND_Y, VIEW_W, 3);
    ctx.fillStyle = "#2e6f78";
    ctx.fillRect(196, GROUND_Y - 40, 28, 28);
    ctx.fillStyle = "#ffc14a";
    ctx.fillRect(204, GROUND_Y - 30, 12, 4);
    return;
  }

  const shakeX = state.shake ? Math.round(Math.sin(state.time * 80) * state.shake) : 0;
  const shakeY = state.shake ? Math.round(Math.cos(state.time * 66) * state.shake * 0.4) : 0;
  drawFar(ctx, state.camX, theme);
  drawMid(ctx, state.camX, state.level.theme, theme);

  ctx.save();
  ctx.translate(Math.round(-state.camX + shakeX), shakeY);
  drawGround(ctx, state.level, theme);

  for (const s of state.spikes) {
    ctx.fillStyle = state.level.theme === "pipe" ? "#d5fff6" : "#d5dde2";
    for (let x = s.x; x < s.x + s.w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y);
      ctx.lineTo(x + 3, GROUND_Y - 8);
      ctx.lineTo(x + 6, GROUND_Y);
      ctx.fill();
    }
  }

  for (const d of state.decals) {
    ctx.fillStyle = "rgba(20, 12, 8, 0.45)";
    ctx.beginPath();
    ctx.ellipse(d.x, d.y - 1, d.r, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const plat of state.oneWay) {
    ctx.fillStyle = theme.platform;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.fillStyle = theme.groundEdge;
    ctx.fillRect(plat.x, plat.y, plat.w, 2);
  }

  for (const c of state.level.checkpoints) {
    const reached = state.player.checkpoint >= c;
    ctx.fillStyle = reached ? theme.accent : "#2a2420";
    ctx.fillRect(c, GROUND_Y - 34, 2, 34);
    ctx.fillRect(c + 2, GROUND_Y - 32, 10, 6);
  }

  const gate = state.level.boss.trigger;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(gate, GROUND_Y - 46, 3, 46);
  ctx.fillRect(gate + 26, GROUND_Y - 32, 3, 32);
  ctx.fillRect(gate, GROUND_Y - 46, 26, 7);

  for (const s of state.solids) {
    if (s.kind !== "crate" || s.dead) continue;
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = "#2a211c";
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    ctx.beginPath();
    ctx.moveTo(s.x + 2, s.y + 2);
    ctx.lineTo(s.x + s.w - 2, s.y + s.h - 2);
    ctx.moveTo(s.x + s.w - 2, s.y + 2);
    ctx.lineTo(s.x + 2, s.y + s.h - 2);
    ctx.stroke();
  }

  for (const it of state.pickups) {
    if (!it.alive) continue;
    const bob = Math.sin(state.time * 5 + it.x) * 1.5;
    if (it.kind === "med") {
      ctx.fillStyle = "#2f8f62";
      ctx.fillRect(it.x, it.y + bob, 12, 12);
      ctx.fillStyle = "#e9fff2";
      ctx.fillRect(it.x + 5, it.y + bob + 2, 2, 8);
      ctx.fillRect(it.x + 2, it.y + bob + 5, 8, 2);
    } else {
      ctx.fillStyle = "#e07a32";
      ctx.fillRect(it.x + 2, it.y + 2 + bob, 8, 10);
      ctx.fillStyle = "#2a211c";
      ctx.fillRect(it.x + 4, it.y + bob, 4, 3);
    }
  }

  for (const h of state.hazards) {
    ctx.fillStyle = "#ffb15a";
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = "#fff1d2";
    ctx.fillRect(h.x, h.y, h.w, 2);
  }

  for (const e of state.enemies) drawEnemy(ctx, e, state.time);
  drawBoss(ctx, state.boss, state.time);
  drawPlayer(ctx, state);

  for (const g of state.grenades) {
    ctx.fillStyle = "#2a211c";
    ctx.fillRect(g.x - 3, g.y - 3, 7, 7);
    ctx.fillStyle = g.friendly ? "#ffb15a" : "#d24b45";
    ctx.fillRect(g.x - 2, g.y - 2, 5, 5);
  }

  for (const b of state.bullets) {
    ctx.fillStyle = b.friendly ? "#e7fff8" : "#ffb15a";
    const len = b.friendly ? 4 : 3;
    ctx.fillRect(b.x - len / 2, b.y - 1, len, 2);
  }

  for (const f of state.fx) {
    if (f.kind === "boom") {
      const k = 1 - f.life / f.max;
      ctx.strokeStyle = `rgba(255, 210, 140, ${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 5 + k * 34, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    const alpha = Math.max(0, f.life / (f.max || 0.3));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.kind === "dust" ? "rgba(232, 214, 190, 0.9)" : f.color || "#fff";
    ctx.fillRect(f.x, f.y, f.kind === "dust" ? 3 : 2, f.kind === "dust" ? 2 : 2);
    ctx.globalAlpha = 1;
  }

  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  for (const pop of state.popups) {
    ctx.fillStyle = "#fff6df";
    ctx.fillText(pop.text, pop.x, pop.y);
  }

  const p = state.player;
  ctx.strokeStyle = "rgba(255, 236, 210, 0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const mx = p.x + p.w / 2 + p.aimX * 8;
  const my = p.y + (p.crouch ? 7 : 10) + p.aimY * 6;
  ctx.moveTo(mx, my);
  ctx.lineTo(mx + p.aimX * 10, my + p.aimY * 10);
  ctx.stroke();

  ctx.restore();

  if (state.hurtFlash > 0) {
    ctx.fillStyle = `rgba(160, 32, 24, ${Math.min(0.35, state.hurtFlash)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

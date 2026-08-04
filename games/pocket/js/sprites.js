/**
 * 程序化像素绘制 — 不使用官方立绘。
 */
import { SPECIES } from "./data.js";

/** 画一格地图 */
export function drawTile(ctx, ch, px, py, s, ox = 0, oy = 0) {
  const x = px * s + ox;
  const y = py * s + oy;
  switch (ch) {
    case ".":
      ctx.fillStyle = "#7cbc4a";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#6aaa3e";
      if (((px + py) & 1) === 0) ctx.fillRect(x + 2, y + 2, 3, 3);
      break;
    case ",":
      ctx.fillStyle = "#c9b48a";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#b8a378";
      ctx.fillRect(x, y + s - 2, s, 2);
      break;
    case "G":
      ctx.fillStyle = "#5a9a32";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#3f7a22";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 2 + (i % 2) * 7, y + 2 + ((i / 2) | 0) * 7, 5, 8);
      }
      break;
    case "~":
      ctx.fillStyle = "#3a7ec8";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#5aa0e0";
      ctx.fillRect(x, y + 4, s, 2);
      ctx.fillRect(x + 3, y + 10, s - 3, 2);
      break;
    case "T":
      ctx.fillStyle = "#5a9a32";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#2d6b1c";
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y + 1);
      ctx.lineTo(x + s - 1, y + s - 3);
      ctx.lineTo(x + 1, y + s - 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#6b4423";
      ctx.fillRect(x + s / 2 - 1, y + s - 4, 3, 4);
      break;
    case "#":
      ctx.fillStyle = "#5a5348";
      ctx.fillRect(x, y, s, s);
      break;
    case "B":
      ctx.fillStyle = "#8b6b4a";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#6e5338";
      ctx.fillRect(x, y, s, 2);
      ctx.fillRect(x, y + s / 2, s, 1);
      break;
    case "F":
      ctx.fillStyle = "#e8d5b0";
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = "#dcc89e";
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
      break;
    case "D":
      ctx.fillStyle = "#6b4423";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#c9a06a";
      ctx.fillRect(x + 3, y + 2, s - 6, s - 3);
      break;
    case "=":
      ctx.fillStyle = "#e8d5b0";
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "#6a7a8a";
      ctx.fillRect(x + 1, y + 4, s - 2, s - 6);
      ctx.fillStyle = "#d04040";
      ctx.beginPath();
      ctx.arc(x + s / 2, y + s / 2 + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(x + s / 2 - 3, y + s / 2, 6, 1);
      break;
    default:
      ctx.fillStyle = "#333";
      ctx.fillRect(x, y, s, s);
  }
}

export function drawPlayer(ctx, x, y, s, facing, frame) {
  const px = x * s;
  const py = y * s - 2;
  const bob = frame % 2;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(px + s / 2, py + s - 1, s * 0.32, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a6ea5";
  ctx.fillRect(px + 4, py + 7 + bob, s - 8, 7);
  ctx.fillStyle = "#f0c8a0";
  ctx.fillRect(px + 5, py + 2 + bob, s - 10, 6);
  ctx.fillStyle = "#c04040";
  ctx.fillRect(px + 4, py + bob, s - 8, 3);
  ctx.fillStyle = "#222";
  if (facing === "down") {
    ctx.fillRect(px + 6, py + 4 + bob, 1, 1);
    ctx.fillRect(px + s - 7, py + 4 + bob, 1, 1);
  } else if (facing === "up") {
    ctx.fillRect(px + 6, py + 3 + bob, 1, 1);
    ctx.fillRect(px + s - 7, py + 3 + bob, 1, 1);
  } else if (facing === "left") ctx.fillRect(px + 5, py + 4 + bob, 1, 1);
  else ctx.fillRect(px + s - 6, py + 4 + bob, 1, 1);
}

export function drawNpc(ctx, x, y, s, kind = "npc") {
  const px = x * s;
  const py = y * s - 2;
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(px + s / 2, py + s - 1, s * 0.3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "oak") {
    ctx.fillStyle = "#f5f0e0";
    ctx.fillRect(px + 4, py + 7, s - 8, 7);
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(px + 5, py + 2, s - 10, 6);
    ctx.fillStyle = "#d8d0c0";
    ctx.fillRect(px + 4, py, s - 8, 3);
  } else if (kind === "rival") {
    ctx.fillStyle = "#5a3a8a";
    ctx.fillRect(px + 4, py + 7, s - 8, 7);
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(px + 5, py + 2, s - 10, 6);
    ctx.fillStyle = "#2a1a40";
    ctx.fillRect(px + 4, py, s - 8, 3);
  } else if (kind === "brock" || kind === "nurse") {
    ctx.fillStyle = kind === "nurse" ? "#e8e8f0" : "#b08050";
    ctx.fillRect(px + 4, py + 7, s - 8, 7);
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(px + 5, py + 2, s - 10, 6);
    ctx.fillStyle = kind === "nurse" ? "#e05070" : "#5a4030";
    ctx.fillRect(px + 4, py, s - 8, 3);
  } else if (kind?.startsWith("ball-")) {
    ctx.fillStyle = "#d04040";
    ctx.beginPath();
    ctx.arc(px + s / 2, py + s / 2, 5, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#f5f5f5";
    ctx.beginPath();
    ctx.arc(px + s / 2, py + s / 2, 5, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.fillRect(px + 3, py + s / 2 - 1, s - 6, 2);
    ctx.beginPath();
    ctx.arc(px + s / 2, py + s / 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "sign" || kind === "clerk" || kind === "pewter-clerk") {
    if (kind === "sign") {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(px + s / 2 - 1, py + 6, 2, 8);
      ctx.fillStyle = "#e8d090";
      ctx.fillRect(px + 3, py + 2, s - 6, 7);
    } else {
      ctx.fillStyle = "#4080a0";
      ctx.fillRect(px + 4, py + 7, s - 8, 7);
      ctx.fillStyle = "#f0c8a0";
      ctx.fillRect(px + 5, py + 2, s - 10, 6);
      ctx.fillStyle = "#204050";
      ctx.fillRect(px + 4, py, s - 8, 3);
    }
  } else if (kind?.startsWith("trainer") || kind === "mom") {
    ctx.fillStyle = kind === "mom" ? "#c06080" : "#c07030";
    ctx.fillRect(px + 4, py + 7, s - 8, 7);
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(px + 5, py + 2, s - 10, 6);
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(px + 4, py, s - 8, 3);
  } else {
    ctx.fillStyle = "#6a8f4e";
    ctx.fillRect(px + 4, py + 7, s - 8, 7);
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(px + 5, py + 2, s - 10, 6);
    ctx.fillStyle = "#4a3a2a";
    ctx.fillRect(px + 4, py, s - 8, 3);
  }
}

export function drawPokemon(ctx, speciesId, cx, cy, size, facing = 1) {
  const sp = SPECIES[speciesId];
  if (!sp) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(facing, 1);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.42, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = sp.color;
  ctx.strokeStyle = "#2a241c";
  ctx.lineWidth = Math.max(1, size * 0.04);
  const shape = sp.shape || "blob";

  if (speciesId === "bulbasaur" || shape === "plant") {
    roundBody(ctx, 0, 4, size * 0.36, size * 0.26);
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.1, size * 0.26, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    eyes(ctx, -size * 0.12, -size * 0.02, size);
  } else if (speciesId === "charmander" || shape === "lizard") {
    roundBody(ctx, 0, 2, size * 0.28, size * 0.36);
    ctx.fillStyle = "#f0c040";
    ctx.beginPath();
    ctx.moveTo(size * 0.22, size * 0.1);
    ctx.quadraticCurveTo(size * 0.45, -size * 0.05, size * 0.28, -size * 0.28);
    ctx.quadraticCurveTo(size * 0.18, -size * 0.05, size * 0.22, size * 0.1);
    ctx.fill();
    eyes(ctx, -size * 0.08, -size * 0.12, size);
  } else if (speciesId === "squirtle" || shape === "turtle") {
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.ellipse(size * 0.06, 4, size * 0.3, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sp.color;
    roundBody(ctx, -size * 0.06, 0, size * 0.26, size * 0.3);
    eyes(ctx, -size * 0.14, -size * 0.08, size);
  } else if (shape === "bird") {
    roundBody(ctx, 0, 2, size * 0.3, size * 0.26);
    ctx.fillStyle = sp.accent;
    ctx.beginPath();
    ctx.ellipse(-size * 0.2, 0, size * 0.18, size * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.2, -size * 0.05);
    ctx.lineTo(size * 0.38, -size * 0.18);
    ctx.lineTo(size * 0.22, size * 0.02);
    ctx.fill();
    eyes(ctx, -size * 0.05, -size * 0.05, size * 0.9);
  } else if (shape === "bug") {
    roundBody(ctx, -size * 0.08, 4, size * 0.22, size * 0.18);
    roundBody(ctx, size * 0.14, 6, size * 0.2, size * 0.2);
    ctx.strokeStyle = sp.accent;
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.05);
    ctx.lineTo(-size * 0.35, -size * 0.2);
    ctx.moveTo(-size * 0.15, 0);
    ctx.lineTo(-size * 0.32, -size * 0.08);
    ctx.stroke();
    eyes(ctx, -size * 0.16, 0, size * 0.85);
  } else if (shape === "snake") {
    ctx.beginPath();
    ctx.ellipse(0, 8, size * 0.18, size * 0.34, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    roundBody(ctx, -size * 0.05, -size * 0.12, size * 0.2, size * 0.18);
    eyes(ctx, -size * 0.12, -size * 0.14, size);
  } else if (shape === "rock") {
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 8);
    ctx.lineTo(-size * 0.2, -size * 0.15);
    ctx.lineTo(size * 0.15, -size * 0.22);
    ctx.lineTo(size * 0.32, 4);
    ctx.lineTo(size * 0.1, size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    eyes(ctx, -size * 0.08, -size * 0.02, size);
  } else if (shape === "mouse" || speciesId === "pikachu" || speciesId === "rattata") {
    roundBody(ctx, 0, 4, size * 0.34, size * 0.24);
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.18);
    ctx.lineTo(-size * 0.22, -size * 0.38);
    ctx.lineTo(0, -size * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(size * 0.1, -size * 0.18);
    ctx.lineTo(size * 0.22, -size * 0.38);
    ctx.lineTo(0, -size * 0.2);
    ctx.fill();
    if (speciesId === "pikachu") {
      ctx.fillStyle = "#d04040";
      ctx.beginPath();
      ctx.arc(-size * 0.22, size * 0.08, size * 0.06, 0, Math.PI * 2);
      ctx.arc(size * 0.22, size * 0.08, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    eyes(ctx, -size * 0.1, -size * 0.02, size);
  } else {
    roundBody(ctx, 0, 2, size * 0.32, size * 0.28);
    eyes(ctx, -size * 0.1, -size * 0.05, size);
  }
  ctx.restore();
}

function roundBody(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function eyes(ctx, x, y, size) {
  ctx.fillStyle = "#1a1510";
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.5, size * 0.045), 0, Math.PI * 2);
  ctx.arc(x + size * 0.14, y, Math.max(1.5, size * 0.045), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - 0.5, y - 0.5, Math.max(0.8, size * 0.02), 0, Math.PI * 2);
  ctx.fill();
}

export { TILE };

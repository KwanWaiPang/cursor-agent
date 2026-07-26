import { TERRAIN } from "../data/classes.js";
import { classNameOf } from "./engine.js";

const TILE = 48;

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  function resize(state) {
    canvas.width = state.width * TILE;
    canvas.height = state.height * TILE;
  }

  function draw(state, hover) {
    if (!state) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 地形
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const t = TERRAIN[state.tiles[y][x]] || TERRAIN.plain;
        ctx.fillStyle = t.fill;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(40,30,20,0.18)";
        ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
      }
    }

    // 移动高亮
    if (state.mode === "move") {
      for (const c of state.moveCells) {
        ctx.fillStyle = "rgba(80,160,220,0.35)";
        ctx.fillRect(c.x * TILE, c.y * TILE, TILE, TILE);
      }
    }

    // 攻击高亮
    if (state.mode === "attack" || state.mode === "action") {
      for (const t of state.attackTargets) {
        ctx.fillStyle = "rgba(200,60,40,0.35)";
        ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
      }
    }

    // 悬停
    if (hover) {
      ctx.strokeStyle = "rgba(255,240,200,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.x * TILE + 2, hover.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.lineWidth = 1;
    }

    // 单位
    for (const u of state.units) {
      if (!u.alive) continue;
      drawUnit(u, state.selectedId === u.id);
    }
  }

  function drawUnit(u, selected) {
    const cx = u.x * TILE + TILE / 2;
    const cy = u.y * TILE + TILE / 2;
    const r = 16;

    // 阴影
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 14, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = u.portrait || "#888";
    ctx.fill();
    ctx.strokeStyle = u.team === "player" ? "#1a5c3a" : "#6b1a1a";
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();
    ctx.lineWidth = 1;

    // 己方/敌方角标
    ctx.fillStyle = u.team === "player" ? "#d4f0dc" : "#f0d4d4";
    ctx.font = "bold 11px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.name.slice(0, 1), cx, cy);

    // 已行动变暗
    if (u.done && u.team === "player") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 血条
    const bw = 28;
    const bh = 4;
    const bx = cx - bw / 2;
    const by = cy - r - 8;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(bx, by, bw, bh);
    const pct = u.hp / u.hpMax;
    ctx.fillStyle = pct > 0.5 ? "#6fbf5a" : pct > 0.25 ? "#d4b84a" : "#c45c2a";
    ctx.fillRect(bx, by, bw * pct, bh);

    if (u.boss || u.lord) {
      ctx.fillStyle = u.lord ? "#f3c27a" : "#e07070";
      ctx.font = "10px serif";
      ctx.fillText(u.lord ? "主" : "将", cx + 14, cy - 12);
    }
  }

  return { draw, resize, TILE };
}

export function describeTile(state, x, y) {
  if (!state || x < 0 || y < 0 || x >= state.width || y >= state.height) return "";
  const t = TERRAIN[state.tiles[y][x]];
  return t ? t.name : "";
}

export function formatUnit(u) {
  if (!u) return "";
  return `${u.name}  Lv${u.level} ${classNameOf(u)}  HP ${u.hp}/${u.hpMax}  攻${u.atk} 防${u.def}`;
}

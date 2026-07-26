import { TERRAIN } from "../data/classes.js";
import { classNameOf } from "./engine.js";
import { getTerrainTile, drawUnitSprite, drawPortrait } from "./sprites.js";

const TILE = 56;

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");

  function resize(state) {
    canvas.width = state.width * TILE;
    canvas.height = state.height * TILE;
  }

  function draw(state, hover) {
    if (!state) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const kind = state.tiles[y][x] || "plain";
        const tile = getTerrainTile(kind, TILE);
        ctx.drawImage(tile, x * TILE, y * TILE);
      }
    }

    if (state.mode === "move") {
      for (const c of state.moveCells) {
        ctx.fillStyle = "rgba(60,150,220,0.32)";
        ctx.fillRect(c.x * TILE, c.y * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(120,200,255,0.55)";
        ctx.strokeRect(c.x * TILE + 3, c.y * TILE + 3, TILE - 6, TILE - 6);
      }
    }

    if (state.mode === "attack" || state.mode === "action") {
      for (const t of state.attackTargets) {
        ctx.fillStyle = "rgba(220,50,40,0.32)";
        ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(255,120,80,0.7)";
        ctx.strokeRect(t.x * TILE + 3, t.y * TILE + 3, TILE - 6, TILE - 6);
      }
    }

    if (hover) {
      ctx.strokeStyle = "rgba(255,240,180,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.x * TILE + 2, hover.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.lineWidth = 1;
    }

    // 按 y 排序，下方单位盖住上方（略有层次）
    const units = state.units.filter((u) => u.alive).sort((a, b) => a.y - b.y || a.x - b.x);
    for (const u of units) {
      const cx = u.x * TILE + TILE / 2;
      const cy = u.y * TILE + TILE / 2 - 4;
      drawUnitSprite(ctx, u, cx, cy, TILE, state.selectedId === u.id);
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
  const camp =
    u.team === "player" ? "我军" : u.team === "ally" ? "友军" : "敌军";
  const cond = u.conditions?.length
    ? ` · ${u.conditions.map((c) => c.id).join("/")}`
    : "";
  return `${u.name}（${camp}） Lv${u.level} ${classNameOf(u)}\nHP ${u.hp}/${u.hpMax}  MP ${u.mp ?? 0}/${u.mpMax ?? 0}\n攻${u.atk} 防${u.def} 技${u.skl} 智${u.itl ?? "-"}${cond}`;
}

export { drawPortrait };

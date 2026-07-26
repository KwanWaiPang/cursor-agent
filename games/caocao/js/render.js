import { TERRAIN } from "../data/classes.js";
import { GENERALS } from "../data/generals.js";
import { classNameOf } from "./engine.js";
import {
  getTerrainTile,
  drawTileEdges,
  drawUnitSprite,
  drawPortrait,
} from "./sprites.js";

const TILE = 56;

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  function resize(state) {
    canvas.width = state.width * TILE;
    canvas.height = state.height * TILE;
  }

  function draw(state, hover, fx = null) {
    if (!state) return;
    const shake = fx?.getShake?.() || { x: 0, y: 0 };
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.translate(shake.x, shake.y);

    // 地形
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const kind = state.tiles[y][x] || "plain";
        const tile = getTerrainTile(kind, TILE, x, y);
        ctx.drawImage(tile, x * TILE, y * TILE);
        drawTileEdges(ctx, state.tiles, x, y, TILE);
      }
    }

    // 细网格（增强战棋读感）
    ctx.strokeStyle = "rgba(20,12,8,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= state.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, state.height * TILE);
      ctx.stroke();
    }
    for (let y = 0; y <= state.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(state.width * TILE, y * TILE + 0.5);
      ctx.stroke();
    }

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 280);

    // 移动范围
    if (state.mode === "move") {
      for (const c of state.moveCells) {
        paintCellOverlay(
          ctx,
          c.x,
          c.y,
          `rgba(50,140,210,${0.22 + pulse * 0.12})`,
          `rgba(140,210,255,${0.45 + pulse * 0.25})`
        );
      }
    }

    // 攻击 / 计策范围（行动阶段预览可打目标；攻击/计策模式加深）
    if (
      (state.mode === "attack" || state.mode === "magic" || state.mode === "action") &&
      state.attackTargets?.length
    ) {
      const isMagic = state.mode === "magic";
      const preview = state.mode === "action";
      for (const t of state.attackTargets) {
        paintCellOverlay(
          ctx,
          t.x,
          t.y,
          isMagic
            ? `rgba(140,80,200,${0.24 + pulse * 0.12})`
            : `rgba(210,45,40,${(preview ? 0.16 : 0.28) + pulse * 0.1})`,
          isMagic
            ? `rgba(200,140,255,${0.55 + pulse * 0.2})`
            : `rgba(255,120,80,${(preview ? 0.4 : 0.65) + pulse * 0.2})`
        );
        if (!preview) {
          const cx = t.x * TILE + TILE / 2;
          const cy = t.y * TILE + TILE / 2;
          ctx.strokeStyle = isMagic
            ? `rgba(220,180,255,${0.5 + pulse * 0.3})`
            : `rgba(255,200,160,${0.55 + pulse * 0.3})`;
          ctx.lineWidth = 1.5;
          const r = 8 + pulse * 3;
          ctx.beginPath();
          ctx.moveTo(cx - r, cy);
          ctx.lineTo(cx + r, cy);
          ctx.moveTo(cx, cy - r);
          ctx.lineTo(cx, cy + r);
          ctx.stroke();
        }
      }
    }

    // 部署空位
    if (state.deploySlots?.length) {
      for (const s of state.deploySlots) {
        paintCellOverlay(
          ctx,
          s.x,
          s.y,
          s.generalId ? "rgba(60,140,90,0.3)" : `rgba(220,180,60,${0.28 + pulse * 0.12})`,
          "rgba(255,220,120,0.85)"
        );
      }
    }

    // 悬停
    if (hover) {
      ctx.strokeStyle = `rgba(255,240,180,${0.75 + pulse * 0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.x * TILE + 2, hover.y * TILE + 2, TILE - 4, TILE - 4);
      ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(255,245,200,0.08)";
      ctx.fillRect(hover.x * TILE, hover.y * TILE, TILE, TILE);
    }

    // 选中武将脚下光环脉冲
    if (state.selectedId) {
      const sel = state.units.find((u) => u.id === state.selectedId && u.alive);
      if (sel) {
        const cx = sel.x * TILE + TILE / 2;
        const cy = sel.y * TILE + TILE / 2 + 10;
        ctx.strokeStyle = `rgba(243,212,138,${0.35 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18 + pulse * 3, 7 + pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 氛围：暖色天光 + 暗角
    const g = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.15,
      20,
      canvas.width * 0.5,
      canvas.height * 0.55,
      Math.max(canvas.width, canvas.height) * 0.75
    );
    g.addColorStop(0, "rgba(255,230,170,0.07)");
    g.addColorStop(0.55, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(20,10,6,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 单位（含特效追踪中的刚击破单位）
    const t = performance.now() / 400;
    const units = state.units
      .filter((u) => u.alive || fx?.isTracked?.(u.id))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    for (const u of units) {
      const bob = u.done ? 0 : Math.sin(t + u.id) * 1.5;
      const uf = fx?.getUnitDraw?.(u.id) || { ox: 0, oy: 0, flash: 0, alpha: 1 };
      const cx = u.x * TILE + TILE / 2 + uf.ox;
      const cy = u.y * TILE + TILE / 2 - 4 + bob + uf.oy;
      ctx.globalAlpha = uf.alpha ?? 1;
      drawUnitSprite(ctx, u, cx, cy, TILE, state.selectedId === u.id, {
        flash: uf.flash || 0,
      });
      ctx.globalAlpha = 1;
    }

    // 特效层
    fx?.draw?.(ctx);

    ctx.restore();
  }

  function paintCellOverlay(ctx, x, y, fill, stroke) {
    const px = x * TILE;
    const py = y * TILE;
    ctx.fillStyle = fill;
    ctx.fillRect(px, py, TILE, TILE);
    // 内斜切高亮，更有战棋感
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 4);
    ctx.lineTo(px + TILE - 4, py + 4);
    ctx.lineTo(px + TILE - 4, py + 10);
    ctx.lineTo(px + 4, py + 10);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
    ctx.lineWidth = 1;
  }

  function drawDeployPreview(stage, deploy, hoverCell) {
    const fake = {
      width: stage.width,
      height: stage.height,
      tiles: null,
      units: [],
      mode: "select",
      moveCells: [],
      attackTargets: [],
      selectedId: null,
      deploySlots: [...deploy.locked.map((p) => ({ ...p, locked: true })), ...deploy.slots],
    };
    const rows = stage.map;
    fake.tiles = rows.map((row) =>
      [...row].map((ch) => {
        const m = { P: "plain", F: "forest", H: "hill", R: "road", W: "water", T: "fort" };
        return m[ch] || "plain";
      })
    );
    for (const p of deploy.locked) {
      const tpl = GENERALS[p.generalId];
      fake.units.push({
        id: `L-${p.generalId}`,
        generalId: p.generalId,
        name: tpl?.name || p.generalId,
        classId: tpl?.classId || "cavalry",
        team: "player",
        x: p.x,
        y: p.y,
        alive: true,
        done: false,
        hp: 1,
        hpMax: 1,
        portrait: tpl?.portrait || "#4a7a58",
      });
    }
    for (const s of deploy.slots) {
      if (!s.generalId) continue;
      const tpl = GENERALS[s.generalId];
      fake.units.push({
        id: `S-${s.generalId}`,
        generalId: s.generalId,
        name: tpl?.name || s.generalId,
        classId: tpl?.classId || "infantry",
        team: "player",
        x: s.x,
        y: s.y,
        alive: true,
        done: false,
        hp: 1,
        hpMax: 1,
        portrait: tpl?.portrait || "#3a6a8a",
      });
    }
    resize(fake);
    draw(fake, hoverCell);
  }

  return { draw, resize, drawDeployPreview, TILE };
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
  const gear = u.loadout?.length
    ? `\n装：${u.loadout.map((g) => g.name).join("、")}`
    : "";
  return `${u.name}（${camp}） Lv${u.level} ${classNameOf(u)}\nHP ${u.hp}/${u.hpMax}  MP ${u.mp ?? 0}/${u.mpMax ?? 0}\n攻${u.atk} 防${u.def} 技${u.skl} 智${u.itl ?? "-"}${cond}${gear}`;
}

export { drawPortrait };

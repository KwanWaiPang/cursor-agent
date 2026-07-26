/**
 * 写实风战略大地绘制（自研程序地貌，非原作 CG）
 */

import { biomeStyle } from "../data/mapgen.js";
import { CITIES } from "../data/cities.js";
import { cityOwner } from "./engine.js";

export function createMapRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let view = { zoom: 1, ox: 0, oy: 0 };
  let cellW = 10;
  let cellH = 10;

  function resize() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 960;
    const h = Math.max(420, Math.min(640, parent?.clientHeight || 560));
    canvas.width = Math.floor(w * devicePixelRatio);
    canvas.height = Math.floor(h * devicePixelRatio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function layout(state) {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    cellW = (w / state.map.cols) * view.zoom;
    cellH = (h / state.map.rows) * view.zoom;
  }

  function draw(state, hoverCell) {
    if (!state) return;
    resize();
    layout(state);
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    // 海/底
    const sea = ctx.createLinearGradient(0, 0, w, h);
    sea.addColorStop(0, "#1a3040");
    sea.addColorStop(1, "#0e1c28");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(view.ox, view.oy);

    const { cols, rows, cells } = state.map;
    const factions = state.factions;

    // 陆地 + 地貌 + 涂色
    for (const c of cells) {
      if (!c.land) continue;
      const px = c.x * cellW;
      const py = c.y * cellH;
      const bio = biomeStyle(c.biome);
      const g = ctx.createLinearGradient(px, py, px + cellW, py + cellH);
      g.addColorStop(0, bio.fill[0]);
      g.addColorStop(1, bio.fill[1]);
      ctx.fillStyle = g;
      ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);

      if (c.owner && factions[c.owner]) {
        ctx.fillStyle = hexAlpha(factions[c.owner].color, c.isCity ? 0.55 : 0.38);
        ctx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
      }
    }

    // 府点
    for (const r of state.map.regions) {
      if (r.isCapital) continue;
      const cell = cells[r.cell];
      if (!cell) continue;
      const px = cell.x * cellW + cellW / 2;
      const py = cell.y * cellH + cellH / 2;
      ctx.fillStyle = cell.owner && factions[cell.owner]
        ? factions[cell.owner].color
        : "rgba(240,230,200,0.5)";
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.2, cellW * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }

    // 都市
    for (const city of CITIES) {
      const idx = state.map.cityCells[city.id];
      const cell = cells[idx];
      if (!cell) continue;
      const px = cell.x * cellW + cellW / 2;
      const py = cell.y * cellH + cellH / 2;
      const owner = cityOwner(state, city.id);
      const col = owner && factions[owner] ? factions[owner].color : "#c4a574";
      const r = Math.max(4, cellW * 0.55);

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(px + 1, py + r * 0.6, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px, py - r);
      ctx.lineTo(px + r * 0.85, py + r * 0.2);
      ctx.lineTo(px, py + r * 0.55);
      ctx.lineTo(px - r * 0.85, py + r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,240,200,0.75)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 城名
      if (view.zoom >= 0.85 || state.selectedCityId === city.id) {
        ctx.font = `600 ${Math.max(10, Math.min(13, cellW * 0.9))}px "Noto Serif SC", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.strokeStyle = "rgba(10,8,6,0.75)";
        ctx.lineWidth = 3;
        ctx.strokeText(city.name, px, py + r * 0.7);
        ctx.fillStyle = "#f8ecd6";
        ctx.fillText(city.name, px, py + r * 0.7);
      }
    }

    // 军队
    for (const army of state.armies) {
      const px = army.x * cellW + cellW / 2;
      const py = army.y * cellH + cellH / 2;
      const col = factions[army.factionId]?.color || "#fff";
      const selected = army.id === state.selectedArmyId;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px + 6, py + 5);
      ctx.lineTo(px - 6, py + 5);
      ctx.closePath();
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = "#f3d48a";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (army.order) {
        ctx.strokeStyle = hexAlpha(col, 0.7);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(army.order.tx * cellW + cellW / 2, army.order.ty * cellH + cellH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 悬停
    if (hoverCell) {
      ctx.strokeStyle = "rgba(255,240,180,0.85)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoverCell.x * cellW, hoverCell.y * cellH, cellW, cellH);
    }

    // 选中城光环
    if (state.selectedCityId) {
      const idx = state.map.cityCells[state.selectedCityId];
      const cell = cells[idx];
      if (cell) {
        const px = cell.x * cellW + cellW / 2;
        const py = cell.y * cellH + cellH / 2;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
        ctx.strokeStyle = `rgba(243,212,138,${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, cellW * (1.2 + pulse * 0.3), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 大气暗角
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(10,6,4,0.35)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  function screenToCell(state, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - view.ox;
    const y = clientY - rect.top - view.oy;
    const cx = Math.floor(x / cellW);
    const cy = Math.floor(y / cellH);
    if (cx < 0 || cy < 0 || cx >= state.map.cols || cy >= state.map.rows) return null;
    return { x: cx, y: cy };
  }

  function pan(dx, dy) {
    view.ox += dx;
    view.oy += dy;
  }

  function zoomAt(factor, cx, cy) {
    const prev = view.zoom;
    view.zoom = Math.max(0.7, Math.min(2.4, view.zoom * factor));
    const r = view.zoom / prev;
    view.ox = cx - (cx - view.ox) * r;
    view.oy = cy - (cy - view.oy) * r;
  }

  function resetView() {
    view = { zoom: 1, ox: 0, oy: 0 };
  }

  return { draw, screenToCell, pan, zoomAt, resetView, getView: () => view };
}

function hexAlpha(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

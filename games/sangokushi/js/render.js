/**
 * 中国战略大地绘制（轮廓 + 江河 + 城池外观）
 */

import { biomeStyle } from "../data/mapgen.js";
import { CITIES } from "../data/cities.js";
import { cityOwner } from "./engine.js";
import { getCitySprite } from "./city_sprites.js";

export function createMapRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let view = { zoom: 1.05, ox: 0, oy: 0 };
  let cellW = 10;
  let cellH = 10;
  let cssW = 960;
  let cssH = 560;

  function resize() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 960;
    const h = Math.max(460, Math.min(680, parent?.clientHeight || 580));
    cssW = w;
    cssH = h;
    canvas.width = Math.floor(w * devicePixelRatio);
    canvas.height = Math.floor(h * devicePixelRatio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function layout(state) {
    cellW = (cssW / state.map.cols) * view.zoom;
    cellH = (cssH / state.map.rows) * view.zoom;
  }

  function draw(state, hoverCell) {
    if (!state) return;
    resize();
    layout(state);
    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    // 海洋底
    const sea = ctx.createLinearGradient(0, 0, w * 0.2, h);
    sea.addColorStop(0, "#163048");
    sea.addColorStop(0.55, "#0f2438");
    sea.addColorStop(1, "#0a1828");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);
    // 海面微波
    ctx.strokeStyle = "rgba(120,170,200,0.06)";
    for (let i = 0; i < 12; i++) {
      const yy = ((performance.now() / 40 + i * 48) % (h + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(w * 0.5, yy + 6, w, yy - 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(view.ox, view.oy);

    const { cells, geo } = state.map;
    const factions = state.factions;
    const mapW = state.map.cols * cellW;
    const mapH = state.map.rows * cellH;

    // 陆地格
    for (const c of cells) {
      if (!c.land) continue;
      const px = c.x * cellW;
      const py = c.y * cellH;
      const bio = biomeStyle(c.biome);
      const g = ctx.createLinearGradient(px, py, px, py + cellH);
      g.addColorStop(0, bio.fill[0]);
      g.addColorStop(1, bio.fill[1]);
      ctx.fillStyle = g;
      ctx.fillRect(px, py, cellW + 0.6, cellH + 0.6);

      if (c.owner && factions[c.owner]) {
        ctx.fillStyle = hexAlpha(factions[c.owner].color, c.isCity ? 0.42 : 0.32);
        ctx.fillRect(px, py, cellW + 0.6, cellH + 0.6);
      }
    }

    // 轻微内陆阴影（沿海拔）
    for (const c of cells) {
      if (!c.land || c.elev < 0.55) continue;
      ctx.fillStyle = `rgba(40,30,20,${(c.elev - 0.55) * 0.25})`;
      ctx.fillRect(c.x * cellW, c.y * cellH, cellW + 0.5, cellH + 0.5);
    }

    // 江河
    drawPolyline(ctx, geo.yellow, mapW, mapH, "rgba(200,160,80,0.55)", Math.max(1.5, cellW * 0.35));
    drawPolyline(ctx, geo.yangtze, mapW, mapH, "rgba(70,140,180,0.65)", Math.max(2, cellW * 0.45));
    drawPolyline(ctx, geo.yangtze, mapW, mapH, "rgba(160,210,230,0.25)", Math.max(1, cellW * 0.2));

    // 中国轮廓描边（识别度关键）
    drawCoast(ctx, geo.mainland, mapW, mapH);
    drawCoast(ctx, geo.hainan, mapW, mapH, true);
    drawCoast(ctx, geo.taiwan, mapW, mapH, true);

    // 府点（小寨）
    for (const r of state.map.regions) {
      if (r.isCapital) continue;
      const cell = cells[r.cell];
      if (!cell) continue;
      const px = cell.x * cellW + cellW / 2;
      const py = cell.y * cellH + cellH / 2;
      const col =
        cell.owner && factions[cell.owner]
          ? factions[cell.owner].color
          : "rgba(240,230,200,0.55)";
      ctx.fillStyle = col;
      ctx.strokeStyle = "rgba(20,12,8,0.45)";
      ctx.lineWidth = 1;
      const s = Math.max(2, cellW * 0.28);
      ctx.beginPath();
      ctx.moveTo(px, py - s);
      ctx.lineTo(px + s * 0.7, py + s * 0.4);
      ctx.lineTo(px - s * 0.7, py + s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 城池精灵
    const cityDraws = CITIES.map((city) => {
      const idx = state.map.cityCells[city.id];
      const cell = cells[idx];
      return { city, cell };
    }).sort((a, b) => (a.cell?.y || 0) - (b.cell?.y || 0));

    for (const { city, cell } of cityDraws) {
      if (!cell) continue;
      const px = cell.x * cellW + cellW / 2;
      const py = cell.y * cellH + cellH / 2;
      const owner = cityOwner(state, city.id);
      const col = owner && factions[owner] ? factions[owner].color : "#c4a574";
      const spr = getCitySprite(city, col);
      const scale = Math.max(0.55, Math.min(1.35, (cellW * 3.2) / spr.width));
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      ctx.drawImage(spr, px - dw / 2, py - dh * 0.72, dw, dh);

      const showName =
        view.zoom >= 0.9 ||
        state.selectedCityId === city.id ||
        city.scale === "巨大" ||
        city.scale === "大";
      if (showName) {
        const label = city.name;
        ctx.font = `600 ${Math.max(11, Math.min(14, cellW * 1.1))}px "Noto Serif SC", serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const tw = ctx.measureText(label).width + 10;
        const ly = py + dh * 0.22;
        ctx.fillStyle = "rgba(16,10,6,0.72)";
        roundRect(ctx, px - tw / 2, ly, tw, 16, 3);
        ctx.strokeStyle = hexAlpha(col, 0.75);
        ctx.lineWidth = 1;
        ctx.strokeRect(px - tw / 2 + 0.5, ly + 0.5, tw - 1, 15);
        ctx.fillStyle = "#f8ecd6";
        ctx.fillText(label, px, ly + 2);
      }
    }

    // 军队
    for (const army of state.armies) {
      const px = army.x * cellW + cellW / 2;
      const py = army.y * cellH + cellH / 2;
      const col = factions[army.factionId]?.color || "#fff";
      const selected = army.id === state.selectedArmyId;
      // 旗阵
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(px, py + 6, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(px - 2, py - 10, 3, 16);
      ctx.beginPath();
      ctx.moveTo(px + 1, py - 10);
      ctx.lineTo(px + 12, py - 6);
      ctx.lineTo(px + 1, py - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e8d8b0";
      ctx.beginPath();
      ctx.arc(px - 4, py + 2, 4, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = "#f3d48a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (army.order) {
        ctx.strokeStyle = hexAlpha(col, 0.75);
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(army.order.tx * cellW + cellW / 2, army.order.ty * cellH + cellH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (hoverCell) {
      ctx.strokeStyle = "rgba(255,240,180,0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hoverCell.x * cellW, hoverCell.y * cellH, cellW, cellH);
    }

    if (state.selectedCityId) {
      const idx = state.map.cityCells[state.selectedCityId];
      const cell = cells[idx];
      if (cell) {
        const px = cell.x * cellW + cellW / 2;
        const py = cell.y * cellH + cellH / 2;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 280);
        ctx.strokeStyle = `rgba(243,212,138,${0.45 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py - 4, cellW * (2.2 + pulse * 0.4), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 暗角
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.8);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(8,5,3,0.4)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  function drawCoast(ctx, ring, mapW, mapH, thin = false) {
    if (!ring?.length) return;
    ctx.beginPath();
    ring.forEach((p, i) => {
      const x = p.x * mapW;
      const y = p.y * mapH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    // 外发光
    ctx.strokeStyle = "rgba(220,200,150,0.22)";
    ctx.lineWidth = thin ? 4 : 7;
    ctx.stroke();
    ctx.strokeStyle = "rgba(40,28,16,0.85)";
    ctx.lineWidth = thin ? 1.4 : 2.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(248,236,214,0.35)";
    ctx.lineWidth = thin ? 0.8 : 1;
    ctx.stroke();
  }

  function drawPolyline(ctx, pts, mapW, mapH, color, width) {
    if (!pts?.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x * mapW;
      const y = p.y * mapH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
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
    view.zoom = Math.max(0.75, Math.min(2.6, view.zoom * factor));
    const r = view.zoom / prev;
    view.ox = cx - (cx - view.ox) * r;
    view.oy = cy - (cy - view.oy) * r;
  }

  function resetView() {
    view = { zoom: 1.05, ox: 0, oy: 0 };
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

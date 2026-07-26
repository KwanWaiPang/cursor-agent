/**
 * 战略大地重绘：致敬三国志系列「州域色块 + 柔和涂色」观感
 * 自研绘制，不使用光荣/第三方游戏贴图。
 */

import { CITIES } from "../data/cities.js";
import { cityOwner } from "./engine.js";
import { getCitySprite } from "./city_sprites.js";

export function createMapRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let view = { zoom: 1.25, ox: 0, oy: 0 };
  let cellW = 10;
  let cellH = 10;
  let cssW = 960;
  let cssH = 560;

  /** 静态底图缓存（州域/山脉/江河/海岸） */
  let baseCache = null;
  let baseKey = "";
  /** 势力涂色缓存 */
  let paintCache = null;
  let paintKey = "";

  function resize() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 960;
    const h = Math.max(500, Math.min(720, parent?.clientHeight || 600));
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

    // 海图底色（战略图常见深蓝灰）
    const sea = ctx.createLinearGradient(0, 0, w, h);
    sea.addColorStop(0, "#1a3348");
    sea.addColorStop(0.45, "#152a3c");
    sea.addColorStop(1, "#0e1e2c");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);
    // 微波
    ctx.strokeStyle = "rgba(140,180,200,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const yy = ((performance.now() / 50 + i * 52) % (h + 30)) - 15;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(w * 0.5, yy + 5, w, yy - 3);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(view.ox, view.oy);

    const mapW = state.map.cols * cellW;
    const mapH = state.map.rows * cellH;

    ensureBaseCache(state, mapW, mapH);
    if (baseCache) ctx.drawImage(baseCache, 0, 0, mapW, mapH);

    ensurePaintCache(state, mapW, mapH);
    if (paintCache) {
      ctx.globalAlpha = 0.92;
      ctx.drawImage(paintCache, 0, 0, mapW, mapH);
      ctx.globalAlpha = 1;
    }

    // 州名（半透明）
    drawZhouLabels(ctx, state.map.geo.zhouRegions, mapW, mapH, view.zoom);

    // 府点
    drawForts(ctx, state, cellW, cellH);

    // 城池
    drawCities(ctx, state, cellW, cellH);

    // 军队
    drawArmies(ctx, state, cellW, cellH);

    if (hoverCell) {
      const cell = state.map.cells[hoverCell.y * state.map.cols + hoverCell.x];
      if (cell?.land) {
        ctx.strokeStyle = "rgba(255,236,180,0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(
          hoverCell.x * cellW + cellW / 2,
          hoverCell.y * cellH + cellH / 2,
          Math.max(cellW, cellH) * 0.7,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
    }

    if (state.selectedCityId) {
      const idx = state.map.cityCells[state.selectedCityId];
      const cell = state.map.cells[idx];
      if (cell) {
        const px = cell.x * cellW + cellW / 2;
        const py = cell.y * cellH + cellH / 2;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 280);
        ctx.strokeStyle = `rgba(243,212,138,${0.4 + pulse * 0.45})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(px, py - 4, cellW * (2.4 + pulse * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 暗角
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(6,4,2,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  function ensureBaseCache(state, mapW, mapH) {
    const key = `${Math.round(mapW)}x${Math.round(mapH)}`;
    if (baseCache && baseKey === key) return;
    baseKey = key;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(mapW * devicePixelRatio));
    c.height = Math.max(1, Math.round(mapH * devicePixelRatio));
    const g = c.getContext("2d");
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    paintBaseLayer(g, state, mapW, mapH);
    baseCache = c;
  }

  function ensurePaintCache(state, mapW, mapH) {
    // 所有权签名
    let sig = 0;
    for (const cell of state.map.cells) {
      if (!cell.land || !cell.owner) continue;
      sig = (sig * 33 + cell.i + cell.owner.charCodeAt(0)) | 0;
    }
    const key = `${Math.round(mapW)}x${Math.round(mapH)}:${sig}`;
    if (paintCache && paintKey === key) return;
    paintKey = key;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(mapW * devicePixelRatio));
    c.height = Math.max(1, Math.round(mapH * devicePixelRatio));
    const g = c.getContext("2d");
    g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    paintOwnershipLayer(g, state, mapW, mapH, cellW, cellH);
    paintCache = c;
  }

  function paintBaseLayer(g, state, mapW, mapH) {
    const { geo } = state.map;

    // 陆地底：羊皮纸暖色
    pathRing(g, geo.mainland, mapW, mapH);
    const landGrad = g.createLinearGradient(0, 0, mapW * 0.2, mapH);
    landGrad.addColorStop(0, "#c9b889");
    landGrad.addColorStop(0.35, "#b8a86e");
    landGrad.addColorStop(0.7, "#9aaa6a");
    landGrad.addColorStop(1, "#7a9a68");
    g.fillStyle = landGrad;
    g.fill();

    // 海南 / 台湾
    for (const ring of [geo.hainan, geo.taiwan]) {
      pathRing(g, ring, mapW, mapH);
      g.fillStyle = "#7a9a68";
      g.fill();
    }

    // 州域色块（裁切在陆地上）
    g.save();
    pathRing(g, geo.mainland, mapW, mapH);
    g.clip();
    for (const z of geo.zhouRegions || []) {
      pathRing(g, z.ring, mapW, mapH);
      g.fillStyle = hexAlpha(z.fill, 0.42);
      g.fill();
      g.strokeStyle = "rgba(40,28,14,0.28)";
      g.lineWidth = Math.max(1.2, mapW * 0.0016);
      g.stroke();
    }
    // 山地阴影采样
    for (const cell of state.map.cells) {
      if (!cell.land || cell.elev < 0.48) continue;
      const a = (cell.elev - 0.48) * 0.35;
      g.fillStyle = `rgba(55,40,22,${a})`;
      g.beginPath();
      g.arc(
        cell.x * (mapW / state.map.cols) + mapW / state.map.cols / 2,
        cell.y * (mapH / state.map.rows) + mapH / state.map.rows / 2,
        (mapW / state.map.cols) * 0.85,
        0,
        Math.PI * 2
      );
      g.fill();
    }
    g.restore();

    // 山脉脊线
    drawMountains(g, geo.mountains, mapW, mapH, mapW / state.map.cols);

    // 江河
    drawPolyline(g, geo.yellow, mapW, mapH, "rgba(196,150,70,0.7)", Math.max(2, mapW * 0.0028));
    drawPolyline(g, geo.huai, mapW, mapH, "rgba(100,150,160,0.45)", Math.max(1.2, mapW * 0.0018));
    drawPolyline(g, geo.pearl, mapW, mapH, "rgba(70,150,140,0.5)", Math.max(1.2, mapW * 0.0018));
    drawPolyline(g, geo.yangtze, mapW, mapH, "rgba(50,120,160,0.75)", Math.max(2.4, mapW * 0.0034));
    drawPolyline(g, geo.yangtze, mapW, mapH, "rgba(170,210,230,0.28)", Math.max(1, mapW * 0.0015));

    // 海岸描边
    drawCoast(g, geo.mainland, mapW, mapH);
    drawCoast(g, geo.hainan, mapW, mapH, true);
    drawCoast(g, geo.taiwan, mapW, mapH, true);

    // 纸感噪点
    g.fillStyle = "rgba(40,30,20,0.03)";
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * mapW;
      const y = Math.random() * mapH;
      g.fillRect(x, y, 1.2, 1.2);
    }
  }

  function paintOwnershipLayer(g, state, mapW, mapH, cw, ch) {
    const factions = state.factions;
    const cols = state.map.cols;
    const rows = state.map.rows;
    /**
     * 三国志14 式「大色块占田」：
     * 整格铺色抹平接缝；同势力连片更厚重，势力交界略描边。
     */
    for (const cell of state.map.cells) {
      if (!cell.land || !cell.owner || !factions[cell.owner]) continue;
      const col = factions[cell.owner].color;
      const px = cell.x * cw;
      const py = cell.y * ch;
      g.fillStyle = hexAlpha(col, cell.isCity ? 0.66 : 0.54);
      g.fillRect(px - 0.55, py - 0.55, cw + 1.2, ch + 1.2);
    }
    // 势力交界线（邻格不同 owner）
    g.lineWidth = Math.max(1, Math.min(cw, ch) * 0.18);
    for (const cell of state.map.cells) {
      if (!cell.land || !cell.owner) continue;
      const px = cell.x * cw;
      const py = cell.y * ch;
      const col = factions[cell.owner]?.color;
      if (!col) continue;
      g.strokeStyle = hexAlpha(col, 0.35);
      const neigh = [
        [1, 0, px + cw, py, px + cw, py + ch],
        [0, 1, px, py + ch, px + cw, py + ch],
      ];
      for (const [dx, dy, x1, y1, x2, y2] of neigh) {
        const nx = cell.x + dx;
        const ny = cell.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = state.map.cells[ny * cols + nx];
        if (!n?.land || n.owner === cell.owner) continue;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
    }
  }

  function drawZhouLabels(g, regions, mapW, mapH, zoom) {
    if (!regions?.length || zoom < 0.8) return;
    g.save();
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const z of regions) {
      const x = z.labelPos.x * mapW;
      const y = z.labelPos.y * mapH;
      const size = Math.max(13, Math.min(20, mapW * 0.018));
      g.font = `600 ${size}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
      g.lineWidth = 3;
      g.strokeStyle = "rgba(248,236,214,0.35)";
      g.strokeText(z.label, x, y);
      g.fillStyle = hexAlpha(z.ink, 0.55);
      g.fillText(z.label, x, y);
    }
    g.restore();
  }

  function drawForts(g, state, cw, ch) {
    const factions = state.factions;
    for (const r of state.map.regions) {
      if (r.isCapital) continue;
      const cell = state.map.cells[r.cell];
      if (!cell) continue;
      const px = cell.x * cw + cw / 2;
      const py = cell.y * ch + ch / 2;
      const col =
        cell.owner && factions[cell.owner]
          ? factions[cell.owner].color
          : "rgba(240,230,200,0.5)";
      g.fillStyle = col;
      g.strokeStyle = "rgba(20,12,8,0.4)";
      g.lineWidth = 1;
      const s = Math.max(2, cw * 0.22);
      g.beginPath();
      g.moveTo(px, py - s);
      g.lineTo(px + s * 0.7, py + s * 0.4);
      g.lineTo(px - s * 0.7, py + s * 0.4);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }

  function drawCities(g, state, cw, ch) {
    const factions = state.factions;
    const cityDraws = CITIES.map((city) => {
      const idx = state.map.cityCells[city.id];
      return { city, cell: state.map.cells[idx] };
    }).sort((a, b) => (a.cell?.y || 0) - (b.cell?.y || 0));

    for (const { city, cell } of cityDraws) {
      if (!cell) continue;
      const px = cell.x * cw + cw / 2;
      const py = cell.y * ch + ch / 2;
      const owner = cityOwner(state, city.id);
      const col = owner && factions[owner] ? factions[owner].color : "#c4a574";
      const spr = getCitySprite(city, col);
      const scale = Math.max(0.55, Math.min(1.4, (cw * 3.4) / spr.width));
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      g.drawImage(spr, px - dw / 2, py - dh * 0.72, dw, dh);

      const showName =
        view.zoom >= 0.85 ||
        state.selectedCityId === city.id ||
        city.scale === "巨大" ||
        city.scale === "大";
      if (showName) {
        const label = city.name;
        g.font = `600 ${Math.max(11, Math.min(14, cw * 1.15))}px "Noto Serif SC", serif`;
        g.textAlign = "center";
        g.textBaseline = "top";
        const tw = g.measureText(label).width + 10;
        const ly = py + dh * 0.22;
        g.fillStyle = "rgba(16,10,6,0.75)";
        roundRect(g, px - tw / 2, ly, tw, 16, 3);
        g.strokeStyle = hexAlpha(col, 0.8);
        g.lineWidth = 1;
        g.strokeRect(px - tw / 2 + 0.5, ly + 0.5, tw - 1, 15);
        g.fillStyle = "#f8ecd6";
        g.fillText(label, px, ly + 2);
      }
    }
  }

  function drawArmies(g, state, cw, ch) {
    const factions = state.factions;
    for (const army of state.armies) {
      const px = army.x * cw + cw / 2;
      const py = army.y * ch + ch / 2;
      const col = factions[army.factionId]?.color || "#fff";
      const selected = army.id === state.selectedArmyId;
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.beginPath();
      g.ellipse(px, py + 6, 8, 3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = col;
      g.fillRect(px - 2, py - 10, 3, 16);
      g.beginPath();
      g.moveTo(px + 1, py - 10);
      g.lineTo(px + 12, py - 6);
      g.lineTo(px + 1, py - 2);
      g.closePath();
      g.fill();
      g.fillStyle = "#e8d8b0";
      g.beginPath();
      g.arc(px - 4, py + 2, 4, 0, Math.PI * 2);
      g.fill();
      if (selected) {
        g.strokeStyle = "#f3d48a";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(px, py, 14, 0, Math.PI * 2);
        g.stroke();
      }
      if (army.order) {
        g.strokeStyle = hexAlpha(col, 0.75);
        g.setLineDash([5, 4]);
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(army.order.tx * cw + cw / 2, army.order.ty * ch + ch / 2);
        g.stroke();
        g.setLineDash([]);
      }
    }
  }

  function pathRing(g, ring, mapW, mapH) {
    if (!ring?.length) return;
    g.beginPath();
    ring.forEach((p, i) => {
      const x = p.x * mapW;
      const y = p.y * mapH;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
  }

  function drawCoast(g, ring, mapW, mapH, thin = false) {
    if (!ring?.length) return;
    pathRing(g, ring, mapW, mapH);
    g.strokeStyle = "rgba(230,210,160,0.2)";
    g.lineWidth = thin ? 4 : 8;
    g.stroke();
    g.strokeStyle = "rgba(30,22,12,0.9)";
    g.lineWidth = thin ? 1.5 : 2.4;
    g.stroke();
    g.strokeStyle = "rgba(248,236,214,0.4)";
    g.lineWidth = thin ? 0.8 : 1.1;
    g.stroke();
  }

  function drawPolyline(g, pts, mapW, mapH, color, width) {
    if (!pts?.length) return;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    pts.forEach((p, i) => {
      const x = p.x * mapW;
      const y = p.y * mapH;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
  }

  function drawMountains(g, ranges, mapW, mapH, cellW) {
    if (!ranges?.length) return;
    g.save();
    for (const r of ranges) {
      const pts = r.path;
      if (!pts?.length) continue;
      const w = Math.max(1.6, cellW * (0.32 + r.width * 0.14));
      g.strokeStyle = "rgba(45,32,18,0.4)";
      g.lineWidth = w + 1.8;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      pts.forEach((p, i) => {
        const x = p.x * mapW;
        const y = p.y * mapH;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.stroke();
      g.strokeStyle = "rgba(110,85,55,0.55)";
      g.lineWidth = w * 0.5;
      g.stroke();
      for (let i = 1; i < pts.length - 1; i += 2) {
        const p = pts[i];
        const x = p.x * mapW;
        const y = p.y * mapH;
        const h = w * 1.9;
        g.fillStyle = "rgba(60,42,28,0.5)";
        g.beginPath();
        g.moveTo(x - h * 0.55, y + h * 0.12);
        g.lineTo(x, y - h * 0.9);
        g.lineTo(x + h * 0.55, y + h * 0.12);
        g.closePath();
        g.fill();
      }
    }
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
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
    // 平移不需要清底图缓存（底图在 translate 内绘制）
  }

  function zoomAt(factor, cx, cy) {
    const prev = view.zoom;
    view.zoom = Math.max(0.7, Math.min(2.8, view.zoom * factor));
    const r = view.zoom / prev;
    view.ox = cx - (cx - view.ox) * r;
    view.oy = cy - (cy - view.oy) * r;
    baseCache = null;
    paintCache = null;
  }

  function resetView() {
    view = { zoom: 1.25, ox: 0, oy: 0 };
    baseCache = null;
    paintCache = null;
  }

  return { draw, screenToCell, pan, zoomAt, resetView, getView: () => view };
}

function hexAlpha(hex, a) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

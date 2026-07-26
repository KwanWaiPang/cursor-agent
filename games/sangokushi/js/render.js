/**
 * 战略大地：致敬《三国志14》「大地涂色」观感
 * 橄榄底图 + 鲜明势力色块 + 城标州名；自研绘制，非光荣贴图。
 */

import { CITIES } from "../data/cities.js";
import { cityOwner } from "./engine.js";
import { getCitySprite } from "./city_sprites.js";

export function createMapRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let view = { zoom: 1.35, ox: 0, oy: 0 };
  let cellW = 10;
  let cellH = 10;
  let cssW = 960;
  let cssH = 560;
  let sizeDirty = true;
  let lastPaintVersion = -1;

  /** 静态底图缓存（州域/山脉/江河/海岸） */
  let baseCache = null;
  let baseKey = "";
  /** 势力涂色缓存 */
  let paintCache = null;
  let paintKey = "";

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      sizeDirty = true;
      baseCache = null;
      paintCache = null;
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);
  }

  function resize() {
    if (!sizeDirty) return;
    sizeDirty = false;
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || 960;
    const h = Math.max(500, Math.min(720, parent?.clientHeight || 600));
    if (w === cssW && h === cssH && canvas.width) return;
    cssW = w;
    cssH = h;
    canvas.width = Math.floor(w * devicePixelRatio);
    canvas.height = Math.floor(h * devicePixelRatio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    baseCache = null;
    paintCache = null;
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

    // 海图：三志战略图常见青绿海
    const sea = ctx.createLinearGradient(0, 0, w, h * 0.8);
    sea.addColorStop(0, "#1e3a42");
    sea.addColorStop(0.5, "#17343c");
    sea.addColorStop(1, "#102830");
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);
    // 极淡水纹（不抢陆地）
    ctx.strokeStyle = "rgba(120,170,180,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const yy = ((performance.now() / 70 + i * 68) % (h + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.quadraticCurveTo(w * 0.45, yy + 4, w, yy - 2);
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
      ctx.globalAlpha = 1;
      ctx.drawImage(paintCache, 0, 0, mapW, mapH);
    }

    // 州名：远景更醒目，近景让城名优先
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

    // 攻城目标光环
    const selArmy = state.armies.find((a) => a.id === state.selectedArmyId);
    if (selArmy?.order?.type === "siege" && selArmy.order.targetCity) {
      const idx = state.map.cityCells[selArmy.order.targetCity];
      const cell = state.map.cells[idx];
      if (cell) {
        const px = cell.x * cellW + cellW / 2;
        const py = cell.y * cellH + cellH / 2;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
        ctx.strokeStyle = `rgba(200,60,40,${0.45 + pulse * 0.4})`;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(px, py - 4, cellW * (2.8 + pulse * 0.4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.restore();

    // 轻暗角（不过暗，保留战略图通透感）
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.9);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(8,6,4,0.32)");
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
    const ver = state.paintVersion || 0;
    const key = `${Math.round(mapW)}x${Math.round(mapH)}:${ver}:${Math.round(cellW * 10)}`;
    if (paintCache && paintKey === key && lastPaintVersion === ver) return;
    lastPaintVersion = ver;
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
    const cw = mapW / state.map.cols;
    const ch = mapH / state.map.rows;

    // 陆地底：三志式橄榄 / 黄褐战略大地
    pathRing(g, geo.mainland, mapW, mapH);
    const landGrad = g.createLinearGradient(0, 0, mapW * 0.15, mapH);
    landGrad.addColorStop(0, "#c2b27a");
    landGrad.addColorStop(0.3, "#a8a060");
    landGrad.addColorStop(0.65, "#7f9a58");
    landGrad.addColorStop(1, "#5f8a50");
    g.fillStyle = landGrad;
    g.fill();

    for (const ring of [geo.hainan, geo.taiwan]) {
      pathRing(g, ring, mapW, mapH);
      g.fillStyle = "#6a8f55";
      g.fill();
    }

    // 地貌微染色（平原亮、山地暗、水乡青）——在州域之下
    g.save();
    pathRing(g, geo.mainland, mapW, mapH);
    g.clip();
    for (const cell of state.map.cells) {
      if (!cell.land) continue;
      let fill = null;
      if (cell.biome === "desert") fill = "rgba(190,150,80,0.18)";
      else if (cell.biome === "jungle") fill = "rgba(40,90,50,0.16)";
      else if (cell.biome === "mountain") fill = "rgba(70,55,35,0.14)";
      else if (cell.biome === "river") fill = "rgba(70,130,120,0.12)";
      else if (cell.biome === "capital") fill = "rgba(200,170,100,0.1)";
      if (!fill) continue;
      g.fillStyle = fill;
      g.fillRect(cell.x * cw, cell.y * ch, cw + 0.5, ch + 0.5);
    }

    // 州域淡彩（不抢势力色）
    for (const z of geo.zhouRegions || []) {
      pathRing(g, z.ring, mapW, mapH);
      g.fillStyle = hexAlpha(z.fill, 0.22);
      g.fill();
      g.strokeStyle = "rgba(50,36,18,0.22)";
      g.lineWidth = Math.max(1, mapW * 0.0014);
      g.stroke();
    }

    // 山地起伏
    for (const cell of state.map.cells) {
      if (!cell.land || cell.elev < 0.45) continue;
      const a = (cell.elev - 0.45) * 0.4;
      g.fillStyle = `rgba(48,36,20,${a})`;
      g.beginPath();
      g.arc(
        cell.x * cw + cw / 2,
        cell.y * ch + ch / 2,
        cw * 0.9,
        0,
        Math.PI * 2
      );
      g.fill();
    }
    g.restore();

    drawMountains(g, geo.mountains, mapW, mapH, cw);

    // 江河：黄河浊、长江清，贴近系列战略图习惯
    drawPolyline(g, geo.yellow, mapW, mapH, "rgba(180,130,50,0.85)", Math.max(2.2, mapW * 0.003));
    drawPolyline(g, geo.yellow, mapW, mapH, "rgba(220,180,90,0.25)", Math.max(1, mapW * 0.0014));
    drawPolyline(g, geo.huai, mapW, mapH, "rgba(90,140,150,0.55)", Math.max(1.3, mapW * 0.0019));
    drawPolyline(g, geo.pearl, mapW, mapH, "rgba(60,140,130,0.55)", Math.max(1.3, mapW * 0.0019));
    drawPolyline(g, geo.yangtze, mapW, mapH, "rgba(40,100,145,0.85)", Math.max(2.6, mapW * 0.0036));
    drawPolyline(g, geo.yangtze, mapW, mapH, "rgba(160,205,230,0.3)", Math.max(1.1, mapW * 0.0016));

    drawCoast(g, geo.mainland, mapW, mapH);
    drawCoast(g, geo.hainan, mapW, mapH, true);
    drawCoast(g, geo.taiwan, mapW, mapH, true);

    // 纸纹（固定种子感：用格子伪随机，避免每帧闪）
    g.fillStyle = "rgba(40,28,16,0.028)";
    for (let i = 0; i < 320; i++) {
      const x = ((i * 97) % 1000) / 1000 * mapW;
      const y = ((i * 53) % 1000) / 1000 * mapH;
      g.fillRect(x, y, 1.1, 1.1);
    }
  }

  function paintOwnershipLayer(g, state, mapW, mapH, cw, ch) {
    const factions = state.factions;
    const cols = state.map.cols;
    const rows = state.map.rows;
    /**
     * 三国志14 式大色块：
     * 高饱和半透明铺满 → 边缘深描形成「战线」；城心略加深。
     */
    // 底层：圆斑叠加以抹平格子感
    for (const cell of state.map.cells) {
      if (!cell.land || !cell.owner || !factions[cell.owner]) continue;
      const col = factions[cell.owner].color;
      const px = cell.x * cw + cw / 2;
      const py = cell.y * ch + ch / 2;
      g.fillStyle = hexAlpha(col, cell.isCity ? 0.78 : 0.62);
      g.beginPath();
      g.arc(px, py, Math.max(cw, ch) * 0.78, 0, Math.PI * 2);
      g.fill();
    }
    // 再铺矩形封缝，保证连片实心
    for (const cell of state.map.cells) {
      if (!cell.land || !cell.owner || !factions[cell.owner]) continue;
      const col = factions[cell.owner].color;
      g.fillStyle = hexAlpha(col, 0.38);
      g.fillRect(cell.x * cw - 0.4, cell.y * ch - 0.4, cw + 1.0, ch + 1.0);
    }

    // 战线描边（异色邻接）
    g.lineCap = "round";
    for (const cell of state.map.cells) {
      if (!cell.land || !cell.owner) continue;
      const col = factions[cell.owner]?.color;
      if (!col) continue;
      const px = cell.x * cw;
      const py = cell.y * ch;
      const edges = [
        [1, 0, px + cw, py, px + cw, py + ch],
        [0, 1, px, py + ch, px + cw, py + ch],
      ];
      for (const [dx, dy, x1, y1, x2, y2] of edges) {
        const nx = cell.x + dx;
        const ny = cell.y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = state.map.cells[ny * cols + nx];
        if (!n?.land || n.owner === cell.owner) continue;
        g.strokeStyle = "rgba(12,8,4,0.55)";
        g.lineWidth = Math.max(1.6, Math.min(cw, ch) * 0.28);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
        g.strokeStyle = hexAlpha(col, 0.7);
        g.lineWidth = Math.max(0.9, Math.min(cw, ch) * 0.14);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
    }
  }

  function drawZhouLabels(g, regions, mapW, mapH, zoom) {
    if (!regions?.length) return;
    // 放大后名称减淡，避免压城名
    const alpha = zoom < 1.1 ? 0.62 : zoom < 1.5 ? 0.38 : 0.18;
    if (alpha < 0.15) return;
    g.save();
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (const z of regions) {
      const x = z.labelPos.x * mapW;
      const y = z.labelPos.y * mapH;
      const size = Math.max(14, Math.min(22, mapW * 0.02));
      g.font = `600 ${size}px "ZCOOL XiaoWei", "Noto Serif SC", serif`;
      g.lineWidth = 3.5;
      g.strokeStyle = `rgba(248,236,214,${alpha * 0.55})`;
      g.strokeText(z.label, x, y);
      g.fillStyle = hexAlpha(z.ink, alpha);
      g.fillText(z.label, x, y);
    }
    g.restore();
  }

  function drawForts(g, state, cw, ch) {
    if (view.zoom < 1.05) return;
    const factions = state.factions;
    for (const r of state.map.regions) {
      if (r.isCapital) continue;
      const cell = state.map.cells[r.cell];
      if (!cell) continue;
      // 远景只画己方或有主的府
      if (view.zoom < 1.35 && cell.owner !== state.playerId) continue;
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
      // 城塞略放大，远景也能认作「城」
      const scale = Math.max(0.62, Math.min(1.55, (cw * 3.9) / spr.width));
      const dw = spr.width * scale;
      const dh = spr.height * scale;
      g.drawImage(spr, px - dw / 2, py - dh * 0.78, dw, dh);

      const owned = !!owner;
      // 三志习惯：大城常显名，小城随缩放
      const showName =
        state.selectedCityId === city.id ||
        city.scale === "巨大" ||
        city.scale === "大" ||
        (view.zoom >= 1.05 && owned) ||
        view.zoom >= 1.4;
      if (showName) {
        const label = city.name;
        const fs = Math.max(10, Math.min(13, cw * 1.05));
        g.font = `600 ${fs}px "Noto Serif SC", serif`;
        g.textAlign = "center";
        g.textBaseline = "top";
        const tw = g.measureText(label).width + 12;
        const th = fs + 6;
        const ly = py + dh * 0.18;
        // 深底金边名牌
        g.fillStyle = owned ? "rgba(18,12,8,0.82)" : "rgba(18,12,8,0.62)";
        roundRect(g, px - tw / 2, ly, tw, th, 2);
        g.strokeStyle = hexAlpha(col, owned ? 0.95 : 0.55);
        g.lineWidth = 1.2;
        g.strokeRect(px - tw / 2 + 0.5, ly + 0.5, tw - 1, th - 1);
        g.fillStyle = owned ? "#f6e6c0" : "rgba(240,225,190,0.85)";
        g.fillText(label, px, ly + 3);
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
    // 外晕 + 深岸线，贴近系列地图轮廓
    g.strokeStyle = "rgba(30,55,60,0.35)";
    g.lineWidth = thin ? 5 : 10;
    g.stroke();
    g.strokeStyle = "rgba(28,20,12,0.85)";
    g.lineWidth = thin ? 1.4 : 2.2;
    g.stroke();
    g.strokeStyle = "rgba(220,200,150,0.35)";
    g.lineWidth = thin ? 0.7 : 1;
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
    view = { zoom: 1.35, ox: 0, oy: 0 };
    baseCache = null;
    paintCache = null;
    sizeDirty = true;
  }

  /** 将镜头框到势力城池中心（中原开局） */
  function focusFaction(state, factionId) {
    const f = state.factions[factionId];
    if (!f?.cities?.length) {
      resetView();
      return;
    }
    focusCells(
      state,
      f.cities.map((cid) => state.map.cells[state.map.cityCells[cid]]).filter(Boolean),
      f.cities.length <= 2 ? 1.85 : 1.6
    );
  }

  function focusCity(state, cityId, zoom = 1.7) {
    const cell = state.map.cells[state.map.cityCells[cityId]];
    if (!cell) return;
    focusCells(state, [cell], zoom);
  }

  function focusCells(state, cells, zoom) {
    if (!cells?.length) {
      resetView();
      return;
    }
    sizeDirty = true;
    resize();
    view.zoom = zoom;
    layout(state);
    let sx = 0;
    let sy = 0;
    for (const cell of cells) {
      sx += cell.x;
      sy += cell.y;
    }
    const cx = (sx / cells.length) * cellW;
    const cy = (sy / cells.length) * cellH;
    view.ox = cssW / 2 - cx;
    view.oy = cssH / 2 - cy;
    baseCache = null;
    paintCache = null;
  }

  return {
    draw,
    screenToCell,
    pan,
    zoomAt,
    resetView,
    focusFaction,
    focusCity,
    getView: () => view,
  };
}

function hexAlpha(hex, a) {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

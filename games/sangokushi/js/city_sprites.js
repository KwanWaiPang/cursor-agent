/**
 * 城池外观：仿三国志战略图「城塞」——城墙、瓮城门、角楼、城内屋宇与旌旗
 * 自研绘制，非光荣贴图。
 */

const cache = new Map();

function scaleOf(city) {
  if (city.scale === "巨大") return 3;
  if (city.scale === "大") return 2;
  if (city.scale === "中") return 1;
  return 0;
}

/**
 * 获取城池贴图（含旗帜色）
 */
export function getCitySprite(city, factionColor = "#c4a574") {
  const key = `${city.id}|${city.scale}|${factionColor}|v2`;
  if (cache.has(key)) return cache.get(key);

  const tier = scaleOf(city);
  const size = 48 + tier * 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.floor(size * 1.15);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  paintCity(ctx, size, tier, factionColor, city.biome === "capital" || city.scale === "巨大");
  cache.set(key, canvas);
  return canvas;
}

function paintCity(ctx, size, tier, flag, capital) {
  const W = size;
  const H = size * 1.15;
  const cx = W / 2;

  // 地面阴影
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(cx, H * 0.9, W * 0.42, H * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // 护城河（中城以上）
  if (tier >= 1) {
    const pad = 3 + tier;
    ctx.fillStyle = "rgba(55,110,130,0.28)";
    roundRectPath(ctx, W * 0.08 - pad * 0.3, H * 0.38 - pad * 0.2, W * 0.84 + pad * 0.6, H * 0.48 + pad * 0.3, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(70,130,150,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // —— 城墙体（略呈梯形，更有城塞体积感）——
  const wallTop = H * 0.42;
  const wallBot = H * 0.82;
  const wallLeft = W * 0.16;
  const wallRight = W * 0.84;
  const wallTopInset = W * 0.04;

  const wallGrad = ctx.createLinearGradient(0, wallTop, 0, wallBot);
  if (capital) {
    wallGrad.addColorStop(0, "#d2b896");
    wallGrad.addColorStop(0.45, "#b09068");
    wallGrad.addColorStop(1, "#6a5040");
  } else {
    wallGrad.addColorStop(0, "#b8a888");
    wallGrad.addColorStop(0.45, "#8a7a5c");
    wallGrad.addColorStop(1, "#5a4a38");
  }
  ctx.fillStyle = wallGrad;
  ctx.beginPath();
  ctx.moveTo(wallLeft + wallTopInset, wallTop);
  ctx.lineTo(wallRight - wallTopInset, wallTop);
  ctx.lineTo(wallRight, wallBot);
  ctx.lineTo(wallLeft, wallBot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(30,20,12,0.55)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 砖缝
  ctx.strokeStyle = "rgba(40,28,16,0.22)";
  ctx.lineWidth = 1;
  const brickRows = 4 + tier;
  for (let r = 1; r < brickRows; r++) {
    const t = r / brickRows;
    const y = wallTop + (wallBot - wallTop) * t;
    const inset = wallTopInset * (1 - t);
    ctx.beginPath();
    ctx.moveTo(wallLeft + inset + 2, y);
    ctx.lineTo(wallRight - inset - 2, y);
    ctx.stroke();
  }
  const brickCols = 5 + tier;
  for (let c = 1; c < brickCols; c++) {
    const t = c / brickCols;
    const xTop = wallLeft + wallTopInset + (wallRight - wallLeft - wallTopInset * 2) * t;
    const xBot = wallLeft + (wallRight - wallLeft) * t;
    ctx.beginPath();
    ctx.moveTo(xTop, wallTop + 2);
    ctx.lineTo(xBot, wallBot - 2);
    ctx.stroke();
  }

  // 城垛（雉堞）
  const merlonN = 6 + tier * 2;
  const topW = wallRight - wallLeft - wallTopInset * 2;
  const merlonW = topW / merlonN;
  const merlonH = H * 0.07;
  ctx.fillStyle = capital ? "#c4a878" : "#9a8a68";
  for (let i = 0; i < merlonN; i++) {
    if (i % 2 === 1) continue;
    const x = wallLeft + wallTopInset + i * merlonW + 1;
    ctx.fillRect(x, wallTop - merlonH, merlonW - 2, merlonH + 1);
    ctx.strokeStyle = "rgba(30,20,12,0.35)";
    ctx.strokeRect(x + 0.5, wallTop - merlonH + 0.5, merlonW - 3, merlonH);
  }

  // —— 城内屋宇（墙后露出的屋顶群）——
  drawInnerRoofs(ctx, cx, wallTop, W, H, tier, capital);

  // —— 角楼 ——
  const tw = W * (0.15 + tier * 0.015);
  const th = H * (0.32 + tier * 0.03);
  drawWatchTower(ctx, wallLeft + wallTopInset - tw * 0.25, wallTop - th * 0.55, tw, th, flag, false);
  drawWatchTower(ctx, wallRight - wallTopInset - tw * 0.75, wallTop - th * 0.55, tw, th, flag, false);

  // 巨大/王畿：中央敌楼
  if (tier >= 2) {
    const kw = tw * (tier >= 3 ? 1.35 : 1.15);
    const kh = th * (tier >= 3 ? 1.35 : 1.15);
    drawWatchTower(ctx, cx - kw / 2, wallTop - kh * 0.72, kw, kh, flag, true);
  }

  // —— 瓮城 / 城门楼 ——
  drawGatehouse(ctx, cx, wallBot, W, H, tier, capital);

  // —— 旌旗 ——
  drawBanner(ctx, cx + W * 0.28, wallTop - H * 0.08, W, H, flag, tier);
  if (tier >= 2) {
    drawBanner(ctx, cx - W * 0.3, wallTop - H * 0.02, W * 0.9, H * 0.9, flag, tier - 1);
  }
}

function drawInnerRoofs(ctx, cx, wallTop, W, H, tier, capital) {
  const roofY = wallTop + H * 0.06;
  const roofs = tier >= 2 ? 5 : tier >= 1 ? 4 : 3;
  for (let i = 0; i < roofs; i++) {
    const ox = (i - (roofs - 1) / 2) * W * 0.11;
    const rw = W * (0.1 + (i % 2) * 0.02);
    const ry = roofY + (i % 3) * H * 0.015;
    // 灰瓦 / 王畿琉璃感
    ctx.fillStyle = capital ? (i === Math.floor(roofs / 2) ? "#8b3030" : "#6a4a3a") : "#5a4a42";
    ctx.beginPath();
    ctx.moveTo(cx + ox - rw, ry + H * 0.05);
    ctx.lineTo(cx + ox, ry);
    ctx.lineTo(cx + ox + rw, ry + H * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = capital ? "#e8d8b0" : "#c8b898";
    ctx.fillRect(cx + ox - rw * 0.55, ry + H * 0.05, rw * 1.1, H * 0.04);
  }
}

function drawWatchTower(ctx, x, y, w, h, flag, keep) {
  // 楼身
  const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
  bodyGrad.addColorStop(0, keep ? "#d8c0a0" : "#c0b090");
  bodyGrad.addColorStop(0.5, keep ? "#a88860" : "#8a7a58");
  bodyGrad.addColorStop(1, "#4a3a2c");
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(x + w * 0.12, y + h * 0.28, w * 0.76, h * 0.7);
  ctx.strokeStyle = "rgba(30,20,12,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + w * 0.12 + 0.5, y + h * 0.28 + 0.5, w * 0.76 - 1, h * 0.7 - 1);

  // 飞檐顶
  ctx.fillStyle = keep ? "#8b2e2e" : "#5a3830";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.08, y + h * 0.32);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w + w * 0.08, y + h * 0.32);
  ctx.lineTo(x + w * 0.85, y + h * 0.36);
  ctx.lineTo(x + w * 0.15, y + h * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(20,12,8,0.4)";
  ctx.stroke();

  // 第二层檐（敌楼）
  if (keep) {
    ctx.fillStyle = "#6a2828";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y + h * 0.48);
    ctx.lineTo(x + w * 0.5, y + h * 0.34);
    ctx.lineTo(x + w * 0.95, y + h * 0.48);
    ctx.closePath();
    ctx.fill();
  }

  // 窗洞
  ctx.fillStyle = "#1a100c";
  ctx.fillRect(x + w * 0.32, y + h * 0.5, w * 0.36, h * 0.14);
  if (keep) {
    ctx.fillRect(x + w * 0.28, y + h * 0.68, w * 0.18, h * 0.1);
    ctx.fillRect(x + w * 0.54, y + h * 0.68, w * 0.18, h * 0.1);
    // 腰线旗色
    ctx.fillStyle = flag;
    ctx.fillRect(x + w * 0.18, y + h * 0.84, w * 0.64, 2.5);
  }
}

function drawGatehouse(ctx, cx, wallBot, W, H, tier, capital) {
  const gw = W * (0.28 + tier * 0.03);
  const gh = H * (0.22 + tier * 0.02);
  const gx = cx - gw / 2;
  const gy = wallBot - gh;

  // 门楼台基
  ctx.fillStyle = capital ? "#a88860" : "#7a6a50";
  ctx.fillRect(gx - 2, gy + gh * 0.35, gw + 4, gh * 0.65);
  ctx.strokeStyle = "rgba(30,20,12,0.45)";
  ctx.strokeRect(gx - 1.5, gy + gh * 0.35 + 0.5, gw + 3, gh * 0.65 - 1);

  // 门楼顶
  ctx.fillStyle = capital ? "#8b3030" : "#5a3830";
  ctx.beginPath();
  ctx.moveTo(gx - 4, gy + gh * 0.4);
  ctx.lineTo(cx, gy);
  ctx.lineTo(gx + gw + 4, gy + gh * 0.4);
  ctx.closePath();
  ctx.fill();

  // 拱门洞
  const archW = gw * 0.42;
  const archH = gh * 0.55;
  const ax = cx - archW / 2;
  const ay = wallBot - archH;
  ctx.fillStyle = "#1a120c";
  ctx.beginPath();
  ctx.moveTo(ax, wallBot);
  ctx.lineTo(ax, ay + archH * 0.4);
  ctx.quadraticCurveTo(cx, ay - 1, ax + archW, ay + archH * 0.4);
  ctx.lineTo(ax + archW, wallBot);
  ctx.closePath();
  ctx.fill();

  // 门扉缝
  ctx.strokeStyle = "rgba(80,60,40,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, ay + archH * 0.25);
  ctx.lineTo(cx, wallBot - 1);
  ctx.stroke();

  // 门钉
  ctx.fillStyle = "#d4b070";
  for (let side = 0; side < 2; side++) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const px = cx + (side === 0 ? -1 : 1) * archW * (0.12 + col * 0.12);
        const py = ay + archH * (0.45 + row * 0.22);
        ctx.beginPath();
        ctx.arc(px, py, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawBanner(ctx, fx, fy, W, H, flag, tier) {
  const poleH = H * (0.22 + tier * 0.02);
  ctx.strokeStyle = "#3a2a18";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(fx, fy + poleH);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  // 旗面
  ctx.fillStyle = flag;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + W * 0.14, fy + H * 0.04);
  ctx.lineTo(fx + W * 0.12, fy + H * 0.08);
  ctx.lineTo(fx, fy + H * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,240,200,0.35)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // 杆顶
  ctx.fillStyle = "#e8c878";
  ctx.beginPath();
  ctx.arc(fx, fy, 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function clearCitySpriteCache() {
  cache.clear();
}

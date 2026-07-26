/**
 * 城池外观：城墙、城门、敌楼（自研像素，按规模变化）
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
  const key = `${city.id}|${city.scale}|${factionColor}`;
  if (cache.has(key)) return cache.get(key);

  const tier = scaleOf(city);
  const size = 40 + tier * 14;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + 10;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  paintCity(ctx, size, tier, factionColor, city.biome === "capital");
  cache.set(key, canvas);
  return canvas;
}

function paintCity(ctx, size, tier, flag, capital) {
  const cx = size / 2;
  const wallTop = size * 0.28;
  const wallBot = size * 0.78;
  const left = size * 0.14;
  const right = size * 0.86;
  const wallH = wallBot - wallTop;

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx + 1, wallBot + 4, size * 0.38, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // 护城河（大城以上）
  if (tier >= 2) {
    ctx.strokeStyle = "rgba(60,120,150,0.55)";
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, left - 4, wallTop - 3, right - left + 8, wallH + 10, 3);
    ctx.stroke();
    ctx.fillStyle = "rgba(70,140,170,0.2)";
    ctx.fill();
  }

  // 城墙主体
  const wallGrad = ctx.createLinearGradient(0, wallTop, 0, wallBot);
  wallGrad.addColorStop(0, capital ? "#c4a888" : "#9a8a6e");
  wallGrad.addColorStop(0.5, capital ? "#a08060" : "#7a6a50");
  wallGrad.addColorStop(1, "#5a4a38");
  ctx.fillStyle = wallGrad;
  roundRectPath(ctx, left, wallTop, right - left, wallH, 2);
  ctx.fill();

  // 砖缝
  ctx.strokeStyle = "rgba(30,20,12,0.28)";
  ctx.lineWidth = 1;
  const rows = 3 + tier;
  for (let r = 0; r < rows; r++) {
    const y = wallTop + 4 + (r * wallH) / rows;
    ctx.beginPath();
    ctx.moveTo(left + 2, y);
    ctx.lineTo(right - 2, y);
    ctx.stroke();
  }
  for (let c = 0; c < 4 + tier; c++) {
    const x = left + 6 + c * ((right - left - 12) / (3 + tier));
    ctx.beginPath();
    ctx.moveTo(x, wallTop + 3);
    ctx.lineTo(x, wallBot - 3);
    ctx.stroke();
  }

  // 城垛
  const merlonN = 5 + tier * 2;
  const merlonW = (right - left) / merlonN;
  ctx.fillStyle = capital ? "#b89870" : "#8a7a58";
  for (let i = 0; i < merlonN; i++) {
    if (i % 2 === 1) continue;
    ctx.fillRect(left + i * merlonW + 1, wallTop - size * 0.08, merlonW - 2, size * 0.1);
  }

  // 角楼
  const towerW = size * (0.14 + tier * 0.02);
  const towerH = size * (0.34 + tier * 0.04);
  drawTower(ctx, left - 2, wallTop - towerH * 0.35, towerW, towerH, flag);
  drawTower(ctx, right - towerW + 2, wallTop - towerH * 0.35, towerW, towerH, flag);

  // 巨大城加中楼
  if (tier >= 3) {
    drawTower(ctx, cx - towerW * 0.55, wallTop - towerH * 0.55, towerW * 1.1, towerH * 1.15, flag, true);
  }

  // 城门
  const gateW = size * (0.16 + tier * 0.02);
  const gateH = size * 0.22;
  const gx = cx - gateW / 2;
  const gy = wallBot - gateH;
  ctx.fillStyle = "#2a1c12";
  ctx.beginPath();
  ctx.moveTo(gx, wallBot);
  ctx.lineTo(gx, gy + gateH * 0.35);
  ctx.quadraticCurveTo(cx, gy - 2, gx + gateW, gy + gateH * 0.35);
  ctx.lineTo(gx + gateW, wallBot);
  ctx.closePath();
  ctx.fill();
  // 门钉
  ctx.fillStyle = "#c4a574";
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.beginPath();
      ctx.arc(gx + gateW * (0.3 + col * 0.4), gy + gateH * (0.45 + row * 0.25), 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 城内屋顶（露出墙头）
  ctx.fillStyle = "#8b2e2e";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, wallTop + size * 0.12);
  ctx.lineTo(cx, wallTop + size * 0.02);
  ctx.lineTo(cx + size * 0.16, wallTop + size * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f0e0c0";
  ctx.fillRect(cx - size * 0.1, wallTop + size * 0.12, size * 0.2, size * 0.1);

  // 旗帜
  const fx = cx + size * 0.22;
  const fy = wallTop - size * 0.12;
  ctx.strokeStyle = "#3a2a1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fx, fy + size * 0.28);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  ctx.fillStyle = flag;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx + size * 0.16, fy + size * 0.06);
  ctx.lineTo(fx, fy + size * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,240,200,0.35)";
  ctx.stroke();
}

function drawTower(ctx, x, y, w, h, flag, keep = false) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, keep ? "#d0b090" : "#b0a080");
  grad.addColorStop(1, "#5a4a38");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y + h * 0.2, w, h * 0.8);
  // 顶
  ctx.fillStyle = keep ? "#8b2e2e" : "#6a3a2a";
  ctx.beginPath();
  ctx.moveTo(x - 2, y + h * 0.25);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w + 2, y + h * 0.25);
  ctx.closePath();
  ctx.fill();
  // 窗
  ctx.fillStyle = "#1a1010";
  ctx.fillRect(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.18);
  if (keep) {
    ctx.fillStyle = flag;
    ctx.fillRect(x + w * 0.15, y + h * 0.7, w * 0.7, 3);
  }
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

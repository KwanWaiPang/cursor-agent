/**
 * 自研像素风地图块（战棋地形贴图）
 * 不使用任何原作 BMP；程序生成多变体 + 邻接过渡。
 */

function mulberry(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const cache = new Map();

function rnd(seed, i) {
  return mulberry(seed * 997 + i * 131 + 17);
}

function fillNoise(ctx, s, seed, colors, density = 40) {
  for (let i = 0; i < density; i++) {
    const x = Math.floor(rnd(seed, i) * s);
    const y = Math.floor(rnd(seed, i + 50) * s);
    const c = colors[Math.floor(rnd(seed, i + 90) * colors.length)];
    const w = 1 + Math.floor(rnd(seed, i + 110) * 2);
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, w);
  }
}

function paintPlain(ctx, s, variant) {
  const base = ctx.createLinearGradient(0, 0, 0, s);
  base.addColorStop(0, variant === 1 ? "#d2dc96" : "#c6d486");
  base.addColorStop(1, variant === 2 ? "#96a858" : "#a8b868");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);

  // 草丛簇
  for (let i = 0; i < 10; i++) {
    const x = 4 + rnd(variant + 3, i) * (s - 10);
    const y = 6 + rnd(variant + 5, i + 20) * (s - 14);
    ctx.strokeStyle = rnd(variant, i) > 0.5 ? "#6a8a38" : "#8aaa48";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x - 2, y, x - 1, y - 3);
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x + 2, y, x + 1, y - 3);
    ctx.stroke();
  }
  fillNoise(ctx, s, variant + 1, ["rgba(90,120,40,0.2)", "rgba(220,230,140,0.25)"], 22);

  // 偶尔小石
  if (variant === 2) {
    ctx.fillStyle = "#9a9068";
    ctx.beginPath();
    ctx.ellipse(s * 0.7, s * 0.65, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(s * 0.68, s * 0.62, 2, 1);
  }
}

function paintRoad(ctx, s, variant) {
  paintPlain(ctx, s, 0);
  const left = s * 0.18;
  const width = s * 0.64;
  const dirt = ctx.createLinearGradient(left, 0, left + width, 0);
  dirt.addColorStop(0, "#9a7a4a");
  dirt.addColorStop(0.5, "#c4a06a");
  dirt.addColorStop(1, "#9a7a4a");
  ctx.fillStyle = dirt;
  ctx.fillRect(left, 0, width, s);

  // 车辙
  ctx.strokeStyle = "rgba(70,50,30,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left + width * 0.35, 0);
  ctx.lineTo(left + width * 0.32, s);
  ctx.moveTo(left + width * 0.65, 0);
  ctx.lineTo(left + width * 0.68, s);
  ctx.stroke();

  // 碎石
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = rnd(variant, i) > 0.5 ? "#d8c090" : "#8a6840";
    ctx.fillRect(
      left + 4 + rnd(variant, i + 2) * (width - 8),
      rnd(variant, i + 4) * s,
      2,
      2
    );
  }

  // 路边草
  ctx.fillStyle = "#7a9a40";
  ctx.fillRect(left - 3, 0, 3, s);
  ctx.fillRect(left + width, 0, 3, s);
}

function paintForest(ctx, s, variant) {
  const ground = ctx.createLinearGradient(0, 0, 0, s);
  ground.addColorStop(0, "#5a7a38");
  ground.addColorStop(1, "#2f4a20");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, s, s);
  fillNoise(ctx, s, variant + 8, ["rgba(20,40,10,0.25)", "rgba(120,160,60,0.2)"], 18);

  const trees =
    variant === 0
      ? [
          [0.28, 0.62, 1],
          [0.72, 0.48, 0.85],
          [0.52, 0.78, 0.7],
        ]
      : variant === 1
        ? [
            [0.35, 0.55, 1.05],
            [0.68, 0.7, 0.8],
            [0.2, 0.8, 0.65],
          ]
        : [
            [0.55, 0.5, 1],
            [0.25, 0.68, 0.75],
            [0.78, 0.72, 0.7],
          ];

  for (const [tx, ty, sc] of trees) {
    const x = tx * s;
    const y = ty * s;
    // 树影
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 6, 10 * sc, 4 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    // 树干
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(x - 2 * sc, y, 4 * sc, 10 * sc);
    ctx.fillStyle = "#3a2414";
    ctx.fillRect(x - 1 * sc, y + 2, 1, 8 * sc);
    // 三层树冠
    const layers = [
      ["#1f5a28", 0.42],
      ["#2f7a35", 0.34],
      ["#4a9a48", 0.24],
    ];
    layers.forEach(([color, h], li) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - s * h * sc);
      ctx.lineTo(x + s * (0.2 - li * 0.02) * sc, y + 2 - li * 2);
      ctx.lineTo(x - s * (0.2 - li * 0.02) * sc, y + 2 - li * 2);
      ctx.closePath();
      ctx.fill();
    });
    // 高光
    ctx.fillStyle = "rgba(180,220,120,0.25)";
    ctx.beginPath();
    ctx.moveTo(x - 2, y - s * 0.28 * sc);
    ctx.lineTo(x + 4, y - s * 0.1 * sc);
    ctx.lineTo(x - 4, y - s * 0.08 * sc);
    ctx.closePath();
    ctx.fill();
  }
}

function paintHill(ctx, s, variant) {
  const skyish = ctx.createLinearGradient(0, 0, 0, s);
  skyish.addColorStop(0, "#b8a878");
  skyish.addColorStop(1, "#6a5a38");
  ctx.fillStyle = skyish;
  ctx.fillRect(0, 0, s, s);

  const peaks =
    variant === 0
      ? [
          [0, 1, 0.32, 0.22, 0.7, 0.5, 1, 0.18],
          [0.1, 1, 0.5, 0.4, 0.9, 0.55],
        ]
      : [
          [0, 1, 0.25, 0.35, 0.55, 0.15, 1, 0.4],
          [0.15, 1, 0.45, 0.45, 0.85, 0.6],
        ];

  // 远峰
  ctx.fillStyle = "#7a6a48";
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.lineTo(s * peaks[0][2], s * peaks[0][3]);
  ctx.lineTo(s * peaks[0][4], s * peaks[0][5]);
  ctx.lineTo(s * peaks[0][6], s * peaks[0][7]);
  ctx.lineTo(s, s);
  ctx.closePath();
  ctx.fill();

  // 近峰
  ctx.fillStyle = "#8a7a55";
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.lineTo(s * peaks[1][2], s * peaks[1][3]);
  ctx.lineTo(s * peaks[1][4], s * peaks[1][5]);
  ctx.lineTo(s, s);
  ctx.closePath();
  ctx.fill();

  // 岩层纹理
  ctx.strokeStyle = "rgba(40,30,20,0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = s * (0.55 + i * 0.08);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, y);
    ctx.quadraticCurveTo(s * 0.5, y + 3, s * 0.9, y - 2);
    ctx.stroke();
  }

  // 雪/亮边
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.moveTo(s * 0.45, s * 0.42);
  ctx.lineTo(s * 0.5, s * 0.28);
  ctx.lineTo(s * 0.58, s * 0.45);
  ctx.closePath();
  ctx.fill();

  // 稀疏灌木
  ctx.fillStyle = "#4a6a30";
  ctx.fillRect(s * 0.15, s * 0.82, 3, 5);
  ctx.beginPath();
  ctx.arc(s * 0.16, s * 0.8, 4, 0, Math.PI * 2);
  ctx.fill();
}

function paintWater(ctx, s, variant, animPhase = 0) {
  const deep = ctx.createLinearGradient(0, 0, s, s);
  deep.addColorStop(0, "#4a88b0");
  deep.addColorStop(0.5, "#3a6a98");
  deep.addColorStop(1, "#2a5078");
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, s, s);

  // 水底暗纹
  fillNoise(ctx, s, variant + 20, ["rgba(20,40,70,0.2)", "rgba(100,160,200,0.15)"], 16);

  ctx.lineWidth = 1.6;
  for (let i = 0; i < 5; i++) {
    const y = s * (0.15 + i * 0.16) + Math.sin(animPhase + i) * 1.5;
    ctx.strokeStyle = i % 2 ? "rgba(220,240,255,0.4)" : "rgba(160,200,230,0.35)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(s * 0.25, y - 4 + variant, s * 0.5, y);
    ctx.quadraticCurveTo(s * 0.75, y + 4 - variant, s, y);
    ctx.stroke();
  }

  // 泡沫点
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(rnd(variant, i) * s, rnd(variant, i + 10) * s, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintFort(ctx, s, variant) {
  // 夯土底
  ctx.fillStyle = "#8a7a60";
  ctx.fillRect(0, 0, s, s);

  const brickH = s / 4;
  const brickW = s / 3;
  for (let row = 0; row < 4; row++) {
    const off = (row + variant) % 2 ? brickW / 2 : 0;
    for (let col = -1; col < 4; col++) {
      const x = col * brickW + off;
      const tone = (row + col + variant) % 2 ? "#a89878" : "#7a6a52";
      ctx.fillStyle = tone;
      ctx.fillRect(x + 1, row * brickH + 1, brickW - 2, brickH - 2);
      ctx.strokeStyle = "rgba(30,20,12,0.4)";
      ctx.strokeRect(x + 1, row * brickH + 1, brickW - 2, brickH - 2);
      // 砖面裂纹
      if (rnd(variant, row * 5 + col) > 0.7) {
        ctx.strokeStyle = "rgba(40,30,20,0.35)";
        ctx.beginPath();
        ctx.moveTo(x + 4, row * brickH + 4);
        ctx.lineTo(x + brickW - 6, row * brickH + brickH - 5);
        ctx.stroke();
      }
    }
  }

  // 城垛
  ctx.fillStyle = "#5a4a38";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(i * (s / 4) + 2, 0, s / 4 - 4, 5);
  }
  // 木门感（变体 1）
  if (variant === 1) {
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(s * 0.35, s * 0.45, s * 0.3, s * 0.55);
    ctx.strokeStyle = "#2a1810";
    ctx.strokeRect(s * 0.35, s * 0.45, s * 0.3, s * 0.55);
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.45);
    ctx.lineTo(s * 0.5, s);
    ctx.stroke();
    ctx.fillStyle = "#c4a574";
    ctx.beginPath();
    ctx.arc(s * 0.58, s * 0.7, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintTile(ctx, kind, s, variant) {
  switch (kind) {
    case "plain":
      paintPlain(ctx, s, variant % 3);
      break;
    case "road":
      paintRoad(ctx, s, variant % 2);
      break;
    case "forest":
      paintForest(ctx, s, variant % 3);
      break;
    case "hill":
      paintHill(ctx, s, variant % 2);
      break;
    case "water":
      paintWater(ctx, s, variant % 3);
      break;
    case "fort":
      paintFort(ctx, s, variant % 2);
      break;
    default:
      ctx.fillStyle = "#888";
      ctx.fillRect(0, 0, s, s);
  }

  // 内阴影边，增强格子立体
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(1, s - 1);
  ctx.lineTo(1, 1);
  ctx.lineTo(s - 1, 1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(20,12,8,0.28)";
  ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
}

/** 获取地形贴图（按坐标变体，减少重复感） */
export function getTerrainTile(kind, size = 56, x = 0, y = 0) {
  const variant = (x * 3 + y * 5 + (kind?.length || 0)) % 3;
  const key = `${kind}_${size}_v${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  // 像素感：关闭平滑后绘制
  ctx.imageSmoothingEnabled = false;
  paintTile(ctx, kind, size, variant);
  cache.set(key, c);
  return c;
}

/**
 * 在格子边缘画邻接过渡（例如平地贴着树林时加草影）
 */
export function drawTileEdges(ctx, tiles, x, y, size) {
  const here = tiles[y][x];
  const n = y > 0 ? tiles[y - 1][x] : null;
  const s = y < tiles.length - 1 ? tiles[y + 1][x] : null;
  const w = x > 0 ? tiles[y][x - 1] : null;
  const e = x < tiles[0].length - 1 ? tiles[y][x + 1] : null;
  const px = x * size;
  const py = y * size;

  const edge = (side, color) => {
    ctx.fillStyle = color;
    if (side === "n") ctx.fillRect(px, py, size, 3);
    if (side === "s") ctx.fillRect(px, py + size - 3, size, 3);
    if (side === "w") ctx.fillRect(px, py, 3, size);
    if (side === "e") ctx.fillRect(px + size - 3, py, 3, size);
  };

  if (here === "plain" || here === "road") {
    if (n === "forest") edge("n", "rgba(40,80,30,0.25)");
    if (s === "forest") edge("s", "rgba(40,80,30,0.25)");
    if (w === "forest") edge("w", "rgba(40,80,30,0.25)");
    if (e === "forest") edge("e", "rgba(40,80,30,0.25)");
    if (n === "water") edge("n", "rgba(80,140,180,0.3)");
    if (s === "water") edge("s", "rgba(80,140,180,0.3)");
    if (w === "water") edge("w", "rgba(80,140,180,0.3)");
    if (e === "water") edge("e", "rgba(80,140,180,0.3)");
    if (n === "hill") edge("n", "rgba(90,70,40,0.22)");
    if (s === "hill") edge("s", "rgba(90,70,40,0.22)");
  }
  if (here === "water") {
    if (n && n !== "water") edge("n", "rgba(200,220,180,0.2)");
    if (s && s !== "water") edge("s", "rgba(200,220,180,0.2)");
    if (w && w !== "water") edge("w", "rgba(200,220,180,0.2)");
    if (e && e !== "water") edge("e", "rgba(200,220,180,0.2)");
  }
  if (here === "fort") {
    if (n && n !== "fort") edge("n", "rgba(40,30,20,0.35)");
    if (w && w !== "fort") edge("w", "rgba(40,30,20,0.35)");
  }
}

export function clearTileCache() {
  cache.clear();
}

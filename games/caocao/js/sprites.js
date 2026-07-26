/**
 * 自研像素风地形与武将棋子（致敬光荣战棋观感，非原作素材）
 */

function mulberry(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 预渲染地形贴图缓存 */
const tileCache = new Map();

export function getTerrainTile(kind, size = 56) {
  const key = `${kind}_${size}`;
  if (tileCache.has(key)) return tileCache.get(key);
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  paintTerrain(ctx, kind, size);
  tileCache.set(key, c);
  return c;
}

function paintTerrain(ctx, kind, s) {
  const g = (a, b) => {
    const grd = ctx.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, a);
    grd.addColorStop(1, b);
    return grd;
  };

  switch (kind) {
    case "plain": {
      ctx.fillStyle = g("#c8d48a", "#a8b868");
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 28; i++) {
        const x = mulberry(i * 3 + 1) * s;
        const y = mulberry(i * 7 + 2) * s;
        ctx.fillStyle = mulberry(i) > 0.5 ? "rgba(90,120,40,0.25)" : "rgba(200,220,120,0.3)";
        ctx.fillRect(x, y, 2, 2);
      }
      break;
    }
    case "road": {
      ctx.fillStyle = g("#c8d48a", "#a8b868");
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#b89a6a";
      ctx.fillRect(s * 0.15, 0, s * 0.7, s);
      ctx.fillStyle = "rgba(90,70,40,0.25)";
      for (let y = 4; y < s; y += 8) {
        ctx.fillRect(s * 0.2, y, s * 0.6, 2);
      }
      break;
    }
    case "forest": {
      ctx.fillStyle = g("#6a8a42", "#3d5c28");
      ctx.fillRect(0, 0, s, s);
      const trees = [
        [0.3, 0.55],
        [0.7, 0.45],
        [0.5, 0.75],
      ];
      for (const [tx, ty] of trees) {
        const x = tx * s;
        const y = ty * s;
        ctx.fillStyle = "#4a3020";
        ctx.fillRect(x - 2, y, 4, s * 0.18);
        ctx.fillStyle = "#2f6b32";
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.35);
        ctx.lineTo(x + s * 0.22, y + 2);
        ctx.lineTo(x - s * 0.22, y + 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#3f8a45";
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.28);
        ctx.lineTo(x + s * 0.16, y);
        ctx.lineTo(x - s * 0.16, y);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "hill": {
      ctx.fillStyle = g("#9a8a62", "#6a5a3a");
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = "#7a6a48";
      ctx.beginPath();
      ctx.moveTo(0, s);
      ctx.lineTo(s * 0.35, s * 0.25);
      ctx.lineTo(s * 0.7, s * 0.45);
      ctx.lineTo(s, s * 0.2);
      ctx.lineTo(s, s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(s * 0.28, s * 0.35);
      ctx.lineTo(s * 0.35, s * 0.25);
      ctx.lineTo(s * 0.42, s * 0.38);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "water": {
      ctx.fillStyle = g("#5a92b8", "#3a6a90");
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = "rgba(200,230,255,0.35)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const y = s * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(s * 0.25, y - 3, s * 0.5, y);
        ctx.quadraticCurveTo(s * 0.75, y + 3, s, y);
        ctx.stroke();
      }
      break;
    }
    case "fort": {
      ctx.fillStyle = "#8a8070";
      ctx.fillRect(0, 0, s, s);
      const brickH = s / 5;
      for (let row = 0; row < 5; row++) {
        const off = row % 2 ? s / 6 : 0;
        for (let col = -1; col < 4; col++) {
          const x = col * (s / 3) + off;
          ctx.fillStyle = row % 2 ? "#9a9080" : "#7a7060";
          ctx.fillRect(x + 1, row * brickH + 1, s / 3 - 2, brickH - 2);
          ctx.strokeStyle = "rgba(40,30,20,0.35)";
          ctx.strokeRect(x + 1, row * brickH + 1, s / 3 - 2, brickH - 2);
        }
      }
      // 城垛感
      ctx.fillStyle = "#6a6050";
      ctx.fillRect(0, 0, s, 4);
      break;
    }
    default: {
      ctx.fillStyle = "#888";
      ctx.fillRect(0, 0, s, s);
    }
  }

  // 网格细线
  ctx.strokeStyle = "rgba(30,20,10,0.18)";
  ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
}

const CLASS_WEAPON = {
  infantry: "spear",
  cavalry: "blade",
  archer: "bow",
  strategist: "fan",
};

/**
 * 绘制战场棋子（类原作：兵种造型 + 阵营底盘 + 姓名一字）
 */
export function drawUnitSprite(ctx, u, cx, cy, tile, selected) {
  const scale = tile / 56;
  const teamRing = u.team === "player" ? "#2a7a4a" : u.team === "ally" ? "#3a6aaa" : "#a03030";
  const body = u.portrait || (u.team === "player" ? "#4a7a58" : "#8a5050");

  // 底盘（原作常见圆形阵营座）
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16 * scale, 16 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = teamRing;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12 * scale, 15 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = u.team === "player" ? "#d8f0dc" : u.team === "ally" ? "#d0e4f8" : "#f0d0d0";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 12 * scale, 11 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const cls = u.classId || "infantry";
  if (cls === "cavalry") drawCavalry(ctx, cx, cy, scale, body, teamRing);
  else if (cls === "archer") drawArcher(ctx, cx, cy, scale, body, teamRing);
  else if (cls === "strategist") drawStrategist(ctx, cx, cy, scale, body, teamRing);
  else drawInfantry(ctx, cx, cy, scale, body, teamRing);

  // 选中光环
  if (selected) {
    ctx.strokeStyle = "#f3d48a";
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12 * scale, 17 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 已行动
  if (u.done && u.team === "player") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * scale, 14 * scale, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 姓名牌
  const label = u.name.length <= 2 ? u.name : u.name.slice(-2);
  ctx.font = `bold ${Math.round(10 * scale)}px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const tw = ctx.measureText(label).width + 6;
  ctx.fillStyle = "rgba(20,12,8,0.72)";
  ctx.fillRect(cx - tw / 2, cy + 18 * scale, tw, 12 * scale);
  ctx.fillStyle = "#f8ecd6";
  ctx.fillText(label, cx, cy + 19 * scale);

  // HP
  const bw = 28 * scale;
  const bh = 4 * scale;
  const bx = cx - bw / 2;
  const by = cy - 26 * scale;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  const pct = Math.max(0, u.hp / u.hpMax);
  ctx.fillStyle = pct > 0.5 ? "#5dcf5a" : pct > 0.25 ? "#d4b84a" : "#d05040";
  ctx.fillRect(bx, by, bw * pct, bh);

  // 主将/敌将标记
  if (u.lord || u.boss) {
    ctx.fillStyle = u.lord ? "#f3c27a" : "#ff7070";
    ctx.font = `bold ${Math.round(9 * scale)}px serif`;
    ctx.textBaseline = "middle";
    ctx.fillText(u.lord ? "主" : "将", cx + 16 * scale, cy - 18 * scale);
  }
}

function head(ctx, cx, cy, scale, skin = "#f0d0b0") {
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, cy - 8 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1c10";
  ctx.beginPath();
  ctx.arc(cx, cy - 10 * scale, 6.2 * scale, Math.PI, 0);
  ctx.fill();
}

function drawInfantry(ctx, cx, cy, scale, body, accent) {
  // 躯干
  ctx.fillStyle = body;
  ctx.fillRect(cx - 7 * scale, cy - 4 * scale, 14 * scale, 14 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 7 * scale, cy + 2 * scale, 14 * scale, 3 * scale);
  head(ctx, cx, cy, scale);
  // 矛
  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 10 * scale, cy + 10 * scale);
  ctx.lineTo(cx + 10 * scale, cy - 18 * scale);
  ctx.stroke();
  ctx.fillStyle = "#d0d8e0";
  ctx.beginPath();
  ctx.moveTo(cx + 10 * scale, cy - 20 * scale);
  ctx.lineTo(cx + 14 * scale, cy - 12 * scale);
  ctx.lineTo(cx + 6 * scale, cy - 12 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawCavalry(ctx, cx, cy, scale, body, accent) {
  // 马
  ctx.fillStyle = "#5a4030";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4 * scale, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a3020";
  ctx.fillRect(cx - 12 * scale, cy + 6 * scale, 3 * scale, 8 * scale);
  ctx.fillRect(cx + 8 * scale, cy + 6 * scale, 3 * scale, 8 * scale);
  // 骑手
  ctx.fillStyle = body;
  ctx.fillRect(cx - 5 * scale, cy - 8 * scale, 10 * scale, 12 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 5 * scale, cy - 2 * scale, 10 * scale, 2 * scale);
  head(ctx, cx, cy - 2 * scale, scale);
  // 刀
  ctx.strokeStyle = "#e0e0e0";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 6 * scale, cy - 2 * scale);
  ctx.lineTo(cx + 16 * scale, cy - 14 * scale);
  ctx.stroke();
}

function drawArcher(ctx, cx, cy, scale, body, accent) {
  ctx.fillStyle = body;
  ctx.fillRect(cx - 6 * scale, cy - 4 * scale, 12 * scale, 14 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 6 * scale, cy + 4 * scale, 12 * scale, 2 * scale);
  head(ctx, cx, cy, scale);
  // 弓
  ctx.strokeStyle = "#8a5a30";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(cx + 10 * scale, cy, 10 * scale, -1.2, 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 10 * scale, cy - 9 * scale);
  ctx.lineTo(cx + 10 * scale, cy + 9 * scale);
  ctx.stroke();
}

function drawStrategist(ctx, cx, cy, scale, body, accent) {
  // 长袍
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(cx - 9 * scale, cy + 12 * scale);
  ctx.lineTo(cx - 6 * scale, cy - 6 * scale);
  ctx.lineTo(cx + 6 * scale, cy - 6 * scale);
  ctx.lineTo(cx + 9 * scale, cy + 12 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 6 * scale, cy - 2 * scale, 12 * scale, 2 * scale);
  head(ctx, cx, cy - 2 * scale, scale);
  // 羽扇
  ctx.fillStyle = "#f0e8d0";
  ctx.beginPath();
  ctx.ellipse(cx + 12 * scale, cy - 6 * scale, 7 * scale, 4 * scale, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8a7030";
  ctx.beginPath();
  ctx.moveTo(cx + 8 * scale, cy);
  ctx.lineTo(cx + 14 * scale, cy - 8 * scale);
  ctx.stroke();
}

const FACE = {
  caocao: { beard: true, crown: "#c4a574", brow: 0.02 },
  xiahou_dun: { eyePatch: true, crown: "#8b2e2e" },
  dianwei: { thick: true, crown: "#5a3a20" },
  xuchu: { thick: true, crown: "#6a4028" },
  xunyu: { scholar: true, crown: "#3a4a6b" },
  guojia: { scholar: true, crown: "#2a3a5b" },
  sunjian: { crown: "#2a5a8a", beard: true },
  guanyu: { beard: true, longBeard: true, crown: "#6b1a1a" },
  zhangfei: { thick: true, crown: "#2a2a4a", beard: true },
  lvbu: { crown: "#5a1a2a", brow: -0.01 },
  zhangjiao: { scholar: true, crown: "#5a2a6b", hat: true },
};

/** 侧栏头像（自研半身像，按武将微调） */
export function drawPortrait(canvas, u) {
  if (!canvas || !u) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const face = FACE[u.generalId] || {};

  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(
    0,
    u.team === "enemy" ? "#4a2828" : u.team === "ally" ? "#243048" : "#243828"
  );
  grd.addColorStop(1, "#1a1410");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // 肩甲 / 袍
  ctx.fillStyle = u.portrait || "#6a5040";
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h);
  ctx.lineTo(w * 0.18, h * 0.52);
  ctx.lineTo(w * 0.82, h * 0.52);
  ctx.lineTo(w * 0.92, h);
  ctx.closePath();
  ctx.fill();
  if (face.scholar) {
    ctx.fillStyle = "rgba(240,232,200,0.25)";
    ctx.fillRect(w * 0.35, h * 0.58, w * 0.3, h * 0.3);
  }

  // 头
  ctx.fillStyle = "#f0d0b0";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.38, w * (face.thick ? 0.24 : 0.22), 0, Math.PI * 2);
  ctx.fill();

  // 发
  ctx.fillStyle = "#1c1410";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.32, w * 0.23, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = face.crown || (u.team === "enemy" ? "#8b2e2e" : "#c4a574");
  if (face.hat) {
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.22);
    ctx.lineTo(w * 0.5, h * 0.06);
    ctx.lineTo(w * 0.72, h * 0.22);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(w * 0.35, h * 0.12, w * 0.3, h * 0.1);
  }

  // 眼
  ctx.fillStyle = "#2a1c10";
  const ey = h * (0.38 + (face.brow || 0));
  if (face.eyePatch) {
    ctx.fillRect(w * 0.36, ey, w * 0.1, w * 0.05);
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(w * 0.34, ey - 2, w * 0.14, w * 0.08);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(w * 0.56, ey, w * 0.06, w * 0.04);
  } else {
    ctx.fillRect(w * 0.38, ey, w * 0.06, w * 0.04);
    ctx.fillRect(w * 0.56, ey, w * 0.06, w * 0.04);
  }

  // 须
  if (face.beard) {
    ctx.fillStyle = "#2a1c10";
    ctx.beginPath();
    if (face.longBeard) {
      ctx.moveTo(w * 0.42, h * 0.48);
      ctx.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.58, h * 0.48);
    } else {
      ctx.ellipse(w / 2, h * 0.5, w * 0.1, h * 0.06, 0, 0, Math.PI);
    }
    ctx.fill();
  }

  const clsName = { infantry: "步", cavalry: "骑", archer: "弓", strategist: "策" }[
    u.classId
  ];
  ctx.fillStyle = "#f8ecd6";
  ctx.font = "12px serif";
  ctx.textAlign = "center";
  ctx.fillText(`${u.name.slice(0, 2)}·${clsName || ""}`, w / 2, h - 8);
}

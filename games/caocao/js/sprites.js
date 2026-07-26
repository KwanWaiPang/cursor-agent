/**
 * 自研像素风武将棋子与立绘（地形见 tiles.js）
 */
export { getTerrainTile, drawTileEdges } from "./tiles.js";

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

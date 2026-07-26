/**
 * 自研像素风武将棋子与立绘（地形见 tiles.js）
 * 兵种可辨、名将略有差异；非原作素材。
 */
export { getTerrainTile, drawTileEdges } from "./tiles.js";

/** 名将外观微调 */
const UNIT_STYLE = {
  caocao: { cape: "#8b2e2e", helm: "#c4a574", horse: "#3a2a1a" },
  xiahou_dun: { cape: "#6b2020", eyePatch: true, helm: "#8b2e2e" },
  xiahou_yuan: { cape: "#a05030", quiver: true },
  dianwei: { cape: "#5a3a20", dual: true, bulk: 1.1 },
  xuchu: { cape: "#6a4028", bulk: 1.15 },
  xunyu: { robe: "#3a4a6b", fan: true },
  guojia: { robe: "#2a3a5b", fan: true },
  zhangliao: { cape: "#4a5a8b", horse: "#2a1a10" },
  sunjian: { cape: "#2a5a8a", helm: "#d4b84a" },
  liubei: { robe: "#3a6a4a", fan: true },
  guanyu: { cape: "#1a4a2a", beard: true, horse: "#2a1a10", blade: "long" },
  zhangfei: { cape: "#2a2a4a", bulk: 1.12, spear: true },
  lvbu: { cape: "#5a1a2a", helm: "#c0c0c0", horse: "#1a1010", bulk: 1.12 },
  huaxiong: { cape: "#7a3030", helm: "#a0a0a0" },
  zhangjiao: { robe: "#5a2a6b", hat: true, staff: true },
  zhangbao: { robe: "#6a3a7b", hat: true },
  zhangliang: { cape: "#7a4a2b", horse: "#4a3020" },
  dongzhuo: { cape: "#4a3a2a", bulk: 1.2 },
  yellow_spear: { cape: "#c9a227", sash: "#e8d060" },
  yellow_archer: { cape: "#d4b84a", sash: "#e8d060", quiver: true },
  yellow_rider: { cape: "#b8952a", sash: "#e8d060", horse: "#6a5030" },
};

function styleOf(u) {
  return UNIT_STYLE[u.generalId] || {};
}

function teamColors(team) {
  if (team === "ally") {
    return { ring: "#3a6aaa", pad: "#d0e4f8", ink: "#1a3050" };
  }
  if (team === "enemy") {
    return { ring: "#a03030", pad: "#f0d0d0", ink: "#4a1010" };
  }
  return { ring: "#2a7a4a", pad: "#d8f0dc", ink: "#143020" };
}

/**
 * 绘制战场棋子
 */
export function drawUnitSprite(ctx, u, cx, cy, tile, selected) {
  const scale = tile / 56;
  const body = u.portrait || (u.team === "player" ? "#4a7a58" : "#8a5050");
  const tc = teamColors(u.team);
  const st = styleOf(u);
  const bulk = st.bulk || 1;

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + 17 * scale, 15 * scale * bulk, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 阵营底盘
  ctx.fillStyle = tc.ring;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13 * scale, 15 * scale * bulk, 6.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tc.pad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13 * scale, 11 * scale * bulk, 4.2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  // 底盘内圈
  ctx.strokeStyle = "rgba(20,12,8,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13 * scale, 11 * scale * bulk, 4.2 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  const cls = u.classId || "infantry";
  if (cls === "cavalry") drawCavalry(ctx, cx, cy, scale, body, tc.ring, st, bulk);
  else if (cls === "archer") drawArcher(ctx, cx, cy, scale, body, tc.ring, st, bulk);
  else if (cls === "strategist") drawStrategist(ctx, cx, cy, scale, body, tc.ring, st, bulk);
  else drawInfantry(ctx, cx, cy, scale, body, tc.ring, st, bulk);

  if (selected) {
    ctx.strokeStyle = "#f3d48a";
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 13 * scale, 17 * scale * bulk, 7.5 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(243,212,138,0.35)";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 13 * scale, 19 * scale * bulk, 8.5 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (u.done && u.team === "player") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * scale, 14 * scale * bulk, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 姓名牌
  const label = u.name.length <= 2 ? u.name : u.name.slice(-2);
  ctx.font = `bold ${Math.round(10 * scale)}px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const tw = ctx.measureText(label).width + 8;
  roundRect(ctx, cx - tw / 2, cy + 19 * scale, tw, 13 * scale, 3 * scale, "rgba(20,12,8,0.78)");
  ctx.fillStyle = "#f8ecd6";
  ctx.fillText(label, cx, cy + 20.5 * scale);

  // HP 条
  const bw = 30 * scale;
  const bh = 5 * scale;
  const bx = cx - bw / 2;
  const by = cy - 28 * scale;
  roundRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, 2, "rgba(0,0,0,0.6)");
  const pct = Math.max(0, u.hp / u.hpMax);
  const hpColor = pct > 0.5 ? "#5dcf5a" : pct > 0.25 ? "#d4b84a" : "#d05040";
  ctx.fillStyle = hpColor;
  ctx.fillRect(bx, by, bw * pct, bh);
  // MP 细线（策士）
  if (u.mpMax > 0 && u.classId === "strategist") {
    const mp = Math.max(0, u.mp / u.mpMax);
    ctx.fillStyle = "rgba(80,140,220,0.9)";
    ctx.fillRect(bx, by + bh + 1, bw * mp, 2 * scale);
  }

  if (u.lord || u.boss) {
    const tag = u.lord ? "主" : "将";
    ctx.fillStyle = u.lord ? "#f3c27a" : "#ff7070";
    ctx.font = `bold ${Math.round(10 * scale)}px serif`;
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeText(tag, cx + 16 * scale, cy - 20 * scale);
    ctx.fillText(tag, cx + 16 * scale, cy - 20 * scale);
  }
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function drawHead(ctx, cx, cy, scale, st = {}) {
  const skin = "#f0d0b0";
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, cy, 6.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  // 发
  ctx.fillStyle = "#1c1410";
  ctx.beginPath();
  ctx.arc(cx, cy - 2 * scale, 6.4 * scale, Math.PI, 0);
  ctx.fill();
  if (st.helm) {
    ctx.fillStyle = st.helm;
    ctx.beginPath();
    ctx.arc(cx, cy - 3 * scale, 6.8 * scale, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 7 * scale, cy - 4 * scale, 14 * scale, 3 * scale);
  }
  if (st.hat) {
    ctx.fillStyle = st.robe || "#5a2a6b";
    ctx.beginPath();
    ctx.moveTo(cx - 8 * scale, cy - 2 * scale);
    ctx.lineTo(cx, cy - 12 * scale);
    ctx.lineTo(cx + 8 * scale, cy - 2 * scale);
    ctx.closePath();
    ctx.fill();
  }
  if (st.eyePatch) {
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(cx - 6 * scale, cy - 1 * scale, 5 * scale, 3 * scale);
  }
  if (st.beard) {
    ctx.fillStyle = "#2a1c10";
    ctx.beginPath();
    ctx.moveTo(cx - 3 * scale, cy + 3 * scale);
    ctx.quadraticCurveTo(cx, cy + 9 * scale, cx + 3 * scale, cy + 3 * scale);
    ctx.fill();
  }
}

function drawCape(ctx, cx, cy, scale, color, bulk) {
  if (!color) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - 8 * scale * bulk, cy - 2 * scale);
  ctx.lineTo(cx - 12 * scale * bulk, cy + 12 * scale);
  ctx.lineTo(cx + 12 * scale * bulk, cy + 12 * scale);
  ctx.lineTo(cx + 8 * scale * bulk, cy - 2 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(cx - 4 * scale, cy, 3 * scale, 10 * scale);
}

function drawInfantry(ctx, cx, cy, scale, body, accent, st, bulk) {
  drawCape(ctx, cx, cy, scale, st.cape || st.sash, bulk);
  // 腿
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(cx - 5 * scale * bulk, cy + 8 * scale, 3.5 * scale, 6 * scale);
  ctx.fillRect(cx + 1.5 * scale * bulk, cy + 8 * scale, 3.5 * scale, 6 * scale);
  // 甲
  ctx.fillStyle = body;
  ctx.fillRect(cx - 8 * scale * bulk, cy - 4 * scale, 16 * scale * bulk, 13 * scale);
  // 甲片
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 7 * scale * bulk, cy - 2 * scale + i * 4 * scale);
    ctx.lineTo(cx + 7 * scale * bulk, cy - 2 * scale + i * 4 * scale);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 8 * scale * bulk, cy + 2 * scale, 16 * scale * bulk, 3 * scale);
  drawHead(ctx, cx, cy - 9 * scale, scale, st);

  // 武器
  if (st.dual) {
    // 双戟
    for (const side of [-1, 1]) {
      ctx.strokeStyle = "#c8d0d8";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + side * 9 * scale, cy + 8 * scale);
      ctx.lineTo(cx + side * 12 * scale, cy - 16 * scale);
      ctx.stroke();
      ctx.fillStyle = "#e8c060";
      ctx.beginPath();
      ctx.moveTo(cx + side * 12 * scale, cy - 18 * scale);
      ctx.lineTo(cx + side * 16 * scale, cy - 10 * scale);
      ctx.lineTo(cx + side * 8 * scale, cy - 10 * scale);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // 长矛
    ctx.strokeStyle = "#8a6a40";
    ctx.lineWidth = 2.2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 10 * scale, cy + 10 * scale);
    ctx.lineTo(cx + 10 * scale, cy - 18 * scale);
    ctx.stroke();
    ctx.fillStyle = "#d8e0e8";
    ctx.beginPath();
    ctx.moveTo(cx + 10 * scale, cy - 20 * scale);
    ctx.lineTo(cx + 14 * scale, cy - 11 * scale);
    ctx.lineTo(cx + 6 * scale, cy - 11 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(cx + 9 * scale, cy - 16 * scale, 1.5 * scale, 6 * scale);
  }
}

function drawCavalry(ctx, cx, cy, scale, body, accent, st, bulk) {
  const horse = st.horse || "#5a4030";
  // 马身
  ctx.fillStyle = horse;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 5 * scale, 15 * scale * bulk, 8.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  // 马头
  ctx.beginPath();
  ctx.ellipse(cx + 12 * scale * bulk, cy + 1 * scale, 6 * scale, 4.5 * scale, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1a10";
  ctx.fillRect(cx + 15 * scale * bulk, cy - 2 * scale, 2 * scale, 4 * scale);
  // 腿
  ctx.fillStyle = "#3a2414";
  ctx.fillRect(cx - 11 * scale, cy + 9 * scale, 3 * scale, 7 * scale);
  ctx.fillRect(cx + 7 * scale, cy + 9 * scale, 3 * scale, 7 * scale);
  // 鞍
  ctx.fillStyle = "#6a3a20";
  ctx.fillRect(cx - 6 * scale, cy + 1 * scale, 12 * scale, 5 * scale);
  // 披风
  if (st.cape) {
    ctx.fillStyle = st.cape;
    ctx.beginPath();
    ctx.moveTo(cx - 4 * scale, cy - 6 * scale);
    ctx.lineTo(cx - 14 * scale, cy + 8 * scale);
    ctx.lineTo(cx - 2 * scale, cy + 6 * scale);
    ctx.closePath();
    ctx.fill();
  }
  // 骑手
  ctx.fillStyle = body;
  ctx.fillRect(cx - 5.5 * scale * bulk, cy - 8 * scale, 11 * scale * bulk, 11 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 5.5 * scale * bulk, cy - 1 * scale, 11 * scale * bulk, 2.5 * scale);
  drawHead(ctx, cx, cy - 11 * scale, scale, st);

  // 刀 / 长刀
  const len = st.blade === "long" ? 22 : 14;
  ctx.strokeStyle = "#e8e8f0";
  ctx.lineWidth = 2.2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 5 * scale, cy - 2 * scale);
  ctx.lineTo(cx + 8 * scale + len * 0.3 * scale, cy - len * scale);
  ctx.stroke();
  ctx.strokeStyle = "#8a7030";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 4 * scale, cy);
  ctx.lineTo(cx + 6 * scale, cy - 4 * scale);
  ctx.stroke();
}

function drawArcher(ctx, cx, cy, scale, body, accent, st, bulk) {
  drawCape(ctx, cx, cy, scale, st.cape || st.sash, bulk);
  ctx.fillStyle = "#3a2a1a";
  ctx.fillRect(cx - 4 * scale, cy + 8 * scale, 3 * scale, 5 * scale);
  ctx.fillRect(cx + 1 * scale, cy + 8 * scale, 3 * scale, 5 * scale);
  ctx.fillStyle = body;
  ctx.fillRect(cx - 7 * scale * bulk, cy - 4 * scale, 14 * scale * bulk, 13 * scale);
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 7 * scale * bulk, cy + 4 * scale, 14 * scale * bulk, 2.5 * scale);
  drawHead(ctx, cx, cy - 9 * scale, scale, st);

  // 弓
  ctx.strokeStyle = "#8a5a30";
  ctx.lineWidth = 2.2 * scale;
  ctx.beginPath();
  ctx.arc(cx + 11 * scale, cy, 11 * scale, -1.25, 1.25);
  ctx.stroke();
  ctx.strokeStyle = "#d8c8a0";
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + 11 * scale, cy - 10 * scale);
  ctx.lineTo(cx + 11 * scale, cy + 10 * scale);
  ctx.stroke();
  // 箭囊
  if (st.quiver !== false) {
    ctx.fillStyle = "#5a3a20";
    ctx.fillRect(cx - 11 * scale, cy - 2 * scale, 4 * scale, 10 * scale);
    ctx.fillStyle = "#c4a574";
    ctx.fillRect(cx - 10 * scale, cy - 5 * scale, 2 * scale, 4 * scale);
  }
}

function drawStrategist(ctx, cx, cy, scale, body, accent, st, bulk) {
  const robe = st.robe || body;
  // 袍摆
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(cx - 10 * scale * bulk, cy + 13 * scale);
  ctx.lineTo(cx - 7 * scale * bulk, cy - 6 * scale);
  ctx.lineTo(cx + 7 * scale * bulk, cy - 6 * scale);
  ctx.lineTo(cx + 10 * scale * bulk, cy + 13 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.moveTo(cx - 2 * scale, cy - 4 * scale);
  ctx.lineTo(cx + 1 * scale, cy + 12 * scale);
  ctx.lineTo(cx - 4 * scale, cy + 12 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(cx - 7 * scale, cy - 2 * scale, 14 * scale, 2.5 * scale);
  drawHead(ctx, cx, cy - 10 * scale, scale, st);

  if (st.staff) {
    ctx.strokeStyle = "#6a4a20";
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(cx + 10 * scale, cy + 12 * scale);
    ctx.lineTo(cx + 12 * scale, cy - 16 * scale);
    ctx.stroke();
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.arc(cx + 12 * scale, cy - 18 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 羽扇
    ctx.fillStyle = "#f0e8d0";
    ctx.beginPath();
    ctx.ellipse(cx + 12 * scale, cy - 6 * scale, 8 * scale, 5 * scale, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a7030";
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + 12 * scale, cy - 6 * scale);
      ctx.lineTo(cx + 12 * scale + i * 3 * scale, cy - 10 * scale);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx + 8 * scale, cy);
    ctx.lineTo(cx + 14 * scale, cy - 8 * scale);
    ctx.stroke();
  }
}

/* —— 侧栏立绘 —— */

const FACE = {
  caocao: { beard: true, crown: "#c4a574", brow: 0.02, cape: "#8b2e2e" },
  xiahou_dun: { eyePatch: true, crown: "#8b2e2e", cape: "#6b2020" },
  xiahou_yuan: { crown: "#a05030", cape: "#a05030" },
  dianwei: { thick: true, crown: "#5a3a20", cape: "#5a3a20" },
  xuchu: { thick: true, crown: "#6a4028", cape: "#6a4028" },
  xunyu: { scholar: true, crown: "#3a4a6b", robe: true },
  guojia: { scholar: true, crown: "#2a3a5b", robe: true },
  zhangliao: { crown: "#4a5a8b", cape: "#4a5a8b", beard: true },
  sunjian: { crown: "#d4b84a", cape: "#2a5a8a", beard: true },
  liubei: { scholar: true, crown: "#3a6a4a", robe: true, beard: true },
  guanyu: { beard: true, longBeard: true, crown: "#6b1a1a", cape: "#1a4a2a" },
  zhangfei: { thick: true, crown: "#2a2a4a", cape: "#2a2a4a", beard: true },
  lvbu: { crown: "#c0c0c0", cape: "#5a1a2a", brow: -0.01 },
  huaxiong: { crown: "#a0a0a0", cape: "#7a3030" },
  zhangjiao: { scholar: true, crown: "#5a2a6b", hat: true, robe: true },
  zhangbao: { scholar: true, crown: "#6a3a7b", hat: true, robe: true },
  zhangliang: { crown: "#7a4a2b", cape: "#7a4a2b" },
  dongzhuo: { thick: true, crown: "#4a3a2a", cape: "#4a3a2a", beard: true },
};

export function drawPortrait(canvas, u) {
  if (!canvas || !u) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const face = FACE[u.generalId] || {};

  // 背景纹
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(
    0,
    u.team === "enemy" ? "#4a2828" : u.team === "ally" ? "#243048" : "#243828"
  );
  grd.addColorStop(1, "#120e0a");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(196,165,116,0.06)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(0, i * 18, w, 1);
  }

  // 肩甲 / 袍
  const armor = face.cape || u.portrait || "#6a5040";
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h);
  ctx.lineTo(w * 0.16, h * 0.5);
  ctx.lineTo(w * 0.84, h * 0.5);
  ctx.lineTo(w * 0.94, h);
  ctx.closePath();
  ctx.fill();
  // 甲片线
  if (!face.robe && !face.scholar) {
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.58 + i * 10);
      ctx.lineTo(w * 0.8, h * 0.58 + i * 10);
      ctx.stroke();
    }
  }
  if (face.scholar || face.robe) {
    ctx.fillStyle = "rgba(240,232,200,0.2)";
    ctx.fillRect(w * 0.32, h * 0.55, w * 0.36, h * 0.4);
    ctx.strokeStyle = "rgba(240,232,200,0.35)";
    ctx.strokeRect(w * 0.38, h * 0.62, w * 0.24, h * 0.28);
  }

  // 头
  ctx.fillStyle = "#f0d0b0";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.36, w * (face.thick ? 0.25 : 0.22), 0, Math.PI * 2);
  ctx.fill();

  // 发 / 冠
  ctx.fillStyle = "#1c1410";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.3, w * 0.23, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = face.crown || (u.team === "enemy" ? "#8b2e2e" : "#c4a574");
  if (face.hat) {
    ctx.beginPath();
    ctx.moveTo(w * 0.26, h * 0.22);
    ctx.lineTo(w * 0.5, h * 0.04);
    ctx.lineTo(w * 0.74, h * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(w * 0.46, h * 0.08, w * 0.08, h * 0.1);
  } else {
    ctx.fillRect(w * 0.34, h * 0.1, w * 0.32, h * 0.11);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(w * 0.4, h * 0.12, w * 0.08, h * 0.04);
  }

  // 眼
  ctx.fillStyle = "#2a1c10";
  const ey = h * (0.36 + (face.brow || 0));
  if (face.eyePatch) {
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(w * 0.33, ey - 3, w * 0.16, w * 0.1);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(w * 0.56, ey, w * 0.07, w * 0.045);
  } else {
    ctx.fillRect(w * 0.37, ey, w * 0.07, w * 0.045);
    ctx.fillRect(w * 0.56, ey, w * 0.07, w * 0.045);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(w * 0.38, ey, w * 0.02, w * 0.02);
    ctx.fillRect(w * 0.57, ey, w * 0.02, w * 0.02);
  }

  // 须
  if (face.beard) {
    ctx.fillStyle = "#2a1c10";
    ctx.beginPath();
    if (face.longBeard) {
      ctx.moveTo(w * 0.4, h * 0.46);
      ctx.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.6, h * 0.46);
      ctx.fill();
      ctx.fillStyle = "#3a2a18";
      ctx.fillRect(w * 0.48, h * 0.5, w * 0.04, h * 0.22);
    } else {
      ctx.ellipse(w / 2, h * 0.48, w * 0.11, h * 0.07, 0, 0, Math.PI);
      ctx.fill();
    }
  }

  // 底栏
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, h - 22, w, 22);
  const clsName = { infantry: "步兵", cavalry: "骑兵", archer: "弓兵", strategist: "策士" }[
    u.classId
  ];
  ctx.fillStyle = "#f8ecd6";
  ctx.font = "bold 11px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText(`${u.name} · ${clsName || ""}`, w / 2, h - 7);
}

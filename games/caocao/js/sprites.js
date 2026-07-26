/**
 * 自研像素风武将棋子与立绘（地形见 tiles.js）
 * 名将 / 小兵明确区分；非原作素材。
 */
import { isHeroUnit } from "../data/generals.js";

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
  boss_generic: { cape: "#5a2a6b", helm: "#c4a574", bulk: 1.08 },
  yellow_spear: { sash: "#e8d060", minionHelm: "yellow" },
  yellow_archer: { sash: "#e8d060", quiver: true, minionHelm: "yellow" },
  yellow_rider: { sash: "#e8d060", horse: "#6a5030", minionHelm: "yellow" },
  enemy_infantry: { minionHelm: "iron" },
  enemy_archer: { quiver: true, minionHelm: "iron" },
  enemy_cavalry: { horse: "#4a3a28", minionHelm: "iron" },
  enemy_strategist: { robe: "#4a3a5a", minionHelm: "hood" },
};

const CLASS_SHORT = {
  infantry: "步",
  cavalry: "骑",
  archer: "弓",
  strategist: "策",
};

function styleOf(u) {
  return UNIT_STYLE[u.generalId] || {};
}

function heroOf(u) {
  return isHeroUnit(u);
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
 * @param {{ flash?: number }} [opts]
 */
export function drawUnitSprite(ctx, u, cx, cy, tile, selected, opts = {}) {
  const hero = heroOf(u);
  const scale = (tile / 56) * (hero ? 1 : 0.88);
  const body = u.portrait || (u.team === "player" ? "#4a7a58" : "#8a5050");
  const tc = teamColors(u.team);
  const st = { ...styleOf(u), minion: !hero };
  const bulk = (st.bulk || 1) * (hero ? 1 : 0.92);
  const flash = opts.flash || 0;

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx + 1, cy + 17 * scale, 15 * scale * bulk, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 阵营底盘（武将金边，小兵素环）
  ctx.fillStyle = tc.ring;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13 * scale, 15 * scale * bulk, 6.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = tc.pad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 13 * scale, 11 * scale * bulk, 4.2 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (hero) {
    ctx.strokeStyle = "rgba(232,208,144,0.85)";
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 13 * scale, 15.5 * scale * bulk, 7 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(20,12,8,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 13 * scale, 11 * scale * bulk, 4.2 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  const cls = u.classId || "infantry";
  if (cls === "cavalry") drawCavalry(ctx, cx, cy, scale, body, tc.ring, st, bulk);
  else if (cls === "archer") drawArcher(ctx, cx, cy, scale, body, tc.ring, st, bulk);
  else if (cls === "strategist") drawStrategist(ctx, cx, cy, scale, body, tc.ring, st, bulk);
  else drawInfantry(ctx, cx, cy, scale, body, tc.ring, st, bulk);

  if (flash > 0.05) {
    ctx.fillStyle = `rgba(255,248,220,${0.4 * flash})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * scale, 15 * scale * bulk, 19 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,230,180,${0.65 * flash})`;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2 * scale, 17 * scale * bulk, 21 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

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

  // 姓名牌：武将全名/二字 + 金边；小兵仅兵种简称
  const label = hero
    ? u.name.length <= 2
      ? u.name
      : u.name.slice(-2)
    : CLASS_SHORT[cls] || "兵";
  ctx.font = `bold ${Math.round((hero ? 10 : 9) * scale)}px "Noto Serif SC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const tw = ctx.measureText(label).width + (hero ? 10 : 7);
  const ly = cy + 19 * scale;
  roundRect(
    ctx,
    cx - tw / 2,
    ly,
    tw,
    13 * scale,
    3 * scale,
    hero ? "rgba(40,24,12,0.88)" : "rgba(20,12,8,0.65)"
  );
  if (hero) {
    ctx.strokeStyle = "rgba(232,208,144,0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - tw / 2 + 0.5, ly + 0.5, tw - 1, 12 * scale);
  }
  ctx.fillStyle = hero ? "#f8ecd6" : "#d8d0c0";
  ctx.fillText(label, cx, ly + 1.5 * scale);

  // HP 条
  const bw = (hero ? 32 : 26) * scale;
  const bh = (hero ? 5 : 4) * scale;
  const bx = cx - bw / 2;
  const by = cy - 28 * scale;
  roundRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, 2, "rgba(0,0,0,0.6)");
  const pct = Math.max(0, u.hp / u.hpMax);
  const hpColor = pct > 0.5 ? "#5dcf5a" : pct > 0.25 ? "#d4b84a" : "#d05040";
  ctx.fillStyle = hpColor;
  ctx.fillRect(bx, by, bw * pct, bh);
  if (u.mpMax > 0 && u.classId === "strategist" && hero) {
    const mp = Math.max(0, u.mp / u.mpMax);
    ctx.fillStyle = "rgba(80,140,220,0.9)";
    ctx.fillRect(bx, by + bh + 1, bw * mp, 2 * scale);
  }

  // 武将角标
  if (hero) {
    const tag = u.lord ? "主" : u.boss ? "帅" : "将";
    ctx.fillStyle = u.lord ? "#f3c27a" : u.boss ? "#ff7070" : "#e8d090";
    ctx.font = `bold ${Math.round(10 * scale)}px serif`;
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
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
  // 小兵：头盔遮脸，辨识度低于名将
  if (st.minion) {
    drawMinionHead(ctx, cx, cy, scale, st);
    return;
  }
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
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(cx - 3 * scale, cy - 6 * scale, 3 * scale, 2 * scale);
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
  // 名将五官
  ctx.fillStyle = "#2a1c10";
  ctx.fillRect(cx - 3.2 * scale, cy - 0.5 * scale, 2 * scale, 1.4 * scale);
  ctx.fillRect(cx + 1.2 * scale, cy - 0.5 * scale, 2 * scale, 1.4 * scale);
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

function drawMinionHead(ctx, cx, cy, scale, st = {}) {
  const kind = st.minionHelm || "iron";
  // 露出一点下颌
  ctx.fillStyle = "#d8b090";
  ctx.beginPath();
  ctx.arc(cx, cy + 1 * scale, 4.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "yellow") {
    ctx.fillStyle = "#e8d060";
    ctx.beginPath();
    ctx.arc(cx, cy - 1 * scale, 6.5 * scale, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 7 * scale, cy - 2 * scale, 14 * scale, 5 * scale);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(cx - 7 * scale, cy + 2 * scale, 14 * scale, 2 * scale);
    // 黄巾结
    ctx.fillStyle = "#f0e080";
    ctx.beginPath();
    ctx.moveTo(cx + 5 * scale, cy);
    ctx.lineTo(cx + 11 * scale, cy - 2 * scale);
    ctx.lineTo(cx + 9 * scale, cy + 4 * scale);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "hood") {
    ctx.fillStyle = "#3a2a4a";
    ctx.beginPath();
    ctx.arc(cx, cy - 1 * scale, 7 * scale, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 7 * scale, cy - 1 * scale, 14 * scale, 6 * scale);
    ctx.fillStyle = "#2a1a30";
    ctx.fillRect(cx - 5 * scale, cy + 1 * scale, 10 * scale, 2 * scale);
  } else {
    // 铁盔
    ctx.fillStyle = "#6a6a70";
    ctx.beginPath();
    ctx.arc(cx, cy - 2 * scale, 7 * scale, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 7 * scale, cy - 3 * scale, 14 * scale, 5 * scale);
    ctx.fillStyle = "#4a4a50";
    ctx.fillRect(cx - 7.5 * scale, cy + 1 * scale, 15 * scale, 2.5 * scale);
    // 护鼻
    ctx.fillStyle = "#8a8a90";
    ctx.fillRect(cx - 1 * scale, cy - 1 * scale, 2 * scale, 5 * scale);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(cx - 4 * scale, cy - 5 * scale, 3 * scale, 2 * scale);
  }
  // 眼缝
  ctx.fillStyle = "rgba(20,12,8,0.55)";
  ctx.fillRect(cx - 4 * scale, cy + 0.5 * scale, 3 * scale, 1.2 * scale);
  ctx.fillRect(cx + 1 * scale, cy + 0.5 * scale, 3 * scale, 1.2 * scale);
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
  caocao: { beard: true, crown: "#c4a574", brow: 0.02, cape: "#8b2e2e", mark: "魏" },
  xiahou_dun: { eyePatch: true, crown: "#8b2e2e", cape: "#6b2020", scar: true },
  xiahou_yuan: { crown: "#a05030", cape: "#a05030", sharp: true },
  dianwei: { thick: true, crown: "#5a3a20", cape: "#5a3a20", browHeavy: true },
  xuchu: { thick: true, crown: "#6a4028", cape: "#6a4028", browHeavy: true },
  xunyu: { scholar: true, crown: "#3a4a6b", robe: true, calm: true },
  guojia: { scholar: true, crown: "#2a3a5b", robe: true, calm: true },
  zhangliao: { crown: "#4a5a8b", cape: "#4a5a8b", beard: true },
  sunjian: { crown: "#d4b84a", cape: "#2a5a8a", beard: true, mark: "吴" },
  liubei: { scholar: true, crown: "#3a6a4a", robe: true, beard: true, mark: "蜀" },
  guanyu: { beard: true, longBeard: true, crown: "#6b1a1a", cape: "#1a4a2a", redFace: true },
  zhangfei: { thick: true, crown: "#2a2a4a", cape: "#2a2a4a", beard: true, browHeavy: true },
  lvbu: { crown: "#c0c0c0", cape: "#5a1a2a", brow: -0.01, sharp: true },
  huaxiong: { crown: "#a0a0a0", cape: "#7a3030", browHeavy: true },
  zhangjiao: { scholar: true, crown: "#5a2a6b", hat: true, robe: true, mystic: true },
  zhangbao: { scholar: true, crown: "#6a3a7b", hat: true, robe: true, mystic: true },
  zhangliang: { crown: "#7a4a2b", cape: "#7a4a2b", beard: true },
  dongzhuo: { thick: true, crown: "#4a3a2a", cape: "#4a3a2a", beard: true },
  boss_generic: { crown: "#c4a574", cape: "#5a2a6b", beard: true },
};

const CLS_NAME = {
  infantry: "步兵",
  cavalry: "骑兵",
  archer: "弓兵",
  strategist: "策士",
};

export function drawPortrait(canvas, u) {
  if (!canvas || !u) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;

  if (!heroOf(u)) {
    drawMinionPortrait(ctx, u, w, h);
    return;
  }
  drawHeroPortrait(ctx, u, w, h);
}

function drawHeroPortrait(ctx, u, w, h) {
  const face = FACE[u.generalId] || {
    crown: u.team === "enemy" ? "#8b2e2e" : "#c4a574",
    cape: u.portrait || "#6a5040",
  };

  // 锦地背景
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(
    0,
    u.team === "enemy" ? "#5a3030" : u.team === "ally" ? "#2a3a58" : "#2a4834"
  );
  grd.addColorStop(1, "#100c08");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  // 祥云暗纹
  ctx.strokeStyle = "rgba(232,208,144,0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(w * (0.2 + i * 0.3), h * 0.2, 10 + i * 2, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // 金框
  ctx.strokeStyle = "rgba(232,208,144,0.65)";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  ctx.strokeStyle = "rgba(139,46,46,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  // 肩甲 / 袍
  const armor = face.cape || u.portrait || "#6a5040";
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.moveTo(w * 0.04, h);
  ctx.lineTo(w * 0.14, h * 0.48);
  ctx.lineTo(w * 0.86, h * 0.48);
  ctx.lineTo(w * 0.96, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(w * 0.2, h * 0.55, w * 0.08, h * 0.3);

  if (!face.robe && !face.scholar) {
    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.18, h * 0.56 + i * 9);
      ctx.lineTo(w * 0.82, h * 0.56 + i * 9);
      ctx.stroke();
    }
    // 护心镜
    ctx.fillStyle = "rgba(232,208,144,0.45)";
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.68, w * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,12,8,0.35)";
    ctx.stroke();
  }
  if (face.scholar || face.robe) {
    ctx.fillStyle = "rgba(240,232,200,0.22)";
    ctx.fillRect(w * 0.3, h * 0.52, w * 0.4, h * 0.38);
    ctx.strokeStyle = "rgba(240,232,200,0.4)";
    ctx.strokeRect(w * 0.36, h * 0.6, w * 0.28, h * 0.26);
  }

  // 头（关羽略红面）
  const skin = face.redFace ? "#c87860" : "#f0d0b0";
  const r = w * (face.thick ? 0.26 : 0.23);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.34, r, 0, Math.PI * 2);
  ctx.fill();
  // 腮红/阴影
  ctx.fillStyle = "rgba(180,80,60,0.12)";
  ctx.beginPath();
  ctx.ellipse(w * 0.38, h * 0.38, w * 0.05, w * 0.03, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.62, h * 0.38, w * 0.05, w * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  // 发
  ctx.fillStyle = "#1c1410";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.28, w * 0.24, Math.PI, 0);
  ctx.fill();

  // 冠 / 巾
  ctx.fillStyle = face.crown || "#c4a574";
  if (face.hat) {
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.22);
    ctx.lineTo(w * 0.5, h * 0.03);
    ctx.lineTo(w * 0.76, h * 0.22);
    ctx.closePath();
    ctx.fill();
    if (face.mystic) {
      ctx.fillStyle = "#e8d090";
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.12, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillRect(w * 0.32, h * 0.08, w * 0.36, h * 0.12);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(w * 0.38, h * 0.1, w * 0.1, h * 0.04);
    // 冠饰
    ctx.fillStyle = face.crown || "#c4a574";
    ctx.fillRect(w * 0.46, h * 0.04, w * 0.08, h * 0.06);
  }

  // 眉眼
  const ey = h * (0.34 + (face.brow || 0));
  ctx.fillStyle = "#2a1c10";
  if (face.browHeavy || face.sharp) {
    ctx.fillRect(w * 0.34, ey - 4, w * 0.12, 2);
    ctx.fillRect(w * 0.54, ey - 4, w * 0.12, 2);
  }
  if (face.eyePatch) {
    ctx.fillStyle = "#1a1010";
    ctx.fillRect(w * 0.32, ey - 3, w * 0.16, w * 0.1);
    ctx.fillStyle = "#2a1c10";
    ctx.fillRect(w * 0.56, ey, w * 0.08, w * 0.05);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(w * 0.58, ey, w * 0.02, w * 0.02);
  } else {
    ctx.fillRect(w * 0.36, ey, w * 0.08, w * 0.05);
    ctx.fillRect(w * 0.56, ey, w * 0.08, w * 0.05);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(w * 0.38, ey, w * 0.025, w * 0.02);
    ctx.fillRect(w * 0.58, ey, w * 0.025, w * 0.02);
  }
  if (face.scar) {
    ctx.strokeStyle = "rgba(120,40,40,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.34, ey - 2);
    ctx.lineTo(w * 0.46, ey + 8);
    ctx.stroke();
  }

  // 鼻 / 嘴
  ctx.fillStyle = "rgba(120,70,50,0.35)";
  ctx.fillRect(w * 0.48, ey + 6, w * 0.04, h * 0.04);
  ctx.fillStyle = "#a06050";
  ctx.fillRect(w * 0.44, h * 0.42, w * 0.12, 2);

  // 须
  if (face.beard) {
    ctx.fillStyle = "#2a1c10";
    ctx.beginPath();
    if (face.longBeard) {
      ctx.moveTo(w * 0.38, h * 0.44);
      ctx.quadraticCurveTo(w * 0.5, h * 0.82, w * 0.62, h * 0.44);
      ctx.fill();
      ctx.fillStyle = "#3a2a18";
      ctx.fillRect(w * 0.48, h * 0.48, w * 0.04, h * 0.24);
    } else {
      ctx.ellipse(w / 2, h * 0.46, w * 0.12, h * 0.08, 0, 0, Math.PI);
      ctx.fill();
    }
  }

  // 角标「名将」
  ctx.fillStyle = "rgba(232,208,144,0.9)";
  ctx.fillRect(4, 4, 28, 14);
  ctx.fillStyle = "#3a2410";
  ctx.font = "bold 9px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText(u.lord ? "主公" : u.boss ? "主将" : "名将", 18, 14);

  if (face.mark) {
    ctx.fillStyle = "rgba(139,46,46,0.85)";
    ctx.beginPath();
    ctx.arc(w - 12, 14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8ecd6";
    ctx.font = "bold 10px 'Noto Serif SC', serif";
    ctx.fillText(face.mark, w - 12, 17);
  }

  // 底栏
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, h - 24, w, 24);
  ctx.fillStyle = "#f8ecd6";
  ctx.font = "bold 11px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText(`${u.name} · ${CLS_NAME[u.classId] || ""}`, w / 2, h - 8);
}

function drawMinionPortrait(ctx, u, w, h) {
  const troop = u.troop || styleOf(u).minionHelm || "iron";
  const armor = u.portrait || "#6a5a48";

  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#2a2420");
  grd.addColorStop(1, "#12100e");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // 素框
  ctx.strokeStyle = "rgba(160,150,130,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, w - 4, h - 4);

  // 肩甲（更矮、更朴素）
  ctx.fillStyle = armor;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h);
  ctx.lineTo(w * 0.2, h * 0.55);
  ctx.lineTo(w * 0.8, h * 0.55);
  ctx.lineTo(w * 0.92, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.22, h * 0.62 + i * 8);
    ctx.lineTo(w * 0.78, h * 0.62 + i * 8);
    ctx.stroke();
  }

  // 头盔遮脸
  ctx.fillStyle = "#c8a888";
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.4, w * 0.16, 0, Math.PI * 2);
  ctx.fill();

  if (troop === "yellow") {
    ctx.fillStyle = "#e8d060";
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.32, w * 0.22, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.28, h * 0.3, w * 0.44, h * 0.14);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(w * 0.28, h * 0.4, w * 0.44, 4);
    ctx.fillStyle = "#f0e080";
    ctx.beginPath();
    ctx.moveTo(w * 0.7, h * 0.34);
    ctx.lineTo(w * 0.88, h * 0.3);
    ctx.lineTo(w * 0.82, h * 0.42);
    ctx.fill();
  } else if (troop === "hood" || u.classId === "strategist") {
    ctx.fillStyle = "#3a2a4a";
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.3, w * 0.24, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.26, h * 0.28, w * 0.48, h * 0.18);
  } else {
    ctx.fillStyle = "#6a6a72";
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.3, w * 0.24, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(w * 0.26, h * 0.28, w * 0.48, h * 0.14);
    ctx.fillStyle = "#4a4a52";
    ctx.fillRect(w * 0.24, h * 0.4, w * 0.52, 5);
    ctx.fillStyle = "#8a8a92";
    ctx.fillRect(w * 0.48, h * 0.34, w * 0.04, h * 0.1);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(w * 0.36, h * 0.22, w * 0.08, 4);
  }

  // 眼缝
  ctx.fillStyle = "rgba(20,12,8,0.55)";
  ctx.fillRect(w * 0.38, h * 0.38, w * 0.08, 3);
  ctx.fillRect(w * 0.54, h * 0.38, w * 0.08, 3);

  // 角标「小兵」
  ctx.fillStyle = "rgba(120,110,95,0.85)";
  ctx.fillRect(4, 4, 28, 14);
  ctx.fillStyle = "#f0e8d8";
  ctx.font = "bold 9px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText("小兵", 18, 14);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, h - 24, w, 24);
  ctx.fillStyle = "#d8d0c0";
  ctx.font = "bold 10px 'Noto Serif SC', serif";
  ctx.fillText(`${CLS_NAME[u.classId] || "士卒"} · 无名`, w / 2, h - 8);
}

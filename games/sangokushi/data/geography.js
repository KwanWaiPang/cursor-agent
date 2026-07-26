/**
 * 汉末行政区（州）与山脉脊线 —— 自研示意几何，供战略地图分层
 * 州界大致对齐东汉十三州格局，并按本游戏都市分区（荆北/荆南、淮南、京兆、南中）细分。
 */

/** 州展示：淡色底 + 标签色 */
export const ZHOU_META = {
  幽州: { tint: "rgba(90,130,160,0.14)", ink: "#6a8aaa", label: "幽州" },
  并州: { tint: "rgba(120,110,90,0.14)", ink: "#7a6a58", label: "并州" },
  冀州: { tint: "rgba(160,140,80,0.12)", ink: "#8a7a40", label: "冀州" },
  青州: { tint: "rgba(100,140,120,0.12)", ink: "#5a7a6a", label: "青州" },
  徐州: { tint: "rgba(140,120,90,0.12)", ink: "#7a6a48", label: "徐州" },
  淮南: { tint: "rgba(80,130,110,0.12)", ink: "#4a7a68", label: "淮南" },
  兖州: { tint: "rgba(150,120,70,0.12)", ink: "#8a6a38", label: "兖州" },
  豫州: { tint: "rgba(170,130,80,0.12)", ink: "#8a6a30", label: "豫州" },
  司隶: { tint: "rgba(180,150,90,0.16)", ink: "#9a7a40", label: "司隶" },
  京兆: { tint: "rgba(160,120,80,0.14)", ink: "#8a6040", label: "京兆" },
  凉州: { tint: "rgba(170,140,90,0.12)", ink: "#8a7040", label: "凉州" },
  扬州: { tint: "rgba(70,130,120,0.12)", ink: "#3a7a70", label: "扬州" },
  交州: { tint: "rgba(50,110,80,0.14)", ink: "#2a6a50", label: "交州" },
  荆北: { tint: "rgba(100,130,80,0.12)", ink: "#5a7a40", label: "荆州·北" },
  荆南: { tint: "rgba(70,120,70,0.12)", ink: "#3a6a38", label: "荆州·南" },
  益州: { tint: "rgba(120,100,70,0.14)", ink: "#6a5840", label: "益州" },
  南中: { tint: "rgba(60,100,70,0.14)", ink: "#3a6048", label: "南中" },
};

/**
 * 山脉脊线（经纬度折线）
 * 用于抬升海拔、山地地貌与脊线绘制
 */
export const MOUNTAIN_RANGES = [
  {
    id: "taihang",
    name: "太行山",
    width: 1.2,
    path: [
      [113.2, 41.0],
      [113.5, 39.5],
      [113.8, 38.2],
      [113.5, 37.0],
      [113.0, 36.0],
      [112.6, 35.2],
    ],
  },
  {
    id: "yinshan",
    name: "阴山",
    width: 1.0,
    path: [
      [107.0, 41.2],
      [109.5, 41.0],
      [112.0, 40.8],
      [114.5, 41.2],
      [117.0, 41.5],
    ],
  },
  {
    id: "qinling",
    name: "秦岭",
    width: 1.4,
    path: [
      [104.5, 33.8],
      [106.5, 34.0],
      [108.5, 34.1],
      [110.5, 33.9],
      [112.0, 33.6],
      [113.2, 33.2],
    ],
  },
  {
    id: "daba",
    name: "大巴山",
    width: 1.1,
    path: [
      [106.0, 32.4],
      [107.5, 32.2],
      [109.0, 31.9],
      [110.5, 31.6],
      [111.5, 31.3],
    ],
  },
  {
    id: "wuyi",
    name: "武夷山",
    width: 1.0,
    path: [
      [116.5, 28.5],
      [117.2, 27.5],
      [117.8, 26.5],
      [118.2, 25.5],
      [118.0, 24.8],
    ],
  },
  {
    id: "nanling",
    name: "南岭",
    width: 1.15,
    path: [
      [109.5, 25.5],
      [111.0, 25.2],
      [112.5, 25.0],
      [114.0, 24.8],
      [115.5, 24.6],
      [117.0, 24.8],
    ],
  },
  {
    id: "hengduan",
    name: "横断山脉",
    width: 1.5,
    path: [
      [99.0, 28.5],
      [100.0, 27.5],
      [100.8, 26.5],
      [101.5, 25.5],
      [102.2, 24.5],
      [102.8, 23.8],
    ],
  },
  {
    id: "qilian",
    name: "祁连山",
    width: 1.2,
    path: [
      [95.0, 38.5],
      [97.5, 38.2],
      [100.0, 37.8],
      [102.0, 37.2],
      [103.5, 36.6],
    ],
  },
  {
    id: "changbai",
    name: "长白山系",
    width: 1.0,
    path: [
      [126.0, 43.5],
      [127.0, 42.5],
      [128.0, 41.8],
      [129.0, 41.2],
    ],
  },
  {
    id: "yanshan",
    name: "燕山",
    width: 0.95,
    path: [
      [115.5, 40.6],
      [117.0, 40.4],
      [118.5, 40.2],
      [120.0, 40.0],
      [121.5, 40.2],
    ],
  },
  {
    id: "dabie",
    name: "大别山",
    width: 0.9,
    path: [
      [114.5, 31.8],
      [115.5, 31.5],
      [116.5, 31.2],
      [117.3, 30.9],
    ],
  },
  {
    id: "minshan",
    name: "岷山",
    width: 1.1,
    path: [
      [103.0, 34.0],
      [103.5, 33.0],
      [104.0, 32.0],
      [104.3, 31.2],
    ],
  },
];

/** 点到折线的近似距离（经纬度平面近似） */
export function distToPolyline(lon, lat, path) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1e-9;
    let t = ((lon - x1) * dx + (lat - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const d = (lon - px) * (lon - px) + (lat - py) * (lat - py);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export function mountainInfluence(lon, lat) {
  let elev = 0;
  let near = false;
  for (const r of MOUNTAIN_RANGES) {
    const d = distToPolyline(lon, lat, r.path);
    const band = 0.55 * r.width;
    if (d < band) {
      near = true;
      const h = (1 - d / band) * (0.35 + 0.2 * r.width);
      if (h > elev) elev = h;
    }
  }
  return { elev, near };
}

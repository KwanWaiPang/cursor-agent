/**
 * 中国陆地轮廓（自研简化多边形，经纬度）
 * 用于战略地图投影与点内判定，非官方国界测绘数据。
 */

/** 投影范围：略放大以容纳全境 */
export const MAP_BOUNDS = {
  lonMin: 73,
  lonMax: 135,
  latMin: 18,
  latMax: 53.5,
};

/**
 * 中国大陆海岸/陆界折线（顺时针，约从东北起）
 * 刻意勾勒鸡形轮廓：东北突出、山东半岛、东南沿海、海南、西南、青藏、西北、北疆。
 */
export const CHINA_MAINLAND = [
  [134.8, 48.4],
  [131.2, 47.8],
  [130.0, 42.8],
  [128.2, 41.5],
  [125.8, 40.0],
  [124.2, 39.8], // 辽东
  [122.5, 39.2],
  [121.5, 38.8], // 渤海湾口
  [120.8, 37.8],
  [122.2, 37.4], // 山东半岛东端
  [121.0, 36.6],
  [119.5, 35.4],
  [120.2, 34.2],
  [121.8, 33.2], // 苏北沿海
  [121.5, 31.8],
  [122.2, 30.8], // 长江口外
  [121.8, 29.8],
  [121.2, 28.2],
  [120.5, 27.0],
  [119.8, 25.8], // 闽
  [118.5, 24.4],
  [117.0, 23.5],
  [116.0, 22.8],
  [114.3, 22.5], // 珠江口东
  [113.2, 21.8],
  [111.5, 21.4],
  [110.2, 20.8],
  [109.5, 21.4], // 雷州
  [108.5, 21.6],
  [107.0, 21.5],
  [106.2, 20.9], // 交趾郡方向（示意凸出）
  [105.3, 20.7],
  [104.4, 21.3],
  [103.0, 22.0],
  [101.5, 21.8],
  [100.0, 21.5],
  [98.5, 23.5],
  [97.5, 24.5],
  [97.8, 27.5],
  [98.5, 29.5],
  [95.5, 29.0],
  [92.0, 28.0],
  [89.0, 27.8],
  [86.0, 28.2],
  [82.5, 30.0],
  [80.0, 32.0],
  [78.5, 34.5],
  [76.5, 36.0],
  [74.5, 37.5],
  [73.8, 39.5], // 帕米尔
  [75.0, 41.0],
  [80.0, 42.5],
  [85.0, 44.5],
  [88.0, 46.0],
  [90.5, 47.5],
  [95.0, 48.0],
  [100.0, 48.5],
  [105.0, 48.0],
  [110.0, 47.0],
  [114.0, 46.0],
  [118.0, 46.5],
  [121.0, 48.0],
  [125.0, 49.5],
  [128.0, 50.0],
  [131.0, 49.0],
  [134.8, 48.4],
];

/** 海南岛 */
export const HAINAN = [
  [109.0, 20.1],
  [110.0, 20.2],
  [111.0, 19.8],
  [111.0, 18.6],
  [110.0, 18.2],
  [108.8, 18.4],
  [108.6, 19.2],
  [109.0, 20.1],
];

/** 台湾岛（示意） */
export const TAIWAN = [
  [121.0, 25.3],
  [121.9, 25.0],
  [121.5, 23.0],
  [120.8, 22.0],
  [120.2, 22.7],
  [120.5, 24.0],
  [121.0, 25.3],
];

/** 长江（示意折线，东向） */
export const YANGTZE = [
  [101.0, 27.5],
  [103.5, 29.5],
  [106.5, 29.6],
  [108.5, 30.8],
  [111.3, 30.6],
  [114.3, 30.5],
  [116.5, 29.8],
  [118.5, 31.5],
  [120.5, 31.8],
  [121.8, 31.4],
];

/** 黄河 */
export const YELLOW_RIVER = [
  [100.5, 36.0],
  [103.0, 36.5],
  [106.0, 37.5],
  [109.0, 38.5],
  [110.5, 40.0],
  [111.5, 39.0],
  [112.5, 35.5],
  [114.5, 35.0],
  [116.5, 36.0],
  [118.5, 37.5],
  [119.2, 37.6],
];

export function project(lon, lat) {
  const { lonMin, lonMax, latMin, latMax } = MAP_BOUNDS;
  const x = (lon - lonMin) / (lonMax - lonMin);
  const y = 1 - (lat - latMin) / (latMax - latMin);
  return { x, y };
}

export function unproject(nx, ny) {
  const { lonMin, lonMax, latMin, latMax } = MAP_BOUNDS;
  const lon = lonMin + nx * (lonMax - lonMin);
  const lat = latMin + (1 - ny) * (latMax - latMin);
  return { lon, lat };
}

export function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function inChinaLand(lon, lat) {
  return (
    pointInRing(lon, lat, CHINA_MAINLAND) ||
    pointInRing(lon, lat, HAINAN) ||
    pointInRing(lon, lat, TAIWAN)
  );
}

export function projectRing(ring) {
  return ring.map(([lon, lat]) => project(lon, lat));
}

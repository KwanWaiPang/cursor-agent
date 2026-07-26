/**
 * 生成汉末疆域网格 + 地区（府）
 * 地区总数贴近公开资料约 338；土地格用于涂色表现。
 */

import { CITIES, BIOMES } from "./cities.js";

const COLS = 96;
const ROWS = 72;

function mulberry(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 粗略中国轮廓：在椭圆+梯形内为陆地 */
export function inChina(nx, ny) {
  // nx, ny in 0..1
  const dx = (nx - 0.55) / 0.42;
  const dy = (ny - 0.48) / 0.48;
  const ellipse = dx * dx + dy * dy;
  if (ellipse > 1.05) return false;
  // 切掉西北过角、东南海洋
  if (nx < 0.18 && ny < 0.35) return false;
  if (nx > 0.92 && ny > 0.55) return false;
  if (ny > 0.95) return false;
  if (nx < 0.22 && ny > 0.75) return false;
  return true;
}

function nearestCity(nx, ny) {
  let best = null;
  let bestD = Infinity;
  for (const c of CITIES) {
    const dx = c.x - nx;
    const dy = c.y - ny;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return { city: best, dist2: bestD };
}

/**
 * @returns {{cols:number,rows:number,cells:Array,regions:Array,cityCells:Object}}
 */
export function buildMap() {
  const cells = [];
  const cityCellIndex = {};

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const nx = (x + 0.5) / COLS;
      const ny = (y + 0.5) / ROWS;
      const land = inChina(nx, ny);
      const i = y * COLS + x;
      if (!land) {
        cells.push({
          i,
          x,
          y,
          land: false,
          owner: null,
          cityId: null,
          regionId: null,
          biome: "sea",
        });
        continue;
      }
      const { city, dist2 } = nearestCity(nx, ny);
      const biome = pickBiome(city, nx, ny, dist2);
      cells.push({
        i,
        x,
        y,
        land: true,
        owner: null,
        cityId: city.id,
        regionId: null,
        biome,
        elev: mulberry(x * 31 + y * 17) * 0.5 + (1 - Math.sqrt(dist2)) * 0.3,
      });
    }
  }

  // 都市中心格
  for (const c of CITIES) {
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(c.x * COLS)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(c.y * ROWS)));
    const i = cy * COLS + cx;
    cells[i].isCity = true;
    cells[i].cityId = c.id;
    cells[i].biome = c.biome;
    cityCellIndex[c.id] = i;
  }

  const regions = buildRegions(cells, cityCellIndex);

  return { cols: COLS, rows: ROWS, cells, regions, cityCells: cityCellIndex };
}

function pickBiome(city, nx, ny, dist2) {
  if (dist2 < 0.0025) return city.biome;
  // 长江一带偏水乡
  if (ny > 0.5 && ny < 0.68 && nx > 0.55 && nx < 0.88) {
    if (mulberry(nx * 1000 + ny * 777) > 0.55) return "river";
  }
  // 南疆
  if (ny > 0.78) return mulberry(nx * 50 + ny * 90) > 0.4 ? "jungle" : "hill";
  // 西北
  if (nx < 0.4 && ny < 0.4) return mulberry(nx * 40 + ny * 40) > 0.5 ? "desert" : "mountain";
  // 太行/秦岭
  if (nx > 0.42 && nx < 0.6 && ny > 0.25 && ny < 0.55) {
    if (mulberry(nx * 80 + ny * 60) > 0.6) return "mountain";
  }
  return city.biome === "capital" ? "plain" : city.biome;
}

function buildRegions(cells, cityCellIndex) {
  const regions = [];
  let rid = 0;

  for (const city of CITIES) {
    const center = cityCellIndex[city.id];
    const cx = cells[center].x;
    const cy = cells[center].y;
    const landOfCity = cells.filter((c) => c.land && c.cityId === city.id);
    // 选府点：中心 + 按距离分层取样
    landOfCity.sort((a, b) => {
      const da = (a.x - cx) ** 2 + (a.y - cy) ** 2;
      const db = (b.x - cx) ** 2 + (b.y - cy) ** 2;
      return da - db;
    });
    const n = Math.min(city.regionCount, Math.max(1, landOfCity.length));
    const step = Math.max(1, Math.floor(landOfCity.length / n));
    const picks = [];
    for (let k = 0; k < n; k++) {
      picks.push(landOfCity[Math.min(landOfCity.length - 1, k * step)]);
    }
    // 确保含都市格
    if (!picks.some((p) => p.i === center)) picks[0] = cells[center];

    const regionIds = [];
    for (let k = 0; k < picks.length; k++) {
      const p = picks[k];
      const id = `r_${city.id}_${k}`;
      regions.push({
        id,
        cityId: city.id,
        name: k === 0 ? `${city.name}城` : `${city.name}·${regionName(k)}`,
        cell: p.i,
        x: p.x,
        y: p.y,
        isCapital: k === 0,
      });
      regionIds.push({ id, x: p.x, y: p.y });
      rid++;
    }

    // 每块土地归属最近府
    for (const c of landOfCity) {
      let best = regionIds[0];
      let bestD = Infinity;
      for (const r of regionIds) {
        const d = (c.x - r.x) ** 2 + (c.y - r.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      }
      c.regionId = best.id;
    }
  }

  return regions;
}

function regionName(k) {
  const names = ["东亭", "西坞", "南村", "北塞", "中原", "河畔", "山寨", "关隘", "驿馆", "屯田", "市集", "卫所"];
  return names[(k - 1) % names.length] + (k > names.length ? String(k) : "");
}

export function biomeStyle(biome) {
  return BIOMES[biome] || BIOMES.plain;
}

export { COLS, ROWS };

/**
 * 基于中国轮廓生成战略网格与地区（府）
 */

import { CITIES, BIOMES } from "./cities.js";
import {
  inChinaLand,
  unproject,
  projectRing,
  CHINA_MAINLAND,
  HAINAN,
  TAIWAN,
  YANGTZE,
  YELLOW_RIVER,
  project,
} from "./china_outline.js";

const COLS = 120;
const ROWS = 84;

function mulberry(seed) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
 * @returns {{cols:number,rows:number,cells:Array,regions:Array,cityCells:Object,geo:object}}
 */
export function buildMap() {
  const cells = [];
  const cityCellIndex = {};

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const nx = (x + 0.5) / COLS;
      const ny = (y + 0.5) / ROWS;
      const { lon, lat } = unproject(nx, ny);
      const land = inChinaLand(lon, lat);
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
      const biome = pickBiome(city, lon, lat, dist2);
      cells.push({
        i,
        x,
        y,
        land: true,
        owner: null,
        cityId: city.id,
        regionId: null,
        biome,
        elev: mulberry(x * 31 + y * 17) * 0.45 + Math.max(0, 0.35 - Math.sqrt(dist2) * 2),
      });
    }
  }

  for (const c of CITIES) {
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(c.x * COLS)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(c.y * ROWS)));
    // 若投影点落海，向最近陆地搜索
    let i = cy * COLS + cx;
    if (!cells[i].land) {
      i = nearestLandIndex(cells, cx, cy) ?? i;
    }
    cells[i].isCity = true;
    cells[i].cityId = c.id;
    cells[i].biome = c.biome;
    cells[i].land = true;
    cityCellIndex[c.id] = i;
  }

  const regions = buildRegions(cells, cityCellIndex);
  const geo = {
    mainland: projectRing(CHINA_MAINLAND),
    hainan: projectRing(HAINAN),
    taiwan: projectRing(TAIWAN),
    yangtze: YANGTZE.map(([lon, lat]) => project(lon, lat)),
    yellow: YELLOW_RIVER.map(([lon, lat]) => project(lon, lat)),
  };

  return { cols: COLS, rows: ROWS, cells, regions, cityCells: cityCellIndex, geo };
}

function nearestLandIndex(cells, cx, cy) {
  let best = null;
  let bestD = Infinity;
  for (const c of cells) {
    if (!c.land) continue;
    const d = Math.abs(c.x - cx) + Math.abs(c.y - cy);
    if (d < bestD) {
      bestD = d;
      best = c.i;
    }
  }
  return best;
}

function pickBiome(city, lon, lat, dist2) {
  if (dist2 < 0.0018) return city.biome;
  // 长江流域
  if (lat > 28.5 && lat < 32.5 && lon > 103 && lon < 122) {
    if (mulberry(lon * 40 + lat * 55) > 0.45) return "river";
  }
  // 华南
  if (lat < 25.5) return mulberry(lon * 30 + lat * 40) > 0.35 ? "jungle" : "hill";
  // 西北干旱
  if (lon < 105 && lat > 35 && lat < 43) {
    return mulberry(lon * 20 + lat * 20) > 0.4 ? "desert" : "mountain";
  }
  // 青藏
  if (lon < 100 && lat < 36) return "mountain";
  // 太行 / 秦岭
  if (lon > 105 && lon < 115 && lat > 32 && lat < 40) {
    if (mulberry(lon * 50 + lat * 50) > 0.62) return "mountain";
  }
  // 东北山林
  if (lat > 42) return mulberry(lon * 12 + lat * 12) > 0.5 ? "hill" : "mountain";
  return city.biome === "capital" ? "plain" : city.biome;
}

function buildRegions(cells, cityCellIndex) {
  const regions = [];
  for (const city of CITIES) {
    const center = cityCellIndex[city.id];
    const cx = cells[center].x;
    const cy = cells[center].y;
    const landOfCity = cells.filter((c) => c.land && c.cityId === city.id);
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
    }

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

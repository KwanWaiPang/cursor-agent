/**
 * 基于中国轮廓生成战略网格、州界与地区（府）
 */

import { CITIES, BIOMES } from "./cities.js";
import {
  inChinaLand,
  unproject,
  projectRing,
  projectPath,
  CHINA_MAINLAND,
  HAINAN,
  TAIWAN,
  YANGTZE,
  YELLOW_RIVER,
  HUAI_RIVER,
  PEARL_RIVER,
  project,
} from "./china_outline.js";
import { MOUNTAIN_RANGES, mountainInfluence } from "./geography.js";
import { zhouOfLonLat, projectedZhouRegions, ZHOU_STYLE } from "./zhou_regions.js";

const COLS = 144;
const ROWS = 100;

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
 * @returns {{cols:number,rows:number,cells:Array,regions:Array,cityCells:Object,geo:object,zhouBorders:Array,zhouLabels:Array}}
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
          zhou: null,
          biome: "sea",
          elev: 0,
        });
        continue;
      }
      const { city, dist2 } = nearestCity(nx, ny);
      const mtn = mountainInfluence(lon, lat);
      let biome = pickBiome(city, lon, lat, dist2, mtn);
      let elev =
        mulberry(x * 31 + y * 17) * 0.28 +
        Math.max(0, 0.28 - Math.sqrt(dist2) * 1.8) +
        mtn.elev;
      if (mtn.near && elev > 0.42) biome = "mountain";
      const zhou = zhouOfLonLat(lon, lat) || city.zhou;
      cells.push({
        i,
        x,
        y,
        land: true,
        owner: null,
        cityId: city.id,
        regionId: null,
        zhou,
        biome,
        elev: Math.min(1, elev),
        lon,
        lat,
      });
    }
  }

  for (const c of CITIES) {
    const cx = Math.min(COLS - 1, Math.max(0, Math.floor(c.x * COLS)));
    const cy = Math.min(ROWS - 1, Math.max(0, Math.floor(c.y * ROWS)));
    let i = cy * COLS + cx;
    if (!cells[i].land) {
      i = nearestLandIndex(cells, cx, cy) ?? i;
    }
    cells[i].isCity = true;
    cells[i].cityId = c.id;
    cells[i].zhou = c.zhou;
    cells[i].biome = c.biome;
    cells[i].land = true;
    cityCellIndex[c.id] = i;
  }

  // 平滑州界：孤立格子归入多数邻域州
  smoothZhou(cells);

  const regions = buildRegions(cells, cityCellIndex);
  const zhouBorders = buildZhouBorders(cells);
  const zhouLabels = buildZhouLabels(cells);

  const geo = {
    mainland: projectRing(CHINA_MAINLAND),
    hainan: projectRing(HAINAN),
    taiwan: projectRing(TAIWAN),
    yangtze: projectPath(YANGTZE),
    yellow: projectPath(YELLOW_RIVER),
    huai: projectPath(HUAI_RIVER),
    pearl: projectPath(PEARL_RIVER),
    mountains: MOUNTAIN_RANGES.map((r) => ({
      id: r.id,
      name: r.name,
      width: r.width,
      path: projectPath(r.path),
    })),
    zhouRegions: projectedZhouRegions(),
  };

  return {
    cols: COLS,
    rows: ROWS,
    cells,
    regions,
    cityCells: cityCellIndex,
    geo,
    zhouBorders,
    zhouLabels,
  };
}

function smoothZhou(cells) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let pass = 0; pass < 2; pass++) {
    const next = cells.map((c) => c.zhou);
    for (const c of cells) {
      if (!c.land) continue;
      const counts = {};
      let total = 0;
      for (const [dx, dy] of dirs) {
        const n = cells[(c.y + dy) * COLS + (c.x + dx)];
        if (!n?.land || !n.zhou) continue;
        counts[n.zhou] = (counts[n.zhou] || 0) + 1;
        total++;
      }
      if (total < 3) continue;
      const own = counts[c.zhou] || 0;
      if (own <= 1) {
        let best = c.zhou;
        let bestN = -1;
        for (const [z, n] of Object.entries(counts)) {
          if (n > bestN) {
            bestN = n;
            best = z;
          }
        }
        next[c.i] = best;
      }
    }
    for (const c of cells) {
      if (c.land) c.zhou = next[c.i];
    }
  }
}

function buildZhouBorders(cells) {
  /** @type {Array<{x1:number,y1:number,x2:number,y2:number,a:string,b:string}>} */
  const edges = [];
  for (const c of cells) {
    if (!c.land) continue;
    const right = cells[c.y * COLS + c.x + 1];
    if (right?.land && right.zhou && c.zhou && right.zhou !== c.zhou) {
      edges.push({
        x1: c.x + 1,
        y1: c.y,
        x2: c.x + 1,
        y2: c.y + 1,
        a: c.zhou,
        b: right.zhou,
      });
    }
    const down = cells[(c.y + 1) * COLS + c.x];
    if (down?.land && down.zhou && c.zhou && down.zhou !== c.zhou) {
      edges.push({
        x1: c.x,
        y1: c.y + 1,
        x2: c.x + 1,
        y2: c.y + 1,
        a: c.zhou,
        b: down.zhou,
      });
    }
  }
  return edges;
}

function buildZhouLabels(cells) {
  const acc = {};
  for (const c of cells) {
    if (!c.land || !c.zhou) continue;
    if (!acc[c.zhou]) acc[c.zhou] = { n: 0, sx: 0, sy: 0 };
    acc[c.zhou].n++;
    acc[c.zhou].sx += c.x + 0.5;
    acc[c.zhou].sy += c.y + 0.5;
  }
  return Object.entries(acc).map(([zhou, v]) => ({
    zhou,
    name: ZHOU_STYLE[zhou]?.label || zhou,
    ink: ZHOU_STYLE[zhou]?.ink || "#6a5a48",
    x: v.sx / v.n,
    y: v.sy / v.n,
  }));
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

function pickBiome(city, lon, lat, dist2, mtn) {
  if (mtn.near && mtn.elev > 0.28) return "mountain";
  if (dist2 < 0.0015) return city.biome;
  if (lat > 28.5 && lat < 32.5 && lon > 103 && lon < 122) {
    if (mulberry(lon * 40 + lat * 55) > 0.48) return "river";
  }
  if (lat < 25.5) return mulberry(lon * 30 + lat * 40) > 0.35 ? "jungle" : "hill";
  if (lon < 105 && lat > 35 && lat < 43) {
    return mulberry(lon * 20 + lat * 20) > 0.4 ? "desert" : "mountain";
  }
  if (lon < 100 && lat < 36) return "mountain";
  if (lon > 105 && lon < 115 && lat > 32 && lat < 40) {
    if (mulberry(lon * 50 + lat * 50) > 0.58) return "mountain";
  }
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

export function zhouTint(zhou) {
  const s = ZHOU_STYLE[zhou];
  if (!s) return null;
  return hexAlpha(s.fill, 0.22);
}

function hexAlpha(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export { COLS, ROWS };

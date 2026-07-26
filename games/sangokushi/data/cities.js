/**
 * 46 都市（致敬《三国志14》都市骨架）
 * 坐标为汉末城邑大致经纬度，投影到中国地图（见 china_outline.js）。
 */

import { project } from "./china_outline.js";

export const BIOMES = {
  plain: { name: "平原", fill: ["#c8bc7e", "#b0a45e"], tint: "rgba(200,180,100,0.35)" },
  hill: { name: "丘陵", fill: ["#8fa06a", "#6e7e48"], tint: "rgba(120,140,70,0.4)" },
  mountain: { name: "山地", fill: ["#8a7a62", "#5e4e3c"], tint: "rgba(90,70,50,0.45)" },
  river: { name: "水乡", fill: ["#6fa090", "#4a7c70"], tint: "rgba(80,140,130,0.4)" },
  desert: { name: "边塞", fill: ["#d0b07a", "#b08a50"], tint: "rgba(180,140,80,0.4)" },
  jungle: { name: "南荒", fill: ["#3f7350", "#2a4e38"], tint: "rgba(40,100,60,0.45)" },
  capital: { name: "王畿", fill: ["#d4c090", "#b89a68"], tint: "rgba(210,180,120,0.4)" },
};

function city(def) {
  const { x, y } = project(def.lon, def.lat);
  return { ...def, x, y };
}

/** @type {Array<object>} */
export const CITIES = [
  // 河北 · 幽州
  city({ id: "xiangping", name: "襄平", province: "河北", zhou: "幽州", lon: 123.17, lat: 41.27, biome: "hill", regionCount: 6, gold: 2076, food: 2891, scale: "小" }),
  city({ id: "beiping", name: "北平", province: "河北", zhou: "幽州", lon: 119.15, lat: 39.90, biome: "plain", regionCount: 7, gold: 2860, food: 4697, scale: "中" }),
  city({ id: "ji", name: "蓟", province: "河北", zhou: "幽州", lon: 116.40, lat: 39.90, biome: "plain", regionCount: 6, gold: 2887, food: 3741, scale: "中" }),
  city({ id: "jinyang", name: "晋阳", province: "河北", zhou: "并州", lon: 112.55, lat: 37.87, biome: "mountain", regionCount: 6, gold: 2122, food: 3694, scale: "小" }),
  city({ id: "nanpi", name: "南皮", province: "河北", zhou: "冀州", lon: 116.70, lat: 38.04, biome: "plain", regionCount: 8, gold: 3847, food: 7661, scale: "中" }),
  city({ id: "ye", name: "邺", province: "河北", zhou: "冀州", lon: 114.48, lat: 36.35, biome: "plain", regionCount: 12, gold: 6827, food: 10279, scale: "大" }),
  // 中原
  city({ id: "pingyuan", name: "平原", province: "中原", zhou: "青州", lon: 116.43, lat: 37.16, biome: "plain", regionCount: 6, gold: 2567, food: 5598, scale: "中" }),
  city({ id: "beihai", name: "北海", province: "中原", zhou: "青州", lon: 119.10, lat: 36.70, biome: "river", regionCount: 6, gold: 2707, food: 5176, scale: "中" }),
  city({ id: "xiapi", name: "下邳", province: "中原", zhou: "徐州", lon: 118.00, lat: 34.30, biome: "plain", regionCount: 8, gold: 2996, food: 6101, scale: "中" }),
  city({ id: "xiaopei", name: "小沛", province: "中原", zhou: "徐州", lon: 116.80, lat: 34.70, biome: "plain", regionCount: 5, gold: 1822, food: 3398, scale: "小" }),
  city({ id: "guangling", name: "广陵", province: "中原", zhou: "徐州", lon: 119.42, lat: 32.39, biome: "river", regionCount: 5, gold: 1783, food: 3479, scale: "小" }),
  city({ id: "shouchun", name: "寿春", province: "中原", zhou: "淮南", lon: 116.80, lat: 32.00, biome: "river", regionCount: 9, gold: 2898, food: 4658, scale: "中" }),
  city({ id: "lujiang", name: "庐江", province: "中原", zhou: "淮南", lon: 117.25, lat: 31.25, biome: "hill", regionCount: 7, gold: 2563, food: 3191, scale: "中" }),
  city({ id: "puyang", name: "濮阳", province: "中原", zhou: "兖州", lon: 115.03, lat: 35.76, biome: "plain", regionCount: 10, gold: 5360, food: 7797, scale: "大" }),
  city({ id: "chenliu", name: "陈留", province: "中原", zhou: "兖州", lon: 114.55, lat: 34.70, biome: "plain", regionCount: 11, gold: 5457, food: 9065, scale: "大" }),
  city({ id: "xuchang", name: "许昌", province: "中原", zhou: "豫州", lon: 113.85, lat: 34.03, biome: "plain", regionCount: 11, gold: 6190, food: 8410, scale: "大" }),
  city({ id: "runan", name: "汝南", province: "中原", zhou: "豫州", lon: 114.35, lat: 33.00, biome: "plain", regionCount: 6, gold: 2660, food: 3557, scale: "中" }),
  city({ id: "luoyang", name: "洛阳", province: "中原", zhou: "司隶", lon: 112.45, lat: 34.65, biome: "capital", regionCount: 13, gold: 8001, food: 6305, scale: "巨大" }),
  // 西北
  city({ id: "wan", name: "宛", province: "西北", zhou: "京兆", lon: 112.53, lat: 33.00, biome: "hill", regionCount: 7, gold: 3702, food: 5059, scale: "中" }),
  city({ id: "changan", name: "长安", province: "西北", zhou: "京兆", lon: 108.94, lat: 34.27, biome: "capital", regionCount: 12, gold: 7123, food: 8962, scale: "巨大" }),
  city({ id: "shangyong", name: "上庸", province: "西北", zhou: "京兆", lon: 110.20, lat: 32.30, biome: "mountain", regionCount: 5, gold: 1572, food: 2622, scale: "小" }),
  city({ id: "anding", name: "安定", province: "西北", zhou: "凉州", lon: 106.70, lat: 35.70, biome: "desert", regionCount: 6, gold: 1779, food: 3519, scale: "小" }),
  city({ id: "tianshui", name: "天水", province: "西北", zhou: "凉州", lon: 105.72, lat: 34.58, biome: "mountain", regionCount: 6, gold: 1919, food: 3827, scale: "小" }),
  city({ id: "wuwei", name: "武威", province: "西北", zhou: "凉州", lon: 102.64, lat: 37.93, biome: "desert", regionCount: 6, gold: 2556, food: 3308, scale: "中" }),
  // 吴越
  city({ id: "jianye", name: "建业", province: "吴越", zhou: "扬州", lon: 118.80, lat: 32.06, biome: "river", regionCount: 8, gold: 3016, food: 3885, scale: "大" }),
  city({ id: "wu", name: "吴", province: "吴越", zhou: "扬州", lon: 120.62, lat: 31.30, biome: "river", regionCount: 7, gold: 2473, food: 4199, scale: "中" }),
  city({ id: "kuaiji", name: "会稽", province: "吴越", zhou: "扬州", lon: 120.58, lat: 30.00, biome: "hill", regionCount: 8, gold: 2657, food: 6089, scale: "中" }),
  city({ id: "chaisang", name: "柴桑", province: "吴越", zhou: "扬州", lon: 115.95, lat: 29.70, biome: "river", regionCount: 8, gold: 2391, food: 3171, scale: "中" }),
  city({ id: "jianan", name: "建安", province: "吴越", zhou: "扬州", lon: 118.18, lat: 27.00, biome: "hill", regionCount: 6, gold: 1619, food: 3444, scale: "小" }),
  city({ id: "nanhai", name: "南海", province: "吴越", zhou: "交州", lon: 113.26, lat: 23.13, biome: "jungle", regionCount: 5, gold: 1939, food: 2411, scale: "小" }),
  city({ id: "jiaozhi", name: "交趾", province: "吴越", zhou: "交州", lon: 105.85, lat: 21.03, biome: "jungle", regionCount: 6, gold: 2200, food: 2765, scale: "中" }),
  // 荆楚
  city({ id: "jiangxia", name: "江夏", province: "荆楚", zhou: "荆北", lon: 114.30, lat: 30.55, biome: "river", regionCount: 6, gold: 1779, food: 2317, scale: "中" }),
  city({ id: "xinye", name: "新野", province: "荆楚", zhou: "荆北", lon: 112.36, lat: 32.52, biome: "plain", regionCount: 5, gold: 1424, food: 2038, scale: "小" }),
  city({ id: "xiangyang", name: "襄阳", province: "荆楚", zhou: "荆北", lon: 112.14, lat: 32.04, biome: "hill", regionCount: 8, gold: 3862, food: 6093, scale: "大" }),
  city({ id: "jiangling", name: "江陵", province: "荆楚", zhou: "荆北", lon: 112.20, lat: 30.35, biome: "river", regionCount: 10, gold: 4111, food: 7321, scale: "大" }),
  city({ id: "changsha", name: "长沙", province: "荆楚", zhou: "荆南", lon: 112.98, lat: 28.20, biome: "hill", regionCount: 6, gold: 2114, food: 2555, scale: "中" }),
  city({ id: "wuling", name: "武陵", province: "荆楚", zhou: "荆南", lon: 111.70, lat: 29.05, biome: "jungle", regionCount: 7, gold: 2415, food: 3916, scale: "中" }),
  city({ id: "guiyang", name: "桂阳", province: "荆楚", zhou: "荆南", lon: 113.00, lat: 25.80, biome: "hill", regionCount: 6, gold: 1974, food: 2489, scale: "小" }),
  city({ id: "lingling", name: "零陵", province: "荆楚", zhou: "荆南", lon: 111.60, lat: 26.40, biome: "hill", regionCount: 6, gold: 2028, food: 2887, scale: "小" }),
  // 巴蜀
  city({ id: "yongan", name: "永安", province: "巴蜀", zhou: "益州", lon: 109.50, lat: 31.00, biome: "mountain", regionCount: 6, gold: 1958, food: 2372, scale: "小" }),
  city({ id: "hanzhong", name: "汉中", province: "巴蜀", zhou: "益州", lon: 107.03, lat: 33.07, biome: "mountain", regionCount: 10, gold: 3605, food: 8506, scale: "大" }),
  city({ id: "zitong", name: "梓潼", province: "巴蜀", zhou: "益州", lon: 105.17, lat: 31.64, biome: "mountain", regionCount: 7, gold: 1939, food: 3613, scale: "中" }),
  city({ id: "jiangzhou", name: "江州", province: "巴蜀", zhou: "益州", lon: 106.55, lat: 29.56, biome: "river", regionCount: 7, gold: 2513, food: 4844, scale: "中" }),
  city({ id: "chengdu", name: "成都", province: "巴蜀", zhou: "益州", lon: 104.07, lat: 30.67, biome: "plain", regionCount: 9, gold: 3842, food: 7362, scale: "巨大" }),
  city({ id: "jianning", name: "建宁", province: "巴蜀", zhou: "南中", lon: 102.72, lat: 25.04, biome: "jungle", regionCount: 7, gold: 2559, food: 3363, scale: "中" }),
  city({ id: "yunnan", name: "云南", province: "巴蜀", zhou: "南中", lon: 100.25, lat: 25.60, biome: "jungle", regionCount: 6, gold: 2114, food: 2852, scale: "小" }),
];

export function cityById(id) {
  return CITIES.find((c) => c.id === id) || null;
}

export function totalRegions() {
  return CITIES.reduce((a, c) => a + c.regionCount, 0);
}

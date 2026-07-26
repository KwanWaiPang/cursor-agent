/**
 * 46 都市（致敬《三国志14》都市骨架）
 * 坐标为自研投影（非原作地图）：x→东，y→南，范围约对应汉末疆域。
 * regionCount 参考公开攻略中各都市所属地区数，合计约 338。
 */

export const BIOMES = {
  plain: { name: "平原", fill: ["#c9b87a", "#b8a868"], tint: "rgba(200,180,100,0.35)" },
  hill: { name: "丘陵", fill: ["#8a9a60", "#6a7a48"], tint: "rgba(120,140,70,0.4)" },
  mountain: { name: "山地", fill: ["#7a6a55", "#5a4a3a"], tint: "rgba(90,70,50,0.45)" },
  river: { name: "水乡", fill: ["#6a9a88", "#4a7a70"], tint: "rgba(80,140,130,0.4)" },
  desert: { name: "边塞", fill: ["#c4a070", "#a08050"], tint: "rgba(180,140,80,0.4)" },
  jungle: { name: "南荒", fill: ["#3a6a48", "#2a4a34"], tint: "rgba(40,100,60,0.45)" },
  capital: { name: "王畿", fill: ["#d0b888", "#b89868"], tint: "rgba(210,180,120,0.4)" },
};

/** @type {Array<{id:string,name:string,province:string,zhou:string,x:number,y:number,biome:string,regionCount:number,gold:number,food:number,scale:string}>} */
export const CITIES = [
  // 河北 · 幽州
  { id: "xiangping", name: "襄平", province: "河北", zhou: "幽州", x: 0.88, y: 0.12, biome: "hill", regionCount: 6, gold: 2076, food: 2891, scale: "小" },
  { id: "beiping", name: "北平", province: "河北", zhou: "幽州", x: 0.78, y: 0.14, biome: "plain", regionCount: 7, gold: 2860, food: 4697, scale: "中" },
  { id: "ji", name: "蓟", province: "河北", zhou: "幽州", x: 0.72, y: 0.16, biome: "plain", regionCount: 6, gold: 2887, food: 3741, scale: "中" },
  // 并州
  { id: "jinyang", name: "晋阳", province: "河北", zhou: "并州", x: 0.58, y: 0.18, biome: "mountain", regionCount: 6, gold: 2122, food: 3694, scale: "小" },
  // 冀州
  { id: "nanpi", name: "南皮", province: "河北", zhou: "冀州", x: 0.74, y: 0.24, biome: "plain", regionCount: 8, gold: 3847, food: 7661, scale: "中" },
  { id: "ye", name: "邺", province: "河北", zhou: "冀州", x: 0.66, y: 0.28, biome: "plain", regionCount: 12, gold: 6827, food: 10279, scale: "大" },
  // 中原 · 青州
  { id: "pingyuan", name: "平原", province: "中原", zhou: "青州", x: 0.76, y: 0.30, biome: "plain", regionCount: 6, gold: 2567, food: 5598, scale: "中" },
  { id: "beihai", name: "北海", province: "中原", zhou: "青州", x: 0.84, y: 0.32, biome: "river", regionCount: 6, gold: 2707, food: 5176, scale: "中" },
  // 徐州
  { id: "xiapi", name: "下邳", province: "中原", zhou: "徐州", x: 0.80, y: 0.40, biome: "plain", regionCount: 8, gold: 2996, food: 6101, scale: "中" },
  { id: "xiaopei", name: "小沛", province: "中原", zhou: "徐州", x: 0.74, y: 0.38, biome: "plain", regionCount: 5, gold: 1822, food: 3398, scale: "小" },
  { id: "guangling", name: "广陵", province: "中原", zhou: "徐州", x: 0.82, y: 0.46, biome: "river", regionCount: 5, gold: 1783, food: 3479, scale: "小" },
  // 淮南
  { id: "shouchun", name: "寿春", province: "中原", zhou: "淮南", x: 0.74, y: 0.48, biome: "river", regionCount: 9, gold: 2898, food: 4658, scale: "中" },
  { id: "lujiang", name: "庐江", province: "中原", zhou: "淮南", x: 0.72, y: 0.54, biome: "hill", regionCount: 7, gold: 2563, food: 3191, scale: "中" },
  // 兖州
  { id: "puyang", name: "濮阳", province: "中原", zhou: "兖州", x: 0.68, y: 0.34, biome: "plain", regionCount: 10, gold: 5360, food: 7797, scale: "大" },
  { id: "chenliu", name: "陈留", province: "中原", zhou: "兖州", x: 0.64, y: 0.38, biome: "plain", regionCount: 11, gold: 5457, food: 9065, scale: "大" },
  // 豫州
  { id: "xuchang", name: "许昌", province: "中原", zhou: "豫州", x: 0.60, y: 0.42, biome: "plain", regionCount: 11, gold: 6190, food: 8410, scale: "大" },
  { id: "runan", name: "汝南", province: "中原", zhou: "豫州", x: 0.62, y: 0.48, biome: "plain", regionCount: 6, gold: 2660, food: 3557, scale: "中" },
  // 司隶
  { id: "luoyang", name: "洛阳", province: "中原", zhou: "司隶", x: 0.54, y: 0.36, biome: "capital", regionCount: 13, gold: 8001, food: 6305, scale: "巨大" },
  // 西北 · 京兆
  { id: "wan", name: "宛", province: "西北", zhou: "京兆", x: 0.56, y: 0.46, biome: "hill", regionCount: 7, gold: 3702, food: 5059, scale: "中" },
  { id: "changan", name: "长安", province: "西北", zhou: "京兆", x: 0.46, y: 0.34, biome: "capital", regionCount: 12, gold: 7123, food: 8962, scale: "巨大" },
  { id: "shangyong", name: "上庸", province: "西北", zhou: "京兆", x: 0.50, y: 0.50, biome: "mountain", regionCount: 5, gold: 1572, food: 2622, scale: "小" },
  // 凉州
  { id: "anding", name: "安定", province: "西北", zhou: "凉州", x: 0.38, y: 0.28, biome: "desert", regionCount: 6, gold: 1779, food: 3519, scale: "小" },
  { id: "tianshui", name: "天水", province: "西北", zhou: "凉州", x: 0.36, y: 0.36, biome: "mountain", regionCount: 6, gold: 1919, food: 3827, scale: "小" },
  { id: "wuwei", name: "武威", province: "西北", zhou: "凉州", x: 0.28, y: 0.22, biome: "desert", regionCount: 6, gold: 2556, food: 3308, scale: "中" },
  // 吴越 · 扬州
  { id: "jianye", name: "建业", province: "吴越", zhou: "扬州", x: 0.78, y: 0.56, biome: "river", regionCount: 8, gold: 3016, food: 3885, scale: "大" },
  { id: "wu", name: "吴", province: "吴越", zhou: "扬州", x: 0.84, y: 0.58, biome: "river", regionCount: 7, gold: 2473, food: 4199, scale: "中" },
  { id: "kuaiji", name: "会稽", province: "吴越", zhou: "扬州", x: 0.86, y: 0.64, biome: "hill", regionCount: 8, gold: 2657, food: 6089, scale: "中" },
  { id: "chaisang", name: "柴桑", province: "吴越", zhou: "扬州", x: 0.70, y: 0.58, biome: "river", regionCount: 8, gold: 2391, food: 3171, scale: "中" },
  { id: "jianan", name: "建安", province: "吴越", zhou: "扬州", x: 0.76, y: 0.70, biome: "hill", regionCount: 6, gold: 1619, food: 3444, scale: "小" },
  // 交州
  { id: "nanhai", name: "南海", province: "吴越", zhou: "交州", x: 0.68, y: 0.86, biome: "jungle", regionCount: 5, gold: 1939, food: 2411, scale: "小" },
  { id: "jiaozhi", name: "交趾", province: "吴越", zhou: "交州", x: 0.58, y: 0.92, biome: "jungle", regionCount: 6, gold: 2200, food: 2765, scale: "中" },
  // 荆楚 · 荆北
  { id: "jiangxia", name: "江夏", province: "荆楚", zhou: "荆北", x: 0.66, y: 0.54, biome: "river", regionCount: 6, gold: 1779, food: 2317, scale: "中" },
  { id: "xinye", name: "新野", province: "荆楚", zhou: "荆北", x: 0.58, y: 0.52, biome: "plain", regionCount: 5, gold: 1424, food: 2038, scale: "小" },
  { id: "xiangyang", name: "襄阳", province: "荆楚", zhou: "荆北", x: 0.56, y: 0.56, biome: "hill", regionCount: 8, gold: 3862, food: 6093, scale: "大" },
  { id: "jiangling", name: "江陵", province: "荆楚", zhou: "荆北", x: 0.60, y: 0.60, biome: "river", regionCount: 10, gold: 4111, food: 7321, scale: "大" },
  // 荆南
  { id: "changsha", name: "长沙", province: "荆楚", zhou: "荆南", x: 0.64, y: 0.72, biome: "hill", regionCount: 6, gold: 2114, food: 2555, scale: "中" },
  { id: "wuling", name: "武陵", province: "荆楚", zhou: "荆南", x: 0.58, y: 0.70, biome: "jungle", regionCount: 7, gold: 2415, food: 3916, scale: "中" },
  { id: "guiyang", name: "桂阳", province: "荆楚", zhou: "荆南", x: 0.66, y: 0.78, biome: "hill", regionCount: 6, gold: 1974, food: 2489, scale: "小" },
  { id: "lingling", name: "零陵", province: "荆楚", zhou: "荆南", x: 0.60, y: 0.76, biome: "hill", regionCount: 6, gold: 2028, food: 2887, scale: "小" },
  // 巴蜀 · 益州
  { id: "yongan", name: "永安", province: "巴蜀", zhou: "益州", x: 0.48, y: 0.58, biome: "mountain", regionCount: 6, gold: 1958, food: 2372, scale: "小" },
  { id: "hanzhong", name: "汉中", province: "巴蜀", zhou: "益州", x: 0.42, y: 0.46, biome: "mountain", regionCount: 10, gold: 3605, food: 8506, scale: "大" },
  { id: "zitong", name: "梓潼", province: "巴蜀", zhou: "益州", x: 0.36, y: 0.52, biome: "mountain", regionCount: 7, gold: 1939, food: 3613, scale: "中" },
  { id: "jiangzhou", name: "江州", province: "巴蜀", zhou: "益州", x: 0.40, y: 0.64, biome: "river", regionCount: 7, gold: 2513, food: 4844, scale: "中" },
  { id: "chengdu", name: "成都", province: "巴蜀", zhou: "益州", x: 0.34, y: 0.58, biome: "plain", regionCount: 9, gold: 3842, food: 7362, scale: "巨大" },
  // 南中
  { id: "jianning", name: "建宁", province: "巴蜀", zhou: "南中", x: 0.36, y: 0.78, biome: "jungle", regionCount: 7, gold: 2559, food: 3363, scale: "中" },
  { id: "yunnan", name: "云南", province: "巴蜀", zhou: "南中", x: 0.30, y: 0.82, biome: "jungle", regionCount: 6, gold: 2114, food: 2852, scale: "小" },
];

export function cityById(id) {
  return CITIES.find((c) => c.id === id) || null;
}

export function totalRegions() {
  return CITIES.reduce((a, c) => a + c.regionCount, 0);
}

/**
 * Original stage layouts. Tropes homage Super Mario, maps are not copies.
 */

export const THEMES = {
  grassland: {
    sky: ["#5c94fc", "#5c94fc"],
    ground: "grass",
    music: "overworld",
    hill: true,
    bush: true,
    cloud: true,
  },
  underground: {
    sky: ["#000000", "#141414"],
    ground: "dirt",
    music: "underground",
    brickBg: true,
  },
  sky: {
    sky: ["#9cdcfc", "#c8f0ff"],
    ground: "cloud",
    music: "sky",
    cloud: true,
  },
  castle: {
    sky: ["#180808", "#401010"],
    ground: "hard",
    music: "castle",
    lava: true,
  },
  ice: {
    sky: ["#a8d8f8", "#e0f4ff"],
    ground: "ice",
    music: "ice",
    cloud: true,
  },
  water: {
    sky: ["#184878", "#2060a0"],
    ground: "hard",
    music: "water",
    water: true,
  },
  night: {
    sky: ["#101830", "#203060"],
    ground: "grass",
    music: "underground",
    hill: true,
    stars: true,
  },
  lava: {
    sky: ["#200800", "#501000"],
    ground: "hard",
    music: "castle",
    lava: true,
  },
};

function grid(w, h, fill = ".") {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

function stamp(g, x, y, s) {
  if (y < 0 || y >= g.length) return;
  for (let i = 0; i < s.length; i++) {
    const xx = x + i;
    if (xx >= 0 && xx < g[0].length && s[i] !== " ") g[y][xx] = s[i];
  }
}

function fill(g, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (g[y] && g[y][x] !== undefined) g[y][x] = ch;
    }
  }
}

function layGround(g, holes = [], ch = "#") {
  const h = g.length;
  const w = g[0].length;
  const open = new Set();
  for (const [a, b] of holes) {
    for (let i = a; i < b; i++) open.add(i);
  }
  for (let x = 0; x < w; x++) {
    if (open.has(x)) continue;
    g[h - 2][x] = ch;
    g[h - 1][x] = ch;
  }
}

function putPipe(g, x, height) {
  const gy = g.length - 2;
  const top = gy - height;
  for (let i = 0; i < height; i++) {
    const y = top + i;
    if (!g[y]) continue;
    g[y][x] = i === 0 ? "{" : "[";
    if (g[y][x + 1] !== undefined) g[y][x + 1] = i === 0 ? "}" : "]";
  }
}

function withEnd(st, kind = "flag") {
  const rows = st.rows.map((r) => r.split(""));
  const h = rows.length;
  const w = rows[0].length;
  const gx = w - 16;
  const steps = kind === "flag" ? 8 : 6;
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k <= i; k++) {
      const y = h - 3 - k;
      const x = gx - (steps + 1) + i;
      if (rows[y] && rows[y][x] !== undefined) rows[y][x] = "-";
    }
  }
  if (kind === "flag") {
    const fy = h - 11;
    const fx = gx + 1;
    if (rows[fy]) rows[fy][fx] = "E";
    for (let y = fy; y < h - 2; y++) {
      if (rows[y] && rows[y][fx] === ".") rows[y][fx] = "|";
    }
  } else {
    const cx = gx + 3;
    const cy = h - 6;
    if (rows[cy]) rows[cy][cx] = "C";
  }
  if (rows[h - 3]) rows[h - 3][3] = "0";
  st.rows = rows.map((r) => r.join(""));
  return st;
}

function pack(id, name, theme, time, g, extras = {}) {
  return withEnd({ id, name, theme, time, rows: g.map((r) => r.join("")), ...extras }, extras.end || "flag");
}

export const STAGES = [];

{
  const w = 214;
  const h = 15;
  const g = grid(w, h);
  layGround(g, [
    [70, 73],
    [87, 91],
    [154, 158],
  ]);
  stamp(g, 16, 9, "?");
  stamp(g, 20, 9, "=?=!=");
  stamp(g, 22, 12, "g");
  stamp(g, 41, 12, "g");
  putPipe(g, 29, 2);
  putPipe(g, 39, 3);
  putPipe(g, 47, 4);
  putPipe(g, 58, 4);
  stamp(g, 64, 6, "h");
  stamp(g, 78, 9, "=====");
  stamp(g, 81, 5, "?");
  stamp(g, 94, 9, "=!?=");
  stamp(g, 91, 12, "g");
  stamp(g, 93, 12, "g");
  stamp(g, 108, 12, "t");
  stamp(g, 118, 12, "g");
  putPipe(g, 128, 2);
  stamp(g, 138, 8, "ooo");
  stamp(g, 137, 9, "=====");
  stamp(g, 146, 12, "g");
  stamp(g, 162, 12, "g");
  stamp(g, 166, 12, "t");
  stamp(g, 178, 9, "=?=");
  STAGES.push(pack("1-1", "青丘草原", "grassland", 400, g, { castleEnd: true }));
}

{
  const w = 220;
  const h = 14;
  const g = grid(w, h);
  fill(g, 0, 0, w - 1, 1, "-");
  layGround(g, [
    [46, 52],
    [86, 94],
    [132, 140],
  ]);
  stamp(g, 8, 3, "oooooooo");
  stamp(g, 20, 5, "g");
  stamp(g, 28, 5, "g");
  stamp(g, 24, 7, "========");
  stamp(g, 36, 10, "t");
  stamp(g, 40, 10, "P");
  stamp(g, 56, 4, "ooo");
  stamp(g, 55, 5, "x.x.x");
  stamp(g, 64, 10, "g");
  stamp(g, 72, 10, "Q");
  stamp(g, 98, 4, "oooo");
  stamp(g, 97, 5, "=!?=");
  stamp(g, 108, 10, "g");
  stamp(g, 116, 10, "t");
  stamp(g, 122, 10, "P");
  stamp(g, 146, 4, "oooooo");
  stamp(g, 145, 5, "======");
  stamp(g, 152, 10, "g");
  stamp(g, 160, 10, "s");
  stamp(g, 168, 10, "P");
  stamp(g, 176, 6, "ooo");
  stamp(g, 188, 10, "g");
  STAGES.push(pack("1-2", "砖穴地底", "underground", 400, g));
}

{
  const w = 230;
  const h = 15;
  const g = grid(w, h);
  fill(g, 0, h - 2, 16, h - 1, "c");
  fill(g, w - 24, h - 2, w - 1, h - 1, "c");
  const pads = [
    [22, 10, 10],
    [40, 8, 9],
    [58, 6, 8],
    [76, 8, 10],
    [96, 5, 8],
    [114, 7, 11],
    [134, 4, 7],
    [150, 7, 10],
    [170, 5, 9],
    [188, 8, 8],
  ];
  for (const [x, y, len] of pads) {
    fill(g, x, y, x + len - 1, y, "c");
    fill(g, x, y + 1, x + len - 1, y + 1, "c");
  }
  stamp(g, 24, 8, "ooo");
  stamp(g, 42, 6, "oo");
  stamp(g, 60, 4, "oooo");
  stamp(g, 78, 6, "v");
  stamp(g, 98, 3, "ooo");
  stamp(g, 116, 5, "v");
  stamp(g, 136, 2, "oooo");
  stamp(g, 152, 5, "m");
  stamp(g, 172, 3, "v");
  stamp(g, 190, 6, "ooo");
  stamp(g, 4, h - 3, "0");
  STAGES.push(pack("1-3", "云上跑道", "sky", 360, g));
}

{
  const w = 210;
  const h = 15;
  const g = grid(w, h);
  layGround(g, [
    [10, 16],
    [28, 36],
    [52, 62],
    [78, 86],
    [104, 114],
    [130, 138],
    [156, 166],
  ]);
  for (const [a, b] of [
    [10, 16],
    [28, 36],
    [52, 62],
    [78, 86],
    [104, 114],
    [130, 138],
    [156, 166],
  ]) {
    fill(g, a, h - 1, b - 1, h - 1, "L");
  }
  stamp(g, 18, 9, "-----");
  stamp(g, 19, 7, "ooo");
  stamp(g, 40, 8, "-----");
  stamp(g, 41, 6, "ooo");
  stamp(g, 66, 9, "------");
  stamp(g, 90, 7, "-----");
  stamp(g, 91, 5, "ooo");
  stamp(g, 118, 9, "------");
  stamp(g, 144, 8, "-----");
  stamp(g, 20, 4, "j");
  stamp(g, 44, 3, "j");
  stamp(g, 70, 4, "j");
  stamp(g, 94, 3, "j");
  stamp(g, 122, 4, "j");
  stamp(g, 22, 12, "g");
  stamp(g, 46, 12, "s");
  stamp(g, 70, 12, "g");
  stamp(g, 96, 12, "s");
  stamp(g, 122, 12, "g");
  stamp(g, 148, 12, "s");
  STAGES.push(pack("1-4", "石火城堡", "castle", 360, g, { end: "castle" }));
}

{
  const w = 220;
  const h = 15;
  const g = grid(w, h);
  layGround(g, [
    [64, 72],
    [108, 118],
    [158, 168],
  ]);
  stamp(g, 18, 8, "ooooo");
  stamp(g, 17, 9, "=====");
  stamp(g, 22, 12, "g");
  stamp(g, 30, 12, "t");
  stamp(g, 38, 12, "P");
  stamp(g, 48, 8, "o.o");
  stamp(g, 47, 9, "=!?");
  stamp(g, 56, 12, "S");
  stamp(g, 78, 12, "g");
  stamp(g, 86, 7, "oooo");
  stamp(g, 85, 8, "====");
  stamp(g, 92, 12, "T");
  stamp(g, 100, 12, "S");
  stamp(g, 122, 12, "g");
  stamp(g, 128, 12, "P");
  stamp(g, 136, 8, "ooo");
  stamp(g, 144, 12, "t");
  stamp(g, 174, 12, "g");
  stamp(g, 180, 12, "S");
  stamp(g, 188, 8, "o.o.o");
  STAGES.push(pack("2-1", "霜镜雪原", "ice", 400, g));
}

{
  const w = 230;
  const h = 15;
  const g = grid(w, h, "~");
  fill(g, 0, 0, w - 1, 1, ".");
  fill(g, 0, h - 2, 18, h - 1, "-");
  fill(g, w - 24, h - 2, w - 1, h - 1, "-");
  const pads = [
    [22, 10, 8],
    [40, 8, 9],
    [58, 11, 10],
    [78, 7, 8],
    [96, 10, 9],
    [116, 6, 8],
    [134, 9, 10],
    [154, 7, 8],
    [172, 10, 9],
    [190, 8, 8],
  ];
  for (const [x, y, len] of pads) fill(g, x, y, x + len - 1, y, "c");
  stamp(g, 24, 8, "ooo");
  stamp(g, 42, 6, "f");
  stamp(g, 60, 9, "ooo");
  stamp(g, 80, 5, "f");
  stamp(g, 98, 8, "ooo");
  stamp(g, 118, 4, "f");
  stamp(g, 136, 7, "ooo");
  stamp(g, 156, 5, "f");
  stamp(g, 174, 8, "ooo");
  stamp(g, 30, 12, "f");
  stamp(g, 88, 12, "f");
  stamp(g, 148, 12, "f");
  stamp(g, 4, h - 3, "0");
  STAGES.push(pack("2-2", "碧波水道", "water", 400, g, { waterFill: true }));
}

{
  const w = 220;
  const h = 15;
  const g = grid(w, h);
  layGround(g, [
    [50, 56],
    [96, 104],
    [148, 156],
  ]);
  stamp(g, 16, 8, "x.x.x");
  stamp(g, 15, 9, "=====");
  stamp(g, 22, 12, "v");
  stamp(g, 30, 12, "g");
  stamp(g, 38, 12, "P");
  stamp(g, 60, 12, "t");
  stamp(g, 68, 7, "oooo");
  stamp(g, 67, 8, "====");
  stamp(g, 76, 12, "v");
  stamp(g, 84, 12, "Q");
  stamp(g, 108, 6, ".$.");
  stamp(g, 107, 7, "===");
  stamp(g, 116, 12, "g");
  stamp(g, 124, 12, "t");
  stamp(g, 132, 12, "P");
  stamp(g, 140, 12, "v");
  stamp(g, 162, 8, "oooo");
  stamp(g, 161, 9, "====");
  stamp(g, 172, 12, "g");
  stamp(g, 180, 12, "P");
  stamp(g, 188, 12, "v");
  STAGES.push(pack("2-3", "夜林鬼径", "night", 380, g));
}

{
  const w = 220;
  const h = 15;
  const g = grid(w, h);
  const pits = [
    [8, 14],
    [28, 36],
    [52, 62],
    [76, 86],
    [100, 110],
    [124, 134],
    [148, 158],
  ];
  layGround(g, pits);
  for (const [a, b] of pits) fill(g, a, h - 1, b - 1, h - 1, "L");
  stamp(g, 16, 9, "-----");
  stamp(g, 17, 7, "ooo");
  stamp(g, 40, 8, "-----");
  stamp(g, 66, 9, "------");
  stamp(g, 90, 7, "-----");
  stamp(g, 91, 5, "ooo");
  stamp(g, 114, 9, "------");
  stamp(g, 138, 8, "-----");
  stamp(g, 18, 4, "j");
  stamp(g, 44, 3, "j");
  stamp(g, 70, 4, "j");
  stamp(g, 94, 3, "j");
  stamp(g, 118, 4, "j");
  stamp(g, 142, 3, "j");
  stamp(g, 20, 12, "s");
  stamp(g, 24, 12, "A");
  stamp(g, 44, 12, "g");
  stamp(g, 70, 12, "s");
  stamp(g, 74, 12, "A");
  stamp(g, 92, 12, "g");
  stamp(g, 118, 12, "s");
  stamp(g, 122, 12, "A");
  stamp(g, 140, 12, "g");
  STAGES.push(pack("2-4", "熔心要塞", "lava", 360, g, { end: "castle" }));
}

export function parseLevel(stage) {
  const gridMap = stage.rows.map((r) => r.split(""));
  const h = gridMap.length;
  const w = Math.max(...gridMap.map((r) => r.length));
  for (const row of gridMap) while (row.length < w) row.push(".");

  const entities = [];
  let spawn = { x: 32, y: (h - 4) * 16 };

  const put = (type, x, y, extra = {}) => {
    entities.push({ type, x: x * 16, y: y * 16, ...extra });
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = gridMap[y][x];
      switch (ch) {
        case "0":
          spawn = { x: x * 16, y: y * 16 };
          gridMap[y][x] = ".";
          break;
        case "g":
          put("walker", x, y);
          gridMap[y][x] = ".";
          break;
        case "t":
          put("turtle", x, y, { color: "green" });
          gridMap[y][x] = ".";
          break;
        case "T":
          put("turtle", x, y, { color: "red" });
          gridMap[y][x] = ".";
          break;
        case "s":
          put("spiny", x, y);
          gridMap[y][x] = ".";
          break;
        case "v":
          put("flyer", x, y);
          gridMap[y][x] = ".";
          break;
        case "n":
          put("piranha", x, y, { pipeX: x, pipeY: y + 1 });
          gridMap[y][x] = ".";
          break;
        case "f":
          put("fish", x, y);
          gridMap[y][x] = ".";
          break;
        case "j":
          put("podoboo", x, y);
          gridMap[y][x] = ".";
          break;
        case "A":
          put("cannon", x, y);
          gridMap[y][x] = "-";
          break;
        case "o":
          put("coin", x, y);
          gridMap[y][x] = ".";
          break;
        case "P":
        case "Q": {
          const ph = ch === "Q" ? 3 : 2;
          for (let i = 0; i < ph; i++) {
            const yy = y + i;
            if (!gridMap[yy]) continue;
            gridMap[yy][x] = i === 0 ? "{" : "[";
            if (gridMap[yy][x + 1] !== undefined) gridMap[yy][x + 1] = i === 0 ? "}" : "]";
          }
          if (ch === "Q") put("piranha", x, y - 1, { pipeX: x, pipeY: y });
          break;
        }
        case "E":
          put("flag", x, y);
          gridMap[y][x] = ".";
          break;
        case "C":
          put("axe", x, y);
          gridMap[y][x] = ".";
          break;
        case "m":
          put("platform", x, y);
          gridMap[y][x] = ".";
          break;
        case "S":
          put("spring", x, y);
          gridMap[y][x] = ".";
          break;
        case "|":
          gridMap[y][x] = ".";
          break;
        default:
          break;
      }
    }
  }

  if (stage.theme === "ice") {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (gridMap[y][x] === "#") gridMap[y][x] = "I";
      }
    }
  }

  return {
    w,
    h,
    grid: gridMap,
    entities,
    spawn,
    theme: { ...THEMES[stage.theme], castleEnd: !!stage.castleEnd },
    id: stage.id,
    name: stage.name,
    time: stage.time,
  };
}

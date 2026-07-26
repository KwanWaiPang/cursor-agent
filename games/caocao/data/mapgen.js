/** 关卡地图模板生成（自研布局，非原作像素图） */

const CHAR = {
  P: "plain",
  F: "forest",
  H: "hill",
  R: "road",
  W: "water",
  T: "fort",
};

export function parseMapRows(rows) {
  return rows.map((row) => [...row].map((ch) => CHAR[ch] || "plain"));
}

export function fieldMap(w = 12, h = 10, seed = 1) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const n = (x * 17 + y * 31 + seed * 13) % 100;
      if (y === Math.floor(h / 2) || x === Math.floor(w / 2)) row += "R";
      else if (n < 12) row += "F";
      else if (n < 20) row += "H";
      else row += "P";
    }
    rows.push(row);
  }
  return rows;
}

export function fortMap(w = 12, h = 10, seed = 1) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const inFort = x >= w - 5 && y <= 4;
      if (inFort) row += "T";
      else if (x >= w - 6 && y <= 5) row += "R";
      else if ((x + y + seed) % 7 === 0) row += "F";
      else row += "P";
    }
    rows.push(row);
  }
  return rows;
}

export function riverMap(w = 14, h = 10, seed = 1) {
  const rows = [];
  const rx = Math.floor(w / 2) - 1;
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (x === rx || x === rx + 1) row += y % 3 === 1 ? "R" : "W";
      else if (y === Math.floor(h / 2) || y === Math.floor(h / 2) + 1) row += "R";
      else if ((x * 3 + y + seed) % 11 === 0) row += "F";
      else if ((x + y * 2 + seed) % 13 === 0) row += "H";
      else row += "P";
    }
    rows.push(row);
  }
  return rows;
}

export function passMap(w = 12, h = 10) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (x <= 1 || x >= w - 2) row += "H";
      else if (x >= Math.floor(w / 2) - 2 && x <= Math.floor(w / 2) + 1) row += "R";
      else if (y <= 1 && x >= 3 && x <= w - 4) row += "T";
      else row += "P";
    }
    rows.push(row);
  }
  return rows;
}

export function chaseMap(w = 14, h = 10, seed = 1) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (y === 0 && x >= w - 3) row += "R";
      else if (x === y || x === y + 1) row += "R";
      else if ((x + y + seed) % 5 === 0) row += "F";
      else if ((x * y + seed) % 17 === 0) row += "H";
      else row += "P";
    }
    rows.push(row);
  }
  return rows;
}

export const MAP_BUILDERS = {
  field: fieldMap,
  fort: fortMap,
  river: riverMap,
  pass: passMap,
  chase: chaseMap,
};

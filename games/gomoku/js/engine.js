/** 五子棋引擎：15 路自由规则（连五即胜） */

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const SIZE = 15;

export function createBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

export function place(board, x, y, color) {
  if (!inBounds(x, y) || board[y][x] !== EMPTY) return false;
  board[y][x] = color;
  return true;
}

export function opponent(color) {
  return color === BLACK ? WHITE : BLACK;
}

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

/** 若 color 在 (x,y) 成五（或以上），返回 true */
export function isWin(board, x, y, color, opts = {}) {
  return !!winLine(board, x, y, color, opts);
}

/**
 * 返回成五的格子列表；连珠规则下黑棋长连（6+）不算胜。
 * @returns {{x:number,y:number}[]|null}
 */
export function winLine(board, x, y, color, opts = {}) {
  const exactFive = Boolean(opts.renju && color === BLACK);
  for (const [dx, dy] of DIRS) {
    const cells = lineRun(board, x, y, dx, dy, color);
    if (exactFive ? cells.length === 5 : cells.length >= 5) return cells;
  }
  return null;
}

function lineRun(board, x, y, dx, dy, color) {
  const cells = [{ x, y }];
  for (let s = 1; ; s++) {
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (!inBounds(nx, ny) || board[ny][nx] !== color) break;
    cells.push({ x: nx, y: ny });
  }
  for (let s = 1; ; s++) {
    const nx = x - dx * s;
    const ny = y - dy * s;
    if (!inBounds(nx, ny) || board[ny][nx] !== color) break;
    cells.unshift({ x: nx, y: ny });
  }
  return cells;
}

function completingFives(board, x, y, dx, dy, color) {
  const keys = new Set();
  for (let offset = -4; offset <= 0; offset++) {
    const gaps = [];
    let stones = 0;
    let ok = true;
    for (let k = 0; k < 5; k++) {
      const nx = x + dx * (offset + k);
      const ny = y + dy * (offset + k);
      if (!inBounds(nx, ny)) {
        ok = false;
        break;
      }
      const t = board[ny][nx];
      if (t === color) stones++;
      else if (t === EMPTY) gaps.push(`${nx},${ny}`);
      else {
        ok = false;
        break;
      }
    }
    if (ok && stones === 4 && gaps.length === 1) keys.add(gaps[0]);
  }
  return keys.size;
}

function isLiveThreeOnAxis(board, x, y, dx, dy, color) {
  const run = lineRun(board, x, y, dx, dy, color);
  if (run.length !== 3) {
    // 跳活三：_XX_X_ / _X_XX_
    const v = [];
    for (let i = -4; i <= 4; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (!inBounds(nx, ny)) v.push("#");
      else if (board[ny][nx] === color) v.push("X");
      else if (board[ny][nx] === EMPTY) v.push("_");
      else v.push("O");
    }
    const s = v.join("");
    return s.includes("_XX_X_") || s.includes("_X_XX_");
  }
  const a = run[0];
  const b = run[run.length - 1];
  const lx = a.x - dx;
  const ly = a.y - dy;
  const rx = b.x + dx;
  const ry = b.y + dy;
  return (
    inBounds(lx, ly) &&
    inBounds(rx, ry) &&
    board[ly][lx] === EMPTY &&
    board[ry][rx] === EMPTY
  );
}

/**
 * 连珠禁手（仅黑棋）：三三、四四、长连。
 * @returns {false|'overline'|'double-four'|'double-three'}
 */
export function forbiddenReason(board, x, y, color, opts = {}) {
  if (!opts.renju || color !== BLACK) return false;
  if (!inBounds(x, y) || board[y][x] !== EMPTY) return "occupied";
  board[y][x] = color;
  let fours = 0;
  let threes = 0;
  let overline = false;
  for (const [dx, dy] of DIRS) {
    const run = lineRun(board, x, y, dx, dy, color);
    if (run.length >= 6) overline = true;
    const f = completingFives(board, x, y, dx, dy, color);
    if (f >= 2) fours += 2;
    else if (f === 1) fours += 1;
    if (isLiveThreeOnAxis(board, x, y, dx, dy, color)) threes += 1;
  }
  board[y][x] = EMPTY;
  if (overline) return "overline";
  if (fours >= 2) return "double-four";
  if (threes >= 2) return "double-three";
  return false;
}

export function isForbidden(board, x, y, color, opts = {}) {
  return Boolean(forbiddenReason(board, x, y, color, opts));
}

export function isBoardFull(board) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === EMPTY) return false;
    }
  }
  return true;
}

export function listEmpty(board) {
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === EMPTY) cells.push({ x, y });
    }
  }
  return cells;
}

/** 是否存在落子（用于 AI 收缩搜索范围） */
export function hasNeighbor(board, x, y, dist = 2) {
  for (let dy = -dist; dy <= dist; dy++) {
    for (let dx = -dist; dx <= dist; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny) && board[ny][nx] !== EMPTY) return true;
    }
  }
  return false;
}

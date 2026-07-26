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
export function isWin(board, x, y, color) {
  for (const [dx, dy] of DIRS) {
    let count = 1;
    for (let s = 1; s < 5; s++) {
      const nx = x + dx * s;
      const ny = y + dy * s;
      if (!inBounds(nx, ny) || board[ny][nx] !== color) break;
      count++;
    }
    for (let s = 1; s < 5; s++) {
      const nx = x - dx * s;
      const ny = y - dy * s;
      if (!inBounds(nx, ny) || board[ny][nx] !== color) break;
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
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

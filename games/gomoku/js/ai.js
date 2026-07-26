import {
  BLACK,
  WHITE,
  EMPTY,
  SIZE,
  inBounds,
  place,
  isWin,
  cloneBoard,
  opponent,
  hasNeighbor,
} from "./engine.js";

/**
 * 简易威胁评估 AI
 * 对每个空点打分：成五 > 活四/冲四 > 活三 …
 */

function lineScore(board, x, y, color, dx, dy) {
  let count = 1;
  let open = 0;
  let blocked = 0;

  for (const sign of [1, -1]) {
    let i = 1;
    let continuous = true;
    while (i <= 5) {
      const nx = x + dx * sign * i;
      const ny = y + dy * sign * i;
      if (!inBounds(nx, ny)) {
        blocked++;
        break;
      }
      const v = board[ny][nx];
      if (v === color && continuous) {
        count++;
        i++;
        continue;
      }
      if (v === EMPTY) {
        open++;
        break;
      }
      blocked++;
      break;
    }
  }

  if (count >= 5) return 100000;
  if (count === 4 && open === 2) return 10000;
  if (count === 4 && open === 1) return 2500;
  if (count === 3 && open === 2) return 800;
  if (count === 3 && open === 1) return 180;
  if (count === 2 && open === 2) return 80;
  if (count === 2 && open === 1) return 20;
  if (count === 1 && open === 2) return 8;
  return 1;
}

const DIRS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

function evaluateCell(board, x, y, me, opp) {
  if (board[y][x] !== EMPTY) return -1;
  // 假落检验直接胜
  board[y][x] = me;
  if (isWin(board, x, y, me)) {
    board[y][x] = EMPTY;
    return 1e9;
  }
  board[y][x] = opp;
  if (isWin(board, x, y, opp)) {
    board[y][x] = EMPTY;
    return 5e8;
  }
  board[y][x] = EMPTY;

  let attack = 0;
  let defend = 0;
  for (const [dx, dy] of DIRS) {
    attack += lineScore(board, x, y, me, dx, dy);
    defend += lineScore(board, x, y, opp, dx, dy);
  }
  // 中心加权
  const cx = Math.abs(x - 7);
  const cy = Math.abs(y - 7);
  const center = (14 - cx - cy) * 2;
  return attack * 1.1 + defend + center;
}

export function pickMove(board, color, difficulty = "normal") {
  const me = color;
  const opp = opponent(color);
  const candidates = [];
  let anyStone = false;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== EMPTY) {
        anyStone = true;
        break;
      }
    }
    if (anyStone) break;
  }
  if (!anyStone) return { x: 7, y: 7 };

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== EMPTY) continue;
      if (!hasNeighbor(board, x, y, 2)) continue;
      const score = evaluateCell(board, x, y, me, opp);
      candidates.push({ x, y, score });
    }
  }
  if (!candidates.length) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] === EMPTY) return { x, y };
      }
    }
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);

  if (difficulty === "easy") {
    const pool = candidates.slice(0, Math.min(8, candidates.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (difficulty === "normal") {
    const top = candidates[0].score;
    const pool = candidates.filter((c) => c.score >= top * 0.85).slice(0, 4);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  // hard：取最优
  return candidates[0];
}

export function think(board, color, difficulty = "normal") {
  const b = cloneBoard(board);
  return pickMove(b, color, difficulty);
}

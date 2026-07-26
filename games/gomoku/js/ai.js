import {
  EMPTY,
  SIZE,
  isWin,
  cloneBoard,
  opponent,
  hasNeighbor,
} from "./engine.js";

/**
 * 赢法数组评分 AI（参考 KwanWaiPang/Chess wuziqi.html）
 * 预生成全部五连赢法，按攻防累计分选点。
 */

let wins = null;
let winCount = 0;

function buildWins() {
  if (wins) return;
  wins = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => [])
  );
  winCount = 0;

  // 横
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < 11; x++) {
      for (let k = 0; k < 5; k++) wins[y][x + k][winCount] = true;
      winCount++;
    }
  }
  // 竖
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < 11; y++) {
      for (let k = 0; k < 5; k++) wins[y + k][x][winCount] = true;
      winCount++;
    }
  }
  // 正斜
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      for (let k = 0; k < 5; k++) wins[y + k][x + k][winCount] = true;
      winCount++;
    }
  }
  // 反斜
  for (let y = 0; y < 11; y++) {
    for (let x = 4; x < SIZE; x++) {
      for (let k = 0; k < 5; k++) wins[y + k][x - k][winCount] = true;
      winCount++;
    }
  }
}

function countWins(board, color) {
  buildWins();
  const tallies = new Array(winCount).fill(0);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== color) continue;
      const cell = wins[y][x];
      for (let k = 0; k < winCount; k++) {
        if (cell[k]) tallies[k]++;
      }
    }
  }
  // 已被对方挡住的赢法作废
  const opp = opponent(color);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== opp) continue;
      const cell = wins[y][x];
      for (let k = 0; k < winCount; k++) {
        if (cell[k]) tallies[k] = 6;
      }
    }
  }
  return tallies;
}

const ATTACK = [0, 220, 420, 2100, 20000];
const DEFEND = [0, 200, 400, 2000, 10000];

function scoreCell(board, x, y, meTallies, oppTallies, me, opp) {
  if (board[y][x] !== EMPTY) return -1;

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
  const cell = wins[y][x];
  for (let k = 0; k < winCount; k++) {
    if (!cell[k]) continue;
    const a = meTallies[k];
    const d = oppTallies[k];
    if (a < 5) attack += ATTACK[a] || 0;
    if (d < 5) defend += DEFEND[d] || 0;
  }
  const center = (14 - Math.abs(x - 7) - Math.abs(y - 7)) * 3;
  return attack + defend + center;
}

export function pickMove(board, color, difficulty = "normal") {
  buildWins();
  const me = color;
  const opp = opponent(color);

  let anyStone = false;
  for (let y = 0; y < SIZE && !anyStone; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== EMPTY) {
        anyStone = true;
        break;
      }
    }
  }
  if (!anyStone) return { x: 7, y: 7 };

  const meTallies = countWins(board, me);
  const oppTallies = countWins(board, opp);
  const candidates = [];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== EMPTY) continue;
      if (!hasNeighbor(board, x, y, 2)) continue;
      const score = scoreCell(board, x, y, meTallies, oppTallies, me, opp);
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
  return candidates[0];
}

export function think(board, color, difficulty = "normal") {
  const b = cloneBoard(board);
  return pickMove(b, color, difficulty);
}

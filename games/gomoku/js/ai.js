import {
  EMPTY,
  SIZE,
  isWin,
  cloneBoard,
  opponent,
  hasNeighbor,
  isForbidden,
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

function scoreCell(board, x, y, meTallies, oppTallies, me, opp, opts = {}) {
  if (board[y][x] !== EMPTY) return -1;

  board[y][x] = me;
  if (isWin(board, x, y, me, opts)) {
    board[y][x] = EMPTY;
    return 1e9;
  }
  board[y][x] = opp;
  if (isWin(board, x, y, opp, opts)) {
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

export function pickMove(board, color, difficulty = "normal", opts = {}) {
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
      if (opts.renju && isForbidden(board, x, y, me, opts)) continue;
      if (!hasNeighbor(board, x, y, 2)) continue;
      const score = scoreCell(board, x, y, meTallies, oppTallies, me, opp, opts);
      candidates.push({ x, y, score });
    }
  }

  if (!candidates.length) {
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (board[y][x] !== EMPTY) continue;
        if (opts.renju && isForbidden(board, x, y, me, opts)) continue;
        return { x, y };
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
  return pickHardMove(board, me, opp, candidates, opts);
}

function findImmediateWin(board, color, opts) {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== EMPTY) continue;
      if (opts.renju && isForbidden(board, x, y, color, opts)) continue;
      board[y][x] = color;
      const win = isWin(board, x, y, color, opts);
      board[y][x] = EMPTY;
      if (win) return { x, y };
    }
  }
  return null;
}

function pickHardMove(board, me, opp, candidates, opts) {
  const topN = candidates.slice(0, Math.min(10, candidates.length));
  let best = topN[0];
  let bestV = -Infinity;
  for (const c of topN) {
    let v = c.score;
    if (v >= 1e9) return c;
    board[c.y][c.x] = me;
    const oppWin = findImmediateWin(board, opp, opts);
    if (oppWin) {
      v -= 4.5e8;
    } else {
      const oppTall = countWins(board, opp);
      const meTall = countWins(board, me);
      let oppBest = 0;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (board[y][x] !== EMPTY) continue;
          if (!hasNeighbor(board, x, y, 2)) continue;
          if (opts.renju && isForbidden(board, x, y, opp, opts)) continue;
          const s = scoreCell(board, x, y, oppTall, meTall, opp, me, opts);
          if (s > oppBest) oppBest = s;
        }
      }
      v -= oppBest * 0.42;
    }
    board[c.y][c.x] = EMPTY;
    if (v > bestV) {
      bestV = v;
      best = c;
    }
  }
  return best;
}

export function think(board, color, difficulty = "normal", opts = {}) {
  const b = cloneBoard(board);
  return pickMove(b, color, difficulty, opts);
}

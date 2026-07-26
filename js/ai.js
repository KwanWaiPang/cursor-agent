/**
 * 浏览器端围棋 AI（启发式 + 浅层对抗搜索）
 * 适合休闲对弈；小路盘（9/13）表现更好。
 */

import { BLACK, WHITE, opponent } from "./engine.js";

const DIFFICULTY = {
  easy: { noise: 0.55, topN: 8, depth: 0, thinkMs: 180 },
  medium: { noise: 0.12, topN: 4, depth: 0, thinkMs: 280 },
  hard: { noise: 0.02, topN: 1, depth: 1, thinkMs: 420 },
};

function keyOf(x, y) {
  return `${x},${y}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class GoAI {
  constructor(difficulty = "medium") {
    this.setDifficulty(difficulty);
  }

  setDifficulty(difficulty) {
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : "medium";
    this.cfg = DIFFICULTY[this.difficulty];
  }

  async chooseMove(engine) {
    const started = performance.now();
    const color = engine.toPlay;
    const candidates = this.collectCandidates(engine);

    const scored = [];
    for (const [x, y] of candidates) {
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      let score = this.evaluateMove(engine, x, y, color, trial);
      if (this.cfg.depth >= 1) {
        score -= 0.85 * this.bestOpponentReply(engine, trial, color);
      }
      scored.push({ x, y, score, captured: trial.captured.length });
    }

    // 保留一点思考时间，避免“秒应”太假
    const elapsed = performance.now() - started;
    if (elapsed < this.cfg.thinkMs) {
      await sleep(this.cfg.thinkMs - elapsed);
    }

    if (!scored.length) {
      return { type: "pass" };
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // 终盘或对方已停着时，收益不足则停着
    const stoneCount = countStones(engine);
    const boardArea = engine.size * engine.size;
    const late = stoneCount > boardArea * 0.55;
    if (engine.consecutivePasses === 1 && best.score < 2.5) {
      return { type: "pass" };
    }
    if (late && best.score < 0.8) {
      return { type: "pass" };
    }

    const pick = this.sample(scored);
    return { type: "play", x: pick.x, y: pick.y };
  }

  sample(scored) {
    const n = Math.min(this.cfg.topN, scored.length);
    const pool = scored.slice(0, n);
    if (this.cfg.noise <= 0 || pool.length === 1) return pool[0];

    // softmax-ish with temperature from noise
    const temp = 0.8 + this.cfg.noise * 4;
    const maxS = pool[0].score;
    const weights = pool.map((m) => Math.exp((m.score - maxS) / temp));
    // mix with uniform noise
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    // with noise probability, pick uniformly from pool
    if (Math.random() < this.cfg.noise) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }

  collectCandidates(engine) {
    const size = engine.size;
    const board = engine.board;
    const near = new Set();
    let stones = 0;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!board[y][x]) continue;
        stones += 1;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (engine.inBounds(nx, ny) && board[ny][nx] === 0) {
              near.add(keyOf(nx, ny));
            }
          }
        }
      }
    }

    // 开局：星位与附近
    if (stones < 8) {
      for (const [x, y] of engine.starPoints()) {
        if (board[y][x] === 0) near.add(keyOf(x, y));
        for (const [nx, ny] of engine.neighbors(x, y)) {
          if (board[ny][nx] === 0) near.add(keyOf(nx, ny));
        }
      }
      // 小棋盘加中心
      const c = (size - 1) >> 1;
      if (board[c][c] === 0) near.add(keyOf(c, c));
    }

    // 上一步附近加强
    if (engine.lastMove && !engine.lastMove.pass) {
      const { x, y } = engine.lastMove;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (engine.inBounds(nx, ny) && board[ny][nx] === 0) {
            near.add(keyOf(nx, ny));
          }
        }
      }
    }

    // 空棋盘兜底：星位
    if (!near.size) {
      for (const [x, y] of engine.starPoints()) near.add(keyOf(x, y));
      const c = (size - 1) >> 1;
      near.add(keyOf(c, c));
    }

    // 一路盘若候选过少，扩大扫描
    if (near.size < 12 && stones > 0) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (board[y][x] === 0) near.add(keyOf(x, y));
        }
      }
    }

    // 限制候选数量，保证性能（19路）
    const arr = [...near].map((k) => k.split(",").map(Number));
    if (arr.length <= 80) return arr;

    // 优先靠近已有子与最近一手
    const lx = engine.lastMove && !engine.lastMove.pass ? engine.lastMove.x : (size - 1) / 2;
    const ly = engine.lastMove && !engine.lastMove.pass ? engine.lastMove.y : (size - 1) / 2;
    arr.sort((a, b) => {
      const da = Math.abs(a[0] - lx) + Math.abs(a[1] - ly);
      const db = Math.abs(b[0] - lx) + Math.abs(b[1] - ly);
      return da - db;
    });
    return arr.slice(0, 80);
  }

  evaluateMove(engine, x, y, color, trial) {
    const opp = opponent(color);
    const before = engine.board;
    const after = trial.board;
    let score = 0;

    // 提子
    score += trial.captured.length * 14;

    // 落子后自身气
    const self = engine.getGroup(x, y, after);
    score += Math.min(self.liberties.size, 6) * 0.9;
    if (self.liberties.size === 1) score -= 8;
    if (self.liberties.size === 2) score -= 1.5;

    // 救自己的叫吃
    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (before[ny][nx] !== color) continue;
      const gBefore = engine.getGroup(nx, ny, before);
      if (gBefore.liberties.size === 1 && gBefore.liberties.has(keyOf(x, y))) {
        score += 12 + gBefore.stones.length * 1.5;
      }
    }

    // 叫吃 / 收紧对方
    const seenOpp = new Set();
    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (after[ny][nx] !== opp) continue;
      const k = keyOf(nx, ny);
      if (seenOpp.has(k)) continue;
      const g = engine.getGroup(nx, ny, after);
      for (const [sx, sy] of g.stones) seenOpp.add(keyOf(sx, sy));
      if (g.liberties.size === 1) score += 9 + g.stones.length;
      else if (g.liberties.size === 2) score += 3 + g.stones.length * 0.3;
    }

    // 开局位置偏好：星位、角、边
    const stones = countStones(engine);
    if (stones < 12) {
      const stars = new Set(engine.starPoints().map(([sx, sy]) => keyOf(sx, sy)));
      if (stars.has(keyOf(x, y))) score += 3.5;
      const edge = Math.min(x, y, engine.size - 1 - x, engine.size - 1 - y);
      if (edge >= 2 && edge <= 3) score += 1.6;
      if (edge === 0) score -= 1.2;
      // 靠近中心略加分（小路盘）
      if (engine.size <= 13) {
        const c = (engine.size - 1) / 2;
        score += 1.2 - (Math.abs(x - c) + Math.abs(y - c)) * 0.08;
      }
    }

    // 靠近对方最近一手（应对）
    if (engine.lastMove && !engine.lastMove.pass && engine.lastMove.color === opp) {
      const d =
        Math.abs(x - engine.lastMove.x) + Math.abs(y - engine.lastMove.y);
      if (d <= 2) score += 1.8;
      else if (d <= 3) score += 0.6;
    }

    // 粗略避免挤眼：被己方四面围住且几乎无外气
    let ownN = 0;
    let emptyN = 0;
    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (before[ny][nx] === color) ownN += 1;
      if (before[ny][nx] === 0) emptyN += 1;
    }
    if (ownN >= 3 && trial.captured.length === 0 && self.liberties.size <= 2) {
      score -= 6;
    }
    if (ownN === 4 && trial.captured.length === 0) score -= 20;

    // 连通己方
    if (ownN > 0) score += ownN * 0.45;
    // 保留一点随机扰动以外的微小位置差
    score += ((x * 13 + y * 7) % 5) * 0.01;
    score += emptyN * 0.05;

    return score;
  }

  /** 对手在新局面下的最佳启发反击分 */
  bestOpponentReply(engine, trial, color) {
    const opp = opponent(color);
    // 构造临时引擎状态
    const tmp = engine.clone();
    tmp.board = trial.board;
    tmp.captures = {
      [BLACK]: engine.captures[BLACK] + (color === BLACK ? trial.captured.length : 0),
      [WHITE]: engine.captures[WHITE] + (color === WHITE ? trial.captured.length : 0),
    };
    tmp.positionHistory = engine.positionHistory.concat([trial.serialized]);
    tmp.toPlay = opp;
    tmp.consecutivePasses = 0;
    tmp.lastMove = null;

    const cands = this.collectCandidates(tmp).slice(0, 28);
    let best = 0;
    for (const [x, y] of cands) {
      const t = tmp.tryPlay(x, y, opp);
      if (!t.ok) continue;
      const s = this.evaluateMove(tmp, x, y, opp, t);
      if (s > best) best = s;
    }
    return best;
  }
}

function countStones(engine) {
  let n = 0;
  for (let y = 0; y < engine.size; y++) {
    for (let x = 0; x < engine.size; x++) {
      if (engine.board[y][x]) n += 1;
    }
  }
  return n;
}

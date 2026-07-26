/**
 * 浏览器端围棋 AI
 * - 入门/普通：启发式 + 浅层搜索
 * - 进阶/专家：启发式先验 + 蒙特卡洛树搜索（MCTS）
 * 小路盘（9/13）棋力明显更强。
 */

import { BLACK, WHITE, opponent } from "./engine.js";

/**
 * 难度配置（可选级别）
 * sims: MCTS 模拟次数（按棋盘再缩放）
 * depth: 启发对抗深度
 */
const DIFFICULTY = {
  easy: {
    label: "入门",
    noise: 0.65,
    topN: 10,
    depth: 0,
    sims: 0,
    priorTop: 24,
    thinkMs: 160,
  },
  medium: {
    label: "普通",
    noise: 0.18,
    topN: 3,
    depth: 1,
    sims: 0,
    priorTop: 36,
    thinkMs: 260,
  },
  hard: {
    label: "进阶",
    noise: 0.04,
    topN: 1,
    depth: 1,
    sims: 500,
    priorTop: 28,
    thinkMs: 200,
  },
  expert: {
    label: "专家",
    noise: 0,
    topN: 1,
    depth: 1,
    sims: 1600,
    priorTop: 36,
    thinkMs: 120,
  },
};

function keyOf(x, y) {
  return `${x},${y}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function applyTrial(engine, trial, color, x, y) {
  const next = engine.clone();
  next.board = trial.board;
  next.captures = {
    [BLACK]:
      engine.captures[BLACK] + (color === BLACK ? trial.captured.length : 0),
    [WHITE]:
      engine.captures[WHITE] + (color === WHITE ? trial.captured.length : 0),
  };
  next.positionHistory = engine.positionHistory.concat([trial.serialized]);
  next.toPlay = opponent(color);
  next.consecutivePasses = 0;
  next.lastMove = { x, y, color };
  next.phase = "playing";
  return next;
}

export class GoAI {
  constructor(difficulty = "medium") {
    this.setDifficulty(difficulty);
  }

  setDifficulty(difficulty) {
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : "medium";
    this.cfg = DIFFICULTY[this.difficulty];
  }

  /** 按棋盘大小缩放 MCTS 次数 */
  scaledSims(size) {
    if (!this.cfg.sims) return 0;
    if (size <= 9) return this.cfg.sims;
    if (size <= 13) return Math.round(this.cfg.sims * 0.55);
    return Math.round(this.cfg.sims * 0.28);
  }

  async chooseMove(engine) {
    const started = performance.now();
    const color = engine.toPlay;
    const urgents = this.findUrgentMoves(engine, color);

    // 有强制提子/逃气时，优先在紧急点中决策
    let seedMoves = urgents.length
      ? urgents
      : this.collectCandidates(engine, this.cfg.priorTop + 20);

    const scored = this.scoreMoves(engine, seedMoves, color);

    if (!scored.length) {
      await this.ensureThinkTime(started);
      return { type: "pass" };
    }

    scored.sort((a, b) => b.score - a.score);

    let pick;
    const sims = this.scaledSims(engine.size);
    if (sims > 0) {
      const prior = scored.slice(0, this.cfg.priorTop);
      pick = await this.mctsSelect(engine, prior, sims);
    } else {
      pick = this.sample(scored);
    }

    // 终盘 / 对方已停着：收益不足则停着
    if (this.shouldPass(engine, pick, scored[0])) {
      await this.ensureThinkTime(started);
      return { type: "pass" };
    }

    await this.ensureThinkTime(started);
    return { type: "play", x: pick.x, y: pick.y };
  }

  async ensureThinkTime(started) {
    const elapsed = performance.now() - started;
    if (elapsed < this.cfg.thinkMs) {
      await sleep(this.cfg.thinkMs - elapsed);
    }
  }

  shouldPass(engine, pick, bestHeuristic) {
    const stoneCount = countStones(engine);
    const boardArea = engine.size * engine.size;
    const late = stoneCount > boardArea * 0.58;
    const score = pick.score ?? bestHeuristic?.score ?? 0;

    if (engine.consecutivePasses === 1 && score < 3.2) return true;
    if (late && score < 1.0) return true;
    return false;
  }

  scoreMoves(engine, moves, color) {
    const scored = [];
    const seen = new Set();
    for (const m of moves) {
      const x = m.x ?? m[0];
      const y = m.y ?? m[1];
      const k = keyOf(x, y);
      if (seen.has(k)) continue;
      seen.add(k);
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      let score = this.evaluateMove(engine, x, y, color, trial);
      if (this.cfg.depth >= 1) {
        score -= 0.9 * this.bestOpponentReply(engine, trial, color, x, y);
      }
      // 紧急点额外加权（在 findUrgent 已标 urgent）
      if (m.urgent) score += m.urgent;
      scored.push({ x, y, score, captured: trial.captured.length, prior: score });
    }
    return scored;
  }

  sample(scored) {
    const n = Math.min(this.cfg.topN, scored.length);
    const pool = scored.slice(0, n);
    if (this.cfg.noise <= 0 || pool.length === 1) return pool[0];

    const temp = 0.7 + this.cfg.noise * 4;
    const maxS = pool[0].score;
    const weights = pool.map((m) => Math.exp((m.score - maxS) / temp));
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.random() < this.cfg.noise) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    let r = Math.random() * sum;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }

  /**
   * 扫描叫吃：优先提子 / 逃气
   */
  findUrgentMoves(engine, color) {
    const opp = opponent(color);
    const board = engine.board;
    const size = engine.size;
    const out = [];
    const seenGroups = new Set();

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = board[y][x];
        if (!c) continue;
        const gk = keyOf(x, y);
        if (seenGroups.has(gk)) continue;
        const g = engine.getGroup(x, y);
        for (const [sx, sy] of g.stones) seenGroups.add(keyOf(sx, sy));
        if (g.liberties.size !== 1) continue;
        const [lx, ly] = [...g.liberties][0].split(",").map(Number);
        if (c === opp) {
          // 提对方
          out.push({ x: lx, y: ly, urgent: 40 + g.stones.length * 3 });
        } else {
          // 逃自己的气（也可能是打劫点）
          out.push({ x: lx, y: ly, urgent: 28 + g.stones.length * 2 });
          // 同时考虑提对方来反杀
          for (const [ax, ay] of g.stones) {
            for (const [nx, ny] of engine.neighbors(ax, ay)) {
              if (board[ny][nx] !== opp) continue;
              const og = engine.getGroup(nx, ny);
              if (og.liberties.size === 1) {
                const [ox, oy] = [...og.liberties][0].split(",").map(Number);
                out.push({ x: ox, y: oy, urgent: 45 + og.stones.length * 3 });
              }
            }
          }
        }
      }
    }
    return out;
  }

  collectCandidates(engine, limit = 80) {
    const size = engine.size;
    const board = engine.board;
    const near = new Set();
    let stones = 0;

    const radius = size <= 9 ? 3 : 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!board[y][x]) continue;
        stones += 1;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
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

    if (stones < 10) {
      for (const [x, y] of engine.starPoints()) {
        if (board[y][x] === 0) near.add(keyOf(x, y));
        for (const [nx, ny] of engine.neighbors(x, y)) {
          if (board[ny][nx] === 0) near.add(keyOf(nx, ny));
        }
      }
      const c = (size - 1) >> 1;
      if (board[c][c] === 0) near.add(keyOf(c, c));
    }

    if (engine.lastMove && !engine.lastMove.pass) {
      const { x, y } = engine.lastMove;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (engine.inBounds(nx, ny) && board[ny][nx] === 0) {
            near.add(keyOf(nx, ny));
          }
        }
      }
    }

    // 二气点：收紧 / 做眼相关
    for (const u of this.findLibertyTargets(engine, 2)) {
      near.add(keyOf(u.x, u.y));
    }

    if (!near.size) {
      for (const [x, y] of engine.starPoints()) near.add(keyOf(x, y));
      const c = (size - 1) >> 1;
      near.add(keyOf(c, c));
    }

    if (near.size < 16 && stones > 0 && size <= 13) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (board[y][x] === 0) near.add(keyOf(x, y));
        }
      }
    }

    const arr = [...near].map((k) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y };
    });

    if (arr.length <= limit) return arr;

    const lx =
      engine.lastMove && !engine.lastMove.pass
        ? engine.lastMove.x
        : (size - 1) / 2;
    const ly =
      engine.lastMove && !engine.lastMove.pass
        ? engine.lastMove.y
        : (size - 1) / 2;
    arr.sort((a, b) => {
      const da = Math.abs(a.x - lx) + Math.abs(a.y - ly);
      const db = Math.abs(b.x - lx) + Math.abs(b.y - ly);
      return da - db;
    });
    return arr.slice(0, limit);
  }

  findLibertyTargets(engine, libertyCount) {
    const out = [];
    const seen = new Set();
    for (let y = 0; y < engine.size; y++) {
      for (let x = 0; x < engine.size; x++) {
        if (!engine.board[y][x]) continue;
        const k0 = keyOf(x, y);
        if (seen.has(k0)) continue;
        const g = engine.getGroup(x, y);
        for (const [sx, sy] of g.stones) seen.add(keyOf(sx, sy));
        if (g.liberties.size === libertyCount) {
          for (const lk of g.liberties) {
            const [lx, ly] = lk.split(",").map(Number);
            out.push({ x: lx, y: ly });
          }
        }
      }
    }
    return out;
  }

  evaluateMove(engine, x, y, color, trial) {
    const opp = opponent(color);
    const before = engine.board;
    const after = trial.board;
    let score = 0;

    score += trial.captured.length * 18;

    const self = engine.getGroup(x, y, after);
    score += Math.min(self.liberties.size, 5) * 1.1;
    if (self.liberties.size === 1) score -= 12;
    if (self.liberties.size === 2) score -= 2.2;

    // 救自己的叫吃
    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (before[ny][nx] !== color) continue;
      const gBefore = engine.getGroup(nx, ny, before);
      if (gBefore.liberties.size === 1 && gBefore.liberties.has(keyOf(x, y))) {
        score += 16 + gBefore.stones.length * 2;
      } else if (gBefore.liberties.size === 2 && gBefore.liberties.has(keyOf(x, y))) {
        score += 3 + gBefore.stones.length * 0.4;
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
      if (g.liberties.size === 1) score += 12 + g.stones.length * 1.4;
      else if (g.liberties.size === 2) score += 4 + g.stones.length * 0.35;
    }

    // 粗略地域：落子后周围空点“归属感”
    score += this.localTerritoryDelta(engine, after, x, y, color) * 0.85;

    const stones = countStones(engine);
    if (stones < 14) {
      const stars = new Set(
        engine.starPoints().map(([sx, sy]) => keyOf(sx, sy))
      );
      if (stars.has(keyOf(x, y))) score += 4.2;
      const edge = Math.min(x, y, engine.size - 1 - x, engine.size - 1 - y);
      if (edge >= 2 && edge <= 3) score += 2.0;
      if (edge === 0) score -= 1.8;
      if (engine.size <= 13) {
        const c = (engine.size - 1) / 2;
        score += 1.4 - (Math.abs(x - c) + Math.abs(y - c)) * 0.09;
      }
    }

    if (engine.lastMove && !engine.lastMove.pass && engine.lastMove.color === opp) {
      const d =
        Math.abs(x - engine.lastMove.x) + Math.abs(y - engine.lastMove.y);
      if (d <= 2) score += 2.2;
      else if (d <= 3) score += 0.8;
    }

    let ownN = 0;
    let emptyN = 0;
    let oppN = 0;
    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (before[ny][nx] === color) ownN += 1;
      else if (before[ny][nx] === opp) oppN += 1;
      else emptyN += 1;
    }
    if (ownN >= 3 && trial.captured.length === 0 && self.liberties.size <= 2) {
      score -= 8;
    }
    if (ownN === 4 && trial.captured.length === 0) score -= 25;

    score += ownN * 0.55;
    score += oppN * 0.25; // 靠拢/贴紧
    score += emptyN * 0.08;
    score += ((x * 13 + y * 7) % 5) * 0.01;

    return score;
  }

  localTerritoryDelta(engine, after, x, y, color) {
    const opp = opponent(color);
    let delta = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!engine.inBounds(nx, ny) || after[ny][nx] !== 0) continue;
        let own = 0;
        let enemy = 0;
        for (const [ax, ay] of engine.neighbors(nx, ny)) {
          if (after[ay][ax] === color) own += 1;
          else if (after[ay][ax] === opp) enemy += 1;
        }
        if (own > enemy) delta += 0.35;
        if (enemy > own) delta -= 0.2;
      }
    }
    return delta;
  }

  bestOpponentReply(engine, trial, color, x, y) {
    const tmp = applyTrial(engine, trial, color, x, y);
    const opp = tmp.toPlay;
    const urgents = this.findUrgentMoves(tmp, opp);
    const cands = (
      urgents.length ? urgents : this.collectCandidates(tmp, 30)
    ).slice(0, 30);
    let best = 0;
    for (const m of cands) {
      const cx = m.x ?? m[0];
      const cy = m.y ?? m[1];
      const t = tmp.tryPlay(cx, cy, opp);
      if (!t.ok) continue;
      let s = this.evaluateMove(tmp, cx, cy, opp, t);
      if (m.urgent) s += m.urgent * 0.5;
      if (s > best) best = s;
    }
    return best;
  }

  /**
   * MCTS：用启发分做先验，快速对局评估胜率
   */
  async mctsSelect(engine, priorMoves, sims) {
    const rootColor = engine.toPlay;
    const root = {
      engine,
      children: [],
      visits: 0,
      value: 0,
      untried: priorMoves.map((m) => ({ ...m })),
      move: null,
      parent: null,
      prior: 1,
    };

    // 先验 softmax
    const maxP = Math.max(...priorMoves.map((m) => m.prior ?? m.score));
    for (const m of root.untried) {
      m.prior = Math.exp(((m.prior ?? m.score) - maxP) / 3.5);
    }

    for (let i = 0; i < sims; i++) {
      let node = root;
      let state = engine;

      // Selection
      while (!node.untried.length && node.children.length) {
        node = this.uctSelect(node);
        state = node.engine;
      }

      // Expansion
      if (node.untried.length && state.phase === "playing") {
        // 按先验加权抽取扩展着法
        const move = this.weightedPick(node.untried);
        node.untried = node.untried.filter(
          (m) => !(m.x === move.x && m.y === move.y)
        );
        const trial = state.tryPlay(move.x, move.y, state.toPlay);
        if (trial.ok) {
          const childEngine = applyTrial(
            state,
            trial,
            state.toPlay,
            move.x,
            move.y
          );
          const child = {
            engine: childEngine,
            children: [],
            visits: 0,
            value: 0,
            untried: this.legalPriorMoves(childEngine, 18),
            move: { x: move.x, y: move.y, score: move.score ?? move.prior },
            parent: node,
            prior: move.prior || 1,
          };
          node.children.push(child);
          node = child;
          state = childEngine;
        }
      }

      // Simulation
      const result = this.playout(state, rootColor, engine.size <= 9 ? 40 : 28);

      // Backprop
      let cur = node;
      while (cur) {
        cur.visits += 1;
        cur.value += result;
        cur = cur.parent;
      }

      if (i % 64 === 63) await sleep(0);
    }

    if (!root.children.length) {
      return priorMoves[0];
    }

    // 选访问最多（稳健），专家再偏向价值
    root.children.sort((a, b) => {
      if (this.difficulty === "expert") {
        const va = a.visits ? a.value / a.visits : -1;
        const vb = b.visits ? b.value / b.visits : -1;
        if (b.visits !== a.visits) return b.visits - a.visits;
        return vb - va;
      }
      return b.visits - a.visits;
    });

    const best = root.children[0];
    const winRate = best.visits ? best.value / best.visits : 0;
    return {
      x: best.move.x,
      y: best.move.y,
      score: winRate * 20 + (best.move.score || 0) * 0.15,
      visits: best.visits,
      winRate,
    };
  }

  uctSelect(node) {
    const c = this.difficulty === "expert" ? 1.15 : 1.35;
    let best = null;
    let bestScore = -Infinity;
    for (const child of node.children) {
      const exploit = child.visits ? child.value / child.visits : 0;
      const explore =
        c *
        Math.sqrt(Math.log(node.visits + 1) / (child.visits + 1e-6)) *
        (0.5 + child.prior);
      const s = exploit + explore;
      if (s > bestScore) {
        bestScore = s;
        best = child;
      }
    }
    return best;
  }

  weightedPick(moves) {
    const sum = moves.reduce((a, m) => a + (m.prior || 1), 0);
    let r = Math.random() * sum;
    for (const m of moves) {
      r -= m.prior || 1;
      if (r <= 0) return m;
    }
    return moves[moves.length - 1];
  }

  legalPriorMoves(engine, limit) {
    if (engine.phase !== "playing") return [];
    const color = engine.toPlay;
    const urgents = this.findUrgentMoves(engine, color);
    const base = urgents.length
      ? urgents
      : this.collectCandidates(engine, limit);
    const scored = [];
    for (const m of base.slice(0, limit)) {
      const x = m.x ?? m[0];
      const y = m.y ?? m[1];
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      const score =
        this.evaluateMove(engine, x, y, color, trial) + (m.urgent || 0);
      scored.push({ x, y, score, prior: Math.exp(score / 4) });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * 快速对局：启发式偏置随机，返回相对 rootColor 的胜负分 [0,1]
   */
  playout(engine, rootColor, maxMoves) {
    const state = engine.clone();
    // 限制历史长度，加速同形判断
    if (state.positionHistory.length > 8) {
      state.positionHistory = state.positionHistory.slice(-8);
    }

    let passes = state.consecutivePasses;
    for (let i = 0; i < maxMoves; i++) {
      if (state.phase !== "playing") break;
      const move = this.policyMove(state);
      if (!move) {
        state.pass();
        passes += 1;
      } else {
        const res = state.play(move.x, move.y);
        if (!res.ok) {
          state.pass();
          passes += 1;
        } else {
          passes = 0;
        }
      }
      if (passes >= 2) break;
      // 截断超长历史
      if (state.positionHistory.length > 10) {
        state.positionHistory = state.positionHistory.slice(-8);
      }
    }

    return this.quickScore(state, rootColor);
  }

  policyMove(engine) {
    const color = engine.toPlay;
    const urgents = this.findUrgentMoves(engine, color);
    const pool = urgents.length
      ? urgents
      : this.collectCandidates(engine, 16);
    const legal = [];
    for (const m of pool) {
      const x = m.x ?? m[0];
      const y = m.y ?? m[1];
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      let s = trial.captured.length * 8 + (m.urgent || 0);
      const self = engine.getGroup(x, y, trial.board);
      s += Math.min(self.liberties.size, 4);
      legal.push({ x, y, s });
    }
    if (!legal.length) return null;
    legal.sort((a, b) => b.s - a.s);
    // 在前几名中随机，保持探索
    const top = legal.slice(0, Math.min(5, legal.length));
    return top[Math.floor(Math.random() * top.length)];
  }

  quickScore(engine, rootColor) {
    const board = engine.board;
    const size = engine.size;
    let black = engine.captures[BLACK];
    let white = engine.captures[WHITE] + engine.komi;

    // 子 + 粗略包围空点
    const visited = Array.from({ length: size }, () =>
      Array(size).fill(false)
    );
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === BLACK) black += 1;
        else if (board[y][x] === WHITE) white += 1;
      }
    }

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0 || visited[y][x]) continue;
        const q = [[x, y]];
        const cells = [];
        const border = new Set();
        visited[y][x] = true;
        while (q.length) {
          const [cx, cy] = q.pop();
          cells.push([cx, cy]);
          for (const [nx, ny] of engine.neighbors(cx, cy)) {
            const v = board[ny][nx];
            if (v === 0) {
              if (!visited[ny][nx]) {
                visited[ny][nx] = true;
                q.push([nx, ny]);
              }
            } else border.add(v);
          }
        }
        if (border.size === 1) {
          if ([...border][0] === BLACK) black += cells.length;
          else white += cells.length;
        }
      }
    }

    const rootScore = rootColor === BLACK ? black : white;
    const other = rootColor === BLACK ? white : black;
    if (rootScore > other) return 1;
    if (rootScore < other) return 0;
    return 0.5;
  }
}

export const AI_DIFFICULTIES = Object.keys(DIFFICULTY);

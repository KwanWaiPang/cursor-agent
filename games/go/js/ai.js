/**
 * 浏览器端围棋 AI（9 / 13 / 19 路）。二十五级到一级在这里搜索；初段到九段改走 KataGo。
 *
 * 高档用的是经典围棋程序的几样东西，不是神经网络：
 * - 形势：棋子向四周扩散的影响（Bouzy 那类稀释），用来估空和避免填自己的空
 * - 搜索：限时蒙特卡洛 + RAVE（Pachi、Fuego 一类）
 * - 局部：叫吃、提子、倒扑的短阅读，高档再加征子
 *
 * 低档故意少看形势、少搜索。旧档名 novice…dan 会映射到新档，避免旧调用失效。
 */

import { BLACK, WHITE, opponent, GoEngine } from "./engine.js";

/**
 * judge: 形势判断的权重。0 几乎不看空，1 按影响估空。
 * forceCapture: 局部阅读净赚多少子才强制下，而不把全局候选丢掉。
 * sims / timeMs: 搜索次数和时间上限。大棋盘在 searchPlan 里再放宽。
 */
const DIFFICULTY = {
  k25: {
    label: "二十五级",
    noise: 0.85,
    topN: 12,
    depth: 0,
    sims: 0,
    priorTop: 14,
    thinkMs: 50,
    timeMs: { 9: 70, 13: 90, 19: 120 },
    readDepth: 0,
    explore: 1.8,
    policyDecay: 0.82,
    judge: 0,
    forceCapture: 6,
  },
  k20: {
    label: "二十级",
    noise: 0.48,
    topN: 8,
    depth: 0,
    sims: 0,
    priorTop: 18,
    thinkMs: 70,
    timeMs: { 9: 110, 13: 160, 19: 220 },
    readDepth: 0,
    explore: 1.7,
    policyDecay: 0.72,
    judge: 0.1,
    forceCapture: 8,
  },
  k15: {
    label: "十五级",
    noise: 0.22,
    topN: 4,
    depth: 0,
    sims: 0,
    priorTop: 22,
    thinkMs: 90,
    timeMs: { 9: 180, 13: 260, 19: 400 },
    readDepth: 0,
    explore: 1.6,
    policyDecay: 0.64,
    judge: 0.28,
    forceCapture: 8,
  },
  k10: {
    label: "十级",
    noise: 0.08,
    topN: 2,
    depth: 1,
    sims: 250,
    priorTop: 26,
    thinkMs: 40,
    timeMs: { 9: 450, 13: 650, 19: 900 },
    readDepth: 2,
    readNodes: 400,
    explore: 1.5,
    raveK: 200,
    policyDecay: 0.55,
    judge: 0.45,
    forceCapture: 8,
  },
  k6: {
    label: "六级",
    noise: 0.03,
    topN: 1,
    depth: 1,
    sims: 900,
    priorTop: 32,
    thinkMs: 30,
    timeMs: { 9: 900, 13: 1400, 19: 2000 },
    readDepth: 3,
    readNodes: 700,
    explore: 1.4,
    raveK: 350,
    policyDecay: 0.48,
    judge: 0.62,
    forceCapture: 10,
  },
  k3: {
    label: "三级",
    noise: 0,
    topN: 1,
    depth: 1,
    sims: 1800,
    priorTop: 38,
    thinkMs: 20,
    timeMs: { 9: 1500, 13: 2400, 19: 3400 },
    readDepth: 4,
    readNodes: 1000,
    explore: 1.28,
    raveK: 500,
    policyDecay: 0.4,
    judge: 0.78,
    forceCapture: 12,
  },
  k1: {
    label: "一级",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 3000,
    priorTop: 44,
    thinkMs: 20,
    timeMs: { 9: 2200, 13: 3500, 19: 5000 },
    readDepth: 4,
    readNodes: 1300,
    explore: 1.16,
    raveK: 700,
    policyDecay: 0.34,
    judge: 0.9,
    forceCapture: 16,
  },
  d1: {
    label: "初段",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 4200,
    priorTop: 50,
    thinkMs: 20,
    timeMs: { 9: 2800, 13: 4500, 19: 6500 },
    readDepth: 5,
    readNodes: 1600,
    ladder: true,
    explore: 1.05,
    raveK: 900,
    policyDecay: 0.28,
    judge: 1,
    forceCapture: 20,
    visitRatio: 0.88,
  },
  d2: {
    label: "二段",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 5600,
    priorTop: 54,
    thinkMs: 20,
    timeMs: { 9: 3400, 13: 5400, 19: 8000 },
    readDepth: 5,
    readNodes: 1900,
    ladder: true,
    explore: 0.98,
    raveK: 1100,
    policyDecay: 0.24,
    judge: 1,
    forceCapture: 24,
    visitRatio: 0.84,
  },
  d3: {
    label: "三段",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 7000,
    priorTop: 58,
    thinkMs: 20,
    timeMs: { 9: 4000, 13: 6400, 19: 9500 },
    readDepth: 6,
    readNodes: 2200,
    ladder: true,
    explore: 0.92,
    raveK: 1300,
    policyDecay: 0.2,
    judge: 1,
    forceCapture: 28,
    visitRatio: 0.8,
  },
  d4: {
    label: "四段",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 8600,
    priorTop: 62,
    thinkMs: 20,
    timeMs: { 9: 4800, 13: 7800, 19: 11500 },
    readDepth: 6,
    readNodes: 2600,
    ladder: true,
    explore: 0.86,
    raveK: 1500,
    policyDecay: 0.16,
    judge: 1,
    forceCapture: 32,
    visitRatio: 0.76,
  },
  d5: {
    label: "五段",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 10500,
    priorTop: 68,
    thinkMs: 20,
    timeMs: { 9: 5600, 13: 9000, 19: 14000 },
    readDepth: 7,
    readNodes: 3200,
    ladder: true,
    explore: 0.8,
    raveK: 1800,
    policyDecay: 0.12,
    judge: 1,
    forceCapture: 36,
    visitRatio: 0.7,
  },
};

const ALIAS = {
  novice: "k25",
  easy: "k20",
  medium: "k6",
  hard: "k3",
  expert: "k1",
  master: "d2",
  dan: "d5",
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

/** 搜索用轻量局面（不拷贝完整棋谱，显著加快 MCTS） */
function applyTrial(engine, trial, color, x, y) {
  const next = new GoEngine(engine.size, engine.komi);
  next.board = trial.board;
  next.captures = {
    [BLACK]:
      engine.captures[BLACK] + (color === BLACK ? trial.captured.length : 0),
    [WHITE]:
      engine.captures[WHITE] + (color === WHITE ? trial.captured.length : 0),
  };
  const hist = engine.positionHistory;
  next.positionHistory =
    hist.length > 12
      ? hist.slice(-8).concat([trial.serialized])
      : hist.concat([trial.serialized]);
  next.toPlay = opponent(color);
  next.consecutivePasses = 0;
  next.lastMove = { x, y, color };
  next.phase = "playing";
  next.moveHistory = [];
  return next;
}

function lightState(engine) {
  const next = new GoEngine(engine.size, engine.komi);
  next.board = engine.cloneBoard();
  next.captures = {
    [BLACK]: engine.captures[BLACK],
    [WHITE]: engine.captures[WHITE],
  };
  next.toPlay = engine.toPlay;
  next.consecutivePasses = engine.consecutivePasses;
  next.positionHistory = engine.positionHistory.slice(-8);
  next.lastMove = engine.lastMove ? { ...engine.lastMove } : null;
  next.phase = "playing";
  next.moveHistory = [];
  return next;
}

export class GoAI {
  constructor(difficulty = "medium") {
    this.setDifficulty(difficulty);
  }

  setDifficulty(difficulty) {
    const id = ALIAS[difficulty] || difficulty;
    this.difficulty = DIFFICULTY[id] ? id : "k6";
    const base = DIFFICULTY[this.difficulty];
    this.cfg = { ...base, timeMs: { ...base.timeMs } };
  }

  /** 当前局面的影响图。正数偏黑，负数偏白。只对这一盘棋盘有效。 */
  prepareJudge(engine) {
    this._inf = null;
    this._infBoard = null;
    if ((this.cfg.judge || 0) <= 0) return;
    this._inf = this.buildInfluence(engine.board, engine.size);
    this._infBoard = engine.board;
  }

  buildInfluence(board, size) {
    const n = size * size;
    let cur = new Float32Array(n);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const c = board[y][x];
        if (c === BLACK) cur[y * size + x] = 1;
        else if (c === WHITE) cur[y * size + x] = -1;
      }
    }
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (let step = 0; step < 4; step += 1) {
      const next = new Float32Array(n);
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const i = y * size + x;
          let sum = cur[i] * 2;
          let deg = 2;
          for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            sum += cur[ny * size + nx];
            deg += 1;
          }
          next[i] = sum / deg;
        }
      }
      cur = next;
    }
    return cur;
  }

  nearestStone(board, x, y, color, max) {
    const size = board.length;
    for (let r = 1; r <= max; r += 1) {
      for (let dy = -r; dy <= r; dy += 1) {
        for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          if (board[ny][nx] === color) return r;
        }
      }
    }
    return max + 1;
  }

  sizeKey(size) {
    if (size <= 9) return 9;
    if (size <= 13) return 13;
    return 19;
  }

  /**
   * 大棋盘给更多搜索，而不是削减。
   * 返回 { sims, timeMs, priorTop, candLimit }
   */
  searchPlan(size) {
    const sk = this.sizeKey(size);
    const timeMs = this.cfg.timeMs[sk] ?? this.cfg.thinkMs;
    if (!this.cfg.sims) {
      return {
        sims: 0,
        timeMs,
        priorTop: this.cfg.priorTop + (sk === 19 ? 12 : sk === 13 ? 6 : 0),
        candLimit: sk === 19 ? 110 : sk === 13 ? 90 : 70,
      };
    }

    // 大棋盘提高候选与模拟上限；用时间预算封顶避免卡死
    const simScale = sk === 9 ? 1 : sk === 13 ? 1.15 : 1.25;
    const priorBoost = sk === 9 ? 0 : sk === 13 ? 6 : 10;
    return {
      sims: Math.round(this.cfg.sims * simScale),
      timeMs,
      priorTop: this.cfg.priorTop + priorBoost,
      candLimit: sk === 19 ? 140 : sk === 13 ? 110 : 80,
    };
  }

  /** 兼容旧测试 */
  scaledSims(size) {
    return this.searchPlan(size).sims;
  }

  async chooseMove(engine) {
    const started = performance.now();
    const color = engine.toPlay;
    const plan = this.searchPlan(engine.size);
    this.prepareJudge(engine);
    await sleep(0);

    const safe = this.safeCapture(engine, color);
    if (safe) {
      await this.ensureThinkTime(started, Math.min(180, plan.timeMs));
      return safe;
    }

    if (this.cfg.readDepth) {
      const forced = this.tacticalPick(engine, color);
      if (forced) {
        await this.ensureThinkTime(started, Math.min(280, plan.timeMs));
        return forced;
      }
    }
    if (this.cfg.ladder) {
      const lad = this.ladderPick(engine, color);
      if (lad) {
        await this.ensureThinkTime(started, Math.min(280, plan.timeMs));
        return lad;
      }
    }

    const urgents = this.findUrgentMoves(engine, color);
    const captures = urgents.filter((u) => u.urgent >= 40);

    // 低档看见叫吃就只顾提子。高档把提子放进全局候选，靠形势决定要不要弃子。
    let seedMoves;
    const global = this.collectCandidates(engine, plan.candLimit);
    if (captures.length && (this.cfg.judge || 0) < 0.75) {
      seedMoves = captures;
    } else {
      seedMoves = [...urgents, ...global];
    }

    const scored = this.scoreMoves(engine, seedMoves, color);
    if (!scored.length) {
      await this.ensureThinkTime(started, plan.timeMs);
      return { type: "pass" };
    }
    scored.sort((a, b) => b.score - a.score);

    let pick;
    if (plan.sims > 0) {
      const prior = scored.slice(0, plan.priorTop);
      pick = await this.mctsSelect(engine, prior, plan.sims, plan.timeMs);
    } else {
      pick = this.sample(scored);
      await this.ensureThinkTime(started, Math.min(plan.timeMs, this.cfg.thinkMs));
    }

    if (this.shouldPass(engine, pick, scored[0])) {
      return { type: "pass" };
    }
    return { type: "play", x: pick.x, y: pick.y };
  }

  async ensureThinkTime(started, minMs) {
    const elapsed = performance.now() - started;
    if (elapsed < minMs) await sleep(minMs - elapsed);
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
      // 有蒙特卡洛时，应手交给搜索。这里再对每个候选做一遍应手会把时间预算吃掉。
      if (this.cfg.depth >= 1 && !this.cfg.sims) {
        const oppBest = this.bestOpponentReply(engine, trial, color, x, y);
        score -= (this.cfg.depth >= 2 ? 1.05 : 0.92) * oppBest;
      }
      if (m.urgent) score += m.urgent;
      scored.push({
        x,
        y,
        score,
        captured: trial.captured.length,
        prior: score,
      });
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

        if (g.liberties.size === 1) {
          const [lx, ly] = [...g.liberties][0].split(",").map(Number);
          if (c === opp) {
            out.push({ x: lx, y: ly, urgent: 55 + g.stones.length * 4 });
          } else {
            out.push({ x: lx, y: ly, urgent: 40 + g.stones.length * 3 });
            for (const [ax, ay] of g.stones) {
              for (const [nx, ny] of engine.neighbors(ax, ay)) {
                if (board[ny][nx] !== opp) continue;
                const og = engine.getGroup(nx, ny);
                if (og.liberties.size === 1) {
                  const [ox, oy] = [...og.liberties][0].split(",").map(Number);
                  out.push({
                    x: ox,
                    y: oy,
                    urgent: 60 + og.stones.length * 4,
                  });
                }
              }
            }
          }
          continue;
        }

        // 二气：叫吃 / 逃二气，显著提高战术意识
        if (g.liberties.size === 2) {
          for (const lk of g.liberties) {
            const [lx, ly] = lk.split(",").map(Number);
            if (c === opp) {
              out.push({ x: lx, y: ly, urgent: 18 + g.stones.length });
            } else {
              out.push({ x: lx, y: ly, urgent: 12 + g.stones.length * 0.6 });
            }
          }
        }
      }
    }
    return out;
  }

  /**
   * 13/19 路布局要点：星位、小目/高目、挂角、拆边
   */
  fusekiPoints(size) {
    const pts = [];
    const add = (x, y) => {
      if (x >= 0 && y >= 0 && x < size && y < size) pts.push([x, y]);
    };

    if (size === 19) {
      const stars = [3, 9, 15];
      for (const y of stars) for (const x of stars) add(x, y);
      // 各角 3-4 / 4-3 / 5-3 守角与挂
      const corners = [
        [3, 3],
        [3, 15],
        [15, 3],
        [15, 15],
      ];
      for (const [cx, cy] of corners) {
        const sx = cx < 9 ? 1 : -1;
        const sy = cy < 9 ? 1 : -1;
        add(cx - sx, cy); // 3-4
        add(cx, cy - sy);
        add(cx - 2 * sx, cy); // 5-3 方向附近
        add(cx, cy - 2 * sy);
        add(cx + sx, cy + 2 * sy); // 挂角一带
        add(cx + 2 * sx, cy + sy);
        add(cx + 3 * sx, cy); // 拆边
        add(cx, cy + 3 * sy);
      }
      // 边上要点
      for (const s of [3, 15]) {
        add(9, s);
        add(s, 9);
        add(6, s);
        add(12, s);
        add(s, 6);
        add(s, 12);
      }
    } else if (size === 13) {
      const stars = [3, 6, 9];
      for (const y of stars) for (const x of stars) add(x, y);
      const corners = [
        [3, 3],
        [3, 9],
        [9, 3],
        [9, 9],
      ];
      for (const [cx, cy] of corners) {
        const sx = cx < 6 ? 1 : -1;
        const sy = cy < 6 ? 1 : -1;
        add(cx - sx, cy);
        add(cx, cy - sy);
        add(cx + 2 * sx, cy + sy);
        add(cx + 3 * sx, cy);
        add(cx, cy + 3 * sy);
      }
      add(6, 6);
    } else {
      for (const [x, y] of [
        [2, 2],
        [2, 6],
        [6, 2],
        [6, 6],
        [4, 4],
        [2, 4],
        [4, 2],
        [6, 4],
        [4, 6],
      ]) {
        add(x, y);
      }
    }
    return pts;
  }

  collectCandidates(engine, limit = 80) {
    const size = engine.size;
    const board = engine.board;
    const near = new Set();
    let stones = 0;

    const radius = size >= 19 ? 2 : size >= 13 ? 3 : 3;
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

    // 开局与中盘初：布局点始终纳入（13/19 关键）
    const openingHorizon = size >= 19 ? 48 : size >= 13 ? 28 : 14;
    if (stones < openingHorizon) {
      for (const [x, y] of this.fusekiPoints(size)) {
        if (board[y][x] === 0) near.add(keyOf(x, y));
      }
      for (const [x, y] of engine.starPoints()) {
        if (board[y][x] === 0) near.add(keyOf(x, y));
      }
    }

    // 空角优先：大棋盘若某角附近无子，加入该角落子点
    if (size >= 13 && stones < openingHorizon) {
      for (const [x, y] of this.emptyCornerTargets(engine)) {
        near.add(keyOf(x, y));
      }
    }

    if (engine.lastMove && !engine.lastMove.pass) {
      const { x, y } = engine.lastMove;
      const localR = size >= 19 ? 4 : 3;
      for (let dy = -localR; dy <= localR; dy++) {
        for (let dx = -localR; dx <= localR; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (engine.inBounds(nx, ny) && board[ny][nx] === 0) {
            near.add(keyOf(nx, ny));
          }
        }
      }
    }

    for (const u of this.findLibertyTargets(engine, 2)) {
      near.add(keyOf(u.x, u.y));
    }

    if (!near.size) {
      for (const [x, y] of this.fusekiPoints(size)) near.add(keyOf(x, y));
    }

    // 9/13 路候选过少时扩全盘；19 路用更大局部即可
    if (near.size < 20 && stones > 0 && size <= 13) {
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

    // 排序：紧急局部 + 空角布局价值
    const lx =
      engine.lastMove && !engine.lastMove.pass
        ? engine.lastMove.x
        : (size - 1) / 2;
    const ly =
      engine.lastMove && !engine.lastMove.pass
        ? engine.lastMove.y
        : (size - 1) / 2;
    const fuseki = new Set(this.fusekiPoints(size).map(([x, y]) => keyOf(x, y)));

    arr.sort((a, b) => {
      const fa = fuseki.has(keyOf(a.x, a.y)) ? 0 : 1;
      const fb = fuseki.has(keyOf(b.x, b.y)) ? 0 : 1;
      if (stones < openingHorizon && fa !== fb) return fa - fb;
      const da = Math.abs(a.x - lx) + Math.abs(a.y - ly);
      const db = Math.abs(b.x - lx) + Math.abs(b.y - ly);
      return da - db;
    });
    return arr.slice(0, limit);
  }

  emptyCornerTargets(engine) {
    const size = engine.size;
    const corners =
      size >= 19
        ? [
            [3, 3],
            [3, 15],
            [15, 3],
            [15, 15],
          ]
        : [
            [3, 3],
            [3, 9],
            [9, 3],
            [9, 9],
          ];
    const out = [];
    for (const [cx, cy] of corners) {
      let occupied = false;
      for (let dy = -3; dy <= 3 && !occupied; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (engine.inBounds(x, y) && engine.board[y][x]) {
            occupied = true;
            break;
          }
        }
      }
      if (!occupied) {
        out.push([cx, cy]);
        // 小目备选
        const sx = cx < size / 2 ? 1 : -1;
        const sy = cy < size / 2 ? 1 : -1;
        out.push([cx - sx, cy], [cx, cy - sy]);
      }
    }
    return out;
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
    const size = engine.size;
    const stones = countStones(engine);

    score += trial.captured.length * 26;

    const self = engine.getGroup(x, y, after);
    score += Math.min(self.liberties.size, 6) * 1.35;
    if (self.liberties.size === 1) score -= 18;
    if (self.liberties.size === 2) score -= 3.5;

    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (before[ny][nx] !== color) continue;
      const gBefore = engine.getGroup(nx, ny, before);
      if (gBefore.liberties.size === 1 && gBefore.liberties.has(keyOf(x, y))) {
        score += 28 + gBefore.stones.length * 3;
      } else if (
        gBefore.liberties.size === 2 &&
        gBefore.liberties.has(keyOf(x, y))
      ) {
        score += 6 + gBefore.stones.length * 0.7;
      }
    }

    const seenOpp = new Set();
    for (const [nx, ny] of engine.neighbors(x, y)) {
      if (after[ny][nx] !== opp) continue;
      const k = keyOf(nx, ny);
      if (seenOpp.has(k)) continue;
      const g = engine.getGroup(nx, ny, after);
      for (const [sx, sy] of g.stones) seenOpp.add(keyOf(sx, sy));
      if (g.liberties.size === 1) score += 20 + g.stones.length * 2.2;
      else if (g.liberties.size === 2) score += 7 + g.stones.length * 0.55;
    }

    // 切断：落子后让对方相邻子不再同块连通
    score += this.cutBonus(before, after, x, y, color) * 1.2;

    score += this.localTerritoryDelta(engine, after, x, y, color) * 1.15;

    // 布局评估：9/13/19 通用，大棋盘权重更高
    const openingHorizon = size >= 19 ? 48 : size >= 13 ? 28 : 14;
    if (stones < openingHorizon) {
      const fuseki = new Set(
        this.fusekiPoints(size).map(([sx, sy]) => keyOf(sx, sy))
      );
      const stars = new Set(
        engine.starPoints().map(([sx, sy]) => keyOf(sx, sy))
      );
      if (stars.has(keyOf(x, y))) score += size >= 13 ? 5.5 : 4.2;
      else if (fuseki.has(keyOf(x, y))) score += size >= 13 ? 3.8 : 2.5;

      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (size >= 13) {
        // 占角/占边，避免太早钻第三线以内或中腹乱战
        if (edge >= 2 && edge <= 4) score += 2.4;
        if (edge === 0) score -= 2.5;
        if (edge >= 6) score -= stones < 20 ? 1.8 : 0.2;
      } else {
        if (edge >= 2 && edge <= 3) score += 2.0;
        if (edge === 0) score -= 1.8;
        const c = (size - 1) / 2;
        score += 1.4 - (Math.abs(x - c) + Math.abs(y - c)) * 0.09;
      }

      // 空角奖励
      score += this.emptyCornerBonus(engine, x, y) * (size >= 19 ? 1.4 : 1.1);
    }

    if (
      engine.lastMove &&
      !engine.lastMove.pass &&
      engine.lastMove.color === opp
    ) {
      const d =
        Math.abs(x - engine.lastMove.x) + Math.abs(y - engine.lastMove.y);
      if (d <= 2) score += 2.2;
      else if (d <= 3) score += 0.8;
      else if (size >= 13 && d >= 8 && stones < openingHorizon) {
        // 开局可脱先占另一角
        score += this.emptyCornerBonus(engine, x, y) * 0.8;
      }
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
      score -= 12;
    }
    if (ownN === 4 && trial.captured.length === 0) score -= 30;

    const judge = this.cfg.judge || 0;
    if (judge > 0 && this._inf && before === this._infBoard) {
      const raw = this._inf[y * size + x];
      const ownInf = color === BLACK ? raw : -raw;
      if (trial.captured.length === 0 && ownInf > 0.2) {
        score -= (5 + 12 * ownInf) * judge;
      }
      if (ownInf < -0.1) {
        score += (stones < openingHorizon ? 4.4 : 2.6) * Math.min(1.3, -ownInf) * judge;
      }
      const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edgeDist >= 2 && edgeDist <= 3 && stones < openingHorizon * 1.5) {
        const dOwn = this.nearestStone(before, x, y, color, 5);
        const dOpp = this.nearestStone(before, x, y, opp, 5);
        if (dOwn >= 3 && dOwn <= 4 && dOpp >= 3) score += 3.1 * judge;
      }
    }

    // 连通己方、贴紧对方（分断/靠压）
    score += ownN * 0.7;
    score += oppN * 0.45;
    score += emptyN * 0.1;
    score += ((x * 13 + y * 7) % 5) * 0.01;

    return score;
  }

  cutBonus(before, after, x, y, color) {
    const opp = opponent(color);
    let bonus = 0;
    const oppNeighbors = [];
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (
        ny >= 0 &&
        nx >= 0 &&
        ny < before.length &&
        nx < before.length &&
        before[ny][nx] === opp
      ) {
        oppNeighbors.push([nx, ny]);
      }
    }
    if (oppNeighbors.length < 2) return 0;
    // 若原先两点同块，落子后不再同块 → 分断
    const [a, b] = oppNeighbors;
    const ga = this._sameGroup(before, a[0], a[1], b[0], b[1]);
    if (!ga) return 0;
    const still = this._sameGroup(after, a[0], a[1], b[0], b[1]);
    if (!still) bonus += 5.5;
    return bonus;
  }

  _sameGroup(board, x1, y1, x2, y2) {
    if (board[y1][x1] === 0 || board[y1][x1] !== board[y2][x2]) return false;
    const color = board[y1][x1];
    const size = board.length;
    const seen = new Set([`${x1},${y1}`]);
    const stack = [[x1, y1]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx === x2 && cy === y2) return true;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        if (board[ny][nx] !== color) continue;
        const k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        seen.add(k);
        stack.push([nx, ny]);
      }
    }
    return false;
  }

  emptyCornerBonus(engine, x, y) {
    const size = engine.size;
    const corners =
      size >= 19
        ? [
            [3, 3],
            [3, 15],
            [15, 3],
            [15, 15],
          ]
        : size >= 13
          ? [
              [3, 3],
              [3, 9],
              [9, 3],
              [9, 9],
            ]
          : [
              [2, 2],
              [2, 6],
              [6, 2],
              [6, 6],
            ];
    let best = 0;
    for (const [cx, cy] of corners) {
      const dist = Math.abs(x - cx) + Math.abs(y - cy);
      if (dist > 4) continue;
      let occupied = false;
      for (let dy = -3; dy <= 3 && !occupied; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          if (engine.inBounds(px, py) && engine.board[py][px]) {
            occupied = true;
            break;
          }
        }
      }
      if (!occupied) best = Math.max(best, 3.2 - dist * 0.45);
    }
    return best;
  }

  localTerritoryDelta(engine, after, x, y, color) {
    const opp = opponent(color);
    let delta = 0;
    const span = engine.size >= 19 ? 3 : 2;
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
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
    const captures = urgents.filter((u) => u.urgent >= 40);
    const cands = (
      captures.length
        ? captures
        : [...urgents, ...this.collectCandidates(tmp, 32)]
    ).slice(0, 32);
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
   * 对方只剩一口气，而且提完自己至少还有两气。
   * 这不是送吃，也不是劫材，直接提掉。
   */
  safeCapture(engine, color) {
    const opp = opponent(color);
    const seen = new Set();
    let best = null;
    let bestN = 0;
    for (let y = 0; y < engine.size; y += 1) {
      for (let x = 0; x < engine.size; x += 1) {
        if (engine.board[y][x] !== opp) continue;
        const k0 = keyOf(x, y);
        if (seen.has(k0)) continue;
        const group = engine.getGroup(x, y);
        for (const [sx, sy] of group.stones) seen.add(keyOf(sx, sy));
        if (group.liberties.size !== 1) continue;
        const [lx, ly] = [...group.liberties][0].split(",").map(Number);
        const trial = engine.tryPlay(lx, ly, color);
        if (!trial.ok || trial.captured.length < 1) continue;
        const libs = engine.getGroup(lx, ly, trial.board).liberties.size;
        if (libs < 2) continue;
        if (trial.captured.length > bestN) {
          bestN = trial.captured.length;
          best = { type: "play", x: lx, y: ly, score: 80 + trial.captured.length * 8 };
        }
      }
    }
    return best;
  }

  /** 只在叫吃、提子、逃气里做短阅读，用来发现倒扑和净吃。 */
  tacticalMoves(engine, color) {
    const out = [];
    const seen = new Set();
    for (const u of this.findUrgentMoves(engine, color)) {
      if ((u.urgent || 0) < 18) continue;
      const k = keyOf(u.x, u.y);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(u);
    }
    out.sort((a, b) => b.urgent - a.urgent);
    return out.slice(0, 6);
  }

  tacticalPick(engine, color) {
    const moves = this.tacticalMoves(engine, color);
    if (!moves.length) return null;
    const budget = { n: 0, max: this.cfg.readNodes || 700 };
    let best = null;
    let bestVal = 0;
    for (const m of moves) {
      const trial = engine.tryPlay(m.x, m.y, color);
      if (!trial.ok) continue;
      const child = applyTrial(engine, trial, color, m.x, m.y);
      const reply = this.readTactics(
        child,
        opponent(color),
        this.cfg.readDepth - 1,
        budget
      );
      const val = trial.captured.length * 10 - reply;
      if (val > bestVal) {
        bestVal = val;
        best = { type: "play", x: m.x, y: m.y, score: 40 + val };
      }
      if (budget.n > budget.max) break;
    }
    const need = this.cfg.forceCapture ?? 10;
    if (!best || bestVal < need) return null;
    return best;
  }

  readTactics(engine, color, depth, budget) {
    if (budget.n > budget.max || depth <= 0 || engine.phase !== "playing") return 0;
    const moves = this.tacticalMoves(engine, color);
    if (!moves.length) return 0;
    let best = 0;
    for (const m of moves) {
      budget.n += 1;
      if (budget.n > budget.max) break;
      const trial = engine.tryPlay(m.x, m.y, color);
      if (!trial.ok) continue;
      const child = applyTrial(engine, trial, color, m.x, m.y);
      const reply = this.readTactics(child, opponent(color), depth - 1, budget);
      const val = trial.captured.length * 10 - reply;
      if (val > best) best = val;
    }
    return best;
  }

  /**
   * 征子：走吃之后对方只有一路可逃，且一路追下去能在边上提掉。
   * 返回 true 表示从 (x,y) 开始可以把 (stoneX,stoneY) 所在的对方棋子征吃。
   */
  ladderCaptures(engine, x, y, color, stoneX, stoneY) {
    const opp = opponent(color);
    const trial = engine.tryPlay(x, y, color);
    if (!trial.ok) return false;
    if (trial.board[stoneY][stoneX] !== opp) return trial.captured.length > 0;
    const state = applyTrial(engine, trial, color, x, y);
    return this._ladderChase(state, stoneX, stoneY, color, opp, 0);
  }

  _ladderChase(state, stoneX, stoneY, color, opp, steps) {
    if (steps > 22) return false;
    if (state.board[stoneY][stoneX] !== opp) return true;
    const group = state.getGroup(stoneX, stoneY);
    if (state.toPlay === opp) {
      if (group.liberties.size !== 1) return false;
      const [lx, ly] = [...group.liberties][0].split(",").map(Number);
      if (!state.play(lx, ly).ok) return true;
      return this._ladderChase(state, stoneX, stoneY, color, opp, steps + 1);
    }
    if (group.liberties.size === 1) {
      const [lx, ly] = [...group.liberties][0].split(",").map(Number);
      if (!state.play(lx, ly).ok) return false;
      return this._ladderChase(state, stoneX, stoneY, color, opp, steps + 1);
    }
    if (group.liberties.size > 4) return false;
    for (const lib of group.liberties) {
      const [hx, hy] = lib.split(",").map(Number);
      const t = state.tryPlay(hx, hy, color);
      if (!t.ok) continue;
      const captured = t.board[stoneY][stoneX] !== opp;
      if (!captured && state.getGroup(stoneX, stoneY, t.board).liberties.size !== 1) {
        continue;
      }
      const copy = state.clone();
      if (!copy.play(hx, hy).ok) continue;
      if (this._ladderChase(copy, stoneX, stoneY, color, opp, steps + 1)) return true;
    }
    return false;
  }

  ladderPick(engine, color) {
    const opp = opponent(color);
    const seen = new Set();
    let checked = 0;
    for (let y = 0; y < engine.size; y += 1) {
      for (let x = 0; x < engine.size; x += 1) {
        if (engine.board[y][x] !== opp) continue;
        const k0 = keyOf(x, y);
        if (seen.has(k0)) continue;
        const group = engine.getGroup(x, y);
        for (const [sx, sy] of group.stones) seen.add(keyOf(sx, sy));
        if (group.stones.length > 2 || group.liberties.size !== 2) continue;
        checked += 1;
        if (checked > 8) return null;
        for (const lib of group.liberties) {
          const [lx, ly] = lib.split(",").map(Number);
          if (this.ladderCaptures(engine, lx, ly, color, x, y)) {
            return { type: "play", x: lx, y: ly, score: 70 };
          }
        }
      }
    }
    return null;
  }

  async mctsSelect(engine, priorMoves, sims, timeMs) {
    const rootColor = engine.toPlay;
    const deadline = performance.now() + timeMs;
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

    const maxP = Math.max(...priorMoves.map((m) => m.prior ?? m.score));
    for (const m of root.untried) {
      m.prior = Math.exp(((m.prior ?? m.score) - maxP) / 3.5);
    }

    const strong = (this.cfg.judge || 0) >= 0.85;
    const playoutLen =
      engine.size >= 19 ? (strong ? 16 : 36) : engine.size >= 13 ? (strong ? 24 : 48) : strong ? 32 : 64;
    const childPrior = engine.size >= 19 ? 16 : 22;

    for (let i = 0; i < sims; i++) {
      if (performance.now() > deadline) break;

      let node = root;
      let state = engine;

      while (!node.untried.length && node.children.length) {
        node = this.uctSelect(node);
        state = node.engine;
      }

      if (node.untried.length && state.phase === "playing") {
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
            untried: this.legalPriorMoves(childEngine, childPrior),
            move: { x: move.x, y: move.y, score: move.score ?? move.prior },
            parent: node,
            prior: move.prior || 1,
          };
          node.children.push(child);
          node = child;
          state = childEngine;
        }
      }

      const played = this.playout(state, rootColor, playoutLen);
      const result = played.value;
      let cur = node;
      while (cur) {
        cur.visits += 1;
        cur.value += result;
        cur = cur.parent;
      }
      if (this.cfg.raveK && played.points) {
        for (const child of root.children) {
          if (!child.move) continue;
          for (const p of played.points) {
            if (p.color === rootColor && p.x === child.move.x && p.y === child.move.y) {
              child.raveN = (child.raveN || 0) + 1;
              child.raveW = (child.raveW || 0) + result;
              break;
            }
          }
        }
      }

      if (i % 32 === 31) await sleep(0);
    }

    if (!root.children.length) return priorMoves[0];

    root.children.sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      const va = a.visits ? a.value / a.visits : -1;
      const vb = b.visits ? b.value / b.visits : -1;
      return vb - va;
    });

    let best = root.children[0];
    if (this.cfg.visitRatio && this.cfg.visitRatio < 1 && best.visits > 0) {
      const minV = best.visits * this.cfg.visitRatio;
      const close = root.children.filter((c) => c.visits >= minV && c.visits > 0);
      close.sort((a, b) => b.value / b.visits - a.value / a.visits);
      if (close.length) best = close[0];
    }
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
    // PUCT + RAVE：先验和快速走子的胜率一起分配模拟
    const c = this.cfg.explore ?? 1.45;
    const raveK = this.cfg.raveK || 0;
    let best = null;
    let bestScore = -Infinity;
    for (const child of node.children) {
      const n = child.visits;
      const wr = n ? child.value / n : 0;
      const rn = child.raveN || 0;
      const rr = rn ? child.raveW / rn : wr;
      let exploit = wr;
      if (raveK && rn) {
        const beta = Math.sqrt(raveK / (3 * n + raveK));
        exploit = (1 - beta) * wr + beta * rr;
      }
      const explore =
        c *
        child.prior *
        (Math.sqrt(node.visits + 1) / (1 + child.visits));
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
    const captures = urgents.filter((u) => u.urgent >= 40);
    const base = captures.length
      ? captures
      : [...urgents, ...this.collectCandidates(engine, limit)];
    const scored = [];
    const seen = new Set();
    for (const m of base) {
      const x = m.x ?? m[0];
      const y = m.y ?? m[1];
      const k = keyOf(x, y);
      if (seen.has(k)) continue;
      seen.add(k);
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      const score =
        this.evaluateMove(engine, x, y, color, trial) + (m.urgent || 0);
      scored.push({ x, y, score, prior: Math.exp(score / 4) });
      if (scored.length >= limit * 2) break;
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  playout(engine, rootColor, maxMoves) {
    const state = lightState(engine);
    const points = [];

    let passes = state.consecutivePasses;
    for (let i = 0; i < maxMoves; i++) {
      if (state.phase !== "playing") break;
      const move = this.policyMove(state);
      if (!move) {
        state.pass();
        passes += 1;
      } else {
        const color = state.toPlay;
        const res = state.play(move.x, move.y);
        if (!res.ok) {
          state.pass();
          passes += 1;
        } else {
          passes = 0;
          points.push({ color, x: move.x, y: move.y });
        }
      }
      if (passes >= 2) break;
      if (state.positionHistory.length > 10) {
        state.positionHistory = state.positionHistory.slice(-6);
      }
    }

    return { value: this.quickScore(state, rootColor), points };
  }

  policyMove(engine) {
    const color = engine.toPlay;
    const opp = opponent(color);
    const board = engine.board;
    const pool = [];
    const seen = new Set();
    const add = (x, y, urgent = 0) => {
      if (!engine.inBounds(x, y) || board[y][x]) return;
      const k = keyOf(x, y);
      if (seen.has(k)) return;
      seen.add(k);
      pool.push({ x, y, urgent });
    };
    if (engine.lastMove && !engine.lastMove.pass) {
      const { x, y } = engine.lastMove;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) add(x + dx, y + dy);
      }
    }
    for (const u of this.findLibertyTargets(engine, 1)) add(u.x, u.y, 40);
    if (pool.length < 6) {
      for (let i = 0; i < 10; i += 1) {
        add(Math.floor(Math.random() * engine.size), Math.floor(Math.random() * engine.size));
      }
    }
    const legal = [];
    for (const m of pool) {
      const x = m.x;
      const y = m.y;
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      let s = trial.captured.length * 14 + (m.urgent || 0);
      const self = engine.getGroup(x, y, trial.board);
      s += Math.min(self.liberties.size, 5) * 1.2;
      if (self.liberties.size === 1) s -= 10;
      if ((this.cfg.judge || 0) >= 0.6 && trial.captured.length === 0) {
        let ownR = 0;
        let oppR = 0;
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (!engine.inBounds(nx, ny)) continue;
            if (engine.board[ny][nx] === color) ownR += 1;
            else if (engine.board[ny][nx] === opp) oppR += 1;
          }
        }
        if (ownR >= 6 && oppR === 0) s -= 14;
        else if (oppR >= 2 && ownR <= 2) s += 3;
      }
      for (const [nx, ny] of engine.neighbors(x, y)) {
        if (trial.board[ny][nx] !== opp) continue;
        const g = engine.getGroup(nx, ny, trial.board);
        if (g.liberties.size === 1) s += 10 + g.stones.length;
      }
      legal.push({ x, y, s });
    }
    if (!legal.length) return null;
    legal.sort((a, b) => b.s - a.s);
    const top = legal.slice(0, Math.min(4, legal.length));
    // 偏置最强着，减少胡走
    const decay = this.cfg.policyDecay ?? 0.55;
    const weights = top.map((_, i) => Math.pow(decay, i));
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < top.length; i++) {
      r -= weights[i];
      if (r <= 0) return top[i];
    }
    return top[0];
  }

  quickScore(engine, rootColor) {
    const board = engine.board;
    const size = engine.size;
    let black = engine.captures[BLACK];
    let white = engine.captures[WHITE] + engine.komi;
    const useInf = (this.cfg.judge || 0) >= 0.45;

    if (useInf) {
      const inf = this.buildInfluence(board, size);
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const v = board[y][x];
          if (v === BLACK) black += 1;
          else if (v === WHITE) white += 1;
          else {
            const influence = inf[y * size + x];
            const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
            const edgeWeight = edge <= 1 ? 1 : edge === 2 ? 0.85 : edge === 3 ? 0.6 : edge === 4 ? 0.35 : 0.12;
            if (influence > 0.08) black += edgeWeight * Math.min(1, (influence - 0.08) / 0.45);
            else if (influence < -0.08) white += edgeWeight * Math.min(1, (-influence - 0.08) / 0.45);
          }
        }
      }
    } else {
      const visited = Array.from({ length: size }, () => Array(size).fill(false));
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (board[y][x] === BLACK) black += 1;
          else if (board[y][x] === WHITE) white += 1;
        }
      }
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
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
    }

    const rootScore = rootColor === BLACK ? black : white;
    const other = rootColor === BLACK ? white : black;
    if (!useInf) {
      if (rootScore > other) return 1;
      if (rootScore < other) return 0;
      return 0.5;
    }
    const diff = rootScore - other;
    return 0.5 + Math.max(-0.48, Math.min(0.48, diff / (size * size * 0.35)));
  }
}

export const AI_DIFFICULTIES = Object.keys(DIFFICULTY);

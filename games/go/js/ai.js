/**
 * 浏览器端围棋 AI（支持 9 / 13 / 19 路）
 * - 入门：启发式（偏随机）
 * - 普通及以上：启发式先验 + 限时 MCTS（越高等级搜索越深）
 */

import { BLACK, WHITE, opponent, GoEngine } from "./engine.js";

/**
 * 难度配置
 * sims: MCTS 基准模拟次数（大棋盘会提高，并由 timeMs 封顶）
 * timeMs: 思考时间预算（毫秒）
 */
const DIFFICULTY = {
  easy: {
    label: "入门",
    noise: 0.55,
    topN: 8,
    depth: 0,
    sims: 0,
    priorTop: 28,
    thinkMs: 120,
    timeMs: { 9: 180, 13: 220, 19: 280 },
  },
  medium: {
    label: "普通",
    noise: 0.1,
    topN: 2,
    depth: 1,
    sims: 600,
    priorTop: 32,
    thinkMs: 80,
    timeMs: { 9: 900, 13: 1400, 19: 2000 },
  },
  hard: {
    label: "进阶",
    noise: 0.02,
    topN: 1,
    depth: 1,
    sims: 2200,
    priorTop: 40,
    thinkMs: 60,
    timeMs: { 9: 2200, 13: 3500, 19: 5000 },
  },
  expert: {
    label: "专家",
    noise: 0,
    topN: 1,
    depth: 2,
    sims: 4500,
    priorTop: 48,
    thinkMs: 40,
    timeMs: { 9: 4000, 13: 6500, 19: 9000 },
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
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : "medium";
    this.cfg = DIFFICULTY[this.difficulty];
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
    const urgents = this.findUrgentMoves(engine, color);
    const captures = urgents.filter((u) => u.urgent >= 40);

    // 必提优先；逃气则与全局候选混合（大棋盘尤其需要）
    let seedMoves;
    if (captures.length) {
      seedMoves = captures;
    } else {
      const global = this.collectCandidates(engine, plan.candLimit);
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
      if (this.cfg.depth >= 1) {
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

    const playoutLen = engine.size >= 19 ? 36 : engine.size >= 13 ? 48 : 64;
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

      const result = this.playout(state, rootColor, playoutLen);
      let cur = node;
      while (cur) {
        cur.visits += 1;
        cur.value += result;
        cur = cur.parent;
      }

      if (i % 32 === 31) await sleep(0);
    }

    if (!root.children.length) return priorMoves[0];

    // 访问次数优先，专家再参考胜率
    root.children.sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      const va = a.visits ? a.value / a.visits : -1;
      const vb = b.visits ? b.value / b.visits : -1;
      return vb - va;
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
    // PUCT：先验越强越优先尝试
    const c =
      this.difficulty === "expert"
        ? 1.25
        : this.difficulty === "hard"
          ? 1.4
          : 1.55;
    let best = null;
    let bestScore = -Infinity;
    for (const child of node.children) {
      const exploit = child.visits ? child.value / child.visits : 0;
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
      if (state.positionHistory.length > 10) {
        state.positionHistory = state.positionHistory.slice(-6);
      }
    }

    return this.quickScore(state, rootColor);
  }

  policyMove(engine) {
    const color = engine.toPlay;
    const urgents = this.findUrgentMoves(engine, color);
    const captures = urgents.filter((u) => u.urgent >= 40);
    const pool = captures.length
      ? captures
      : urgents.length
        ? urgents
        : [
            ...this.findLibertyTargets(engine, 2),
            ...this.collectCandidates(engine, engine.size >= 19 ? 24 : 20),
          ];
    const legal = [];
    const seen = new Set();
    for (const m of pool) {
      const x = m.x ?? m[0];
      const y = m.y ?? m[1];
      const k = keyOf(x, y);
      if (seen.has(k)) continue;
      seen.add(k);
      const trial = engine.tryPlay(x, y, color);
      if (!trial.ok) continue;
      let s = trial.captured.length * 14 + (m.urgent || 0);
      const self = engine.getGroup(x, y, trial.board);
      s += Math.min(self.liberties.size, 5) * 1.2;
      if (self.liberties.size === 1) s -= 10;
      // 快速叫吃分
      const opp = opponent(color);
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
    const weights = top.map((_, i) => Math.pow(0.55, i));
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

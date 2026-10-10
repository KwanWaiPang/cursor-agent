/**
 * 围棋规则引擎（中国规则：子空皆地，禁自杀）
 * - 劫争只认简单劫：不能立刻回提。更早出现过的局面可以再下。
 * - 连续两次停着会进入点目；对局中也可以直接标死子或点目。
 */

export const BLACK = 1;
export const WHITE = 2;

export function opponent(color) {
  return color === BLACK ? WHITE : BLACK;
}

export function colorName(color) {
  return color === BLACK ? "黑" : "白";
}

/** 仍在盘上的子，标它是第几手落下的。停着不占号，提掉的子不再标。 */
export function stoneOrderNumbers(engine) {
  const numbers = Array.from({ length: engine.size }, () => Array(engine.size).fill(0));
  let n = 0;
  for (const move of engine.moveHistory) {
    if (move.type !== "play") continue;
    n += 1;
    for (const [x, y] of move.captured || []) {
      if (numbers[y]) numbers[y][x] = 0;
    }
    if (numbers[move.y]) numbers[move.y][move.x] = n;
  }
  return numbers;
}

function keyOf(x, y) {
  return `${x},${y}`;
}

export class GoEngine {
  constructor(size = 19, komi = 7.5, options = {}) {
    this.size = size;
    this.komi = komi;
    this.autoDead = options.autoDead !== false;
    this._history = [];
    this.reset();
  }

  /** 有序局面栈，供悔棋、搜索截断，以及简单劫（对照上上手的局面）。 */
  get positionHistory() {
    return this._history;
  }

  set positionHistory(list) {
    this._history = Array.isArray(list) ? list.slice() : [];
  }

  _pushPosition(hash) {
    this._history.push(hash);
  }

  _popPosition() {
    this._history.pop();
    return this._history[this._history.length - 1];
  }

  /** 简单劫：这一手若把棋盘还原成上上手的局面，就是立刻回提，不允许。 */
  _koForbidden(hash) {
    if (this._history.length < 2) return false;
    return hash === this._history[this._history.length - 2];
  }

  reset() {
    this.board = Array.from({ length: this.size }, () =>
      Array(this.size).fill(0)
    );
    this.toPlay = BLACK;
    this.captures = { [BLACK]: 0, [WHITE]: 0 };
    this.moveHistory = [];
    this.positionHistory = [this.serialize()];
    this.consecutivePasses = 0;
    this.phase = "playing"; // playing | scoring | finished
    this.deadMarks = new Set();
    this.result = null;
    this.lastMove = null; // {x,y} | {pass:true}
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  neighbors(x, y) {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const out = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.inBounds(nx, ny)) out.push([nx, ny]);
    }
    return out;
  }

  serialize(board = this.board) {
    return board.map((row) => row.join("")).join("/");
  }

  cloneBoard(board = this.board) {
    return board.map((row) => row.slice());
  }

  getGroup(x, y, board = this.board) {
    const color = board[y][x];
    if (!color) return { stones: [], liberties: new Set() };

    const stones = [];
    const liberties = new Set();
    const seen = new Set();
    const stack = [[x, y]];
    seen.add(keyOf(x, y));

    while (stack.length) {
      const [cx, cy] = stack.pop();
      stones.push([cx, cy]);
      for (const [nx, ny] of this.neighbors(cx, cy)) {
        const v = board[ny][nx];
        if (v === 0) {
          liberties.add(keyOf(nx, ny));
        } else if (v === color) {
          const k = keyOf(nx, ny);
          if (!seen.has(k)) {
            seen.add(k);
            stack.push([nx, ny]);
          }
        }
      }
    }

    return { stones, liberties };
  }

  /**
   * 模拟落子，返回 {ok, reason, board, captured}
   */
  tryPlay(x, y, color = this.toPlay) {
    if (this.phase !== "playing") {
      return { ok: false, reason: "对局已结束或正在点目" };
    }
    if (!this.inBounds(x, y)) {
      return { ok: false, reason: "坐标越界" };
    }
    if (this.board[y][x] !== 0) {
      return { ok: false, reason: "此处已有棋子" };
    }

    const next = this.cloneBoard();
    next[y][x] = color;
    const opp = opponent(color);
    const captured = [];
    const removed = new Set();

    for (const [nx, ny] of this.neighbors(x, y)) {
      if (next[ny][nx] !== opp) continue;
      const nk = keyOf(nx, ny);
      if (removed.has(nk)) continue;
      const group = this.getGroup(nx, ny, next);
      if (group.liberties.size === 0) {
        for (const [gx, gy] of group.stones) {
          next[gy][gx] = 0;
          removed.add(keyOf(gx, gy));
          captured.push([gx, gy]);
        }
      }
    }

    const self = this.getGroup(x, y, next);
    if (self.liberties.size === 0) {
      return { ok: false, reason: "禁着点（自杀）" };
    }

    const serialized = this.serialize(next);
    if (this._koForbidden(serialized)) {
      return { ok: false, reason: "禁着点（劫争，不能立刻回提）" };
    }

    return { ok: true, board: next, captured, serialized };
  }

  isLegal(x, y, color = this.toPlay) {
    return this.tryPlay(x, y, color).ok;
  }

  play(x, y) {
    const trial = this.tryPlay(x, y);
    if (!trial.ok) return trial;

    const color = this.toPlay;
    this.board = trial.board;
    this.captures[color] += trial.captured.length;
    this.moveHistory.push({
      type: "play",
      x,
      y,
      color,
      captured: trial.captured,
      prevBoard: this.positionHistory[this.positionHistory.length - 1],
    });
    this._pushPosition(trial.serialized);
    this.consecutivePasses = 0;
    this.lastMove = { x, y, color };
    this.toPlay = opponent(color);
    return { ok: true, captured: trial.captured };
  }

  pass() {
    if (this.phase !== "playing") {
      return { ok: false, reason: "当前不能停着" };
    }
    const color = this.toPlay;
    this.moveHistory.push({ type: "pass", color });
    this.consecutivePasses += 1;
    this.lastMove = { pass: true, color };
    this.toPlay = opponent(color);

    if (this.consecutivePasses >= 2) this.beginScoring();
    return { ok: true, scoring: this.phase === "scoring" };
  }

  resign(color = this.toPlay) {
    if (this.phase !== "playing") {
      return { ok: false, reason: "当前不能认输" };
    }
    const loser = color;
    const winner = opponent(loser);
    this.phase = "finished";
    this.result = {
      type: "resign",
      winner,
      text: `${colorName(winner)}胜（${colorName(loser)}认输）`,
    };
    return { ok: true, result: this.result };
  }

  /** 深拷贝当前局面，供 AI 搜索使用 */
  clone() {
    const g = new GoEngine(this.size, this.komi, {
      autoDead: this.autoDead,
    });
    g.board = this.cloneBoard();
    g.toPlay = this.toPlay;
    g.captures = { [BLACK]: this.captures[BLACK], [WHITE]: this.captures[WHITE] };
    g.moveHistory = this.moveHistory.map((m) => ({
      ...m,
      captured: m.captured ? m.captured.map(([x, y]) => [x, y]) : undefined,
    }));
    g.positionHistory = this.positionHistory.slice();
    g.consecutivePasses = this.consecutivePasses;
    g.phase = this.phase;
    g.deadMarks = new Set(this.deadMarks);
    g.result = this.result ? { ...this.result } : null;
    g.lastMove = this.lastMove ? { ...this.lastMove } : null;
    return g;
  }

  undo() {
    if (this.phase === "finished" && this.result?.type === "resign") {
      // 撤销认输
      this.phase = "playing";
      this.result = null;
      return { ok: true };
    }
    if (this.phase === "scoring" || (this.phase === "finished" && this.result?.type === "score")) {
      // 离开点目，回到对局。连着的停着一并拿掉，已经落下的子留着。
      this.phase = "playing";
      this.result = null;
      this.deadMarks = new Set();
      while (
        this.moveHistory.length &&
        this.consecutivePasses > 0 &&
        this.moveHistory[this.moveHistory.length - 1].type === "pass"
      ) {
        this._undoOne();
      }
      return { ok: true };
    }
    if (!this.moveHistory.length) {
      return { ok: false, reason: "没有可悔的棋" };
    }
    return this._undoOne();
  }

  _undoOne() {
    const move = this.moveHistory.pop();
    if (!move) return { ok: false, reason: "没有可悔的棋" };

    if (move.type === "pass") {
      this.consecutivePasses = Math.max(0, this.consecutivePasses - 1);
      this.toPlay = move.color;
      this.lastMove = this._rebuildLastMove();
      return { ok: true };
    }

    // restore board from previous serialized position
    const prev = this._popPosition();
    this.board = prev.split("/").map((row) =>
      row.split("").map((ch) => Number(ch))
    );
    this.captures[move.color] -= move.captured.length;
    this.toPlay = move.color;
    this.consecutivePasses = 0;
    this.lastMove = this._rebuildLastMove();
    return { ok: true };
  }

  _rebuildLastMove() {
    for (let i = this.moveHistory.length - 1; i >= 0; i--) {
      const m = this.moveHistory[i];
      if (m.type === "pass") return { pass: true, color: m.color };
      return { x: m.x, y: m.y, color: m.color };
    }
    return null;
  }

  toggleDead(x, y) {
    if (this.phase !== "scoring") return { ok: false };
    if (!this.inBounds(x, y) || this.board[y][x] === 0) {
      return { ok: false, reason: "请点击棋子标记死子" };
    }
    const { stones } = this.getGroup(x, y);
    const keys = stones.map(([sx, sy]) => keyOf(sx, sy));
    const allDead = keys.every((k) => this.deadMarks.has(k));
    if (allDead) {
      keys.forEach((k) => this.deadMarks.delete(k));
    } else {
      keys.forEach((k) => this.deadMarks.add(k));
    }
    return { ok: true };
  }

  clearDeadMarks() {
    if (this.phase !== "scoring") return { ok: false };
    this.deadMarks = new Set();
    return { ok: true };
  }

  listGroups(board = this.board) {
    const seen = new Set();
    const groups = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const c = board[y][x];
        if (!c) continue;
        const k = keyOf(x, y);
        if (seen.has(k)) continue;
        const g = this.getGroup(x, y, board);
        for (const [sx, sy] of g.stones) seen.add(keyOf(sx, sy));
        groups.push({ color: c, ...g });
      }
    }
    return groups;
  }

  /**
   * 粗略数“真眼”：被己方围住的单点空，且对角不太危险
   */
  countApproxEyes(group, board = this.board) {
    const color = group.color ?? board[group.stones[0][1]][group.stones[0][0]];
    const stoneSet = new Set(group.stones.map(([x, y]) => keyOf(x, y)));
    let eyes = 0;
    for (const lk of group.liberties) {
      const [x, y] = lk.split(",").map(Number);
      let own = 0;
      let enemy = 0;
      let empty = 0;
      const neigh = this.neighbors(x, y);
      for (const [nx, ny] of neigh) {
        const v = board[ny][nx];
        if (v === color || stoneSet.has(keyOf(nx, ny))) own += 1;
        else if (v === 0) empty += 1;
        else enemy += 1;
      }
      // 单点眼：四周都是己方（或盘外）
      if (enemy === 0 && empty === 0 && own === neigh.length) {
        // 假眼检查：对角被对方占据过多
        let diagEnemy = 0;
        let diagTotal = 0;
        for (const [dx, dy] of [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (!this.inBounds(nx, ny)) continue;
          diagTotal += 1;
          if (board[ny][nx] && board[ny][nx] !== color) diagEnemy += 1;
        }
        // 角上和边上，一个对角敌子就是假眼；中腹要两个对角敌子才算假眼。
        const falseEye =
          diagTotal <= 1 ? diagEnemy >= 1 : diagTotal === 2 ? diagEnemy >= 1 : diagEnemy >= 2;
        if (!falseEye) eyes += 1;
      }
    }
    return eyes;
  }

  /**
   * 影响力图：正值偏黑，负值偏白
   */
  computeInfluence(deadSet = this.deadMarks) {
    const size = this.size;
    const inf = Array.from({ length: size }, () => Array(size).fill(0));
    const decay = size >= 19 ? 0.62 : size >= 13 ? 0.66 : 0.7;
    const radius = size >= 19 ? 4 : 3;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const c = this.board[y][x];
        if (!c || deadSet.has(keyOf(x, y))) continue;
        const sign = c === BLACK ? 1 : -1;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (!this.inBounds(nx, ny)) continue;
            if (this.board[ny][nx] && !deadSet.has(keyOf(nx, ny))) continue;
            const dist = Math.abs(dx) + Math.abs(dy);
            if (dist > radius) continue;
            inf[ny][nx] += sign * Math.pow(decay, dist);
          }
        }
      }
    }
    return inf;
  }

  /**
   * 自动标记死子（启发式，可手动改）
   * - 一气棋块默认死
   * - 无明显两眼且处在对方势力中的棋块标死
   * - 迭代：删去死子后再评估被围在对方实地里的残子
   */
  autoMarkDead() {
    const entered = this.phase === "playing";
    if (entered) this.phase = "scoring";
    if (this.phase !== "scoring" && this.phase !== "finished") {
      return { ok: false, reason: "对局已结束" };
    }

    this.deadMarks = new Set();
    const markGroup = (g) => {
      for (const [x, y] of g.stones) this.deadMarks.add(keyOf(x, y));
    };

    // 多轮迭代，逐步识别被围死子
    for (let round = 0; round < 3; round++) {
      const aliveBoard = this.cloneBoard();
      for (const k of this.deadMarks) {
        const [x, y] = k.split(",").map(Number);
        aliveBoard[y][x] = 0;
      }

      const groups = this.listGroups(aliveBoard);
      const influence = this.computeInfluence(this.deadMarks);
      let added = 0;

      for (const g of groups) {
        const already = g.stones.every(([x, y]) =>
          this.deadMarks.has(keyOf(x, y))
        );
        if (already) continue;

        const eyes = this.countApproxEyes(g, aliveBoard);
        if (eyes >= 2) continue; // 有两眼，视为活棋
        if (this.looksLikeSeki(g, aliveBoard)) continue;

        // 终局一气：死
        if (g.liberties.size <= 1) {
          markGroup(g);
          added += 1;
          continue;
        }

        // 气很少且几乎无眼
        if (g.liberties.size <= 2 && eyes === 0) {
          // 是否被对方完全贴住
          let touchOpp = 0;
          let touchOwn = 0;
          for (const [x, y] of g.stones) {
            for (const [nx, ny] of this.neighbors(x, y)) {
              const v = aliveBoard[ny][nx];
              if (v === g.color) touchOwn += 1;
              else if (v && v !== g.color) touchOpp += 1;
            }
          }
          if (touchOpp >= touchOwn) {
            markGroup(g);
            added += 1;
            continue;
          }
        }

        // 影响力：棋块落在对方强势区域
        let sum = 0;
        for (const [x, y] of g.stones) sum += influence[y][x];
        const avg = sum / g.stones.length;
        const against =
          g.color === BLACK ? avg < -0.55 : avg > 0.55;
        if (against && eyes === 0 && g.liberties.size <= 4) {
          markGroup(g);
          added += 1;
          continue;
        }

        // 被围在“单一对方颜色”空区中的残子
        if (eyes === 0 && this.isEnclosedByOpponent(g, aliveBoard)) {
          markGroup(g);
          added += 1;
        }
      }

      if (!added) break;
    }

    return { ok: true, count: this.deadMarks.size, entered };
  }

  /**
   * 双方气都只在同一小片公共空上，谁先填谁就被提，终局算双活。
   * 只认 1 到 3 口气，避免把大空误判成活棋。
   */
  looksLikeSeki(group, board = this.board) {
    const libs = group.liberties;
    if (!libs || libs.size < 1 || libs.size > 3) return false;
    const color = group.color ?? board[group.stones[0][1]][group.stones[0][0]];
    const opp = opponent(color);
    if (this.countApproxEyes(group, board) >= 2) return false;

    const oppGroups = [];
    const seen = new Set();
    for (const lk of libs) {
      const [x, y] = lk.split(",").map(Number);
      let touched = false;
      for (const [nx, ny] of this.neighbors(x, y)) {
        if (board[ny][nx] !== opp) continue;
        touched = true;
        const mark = keyOf(nx, ny);
        if (seen.has(mark)) continue;
        const other = this.getGroup(nx, ny, board);
        for (const [sx, sy] of other.stones) seen.add(keyOf(sx, sy));
        oppGroups.push(other);
      }
      if (!touched) return false;
    }
    if (!oppGroups.length) return false;

    for (const lk of libs) {
      if (!oppGroups.some((other) => other.liberties.has(lk))) return false;
    }
    for (const other of oppGroups) {
      if (this.countApproxEyes({ color: opp, ...other }, board) >= 2) return false;
      for (const lk of other.liberties) {
        if (!libs.has(lk)) return false;
      }
    }
    for (const lk of libs) {
      const [x, y] = lk.split(",").map(Number);
      const selfTry = this._canFill(board, x, y, color);
      const oppTry = this._canFill(board, x, y, opp);
      if (selfTry.ok && selfTry.captured?.length) return false;
      if (oppTry.ok && oppTry.captured?.length) return false;
    }
    return true;
  }

  _canFill(board, x, y, color) {
    const probe = new GoEngine(this.size, this.komi, { autoDead: false });
    probe.board = board.map((row) => row.slice());
    probe.toPlay = color;
    probe.phase = "playing";
    probe.positionHistory = [probe.serialize()];
    return probe.tryPlay(x, y, color);
  }

  /**
   * 棋块的所有气点所属空区，是否都只被对方（+自身）包围
   */
  isEnclosedByOpponent(group, board) {
    const color = group.color;
    const opp = opponent(color);
    const stoneSet = new Set(group.stones.map(([x, y]) => keyOf(x, y)));

    for (const lk of group.liberties) {
      const [sx, sy] = lk.split(",").map(Number);
      // flood empty region from this liberty
      const seen = new Set([lk]);
      const q = [[sx, sy]];
      const borders = new Set();
      while (q.length) {
        const [cx, cy] = q.pop();
        for (const [nx, ny] of this.neighbors(cx, cy)) {
          const v = board[ny][nx];
          if (v === 0) {
            const k = keyOf(nx, ny);
            if (!seen.has(k)) {
              seen.add(k);
              q.push([nx, ny]);
            }
          } else if (!stoneSet.has(keyOf(nx, ny))) {
            borders.add(v);
          }
        }
      }
      // 若空区还碰到己方其他子，则不是被单独围杀
      if (borders.has(color)) return false;
      if (!borders.has(opp) && borders.size > 0) return false;
      // 很大的公共空（中腹）不判死
      if (seen.size > Math.max(8, Math.floor(this.size * 1.2))) return false;
    }
    return group.liberties.size > 0;
  }

  /** 进入点目。自动判断可关；已经在点目时只刷新预览，不抹掉手动标记。 */
  beginScoring() {
    if (this.phase === "finished" && this.result?.type === "resign") {
      return { ok: false, reason: "对局已结束" };
    }
    const entered = this.phase === "playing";
    if (entered) {
      this.phase = "scoring";
      this.deadMarks = new Set();
      if (this.autoDead) this.autoMarkDead();
    }
    return { ok: true, entered, preview: this.scorePreview() };
  }

  /**
   * 中国规则数子：存活子 + 独占空点；白贴目。
   * 死子先从盘上拿走，那些交叉点若被一方围住就计入该方空点。
   * 提子数不另加。双活的公共气两边都挨着，不算任何一方的地。
   */
  analyzeArea() {
    const working = this.cloneBoard();
    const territoryMap = Array.from({ length: this.size }, () => Array(this.size).fill(0));
    const removed = { [BLACK]: 0, [WHITE]: 0 };
    for (const k of this.deadMarks) {
      const [x, y] = k.split(",").map(Number);
      const c = working[y]?.[x];
      if (c) {
        removed[c] += 1;
        working[y][x] = 0;
      }
    }

    const territory = { [BLACK]: 0, [WHITE]: 0 };
    const visited = Array.from({ length: this.size }, () => Array(this.size).fill(false));

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (working[y][x] !== 0 || visited[y][x]) continue;

        const queue = [[x, y]];
        const empties = [];
        const borders = new Set();
        visited[y][x] = true;

        while (queue.length) {
          const [cx, cy] = queue.shift();
          empties.push([cx, cy]);
          for (const [nx, ny] of this.neighbors(cx, cy)) {
            const v = working[ny][nx];
            if (v === 0) {
              if (!visited[ny][nx]) {
                visited[ny][nx] = true;
                queue.push([nx, ny]);
              }
            } else {
              borders.add(v);
            }
          }
        }

        if (borders.size === 1) {
          const owner = [...borders][0];
          territory[owner] += empties.length;
          for (const [ex, ey] of empties) territoryMap[ey][ex] = owner;
        }
      }
    }

    let blackStones = 0;
    let whiteStones = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (working[y][x] === BLACK) blackStones += 1;
        if (working[y][x] === WHITE) whiteStones += 1;
      }
    }

    const blackScore = blackStones + territory[BLACK];
    const whiteScore = whiteStones + territory[WHITE] + this.komi;

    let winner = null;
    let text;
    if (blackScore > whiteScore) {
      winner = BLACK;
      text = `黑胜 ${(blackScore - whiteScore).toFixed(1)} 子`;
    } else if (whiteScore > blackScore) {
      winner = WHITE;
      text = `白胜 ${(whiteScore - blackScore).toFixed(1)} 子`;
    } else {
      text = "和棋";
    }

    return {
      winner,
      text,
      blackScore,
      whiteScore,
      territory,
      territoryMap,
      stones: { [BLACK]: blackStones, [WHITE]: whiteStones },
      removed,
    };
  }

  /** 确认前的着色预览。不结束对局。 */
  scorePreview() {
    return this.analyzeArea();
  }

  /**
   * 中国规则数子：存活子 + 独占空点；白贴目。
   * 提子只作记录，不另加进这个结果。
   */
  score() {
    if (this.phase === "playing") {
      this.phase = "scoring";
      this.deadMarks = new Set();
      if (this.autoDead) this.autoMarkDead();
    }
    if (this.phase !== "scoring" && this.phase !== "finished") {
      return { ok: false, reason: "对局已结束" };
    }

    const area = this.analyzeArea();
    this.phase = "finished";
    this.result = { type: "score", ...area };
    return { ok: true, result: this.result };
  }

  starPoints() {
    const s = this.size;
    if (s === 9) return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
    if (s === 13) {
      return [
        [3, 3],
        [3, 6],
        [3, 9],
        [6, 3],
        [6, 6],
        [6, 9],
        [9, 3],
        [9, 6],
        [9, 9],
      ];
    }
    if (s !== 19) return [];
    const pts = [3, 9, 15];
    const out = [];
    for (const y of pts) for (const x of pts) out.push([x, y]);
    return out;
  }
}

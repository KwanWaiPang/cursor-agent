/**
 * 围棋规则引擎（中国规则思路：子空皆地）
 * - 落子、提子、禁自杀、禁止同形再现（超劫）
 * - 连续两次停着进入点目；可标记死子后计分
 */

export const BLACK = 1;
export const WHITE = 2;

export function opponent(color) {
  return color === BLACK ? WHITE : BLACK;
}

export function colorName(color) {
  return color === BLACK ? "黑" : "白";
}

function keyOf(x, y) {
  return `${x},${y}`;
}

export class GoEngine {
  constructor(size = 19, komi = 7.5) {
    this.size = size;
    this.komi = komi;
    this.reset();
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
    if (this.positionHistory.includes(serialized)) {
      return { ok: false, reason: "禁着点（同形再现 / 劫争）" };
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
    this.positionHistory.push(trial.serialized);
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

    if (this.consecutivePasses >= 2) {
      this.phase = "scoring";
      this.deadMarks = new Set();
    }
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
    const g = new GoEngine(this.size, this.komi);
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
    if (!this.moveHistory.length) {
      return { ok: false, reason: "没有可悔的棋" };
    }
    if (this.phase === "scoring" || this.phase === "finished") {
      // 从点目回到对局：撤销最后一次停着，并再撤销前一次停着（若存在）
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
    this.positionHistory.pop();
    const prev = this.positionHistory[this.positionHistory.length - 1];
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

  /**
   * 中国规则数子：存活子 + 独占空点；白贴目
   */
  score() {
    if (this.phase !== "scoring" && this.phase !== "finished") {
      return { ok: false, reason: "请先双方停着进入点目" };
    }

    const working = this.cloneBoard();
    // 死子移除并计入对方提子（展示用）
    const removed = { [BLACK]: 0, [WHITE]: 0 };
    for (const k of this.deadMarks) {
      const [x, y] = k.split(",").map(Number);
      const c = working[y][x];
      if (c) {
        removed[c] += 1;
        working[y][x] = 0;
      }
    }

    const territory = { [BLACK]: 0, [WHITE]: 0 };
    const visited = Array.from({ length: this.size }, () =>
      Array(this.size).fill(false)
    );

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
      text = `黑胜 ${((blackScore - whiteScore)).toFixed(1)} 子`;
    } else if (whiteScore > blackScore) {
      winner = WHITE;
      text = `白胜 ${((whiteScore - blackScore)).toFixed(1)} 子`;
    } else {
      text = "和棋";
    }

    this.phase = "finished";
    this.result = {
      type: "score",
      winner,
      text,
      blackScore,
      whiteScore,
      territory,
      stones: { [BLACK]: blackStones, [WHITE]: whiteStones },
      removed,
    };
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
    // 19
    const pts = [3, 9, 15];
    const out = [];
    for (const y of pts) for (const x of pts) out.push([x, y]);
    return out;
  }
}

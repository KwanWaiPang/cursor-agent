/**
 * 分级解题 / 官子练习。题目见 problems.js。
 * 进度存在 localStorage，测试可传入内存对象。
 */

import { BLACK, WHITE, GoEngine } from "./engine.js";
import { PROBLEMS, TRACKS } from "./problems.js";

const STORAGE_KEY = "go-hub-drill-v1";

export { PROBLEMS, TRACKS };

export function loadProgress() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { solved: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return { solved: {} };
    if (!data.solved || typeof data.solved !== "object") data.solved = {};
    return data;
  } catch {
    return { solved: {} };
  }
}

export function saveProgress(progress) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* private mode */
  }
}

export function problemsOf(track, level) {
  return PROBLEMS.filter((p) => p.track === track && p.level === level);
}

export function trackById(id) {
  return TRACKS.find((t) => t.id === id) || TRACKS[0];
}

export function isLevelUnlocked() {
  return true;
}

export function levelCleared(track, level, progress) {
  const list = problemsOf(track, level);
  return list.length > 0 && list.every((p) => progress?.solved?.[p.id]);
}

export function loadPosition(problem) {
  const g = new GoEngine(problem.size, 0);
  for (const [x, y] of problem.black) g.board[y][x] = BLACK;
  for (const [x, y] of problem.white) g.board[y][x] = WHITE;
  g.toPlay = problem.toPlay;
  g.positionHistory = [g.serialize()];
  g.captures = { [BLACK]: 0, [WHITE]: 0 };
  return g;
}

/** Crop to the relevant corner while keeping a real board edge when it matters. */
export function viewFor(problem) {
  const size = problem.size;
  let x0 = size;
  let y0 = size;
  let x1 = 0;
  let y1 = 0;
  const consider = (x, y) => {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  };
  for (const [x, y] of problem.black) consider(x, y);
  for (const [x, y] of problem.white) consider(x, y);
  const walk = (moves) => {
    for (const m of moves || []) {
      consider(m.x, m.y);
      walk(m.replies);
    }
  };
  walk(problem.moves);
  if (x1 < x0 || y1 < y0) return null;
  x0 = Math.max(0, x0 - 2);
  y0 = Math.max(0, y0 - 2);
  x1 = Math.min(size - 1, x1 + 2);
  y1 = Math.min(size - 1, y1 + 2);
  if (x0 <= 2) x0 = 0;
  if (y0 <= 2) y0 = 0;
  if (x1 >= size - 3) x1 = size - 1;
  if (y1 >= size - 3) y1 = size - 1;
  while (x1 - x0 < 6 && (x0 > 0 || x1 < size - 1)) {
    if (x0 > 0) x0 -= 1;
    if (x1 - x0 < 6 && x1 < size - 1) x1 += 1;
  }
  while (y1 - y0 < 6 && (y0 > 0 || y1 < size - 1)) {
    if (y0 > 0) y0 -= 1;
    if (y1 - y0 < 6 && y1 < size - 1) y1 += 1;
  }
  if (x0 === 0 && y0 === 0 && x1 === size - 1 && y1 === size - 1) return null;
  return {
    x0,
    y0,
    x1,
    y1,
    edgeL: x0 === 0,
    edgeR: x1 === size - 1,
    edgeT: y0 === 0,
    edgeB: y1 === size - 1,
  };
}

export class DrillSession {
  constructor(progress = { solved: {} }) {
    this.progress = progress;
    this.track = progress.track || "tactic";
    this.level = progress.level || 1;
    this.index = progress.index || 0;
    if (!trackById(this.track).levels.some((lv) => lv.level === this.level)) {
      this.level = 1;
      this.index = 0;
    }
    this.log = [];
    this.cursor = null;
    this.solvedFlag = false;
    this.misses = 0;
    this.busy = false;
    this.view = null;
    this.clampIndex();
    this.view = viewFor(this.problem);
  }

  get problem() {
    const list = problemsOf(this.track, this.level);
    return list[this.index] || list[0];
  }

  clampIndex() {
    const list = problemsOf(this.track, this.level);
    if (!list.length) {
      this.index = 0;
      return;
    }
    if (this.index < 0) this.index = 0;
    if (this.index >= list.length) this.index = list.length - 1;
  }

  rememberPlace() {
    this.progress.track = this.track;
    this.progress.level = this.level;
    this.progress.index = this.index;
  }

  resetAttempt() {
    this.log = [];
    this.cursor = null;
    this.solvedFlag = false;
    this.misses = 0;
    this.busy = false;
    this.view = viewFor(this.problem);
  }

  options() {
    if (!this.cursor) return this.problem.moves;
    return this.cursor.replies || [];
  }

  classify(x, y) {
    const hit = this.options().find((m) => m.x === x && m.y === y);
    if (!hit) return { ok: false };
    return { ok: true, node: hit };
  }

  commitUser(node) {
    this.log.push(node);
    if (!node.replies?.length) {
      this.cursor = node;
      this.solvedFlag = true;
      return { solved: true, defense: null };
    }
    return { solved: false, defense: node.replies[0] };
  }

  commitDefense(node) {
    this.log.push(node);
    this.cursor = node;
    if (!node.replies?.length) {
      this.solvedFlag = true;
      return { solved: true };
    }
    return { solved: false };
  }

  undo() {
    if (!this.log.length) return false;
    const solver = this.problem.toPlay;
    if (this.log[this.log.length - 1].color !== solver) this.log.pop();
    if (this.log.length && this.log[this.log.length - 1].color === solver) this.log.pop();
    this.cursor = this.log[this.log.length - 1] || null;
    this.solvedFlag = false;
    this.misses = 0;
    return true;
  }

  markSolved() {
    this.progress.solved[this.problem.id] = true;
    this.rememberPlace();
  }

  mainLine() {
    const steps = [];
    let nodes = this.problem.moves;
    let guard = 0;
    while (nodes?.length && guard < 48) {
      const m = nodes[0];
      steps.push(m);
      nodes = m.replies;
      guard += 1;
    }
    return steps;
  }

  isUnlocked(track, level) {
    return isLevelUnlocked(track, level, this.progress);
  }

  setPlace(track, level, index = 0) {
    if (!isLevelUnlocked(track, level, this.progress)) return false;
    this.track = track;
    this.level = level;
    this.index = index;
    this.clampIndex();
    this.resetAttempt();
    this.rememberPlace();
    return true;
  }

  step(delta) {
    const list = problemsOf(this.track, this.level);
    const next = this.index + delta;
    if (next < 0 || next >= list.length) return false;
    this.index = next;
    this.resetAttempt();
    this.rememberPlace();
    return true;
  }

  solvedCount() {
    return problemsOf(this.track, this.level).filter((p) => this.progress.solved[p.id]).length;
  }
}

/**
 * 19 路全谱打谱 / 猜下一手 / 执一方对练。
 * 偏离棋谱之后的应手由外面的 AI 接手，这里只负责谱面。
 */

import { BLACK, WHITE, GoEngine } from "./engine.js";
import { KIFU, KIFU_GROUPS } from "./kifu.js";

export { KIFU, KIFU_GROUPS };

const FILES = "ABCDEFGHJKLMNOPQRST";

export function coordName(x, y, size = 19) {
  return `${FILES[x] || "?"}${size - y}`;
}

export function freshKifu(game) {
  const g = new GoEngine(game.size, game.komi || 0);
  for (const [x, y] of game.black || []) g.board[y][x] = BLACK;
  for (const [x, y] of game.white || []) g.board[y][x] = WHITE;
  g.toPlay = game.toPlay || BLACK;
  g.positionHistory = [g.serialize()];
  return g;
}

/** 仍在盘上的子，标上它落下时的手数。座子没有手数。 */
export function stoneNumbers(game, engine) {
  const g = freshKifu(game);
  const numbers = Array.from({ length: game.size }, () => Array(game.size).fill(0));
  let n = 0;
  for (const move of engine.moveHistory) {
    if (move.type !== "play") continue;
    n += 1;
    const res = g.play(move.x, move.y);
    if (!res.ok) break;
    for (const [x, y] of res.captured || []) numbers[y][x] = 0;
    numbers[move.y][move.x] = n;
  }
  return numbers;
}

const studyNotesAttached = new WeakSet();

/** 没有古谱批注的局，标出第一次提子和提得最多的那一手，方便跳着看。 */
export function attachStudyNotes(game) {
  if (!game || studyNotesAttached.has(game)) return;
  studyNotesAttached.add(game);
  const engine = freshKifu(game);
  let first = -1;
  let firstN = 0;
  let big = -1;
  let bigN = 0;
  for (let i = 0; i < game.moves.length; i += 1) {
    const move = game.moves[i];
    const res = move.pass ? engine.pass() : engine.play(move.x, move.y);
    if (!res.ok) break;
    const captured = res.captured?.length || 0;
    if (captured > 0 && first < 0) {
      first = i;
      firstN = captured;
    }
    if (captured > bigN) {
      big = i;
      bigN = captured;
    }
  }
  const add = (index, text) => {
    const move = game.moves[index];
    if (!move || move.note) return;
    move.note = text;
  };
  if (first >= 0) add(first, `本局第一次提子，这一手提掉 ${firstN} 子。`);
  if (big >= 0 && big !== first && bigN >= 3) add(big, `本局提得最多的一手，提掉 ${bigN} 子。`);
}

export class KifuSession {
  constructor(game) {
    attachStudyNotes(game);
    this.game = game;
    this.cursor = 0;
    this.mode = "replay";
    this.userSide = BLACK;
    this.deviated = false;
    this.misses = [];
    this.guessTries = 0;
  }

  playedMove() {
    if (this.cursor <= 0) return null;
    return this.game.moves[this.cursor - 1] || null;
  }

  resetStudy() {
    this.cursor = 0;
    this.deviated = false;
    this.misses = [];
    this.guessTries = 0;
  }

  /** 猜错一次先不公布答案；再错才记入错过，方便回头再练。 */
  recordGuessMiss() {
    this.guessTries += 1;
    if (this.guessTries >= 2 && !this.misses.includes(this.cursor)) this.misses.push(this.cursor);
    return this.guessTries;
  }

  jumpTo(index) {
    const next = Math.max(0, Math.min(Math.round(index) || 0, this.total));
    this.cursor = next;
    this.deviated = false;
    this.guessTries = 0;
    return next;
  }

  /** 下一处带批注的手数下标；没有就从头找。 */
  nextNoteIndex() {
    const moves = this.game.moves;
    const later = moves.findIndex((move, i) => i >= this.cursor && move.note);
    if (later >= 0) return later;
    return moves.findIndex((move) => move.note);
  }

  /** 下一处错过的位置。 */
  nextMissIndex() {
    const later = this.misses.find((i) => i > this.cursor);
    if (later != null) return later;
    return this.misses.length ? this.misses[0] : -1;
  }

  get total() {
    return this.game.moves.length;
  }

  nextMove() {
    if (this.deviated || this.cursor >= this.total) return null;
    return this.game.moves[this.cursor];
  }

  mount() {
    const engine = freshKifu(this.game);
    for (let i = 0; i < this.cursor; i += 1) this._playRecorded(engine, this.game.moves[i]);
    return engine;
  }

  _playRecorded(engine, move) {
    if (move.pass) return engine.pass();
    return engine.play(move.x, move.y);
  }

  matches(x, y) {
    const move = this.nextMove();
    return !!move && !move.pass && move.x === x && move.y === y;
  }

  advance(engine) {
    const move = this.nextMove();
    if (!move) return { ok: false, reason: "已经是终局" };
    const res = this._playRecorded(engine, move);
    if (!res.ok) return res;
    this.cursor += 1;
    this.guessTries = 0;
    return { ok: true, move, captured: res.captured || [] };
  }

  /** 对方还在谱上时，把连续的谱着走完，直到轮到用户或终局。 */
  autoOpponent(engine) {
    const played = [];
    while (this.mode === "play" && !this.deviated) {
      const move = this.nextMove();
      if (!move || engine.toPlay === this.userSide) break;
      const res = this.advance(engine);
      if (!res.ok) break;
      played.push(res);
    }
    return played;
  }
}

export function gameById(id) {
  return KIFU.find((g) => g.id === id) || KIFU[0];
}

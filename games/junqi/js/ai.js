import { SIDE, ROWS, listMoves, isCamp } from "./engine.js";

function pieceValue(p) {
  if (!p) return 0;
  if (p.type === "flag") return 1000;
  if (p.type === "mine") return 40;
  if (p.type === "bomb") return 55;
  return p.rank;
}

/**
 * 评估一步：吃子、逼近军旗、前进
 */
export function scoreMove(board, move, side, difficulty = "normal") {
  const [tr, tc] = move.to;
  const [fr, fc] = move.from;
  const me = board[fr][fc];
  const foe = board[tr][tc];
  const jitter = difficulty === "hard" ? Math.random() * 0.6 : Math.random() * 3;
  let score = jitter;

  // 向前推进（南方向上减行，北方向下增行）
  if (side === SIDE.NORTH) score += (tr - fr) * 1.2;
  else score += (fr - tr) * 1.2;

  if (foe) {
    // 预估碰撞
    if (foe.type === "flag") return 1e6;
    if (me.type === "bomb") score += 30;
    else if (foe.type === "mine") {
      score += me.type === "engineer" ? 90 : -80;
    } else if (foe.revealed) {
      if (me.type === "bomb") score += 50;
      else if (me.rank > foe.rank) score += 40 + (me.rank - foe.rank);
      else if (me.rank === foe.rank) score += 5;
      else score -= 60;
    } else {
      // 未知子：司令/军长更敢撞，小子谨慎
      score += me.rank >= 70 ? 25 : me.rank <= 30 ? -10 : 8;
      if (me.type === "engineer") score += 6;
    }
  }

  // 不爱进己方行营赖着（除非躲避）
  if (isCamp(tr, tc)) score -= 4;

  // 保司令
  if (me.type === "commander" && foe && !foe.revealed) score -= 15;

  if (difficulty === "hard") {
    if (foe?.type === "flag") score += 500;
    if (side === SIDE.NORTH) score += tr * 0.8;
    else score += (ROWS - 1 - tr) * 0.8;
  }

  return score + pieceValue(me) * 0.01;
}

export function pickMove(board, side, difficulty = "normal") {
  const moves = listMoves(board, side);
  if (!moves.length) return null;
  const scored = moves.map((m) => ({
    m,
    s: scoreMove(board, m, side, difficulty),
  }));
  scored.sort((a, b) => b.s - a.s);
  if (difficulty === "easy") {
    const pool = scored.slice(0, Math.max(4, Math.ceil(scored.length * 0.55)));
    return pool[Math.floor(Math.random() * pool.length)].m;
  }
  if (difficulty === "hard") {
    return scored[0].m;
  }
  const top = scored[0].s;
  const pool = scored.filter((x) => x.s >= top - 10).slice(0, 3);
  return pool[Math.floor(Math.random() * pool.length)].m;
}

export function think(board, side, difficulty = "normal") {
  return pickMove(board, side, difficulty);
}

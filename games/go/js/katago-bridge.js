/**
 * Hands a position to the bundled Web KaTrain KataGo engine.
 * The network file is loaded only after the player picks this level.
 */

const BLACK = 1;

/**
 * 初段到九段共用一个小模型。引擎少于 16 次搜索会自动抬到 16，所以初段从 16 次起。
 * 段位越高，搜索越多、着手越稳。九段会把这一小模型用到比较满，一手可能要几十秒。
 */
export const KATA_LEVELS = {
  d1: { visits: 16, maxTimeMs: 4000, rootPolicyTemperature: 1.2 },
  d2: { visits: 32, maxTimeMs: 7000, rootPolicyTemperature: 1.05 },
  d3: { visits: 48, maxTimeMs: 10000, rootPolicyTemperature: 1 },
  d4: { visits: 80, maxTimeMs: 14000, rootPolicyTemperature: 0.95 },
  d5: { visits: 128, maxTimeMs: 20000, rootPolicyTemperature: 0.9 },
  d6: { visits: 192, maxTimeMs: 28000, rootPolicyTemperature: 0.85 },
  d7: { visits: 256, maxTimeMs: 36000, rootPolicyTemperature: 0.8 },
  d8: { visits: 384, maxTimeMs: 48000, rootPolicyTemperature: 0.75 },
  d9: { visits: 512, maxTimeMs: 60000, rootPolicyTemperature: 0.7 },
};

export function isModelLevel(id) {
  return Object.prototype.hasOwnProperty.call(KATA_LEVELS, id);
}

let modelReady = false;

export function positionForKata(engine) {
  const board = [];
  for (let y = 0; y < engine.size; y += 1) {
    const row = [];
    for (let x = 0; x < engine.size; x += 1) {
      const stone = engine.board[y][x];
      row.push(stone === BLACK ? "black" : stone ? "white" : null);
    }
    board.push(row);
  }
  const history = [];
  for (const move of engine.moveHistory || []) {
    if (move.type !== "play") continue;
    history.push({
      x: move.x,
      y: move.y,
      player: move.color === BLACK ? "black" : "white",
    });
  }
  return {
    size: engine.size,
    komi: engine.komi,
    toPlay: engine.toPlay === BLACK ? "black" : "white",
    board,
    history,
  };
}

/** 讲解用的短搜索。比高段对弈少看几手，避免每步都等很久。 */
export const TEACH_SETTINGS = { visits: 16, maxTimeMs: 2500, rootPolicyTemperature: 1, topK: 12 };

const FILES = "ABCDEFGHJKLMNOPQRST";

export function teachCoord(x, y, size) {
  return `${FILES[x] || "?"}${size - y}`;
}

function leadSentence(scoreLead) {
  const n = Math.abs(scoreLead).toFixed(1);
  if (Math.abs(scoreLead) < 0.35) return "落子前它看着双方差不多。";
  return scoreLead > 0 ? `落子前它估计黑棋领先 ${n} 目。` : `落子前它估计白棋领先 ${n} 目。`;
}

/**
 * Turn one KataGo review of the position *before* the move into a short comment.
 * `relativePointsLost` is already from the side that played, matching KaTrain.
 */
export function teachVerdict(review, played, size) {
  const moves = review?.moves || [];
  const best = moves.find((move) => !move.pass) || null;
  const hit = moves.find((move) =>
    played.pass ? move.pass : !move.pass && move.x === played.x && move.y === played.y,
  );
  const lead = leadSentence(Number(review?.rootScoreLead) || 0);
  const bestName = best ? teachCoord(best.x, best.y, size) : "";
  const territory = Array.isArray(review?.territory) ? review.territory : [];
  const overlay = { territory: [], best: null, candidates: [] };
  const pointed = { best: best ? { x: best.x, y: best.y } : null, overlay };
  if (!moves.length) {
    return { ...pointed, kind: "empty", loss: null, playedMatchesBest: false, text: "模型没有给出可下的点。" };
  }
  if (!hit) {
    return {
      ...pointed,
      best: null,
      kind: "unseen",
      loss: null,
      playedMatchesBest: false,
      text: "这次搜索没算到这手，先不下结论。",
    };
  }
  overlay.territory = territory;
  const loss = Math.max(0, Number(hit.relativePointsLost) || 0);
  const samePoint = !played.pass && best && hit.x === best.x && hit.y === best.y;
  if (samePoint || loss < 0.5) {
    return {
      ...pointed,
      kind: samePoint ? "best" : "close",
      loss,
      playedMatchesBest: Boolean(samePoint),
      text: samePoint
        ? `这手就是模型最想下的。${lead}`
        : `这手和模型最想下的差不多。${bestName ? `它最想下在 ${bestName}。` : ""}${lead}`,
    };
  }
  if (best) overlay.best = { x: best.x, y: best.y };
  const action = played.pass ? "停着" : "这手";
  return {
    ...pointed,
    kind: "loss",
    loss,
    playedMatchesBest: false,
    text: `${action}大约亏 ${loss.toFixed(1)} 目。${bestName ? `模型更想下在 ${bestName}。` : ""}${lead}`,
  };
}

function orientReview(engine, review) {
  const probe = (review.moves || []).find((move) => !move.pass);
  if (!probe || engine.isLegal(probe.x, probe.y)) return review;
  const flippedY = engine.size - 1 - probe.y;
  if (!engine.isLegal(probe.x, flippedY)) return review;
  const territory = review.territory.map((_, y) => review.territory[engine.size - 1 - y] || []);
  const policy = [];
  for (let y = 0; y < engine.size; y += 1) {
    for (let x = 0; x < engine.size; x += 1) {
      policy.push(review.policy?.[(engine.size - 1 - y) * engine.size + x] ?? 0);
    }
  }
  if (review.policy?.length) policy.push(review.policy[review.policy.length - 1] || 0);
  return {
    ...review,
    territory,
    policy,
    moves: review.moves.map((move) => (move.pass ? move : { ...move, y: engine.size - 1 - move.y })),
  };
}

export async function kataReview(engine, onStatus) {
  if (!modelReady) onStatus?.("正在加载 KataGo 模型，第一次大约 4MB…");
  const hub = await import("../katago/hub.js");
  const review = await hub.reviewPosition(positionForKata(engine), TEACH_SETTINGS);
  modelReady = true;
  return orientReview(engine, review);
}

export async function kataChooseMove(engine, level, onStatus) {
  const settings = KATA_LEVELS[level] || KATA_LEVELS.d3;
  if (!modelReady) onStatus?.("正在加载 KataGo 模型，第一次大约 4MB…");
  else onStatus?.("KataGo 思考中…");
  const hub = await import("../katago/hub.js");
  const move = await hub.chooseMove(positionForKata(engine), settings);
  modelReady = true;
  if (move.type === "pass") return move;
  if (engine.isLegal(move.x, move.y)) return move;
  const flipped = engine.size - 1 - move.y;
  if (engine.isLegal(move.x, flipped)) return { type: "play", x: move.x, y: flipped };
  throw new Error("KataGo 给出的落点在这里不合法");
}

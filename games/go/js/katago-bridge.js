/**
 * Hands a position to the bundled Web KaTrain KataGo engine.
 * The network file is loaded only after the player picks this level.
 */

const BLACK = 1;

/** 初段到五段共用一个模型。段位越高，搜索手数和时间越多，着手越稳。 */
export const KATA_LEVELS = {
  d1: { visits: 2, maxTimeMs: 1800, rootPolicyTemperature: 1.35 },
  d2: { visits: 4, maxTimeMs: 2800, rootPolicyTemperature: 1.15 },
  d3: { visits: 8, maxTimeMs: 4500, rootPolicyTemperature: 1 },
  d4: { visits: 16, maxTimeMs: 8000, rootPolicyTemperature: 1 },
  d5: { visits: 32, maxTimeMs: 12000, rootPolicyTemperature: 0.9 },
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

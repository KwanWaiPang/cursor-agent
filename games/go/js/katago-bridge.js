/**
 * Hands a position to the bundled Web KaTrain KataGo engine.
 * The network file is loaded only after the player picks this level.
 */

const BLACK = 1;

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

export async function kataChooseMove(engine, onStatus) {
  onStatus?.("正在加载 KataGo 模型，第一次大约 4MB…");
  const hub = await import("../katago/hub.js");
  onStatus?.("KataGo 思考中…");
  const move = await hub.chooseMove(positionForKata(engine));
  if (move.type === "pass") return move;
  if (engine.isLegal(move.x, move.y)) return move;
  const flipped = engine.size - 1 - move.y;
  if (engine.isLegal(move.x, flipped)) return { type: "play", x: move.x, y: flipped };
  throw new Error("KataGo 给出的落点在这里不合法");
}

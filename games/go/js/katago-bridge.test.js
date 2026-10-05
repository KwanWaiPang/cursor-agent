import { GoEngine } from "./engine.js";
import { positionForKata } from "./katago-bridge.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const g = new GoEngine(9, 7.5);
g.play(2, 2);
g.play(6, 6);
const pos = positionForKata(g);
assert(pos.size === 9, "size");
assert(pos.komi === 7.5, "komi");
assert(pos.toPlay === "black", "black to play after two moves");
assert(pos.board[2][2] === "black", "black stone");
assert(pos.board[6][6] === "white", "white stone");
assert(pos.history.length === 2, "history");
assert(pos.history[1].player === "white" && pos.history[1].x === 6, "second move");
console.log("katago bridge position test passed");

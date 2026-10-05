import { GoEngine } from "./engine.js";
import { KATA_LEVELS, isModelLevel, positionForKata, teachCoord, teachVerdict } from "./katago-bridge.js";

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
assert(!isModelLevel("k1") && isModelLevel("d1") && isModelLevel("d5"), "only dan levels use the model");
assert(KATA_LEVELS.d1.visits < KATA_LEVELS.d3.visits && KATA_LEVELS.d3.visits < KATA_LEVELS.d5.visits, "higher dan searches more");
assert(KATA_LEVELS.d1.maxTimeMs < KATA_LEVELS.d5.maxTimeMs, "higher dan may think longer");
assert(teachCoord(2, 2, 9) === "C7", "coord from the top");

const review = {
  rootScoreLead: 2,
  territory: [[0.8]],
  moves: [
    { x: 2, y: 2, pass: false, pointsLost: 0, relativePointsLost: 0, order: 0, visits: 8, winRate: 0.6, scoreLead: 2 },
    { x: 3, y: 3, pass: false, pointsLost: 4, relativePointsLost: 4.2, order: 1, visits: 2, winRate: 0.4, scoreLead: -2 },
  ],
};
const best = teachVerdict(review, { pass: false, x: 2, y: 2 }, 9);
assert(best.kind === "best" && best.text.includes("最想下的"), best.text);
assert(!best.overlay.best, "matching move does not mark another point");
const loss = teachVerdict(review, { pass: false, x: 3, y: 3 }, 9);
assert(loss.kind === "loss" && loss.text.includes("亏 4.2 目") && loss.text.includes("C7"), loss.text);
assert(loss.overlay.best.x === 2 && loss.overlay.candidates.length === 2, "marks the better point");
const missed = teachVerdict(review, { pass: false, x: 0, y: 0 }, 9);
assert(missed.kind === "unseen" && missed.text.includes("不在模型看过"), missed.text);
const policy = Array(82).fill(0);
policy[0] = 0.08;
const soft = teachVerdict({ ...review, policy }, { pass: false, x: 0, y: 0 }, 9);
assert(soft.text.includes("8%") && soft.text.includes("没细看"), soft.text);
const behind = teachVerdict({ ...review, rootScoreLead: -3.5 }, { pass: false, x: 2, y: 2 }, 9);
assert(behind.text.includes("白棋领先 3.5 目"), behind.text);

console.log("katago bridge position test passed");

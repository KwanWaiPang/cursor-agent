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
assert(!isModelLevel("k1") && isModelLevel("d1") && isModelLevel("d9"), "only dan levels use the model");
assert(Object.keys(KATA_LEVELS).length === 9, "nine model ranks");
assert(KATA_LEVELS.d1.visits >= 16, "first dan is at the engine visit floor");
const modelIds = Object.keys(KATA_LEVELS);
for (let i = 1; i < modelIds.length; i += 1) {
  const prev = KATA_LEVELS[modelIds[i - 1]];
  const next = KATA_LEVELS[modelIds[i]];
  assert(next.visits > prev.visits, `${modelIds[i]} searches more`);
  assert(next.maxTimeMs > prev.maxTimeMs, `${modelIds[i]} may think longer`);
  assert(next.rootPolicyTemperature <= prev.rootPolicyTemperature, `${modelIds[i]} plays more steadily`);
}
assert(KATA_LEVELS.d9.visits >= 512, "nine dan is much stronger than the old five dan");
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
assert(loss.overlay.best.x === 2 && loss.overlay.candidates.length === 0, "only marks the better point");
const missed = teachVerdict(review, { pass: false, x: 0, y: 0 }, 9);
assert(missed.kind === "unseen" && missed.text.includes("没算到") && missed.text.includes("不下结论"), missed.text);
assert(!missed.overlay.best && !missed.text.includes("更想下"), "unseen move draws no conclusion");
const policy = Array(82).fill(0);
policy[0] = 0.08;
const soft = teachVerdict({ ...review, policy }, { pass: false, x: 0, y: 0 }, 9);
assert(soft.kind === "unseen" && !soft.text.includes("%"), soft.text);
const behind = teachVerdict({ ...review, rootScoreLead: -3.5 }, { pass: false, x: 2, y: 2 }, 9);
assert(behind.text.includes("白棋领先 3.5 目"), behind.text);

console.log("katago bridge position test passed");

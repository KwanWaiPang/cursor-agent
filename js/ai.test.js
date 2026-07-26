import { BLACK, WHITE, GoEngine } from "./engine.js";
import { GoAI } from "./ai.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function testOpeningMove() {
  const g = new GoEngine(9, 7.5);
  const ai = new GoAI("medium");
  ai.cfg.thinkMs = 0;
  const move = await ai.chooseMove(g);
  assert(move.type === "play", "opening should play");
  assert(g.isLegal(move.x, move.y, BLACK), "opening move legal");
}

async function testCapturePreference() {
  const g = new GoEngine(9, 7.5);
  // 白一子被叫吃，唯一气在 (1,2)
  g.board[1][1] = WHITE;
  g.board[0][1] = BLACK; // (1,0)
  g.board[1][0] = BLACK; // (0,1)
  g.board[1][2] = BLACK; // (2,1)
  g.toPlay = BLACK;
  g.positionHistory = [g.serialize()];

  const ai = new GoAI("hard");
  ai.cfg.thinkMs = 0;
  const move = await ai.chooseMove(g);
  assert(move.type === "play", "should play capture");
  assert(move.x === 1 && move.y === 2, `should capture at 1,2 got ${move.x},${move.y}`);
}

async function testReplyAfterHuman() {
  const g = new GoEngine(9, 7.5);
  assert(g.play(2, 2).ok, "human black");
  const ai = new GoAI("easy");
  ai.cfg.thinkMs = 0;
  const move = await ai.chooseMove(g);
  assert(move.type === "play" || move.type === "pass", "ai responds");
  if (move.type === "play") {
    const trial = g.tryPlay(move.x, move.y, WHITE);
    assert(trial.ok, "ai reply legal");
  }
}

await testOpeningMove();
await testCapturePreference();
await testReplyAfterHuman();
console.log("All AI tests passed.");

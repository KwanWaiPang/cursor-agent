import { BLACK, WHITE, GoEngine } from "./engine.js";
import { GoAI, AI_DIFFICULTIES } from "./ai.js";

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

  for (const diff of ["medium", "hard", "expert"]) {
    const ai = new GoAI(diff);
    ai.cfg.thinkMs = 0;
    if (ai.cfg.sims) ai.cfg.sims = Math.min(ai.cfg.sims, 120);
    const move = await ai.chooseMove(g);
    assert(move.type === "play", `${diff} should play capture`);
    assert(
      move.x === 1 && move.y === 2,
      `${diff} should capture at 1,2 got ${move.x},${move.y}`
    );
  }
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

async function testDifficultiesExist() {
  assert(AI_DIFFICULTIES.includes("easy"), "easy");
  assert(AI_DIFFICULTIES.includes("medium"), "medium");
  assert(AI_DIFFICULTIES.includes("hard"), "hard");
  assert(AI_DIFFICULTIES.includes("expert"), "expert");
  const easy = new GoAI("easy");
  const expert = new GoAI("expert");
  assert(expert.cfg.sims > easy.cfg.sims, "expert has more sims");
  assert(expert.scaledSims(9) > hardScaled(), "scaled expert > hard");
  function hardScaled() {
    return new GoAI("hard").scaledSims(9);
  }
}

await testDifficultiesExist();
await testOpeningMove();
await testCapturePreference();
await testReplyAfterHuman();
console.log("All AI tests passed.");

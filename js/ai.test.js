import { BLACK, WHITE, GoEngine } from "./engine.js";
import { GoAI, AI_DIFFICULTIES } from "./ai.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function testOpeningMove() {
  for (const size of [9, 13, 19]) {
    const g = new GoEngine(size, 7.5);
    const ai = new GoAI("medium");
    ai.cfg.thinkMs = 0;
    ai.cfg.timeMs = { 9: 0, 13: 0, 19: 0 };
    const move = await ai.chooseMove(g);
    assert(move.type === "play", `${size}: opening should play`);
    assert(g.isLegal(move.x, move.y, BLACK), `${size}: opening move legal`);
  }
}

async function testCapturePreference() {
  for (const size of [9, 13, 19]) {
    const g = new GoEngine(size, 7.5);
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
      ai.cfg.timeMs = { 9: 50, 13: 50, 19: 50 };
      if (ai.cfg.sims) ai.cfg.sims = Math.min(ai.cfg.sims, 80);
      const move = await ai.chooseMove(g);
      assert(move.type === "play", `${size}/${diff} should play capture`);
      assert(
        move.x === 1 && move.y === 2,
        `${size}/${diff} should capture at 1,2 got ${move.x},${move.y}`
      );
    }
  }
}

async function testFusekiSupportsLargeBoards() {
  const ai = new GoAI("hard");
  assert(ai.fusekiPoints(13).length > 10, "13 fuseki points");
  assert(ai.fusekiPoints(19).length > 20, "19 fuseki points");
  const p13 = ai.searchPlan(13);
  const p19 = ai.searchPlan(19);
  const p9 = ai.searchPlan(9);
  assert(p13.sims >= p9.sims, "13-way gets at least as many sims as 9");
  assert(p19.sims >= p13.sims, "19-way gets at least as many sims as 13");
  assert(p19.timeMs >= p13.timeMs, "19-way gets more think time");
}

async function testReplyAfterHuman() {
  const g = new GoEngine(13, 7.5);
  assert(g.play(3, 3).ok, "human black");
  const ai = new GoAI("easy");
  ai.cfg.thinkMs = 0;
  ai.cfg.timeMs = { 9: 0, 13: 0, 19: 0 };
  const move = await ai.chooseMove(g);
  assert(move.type === "play" || move.type === "pass", "ai responds on 13");
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
  assert(expert.scaledSims(19) > new GoAI("hard").scaledSims(19), "expert>hard on 19");
}

await testDifficultiesExist();
await testFusekiSupportsLargeBoards();
await testOpeningMove();
await testCapturePreference();
await testReplyAfterHuman();
console.log("All AI tests passed.");

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

    for (const diff of ["medium", "hard", "expert", "master", "dan"]) {
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
  for (const id of ["novice", "easy", "medium", "hard", "expert", "master", "dan"]) {
    assert(AI_DIFFICULTIES.includes(id), id);
  }
  const order = ["novice", "easy", "medium", "hard", "expert", "master", "dan"];
  for (let i = 1; i < order.length; i += 1) {
    const prev = new GoAI(order[i - 1]);
    const cur = new GoAI(order[i]);
    assert(cur.cfg.sims >= prev.cfg.sims, `${order[i]} sims >= ${order[i - 1]}`);
    assert(
      cur.searchPlan(19).timeMs >= prev.searchPlan(19).timeMs,
      `${order[i]} thinks at least as long on 19`
    );
  }
  assert(new GoAI("dan").cfg.ladder, "dan reads ladders");
  assert(new GoAI("hard").cfg.readDepth >= 3, "hard reads captures");
  assert(!new GoAI("easy").cfg.readDepth, "easy does not deep-read");
}

async function testLadderAndTactics() {
  const g = new GoEngine(9, 0);
  g.board[1][3] = WHITE;
  g.board[1][2] = BLACK;
  g.board[2][3] = BLACK;
  g.toPlay = BLACK;
  g.positionHistory = [g.serialize()];
  const ai = new GoAI("dan");
  assert(ai.ladderCaptures(g, 4, 1, BLACK, 3, 1), "working ladder");
  assert(!ai.ladderCaptures(g, 3, 0, BLACK, 3, 1), "the other side is not a ladder");

  const chase = new GoEngine(9, 0);
  chase.board[4][4] = WHITE;
  chase.board[4][3] = BLACK;
  chase.board[3][4] = BLACK;
  chase.board[5][3] = BLACK;
  chase.board[5][5] = BLACK;
  chase.toPlay = BLACK;
  chase.positionHistory = [chase.serialize()];
  const reader = new GoAI("hard");
  reader.cfg.timeMs = { 9: 30, 13: 30, 19: 30 };
  reader.cfg.sims = 0;
  const move = await reader.chooseMove(chase);
  assert(move.type === "play" && move.x === 5 && move.y === 4, `atari first, got ${move.x},${move.y}`);
}

await testDifficultiesExist();
await testFusekiSupportsLargeBoards();
await testOpeningMove();
await testCapturePreference();
await testReplyAfterHuman();
await testLadderAndTactics();
console.log("All AI tests passed.");

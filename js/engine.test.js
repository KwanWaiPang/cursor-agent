import { BLACK, WHITE, GoEngine } from "./engine.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testCapture() {
  const g = new GoEngine(9, 7.5);
  // white surrounded by black: place W at 1,1 then surround
  assert(g.play(0, 1).ok, "B");
  assert(g.play(1, 1).ok, "W");
  assert(g.play(1, 0).ok, "B");
  assert(g.play(5, 5).ok, "W elsewhere");
  assert(g.play(1, 2).ok, "B");
  assert(g.play(6, 6).ok, "W elsewhere");
  const res = g.play(2, 1);
  assert(res.ok, "capture move");
  assert(res.captured.length === 1, "one stone captured");
  assert(g.board[1][1] === 0, "white stone removed");
  assert(g.captures[BLACK] === 1, "black capture count");
}

function testSuicide() {
  const g = new GoEngine(9, 7.5);
  // surround 1,1 leaving one liberty filled by suicide attempt of white
  g.play(0, 1); // B
  g.play(8, 8); // W
  g.play(1, 0); // B
  g.play(8, 7); // W
  g.play(2, 1); // B
  g.play(8, 6); // W
  g.play(1, 2); // B — 1,1 has no liberty for white
  const bad = g.tryPlay(1, 1, WHITE);
  assert(!bad.ok, "suicide illegal");
}

function testKo() {
  // 形状：
  // . B W .
  // B W . W
  // . B W .
  // 黑在 (2,1) 提掉 (1,1)，白不能立刻在 (1,1) 回提
  const g = new GoEngine(9, 7.5);
  g.play(1, 0); // B
  g.play(2, 0); // W
  g.play(0, 1); // B
  g.play(1, 1); // W（劫材子）
  g.play(1, 2); // B
  g.play(2, 2); // W
  g.play(4, 4); // B 闲棋
  g.play(3, 1); // W
  const cap = g.play(2, 1); // B 提劫
  assert(cap.ok && cap.captured.length === 1, "ko capture");
  assert(g.board[1][1] === 0, "white ko stone gone");
  const re = g.tryPlay(1, 1, WHITE);
  assert(!re.ok, "immediate ko recapture illegal");
}

function testScore() {
  const g = new GoEngine(5, 0);
  // Fill almost all: black owns left, white right roughly
  // Simpler: empty board scoring after pass-pass -> all dame, 0-0 + komi
  g.pass();
  g.pass();
  assert(g.phase === "scoring", "enter scoring");
  const res = g.score();
  assert(res.ok, "score ok");
  assert(res.result.whiteScore === 0, "komi 0 empty");
  assert(res.result.blackScore === 0, "black 0 empty");
}

function testUndoPassAndScoring() {
  const g = new GoEngine(9, 7.5);
  assert(g.play(0, 0).ok, "play");
  assert(g.pass().ok, "pass1");
  assert(g.consecutivePasses === 1, "one pass");
  assert(g.pass().ok, "pass2");
  assert(g.phase === "scoring", "scoring");
  assert(g.undo().ok, "undo scoring");
  assert(g.phase === "playing", "back to playing");
  assert(g.consecutivePasses === 0, "passes cleared");
}

function testCaptureWithSharedGroup() {
  const g = new GoEngine(9, 7.5);
  // 白两子竖连，黑围而提
  g.play(1, 0); // B
  g.play(1, 1); // W
  g.play(0, 1); // B
  g.play(1, 2); // W
  g.play(0, 2); // B
  g.play(8, 8); // W
  g.play(2, 1); // B
  g.play(8, 7); // W
  g.play(2, 2); // B
  g.play(8, 6); // W
  const res = g.play(1, 3); // B captures both
  assert(res.ok, "multi capture ok");
  assert(res.captured.length === 2, `captured 2 got ${res.captured.length}`);
  assert(g.board[1][1] === 0 && g.board[2][1] === 0, "both gone");
}

function testResignUndo() {
  const g = new GoEngine(9, 7.5);
  g.resign(BLACK);
  assert(g.phase === "finished", "finished");
  assert(g.undo().ok, "undo resign");
  assert(g.phase === "playing", "playing again");
  assert(g.toPlay === BLACK, "black to play");
}

function testStarPoints() {
  assert(new GoEngine(9).starPoints().length === 5, "9 stars");
  assert(new GoEngine(13).starPoints().length === 9, "13 stars");
  assert(new GoEngine(19).starPoints().length === 9, "19 stars");
}

testCapture();
testSuicide();
testKo();
testScore();
testUndoPassAndScoring();
testCaptureWithSharedGroup();
testResignUndo();
testStarPoints();
console.log("All engine tests passed.");

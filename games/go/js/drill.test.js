import { BLACK, WHITE } from "./engine.js";
import {
  PROBLEMS,
  TRACKS,
  DrillSession,
  isLevelUnlocked,
  levelCleared,
  loadPosition,
  problemsOf,
} from "./drill.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function playMain(problem) {
  const session = new DrillSession({ solved: {} });
  session.track = problem.track;
  session.level = problem.level;
  session.index = problemsOf(problem.track, problem.level).findIndex((p) => p.id === problem.id);
  session.resetAttempt();
  const engine = loadPosition(problem);
  let guard = 0;
  while (!session.solvedFlag && guard < 48) {
    guard += 1;
    const opts = session.options();
    assert(opts.length, `${problem.id} ran out of moves before solved`);
    const node = opts[0];
    assert(engine.toPlay === node.color, `${problem.id} turn`);
    const res = engine.play(node.x, node.y);
    assert(res.ok, `${problem.id} illegal ${node.x},${node.y} ${res.reason || ""}`);
    const step = session.commitUser(node);
    if (step.defense) {
      assert(engine.toPlay === step.defense.color, `${problem.id} defense turn`);
      const d = engine.play(step.defense.x, step.defense.y);
      assert(d.ok, `${problem.id} defense illegal`);
      session.commitDefense(step.defense);
    }
  }
  assert(session.solvedFlag, `${problem.id} main line should solve`);
}

function testCurriculumShape() {
  assert(TRACKS.length === 2, "two tracks");
  for (const track of TRACKS) {
    assert(track.levels.length === 6, `${track.id} has 6 levels`);
    for (const lv of track.levels) {
      const list = problemsOf(track.id, lv.level);
      assert(list.length === 6, `${track.id} L${lv.level} has ${list.length}`);
    }
  }
  assert(PROBLEMS.length === 72, `expected 72 problems, got ${PROBLEMS.length}`);
}

function testUnlock() {
  const progress = { solved: {} };
  assert(isLevelUnlocked("tactic", 1, progress), "level 1 open");
  assert(!isLevelUnlocked("tactic", 2, progress), "level 2 locked");
  for (const p of problemsOf("tactic", 1)) progress.solved[p.id] = true;
  assert(isLevelUnlocked("tactic", 2, progress), "level 2 opens");
  assert(!isLevelUnlocked("tactic", 3, progress), "level 3 still locked");
  assert(levelCleared("tactic", 1, progress), "level 1 cleared");
  assert(!isLevelUnlocked("yose", 2, progress), "tracks are separate");
}

function testRejectsWrongMove() {
  const session = new DrillSession({ solved: {} });
  session.setPlace("tactic", 1, 0);
  const problem = session.problem;
  const engine = loadPosition(problem);
  const wrong = session.classify(0, 0);
  const right = problem.moves[0];
  if (right.x === 0 && right.y === 0) {
    assert(session.classify(8, 8).ok === false, "a far point is not the answer");
  } else {
    assert(!wrong.ok, "empty corner is not the first-level answer");
  }
  assert(session.classify(right.x, right.y).ok, "recorded move is accepted");
  assert(engine.board[right.y][right.x] === 0, "answer point starts empty");
  assert(problem.toPlay === BLACK || problem.toPlay === WHITE, "side");
}

function testUndo() {
  const session = new DrillSession({ solved: {} });
  session.track = "tactic";
  session.level = 2;
  session.index = 1;
  session.resetAttempt();
  const first = session.options()[0];
  const step = session.commitUser(first);
  assert(step.defense, "chase problem has a reply");
  session.commitDefense(step.defense);
  assert(session.undo(), "undo the exchange");
  assert(session.log.length === 0, "back to the start");
  assert(session.classify(first.x, first.y).ok, "the same move is available again");
}

testCurriculumShape();
testUnlock();
testRejectsWrongMove();
testUndo();
for (const problem of PROBLEMS) playMain(problem);
console.log(`All drill tests passed (${PROBLEMS.length} problems).`);

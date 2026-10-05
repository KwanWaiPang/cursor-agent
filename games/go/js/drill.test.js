import { BLACK, WHITE } from "./engine.js";
import {
  PROBLEMS,
  TRACKS,
  DrillSession,
  drillFaceText,
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
  while (!session.solvedFlag && guard < 80) {
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
    assert(track.levels.length === 8, `${track.id} has ${track.levels.length} levels`);
    for (const lv of track.levels) {
      const list = problemsOf(track.id, lv.level);
      assert(list.length >= 20, `${track.id} L${lv.level} has ${list.length}`);
    }
  }
  assert(PROBLEMS.length >= 320, `expected a larger set, got ${PROBLEMS.length}`);
}

function mainLineOf(problem) {
  const line = [];
  let cur = problem.moves;
  let guard = 0;
  while (cur?.length && guard < 80) {
    line.push(cur[0]);
    cur = cur[0].replies;
    guard += 1;
  }
  return line;
}

function testExplanationsAndBattles() {
  let fights = 0;
  for (const problem of PROBLEMS) {
    assert(problem.explain && problem.explain.includes("先"), `${problem.id} explain`);
    assert(problem.explain.includes("下一手"), `${problem.id} tells the next move`);
    assert(problem.lesson && problem.lesson.includes("手"), `${problem.id} lesson`);
    assert(problem.prompt === problem.explain, `${problem.id} prompt`);
    const face = drillFaceText(problem.prompt);
    assert(face && !face.includes("下一手"), `${problem.id} face hides the next move`);
    assert(!/下在 [A-T]\d+/.test(face), `${problem.id} face has no coordinate`);
    assert(!/死活|吐血/.test(problem.prompt + problem.lesson), `${problem.id} wording`);
    const line = mainLineOf(problem);
    assert(line.length, `${problem.id} empty line`);
    for (const move of line) {
      assert(move.why && move.why.length > 4, `${problem.id} move missing why`);
    }
    const own = line.filter((move) => move.color === problem.toPlay);
    if (own.length > 1) {
      fights += 1;
      assert(
        line.some((move) => move.color !== problem.toPlay),
        `${problem.id} multi-move problem has no opponent reply`
      );
      assert(problem.explain.includes("对战"), `${problem.id} should say it is a fight`);
    }
  }
  assert(fights >= 40, `expected many interactive fights, got ${fights}`);
}

function testUnlock() {
  const progress = { solved: {} };
  for (const track of TRACKS) {
    assert(track.levels.length >= 8, `${track.id} levels`);
    for (const lv of track.levels) {
      assert(isLevelUnlocked(track.id, lv.level, progress), `${track.id} L${lv.level} is free`);
      assert(problemsOf(track.id, lv.level).length >= 20, `${track.id} L${lv.level} count`);
    }
  }
  const session = new DrillSession({ solved: {} });
  assert(session.setPlace("tactic", 8, 0), "can open the hardest level immediately");
  assert(session.problem.level === 8, "landed on level 8");
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
testExplanationsAndBattles();
testUndo();
for (const problem of PROBLEMS) playMain(problem);
console.log(`All drill tests passed (${PROBLEMS.length} problems).`);

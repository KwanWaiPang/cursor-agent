import { BLACK, WHITE } from "./engine.js";
import { PROBLEMS, TRACKS } from "./problems.js";
import {
  DrillSession,
  drillFaceText,
  installDrillCatalog,
  isLevelUnlocked,
  levelCleared,
  loadPosition,
  problemsOf,
} from "./drill.js";

installDrillCatalog({ PROBLEMS, TRACKS });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function playMain(problem) {
  if (problem.review) return;
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
    assert(track.levels.length >= 8, `${track.id} has ${track.levels.length} levels`);
    for (const lv of track.levels) {
      const list = problemsOf(track.id, lv.level);
      assert(list.length >= 5, `${track.id} L${lv.level} has ${list.length}`);
    }
  }
  assert(PROBLEMS.length > 320, `expected more problems after adding collections, got ${PROBLEMS.length}`);
  assert(!PROBLEMS.some((problem) => problem.title.includes("换个角落")), "mirrored copies stay out");
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
    if (problem.review) {
      assert(!problem.moves?.length, `${problem.id} look-only problem has a fake line`);
      assert(problem.prompt.includes("无原谱正解"), `${problem.id} names the missing book line`);
      assert(problem.lesson.includes("无原谱正解"), `${problem.id} lesson`);
      assert(problem.explain === problem.prompt, `${problem.id} explain is the prompt`);
      assert(!problem.prompt.includes("下一手"), `${problem.id} prompt stays a goal`);
      const face = drillFaceText(problem.prompt);
      assert(face && !face.includes("下一手") && !/下在 [A-T]\d+/.test(face), `${problem.id} face`);
      assert(!/死活|吐血/.test(problem.prompt + problem.lesson), `${problem.id} wording`);
      continue;
    }
    assert(problem.explain && problem.explain.includes("先"), `${problem.id} explain`);
    assert(problem.explain.includes("下一手"), `${problem.id} tells the next move`);
    assert(problem.lesson && problem.lesson.includes("手"), `${problem.id} lesson`);
    assert(!problem.prompt.includes("下一手"), `${problem.id} prompt stays a goal`);
    assert(!problem.prompt.includes("按谱上的次序"), `${problem.id} states a go goal`);
    assert(problem.explain.startsWith(problem.prompt), `${problem.id} explain extends the prompt`);
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
      assert(problemsOf(track.id, lv.level).length >= 5, `${track.id} L${lv.level} count`);
    }
  }
  const session = new DrillSession({ solved: {} });
  const lastTactic = TRACKS.find((track) => track.id === "tactic").levels.at(-1).level;
  assert(session.setPlace("tactic", lastTactic, 0), "can open the last tactic level immediately");
  assert(session.problem.level === lastTactic, "landed on the last tactic level");
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

function testReviewProblem() {
  const problem = PROBLEMS.find((item) => item.review);
  assert(problem, "a look-only classical problem exists");
  const session = new DrillSession({ solved: {} });
  const index = problemsOf(problem.track, problem.level).findIndex((item) => item.id === problem.id);
  assert(session.setPlace(problem.track, problem.level, index), "open the look-only level");
  assert(session.options().length === 0, "look-only problem has no checked moves");
  session.markSolved();
  assert(session.progress.solved[problem.id], "looking counts as seen");
}

testCurriculumShape();
testUnlock();
testRejectsWrongMove();
testExplanationsAndBattles();
testUndo();
testReviewProblem();
for (const problem of PROBLEMS) playMain(problem);
console.log(`All drill tests passed (${PROBLEMS.length} problems).`);

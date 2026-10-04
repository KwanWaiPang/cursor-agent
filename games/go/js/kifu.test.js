import { BLACK, WHITE } from "./engine.js";
import { KIFU, KifuSession, freshKifu, coordName } from "./kifu-play.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testLibrary() {
  assert(KIFU.length >= 16, `expected a shelf of full games, got ${KIFU.length}`);
  const groups = new Set(KIFU.map((g) => g.group));
  assert(groups.has("当湖十局"), "danghu");
  assert(groups.has("秀策名局"), "shusaku");
  for (const game of KIFU) {
    assert(game.size === 19, `${game.id} not 19`);
    assert(game.moves.length >= 40, `${game.id} short`);
    const session = new KifuSession(game);
    const engine = session.mount();
    assert(engine.size === 19, "board");
    while (session.nextMove()) {
      const res = session.advance(engine);
      assert(res.ok, `${game.title} #${session.cursor} ${res.reason || ""}`);
    }
    assert(session.cursor === game.moves.length, `${game.title} finished`);
  }
}

function testEarNoteAndGuess() {
  const ear = KIFU.find((g) => g.title.includes("耳赤"));
  assert(ear, "ear game");
  assert(ear.moves[126]?.note, "move 127 is annotated");
  assert(!ear.seat, "ear game is an empty-board game");
  const session = new KifuSession(ear);
  const engine = session.mount();
  const first = session.nextMove();
  assert(session.matches(first.x, first.y), "first move matches");
  assert(!session.matches((first.x + 1) % 19, first.y), "neighbor is not the record");
  assert(coordName(first.x, first.y, 19).length >= 2, "coord name");
  const danghu = KIFU.find((g) => g.group === "当湖十局");
  assert(danghu.seat && danghu.toPlay === WHITE, "danghu is white to play with seat stones");
  const seated = freshKifu(danghu);
  const stones = seated.board.flat().filter(Boolean).length;
  assert(stones === 4, `seat stones ${stones}`);
  assert(seated.toPlay === WHITE, "white first");
}

function testSideFollow() {
  const game = KIFU.find((g) => !g.seat);
  const session = new KifuSession(game);
  session.mode = "play";
  session.userSide = BLACK;
  const engine = session.mount();
  assert(engine.toPlay === BLACK, "black to move");
  const move = session.nextMove();
  assert(session.matches(move.x, move.y), "user can play the record");
  session.advance(engine);
  const auto = session.autoOpponent(engine);
  assert(auto.length === 1, "white's recorded reply is automatic");
  assert(engine.toPlay === BLACK, "back to the learner");
}

testLibrary();
testEarNoteAndGuess();
testSideFollow();
console.log(`All kifu tests passed (${KIFU.length} games).`);

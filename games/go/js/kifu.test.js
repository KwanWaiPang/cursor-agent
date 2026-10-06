import { BLACK, WHITE } from "./engine.js";
import { KIFU, KifuSession, freshKifu, coordName, attachStudyNotes, stoneMoveIndex } from "./kifu-play.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testLibrary() {
  assert(KIFU.length >= 1800, `expected the ancient shelf, got ${KIFU.length}`);
  const groups = new Set(KIFU.map((g) => g.group));
  assert(groups.has("当湖十局"), "danghu");
  assert(groups.has("秀策名局"), "shusaku");
  assert(groups.has("聂卫平") && groups.has("柯洁") && groups.has("陈祖德"), "chinese masters");
  assert(groups.has("本因坊秀和") && groups.has("御城棋") && groups.has("道策御城棋"), "ancient houses");
  assert(KIFU.filter((g) => g.group === "聂卫平").length >= 8, "nie games");
  assert(KIFU.every((g) => g.level === "初级" || g.level === "中级" || g.level === "高级"), "every game has a study level");
  const danghuLevel = KIFU.find((g) => g.group === "当湖十局");
  assert(danghuLevel.level === "高级" && danghuLevel.era === "清", "danghu is a Qing game");
  const eras = new Set(KIFU.map((g) => g.era));
  for (const era of ["唐", "宋", "明", "清", "近代"]) assert(eras.has(era), era);
  assert([...eras].every((era) => ["唐", "宋", "明", "清", "近代"].includes(era)), `unexpected era ${[...eras]}`);
  assert(KIFU.some((g) => g.level === "初级" && g.era === "清"), "easy Qing games");
  assert(KIFU.find((g) => g.group === "唐代名局").era === "唐", "Tang games");
  assert(KIFU.find((g) => g.group === "宋代名局").era === "宋", "Song games");
  assert(KIFU.find((g) => g.group === "柯洁").era === "近代", "modern Chinese games");
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
  assert(KIFU.filter((g) => g.group === "当湖十局").length === 10, "all ten danghu games");
  const jowaGame = KIFU.find((g) => g.id === "276-4");
  assert(jowaGame && jowaGame.size === 19 && jowaGame.moves.length > 100, "1835 Jowa game");
  assert(!jowaGame.title.includes("吐血"), "title stays neutral");
  assert(KIFU.some((g) => g.group === "秀策三十番棋"), "shusaku thirty-game match");
  assert(!KIFU.some((g) => /[A-Za-z]{4,}/.test(g.blackName + g.whiteName)), "player names stay in Chinese");
  const seated = freshKifu(danghu);
  const stones = seated.board.flat().filter(Boolean).length;
  assert(stones === 4, `seat stones ${stones}`);
  assert(seated.toPlay === WHITE, "white first");
}

function testMissesAndNotes() {
  const ear = KIFU.find((g) => g.title.includes("耳赤"));
  const session = new KifuSession(ear);
  session.cursor = 20;
  assert(session.recordGuessMiss() === 1, "first miss stays private");
  assert(session.misses.length === 0, "first miss is not stored");
  assert(session.recordGuessMiss() === 2, "second miss");
  assert(session.misses[0] === 20, "second miss is stored once");
  session.recordGuessMiss();
  assert(session.misses.length === 1, "same position is not stored twice");
  const earIndex = session.game.moves.findIndex((move) => move.note && move.note.includes("耳赤"));
  assert(earIndex === 126, `ear note stays on move 127, index ${earIndex}`);
  session.jumpTo(earIndex + 1);
  assert(session.cursor === 127 && session.guessTries === 0, "jump clears the guess count");
  assert(session.playedMove().note.includes("耳赤"), "the note belongs to the move just played");
  assert(!session.nextMove()?.note?.includes("耳赤"), "the following move does not keep that note");
  session.jumpTo(9999);
  assert(session.cursor === session.total, "jump cannot pass the end");
  session.cursor = 0;
  assert(session.nextMissIndex() === 20, "the stored miss is still waiting");
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

function testStoneMoveIndex() {
  const game = KIFU.find((g) => g.group === "当湖十局");
  const session = new KifuSession(game);
  const engine = session.mount();
  while (session.cursor < 40) session.advance(engine);
  const just = session.playedMove();
  assert(stoneMoveIndex(engine, just.x, just.y) === 40, "the stone just played is move 40");
  const first = game.moves[0];
  assert(stoneMoveIndex(engine, first.x, first.y) === 1, "the first stone stays move 1");
  const seat = game.black[0];
  assert(stoneMoveIndex(engine, seat[0], seat[1]) === 0, "a seat stone is not a move");
  assert(stoneMoveIndex(engine, 0, 0) === 0, "an empty point has no move");
}

function testStudyNotes() {
  let noted = 0;
  for (const game of KIFU) {
    attachStudyNotes(game);
    if (game.moves.some((move) => move.note && move.note.includes("提子"))) noted += 1;
  }
  assert(noted >= 80, `expected capture notes on most games, got ${noted}`);
}

testLibrary();
testEarNoteAndGuess();
testMissesAndNotes();
testSideFollow();
testStoneMoveIndex();
testStudyNotes();
console.log(`All kifu tests passed (${KIFU.length} games).`);

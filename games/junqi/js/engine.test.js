import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SIDE,
  autoDeploy,
  mergeBoards,
  canMoveDeploy,
  moveDeploy,
  swapDeploy,
  ROWS,
  COLS,
} from "./engine.js";

function southBoard() {
  return mergeBoards(autoDeploy(SIDE.NORTH), autoDeploy(SIDE.SOUTH));
}

function southPieces(board) {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p?.side === SIDE.SOUTH) out.push({ r, c, p });
    }
  }
  return out;
}

function firstSwapPair(board) {
  const pieces = southPieces(board);
  for (const a of pieces) {
    for (const b of pieces) {
      if (a.r === b.r && a.c === b.c) continue;
      if (canMoveDeploy(board, [a.r, a.c], [b.r, b.c], SIDE.SOUTH)) {
        return [a, b];
      }
    }
  }
  return null;
}

test("auto-deploy fills 25 south stations", () => {
  const board = southBoard();
  assert.equal(southPieces(board).length, 25);
});

test("click-swap during deploy actually exchanges two pieces", () => {
  const board = southBoard();
  const pair = firstSwapPair(board);
  assert.ok(pair, "should find at least one legal swap");
  const [a, b] = pair;
  const nameA = a.p.name;
  const nameB = b.p.name;
  const idA = a.p.id;
  const idB = b.p.id;
  assert.equal(swapDeploy(board, [a.r, a.c], [b.r, b.c], SIDE.SOUTH), true);
  assert.equal(board[a.r][a.c].id, idB);
  assert.equal(board[b.r][b.c].id, idA);
  assert.equal(board[a.r][a.c].name, nameB);
  assert.equal(board[b.r][b.c].name, nameA);
});

test("moveDeploy swaps occupied stations instead of throwing", () => {
  const board = southBoard();
  const pair = firstSwapPair(board);
  assert.ok(pair);
  const [a, b] = pair;
  const idA = a.p.id;
  const idB = b.p.id;
  assert.equal(moveDeploy(board, [a.r, a.c], [b.r, b.c], SIDE.SOUTH), true);
  assert.equal(board[a.r][a.c].id, idB);
  assert.equal(board[b.r][b.c].id, idA);
});

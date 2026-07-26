/**
 * 二人军棋 · 暗棋规则引擎
 * 12×5 标准点位；行营 / 大本营 / 铁路矩形；公路一步；铁路滑行
 */

export const ROWS = 12;
export const COLS = 5;

export const SIDE = { SOUTH: "south", NORTH: "north" };

export const TYPES = {
  flag: { id: "flag", name: "军旗", rank: 0, immovable: true },
  mine: { id: "mine", name: "地雷", rank: 1, immovable: true },
  bomb: { id: "bomb", name: "炸弹", rank: 2 },
  engineer: { id: "engineer", name: "工兵", rank: 10 },
  platoon: { id: "platoon", name: "排长", rank: 20 },
  company: { id: "company", name: "连长", rank: 30 },
  battalion: { id: "battalion", name: "营长", rank: 40 },
  regiment: { id: "regiment", name: "团长", rank: 50 },
  brigade: { id: "brigade", name: "旅长", rank: 60 },
  division: { id: "division", name: "师长", rank: 70 },
  army: { id: "army", name: "军长", rank: 80 },
  commander: { id: "commander", name: "司令", rank: 90 },
};

export const FORCE_LIST = [
  "commander",
  "army",
  "division",
  "division",
  "brigade",
  "brigade",
  "regiment",
  "regiment",
  "battalion",
  "battalion",
  "company",
  "company",
  "company",
  "platoon",
  "platoon",
  "platoon",
  "engineer",
  "engineer",
  "engineer",
  "mine",
  "mine",
  "mine",
  "bomb",
  "bomb",
  "flag",
];

let _pid = 1;
export function makePiece(typeId, side) {
  const t = TYPES[typeId];
  return {
    id: _pid++,
    type: typeId,
    name: t.name,
    rank: t.rank,
    side,
    revealed: false,
    immovable: !!t.immovable,
  };
}

export function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < ROWS && c < COLS;
}

export function key(r, c) {
  return `${r},${c}`;
}

/** 行营：每方 5 个 */
export const CAMPS = new Set([
  "2,1",
  "2,3",
  "3,2",
  "4,1",
  "4,3",
  "7,1",
  "7,3",
  "8,2",
  "9,1",
  "9,3",
]);

export const HQ = {
  north: [
    [0, 1],
    [0, 3],
  ],
  south: [
    [11, 1],
    [11, 3],
  ],
};

export function isCamp(r, c) {
  return CAMPS.has(key(r, c));
}

export function isHQ(r, c, side) {
  if (side) return HQ[side].some(([hr, hc]) => hr === r && hc === c);
  return isHQ(r, c, SIDE.NORTH) || isHQ(r, c, SIDE.SOUTH);
}

/**
 * 铁路点：各方形成矩形快行区 + 两侧跨前线
 * （对齐常见陆军棋纸 / 可玩拓扑）
 */
export const RAILWAYS = new Set([
  // 北矩形
  "1,0",
  "1,1",
  "1,2",
  "1,3",
  "1,4",
  "2,0",
  "2,4",
  "3,0",
  "3,4",
  "4,0",
  "4,1",
  "4,2",
  "4,3",
  "4,4",
  // 跨前线两侧
  "5,0",
  "5,4",
  "6,0",
  "6,4",
  // 南矩形
  "7,0",
  "7,1",
  "7,2",
  "7,3",
  "7,4",
  "8,0",
  "8,4",
  "9,0",
  "9,4",
  "10,0",
  "10,1",
  "10,2",
  "10,3",
  "10,4",
]);

export function isRail(r, c) {
  return RAILWAYS.has(key(r, c));
}

/**
 * 邻接：正交公路（前线仅 0/2/4 列贯通）+ 行营对角 + 前线斜线
 */
export function getNeighbors(r, c) {
  const neighbors = [];
  const seen = new Set();

  function add(nr, nc, type) {
    if (!inBounds(nr, nc)) return;
    const k = key(nr, nc);
    if (seen.has(k)) return;
    seen.add(k);
    neighbors.push({ r: nr, c: nc, type });
  }

  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds(nr, nc)) continue;
    // 前线：仅左中右三路正交贯通
    if ((r === 5 && nr === 6) || (r === 6 && nr === 5)) {
      if (c === 0 || c === 2 || c === 4) add(nr, nc, "orthogonal");
      continue;
    }
    add(nr, nc, "orthogonal");
  }

  // 前线斜线（X 通道）
  if (r === 5 && c === 0) add(6, 2, "diagonal");
  if (r === 5 && c === 2) {
    add(6, 0, "diagonal");
    add(6, 4, "diagonal");
  }
  if (r === 5 && c === 4) add(6, 2, "diagonal");
  if (r === 6 && c === 0) add(5, 2, "diagonal");
  if (r === 6 && c === 2) {
    add(5, 0, "diagonal");
    add(5, 4, "diagonal");
  }
  if (r === 6 && c === 4) add(5, 2, "diagonal");

  // 行营四角连通
  if (isCamp(r, c)) {
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      add(r + dr, c + dc, "diagonal");
    }
  }

  // 非行营对角进入行营
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc) && isCamp(nr, nc)) add(nr, nc, "diagonal");
  }

  return neighbors;
}

/** @deprecated 兼容旧调用 */
export function highwayNeighbors(r, c) {
  return getNeighbors(r, c).map((n) => [n.r, n.c]);
}

export function railNeighbors(r, c) {
  if (!isRail(r, c)) return [];
  return getNeighbors(r, c)
    .filter((n) => isRail(n.r, n.c))
    .map((n) => [n.r, n.c]);
}

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function deploySlots(side) {
  const slots = [];
  const rows = side === SIDE.SOUTH ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) {
      if (isCamp(r, c)) continue;
      slots.push([r, c]);
    }
  }
  return slots;
}

export function autoDeploy(side) {
  const board = createEmptyBoard();
  const pieces = FORCE_LIST.map((t) => makePiece(t, side));
  const slots = deploySlots(side);
  const hq = HQ[side];

  const flag = pieces.find((p) => p.type === "flag");
  const hqPick = hq[Math.floor(Math.random() * hq.length)];
  board[hqPick[0]][hqPick[1]] = flag;

  const used = new Set([key(hqPick[0], hqPick[1])]);
  const restSlots = slots.filter(([r, c]) => !used.has(key(r, c)));

  const backRows = side === SIDE.SOUTH ? new Set([10, 11]) : new Set([0, 1]);
  const frontRow = side === SIDE.SOUTH ? 6 : 5;

  const mines = pieces.filter((p) => p.type === "mine");
  const bombs = pieces.filter((p) => p.type === "bomb");
  const others = pieces.filter(
    (p) => p.type !== "flag" && p.type !== "mine" && p.type !== "bomb"
  );

  function takeSlot(pred) {
    const idx = restSlots.findIndex(([r, c]) => pred(r, c));
    if (idx < 0) return restSlots.shift();
    return restSlots.splice(idx, 1)[0];
  }

  for (const m of mines) {
    const s = takeSlot((r) => backRows.has(r));
    if (s) board[s[0]][s[1]] = m;
  }
  for (const b of bombs) {
    const s = takeSlot((r) => r !== frontRow);
    if (s) board[s[0]][s[1]] = b;
  }
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  for (const p of others) {
    const s = restSlots.shift();
    if (s) board[s[0]][s[1]] = p;
  }

  // 大本营内棋子开局即锁定
  for (const [hr, hc] of hq) {
    const p = board[hr][hc];
    if (p) p.immovable = true;
  }
  return board;
}

export function mergeBoards(north, south) {
  const b = createEmptyBoard();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      b[r][c] = north[r][c] || south[r][c] || null;
    }
  }
  return b;
}

export function resolveCombat(attacker, defender) {
  const removed = [];
  let survivor = null;
  let winSide = null;

  attacker.revealed = true;
  defender.revealed = true;

  if (defender.type === "flag") {
    removed.push(defender);
    survivor = attacker;
    winSide = attacker.side;
    return { survivor, removed, winSide };
  }

  if (attacker.type === "bomb" || defender.type === "bomb") {
    removed.push(attacker, defender);
    return { survivor: null, removed, winSide: null };
  }

  if (defender.type === "mine") {
    if (attacker.type === "engineer") {
      removed.push(defender);
      survivor = attacker;
    } else {
      removed.push(attacker);
      survivor = defender;
    }
    return { survivor, removed, winSide: null };
  }

  if (attacker.rank > defender.rank) {
    removed.push(defender);
    survivor = attacker;
  } else if (attacker.rank < defender.rank) {
    removed.push(attacker);
    survivor = defender;
  } else {
    removed.push(attacker, defender);
  }
  return { survivor, removed, winSide: null };
}

function canStopOrAttack(board, side, tr, tc) {
  const t = board[tr][tc];
  if (!t) return { ok: true, attack: false };
  if (t.side === side) return { ok: false };
  if (isCamp(tr, tc)) return { ok: false };
  return { ok: true, attack: true };
}

function railStraightMoves(board, side, r, c) {
  const moves = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dr, dc] of dirs) {
    let pr = r;
    let pc = c;
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc) && isRail(nr, nc)) {
      if (!railNeighbors(pr, pc).some(([a, b]) => a === nr && b === nc)) break;
      const check = canStopOrAttack(board, side, nr, nc);
      if (!check.ok) break;
      moves.push({
        from: [r, c],
        to: [nr, nc],
        attack: !!check.attack,
        rail: true,
      });
      if (check.attack) break;
      pr = nr;
      pc = nc;
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

function railEngineerMoves(board, side, r, c) {
  const moves = [];
  const queue = [[r, c]];
  const seen = new Set([key(r, c)]);
  while (queue.length) {
    const [cr, cc] = queue.shift();
    for (const [nr, nc] of railNeighbors(cr, cc)) {
      const k = key(nr, nc);
      if (seen.has(k)) continue;
      seen.add(k);
      const check = canStopOrAttack(board, side, nr, nc);
      if (!check.ok) continue;
      moves.push({
        from: [r, c],
        to: [nr, nc],
        attack: !!check.attack,
        rail: true,
      });
      if (!check.attack) queue.push([nr, nc]);
    }
  }
  return moves;
}

export function listMoves(board, side) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.side !== side || p.immovable) continue;

      for (const n of getNeighbors(r, c)) {
        const check = canStopOrAttack(board, side, n.r, n.c);
        if (!check.ok) continue;
        moves.push({
          from: [r, c],
          to: [n.r, n.c],
          attack: !!check.attack,
        });
      }

      if (!isRail(r, c)) continue;
      const railMoves =
        p.type === "engineer"
          ? railEngineerMoves(board, side, r, c)
          : railStraightMoves(board, side, r, c);
      moves.push(...railMoves);
    }
  }

  const uniq = new Map();
  for (const m of moves) uniq.set(`${m.from}-${m.to}`, m);
  return [...uniq.values()];
}

export function revealFlagIfCommanderLost(board, side, removed) {
  if (!removed.some((p) => p.side === side && p.type === "commander")) return;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.side === side && p.type === "flag") {
        p.revealed = true;
        p.flagExposed = true;
      }
    }
  }
}

export function applyMove(board, move) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const attacker = board[fr][fc];
  const defender = board[tr][tc];
  const next = board.map((row) => row.slice());
  let winSide = null;
  let combat = null;

  if (!defender) {
    next[tr][tc] = attacker;
    next[fr][fc] = null;
    if (isHQ(tr, tc)) attacker.immovable = true;
  } else {
    combat = resolveCombat(attacker, defender);
    next[fr][fc] = null;
    next[tr][tc] = combat.survivor;
    winSide = combat.winSide;
    if (combat.survivor && isHQ(tr, tc)) combat.survivor.immovable = true;
    revealFlagIfCommanderLost(next, SIDE.NORTH, combat.removed);
    revealFlagIfCommanderLost(next, SIDE.SOUTH, combat.removed);
  }
  return { board: next, combat, winSide };
}

export function hasMovable(board, side) {
  return listMoves(board, side).length > 0;
}

export function findFlag(board, side) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.side === side && p.type === "flag") return [r, c];
    }
  }
  return null;
}

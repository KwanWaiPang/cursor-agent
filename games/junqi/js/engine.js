/**
 * 二人军棋（简化铁路）
 * 棋盘 12×5；北 AI / 南 玩家；暗棋交锋直至碰撞亮明
 */

export const ROWS = 12;
export const COLS = 5;

export const SIDE = { SOUTH: "south", NORTH: "north" };

/** 兵种：rank 越大越强；特殊用 type 判断 */
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

/** 每方编制 */
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

/** 行营：不可被攻击 */
export const CAMPS = new Set([
  "2,1",
  "2,3",
  "4,1",
  "4,3",
  "7,1",
  "7,3",
  "9,1",
  "9,3",
]);

/** 大本营 */
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
  return CAMPS.has(`${r},${c}`);
}

export function isHQ(r, c, side) {
  return HQ[side].some(([hr, hc]) => hr === r && hc === c);
}

/** 铁路格 */
export function isRail(r, c) {
  if (c === 0 || c === 4) return true;
  if (r === 1 || r === 5 || r === 6 || r === 10) return true;
  return false;
}

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function key(r, c) {
  return `${r},${c}`;
}

/** 部署区空位 */
export function deploySlots(side) {
  const slots = [];
  const rows = side === SIDE.SOUTH ? [6, 7, 8, 9, 10, 11] : [0, 1, 2, 3, 4, 5];
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) {
      // 行营不放置
      if (isCamp(r, c)) continue;
      slots.push([r, c]);
    }
  }
  return slots;
}

/**
 * 自动布阵
 * 军旗必在大本营；地雷靠后两排；炸弹不在最前排
 */
export function autoDeploy(side) {
  const board = createEmptyBoard();
  const pieces = FORCE_LIST.map((t) => makePiece(t, side));
  const slots = deploySlots(side);
  const hq = HQ[side].map(([r, c]) => [r, c]);

  // 军旗
  const flag = pieces.find((p) => p.type === "flag");
  const hqPick = hq[Math.floor(Math.random() * hq.length)];
  board[hqPick[0]][hqPick[1]] = flag;

  const used = new Set([key(hqPick[0], hqPick[1])]);
  const restSlots = slots.filter(([r, c]) => !used.has(key(r, c)));

  const backRows =
    side === SIDE.SOUTH ? new Set([10, 11]) : new Set([0, 1]);
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
  // 打乱其余
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  for (const p of others) {
    const s = restSlots.shift();
    if (s) board[s[0]][s[1]] = p;
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

/** 战斗结算：返回 { survivor, removed[], winSide? } */
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

const ORTH = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function railNeighbors(r, c) {
  const out = [];
  for (const [dr, dc] of ORTH) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc) && isRail(nr, nc) && isRail(r, c)) out.push([nr, nc]);
  }
  return out;
}

/** 生成合法走法 {from:[r,c], to:[r,c]} */
export function listMoves(board, side) {
  const moves = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.side !== side || p.immovable) continue;

      // 邻格
      for (const [dr, dc] of ORTH) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const t = board[nr][nc];
        if (!t) {
          moves.push({ from: [r, c], to: [nr, nc] });
        } else if (t.side !== side && !isCamp(nr, nc)) {
          moves.push({ from: [r, c], to: [nr, nc], attack: true });
        }
      }

      // 铁路滑行
      if (!isRail(r, c)) continue;
      const queue = [[r, c]];
      const seen = new Set([key(r, c)]);
      while (queue.length) {
        const [cr, cc] = queue.shift();
        for (const [nr, nc] of railNeighbors(cr, cc)) {
          const k = key(nr, nc);
          if (seen.has(k)) continue;
          seen.add(k);
          if (nr === r && nc === c) continue;
          const t = board[nr][nc];
          if (!t) {
            moves.push({ from: [r, c], to: [nr, nc], rail: true });
            queue.push([nr, nc]);
          } else if (t.side !== side && !isCamp(nr, nc)) {
            // 工兵可沿铁路攻击；其余也可攻击铁路尽头敌人（常见规则：非工兵铁路直走遇敌可吃）
            moves.push({ from: [r, c], to: [nr, nc], attack: true, rail: true });
          }
          // 被阻挡则不穿越
        }
      }
    }
  }
  // 去重
  const uniq = new Map();
  for (const m of moves) {
    uniq.set(`${m.from}-${m.to}`, m);
  }
  return [...uniq.values()];
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
  } else {
    combat = resolveCombat(attacker, defender);
    next[fr][fc] = null;
    next[tr][tc] = combat.survivor;
    winSide = combat.winSide;
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

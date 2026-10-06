/**
 * Build games/go/js/problems.js
 *
 * Beginner problems are original to this repo.
 * Levels 4–9 use Go Game Guru weekly problems by An Younggil (8p) and
 * David Ormerod (CC BY-NC-SA 4.0). Only the line marked Correct is kept.
 * 官子 uses Guan Zi Pu / gzp (Qing; Flygo → u-go.net).
 *
 * Modern copyrighted problem books are not included.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { GoEngine } from "../js/engine.js";

const BLACK = 1;
const WHITE = 2;

const ORIGINALS = [
  {
    id: "tactic-1-01",
    track: "tactic",
    level: 1,
    title: "提掉一子",
    prompt: "黑先。白子只剩一口气，把它提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[3, 4], [4, 3], [5, 4]],
    white: [[4, 4]],
    moves: [{ x: 4, y: 5, color: BLACK, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-1-02",
    track: "tactic",
    level: 1,
    title: "角上的两子",
    prompt: "黑先。角上两子连在一起，一口气提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[1, 0], [0, 2]],
    white: [[0, 0], [0, 1]],
    moves: [{ x: 1, y: 1, color: BLACK, replies: [] }],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-1-03",
    track: "tactic",
    level: 1,
    title: "逃出这一子",
    prompt: "黑先。自己的子被叫吃了，把气长出来。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[4, 4]],
    white: [[3, 4], [5, 4], [4, 3]],
    moves: [{ x: 4, y: 5, color: BLACK, replies: [] }],
    check: { type: "survive", at: [4, 4] },
  },
  {
    id: "tactic-1-04",
    track: "tactic",
    level: 1,
    title: "提掉相连的两子",
    prompt: "黑先。两颗白子连成一串，只剩一口气。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[3, 3], [5, 3], [3, 4], [5, 4], [4, 2]],
    white: [[4, 3], [4, 4]],
    moves: [{ x: 4, y: 5, color: BLACK, replies: [] }],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-1-05",
    track: "tactic",
    level: 1,
    title: "边上提子",
    prompt: "黑先。边上的白子没有外气了。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[1, 4], [0, 3]],
    white: [[0, 4]],
    moves: [{ x: 0, y: 5, color: BLACK, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-1-07",
    track: "tactic",
    level: 1,
    title: "上边提子",
    prompt: "黑先。上边这颗白子四周都被挡住了，只剩下面一口气。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[4, 0], [3, 1], [5, 1]],
    white: [[4, 1]],
    moves: [{ x: 4, y: 2, color: BLACK, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-1-08",
    track: "tactic",
    level: 1,
    title: "边上的单子",
    prompt: "黑先。边上一颗白子只剩一口气，把它提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[0, 1], [1, 2]],
    white: [[0, 2]],
    moves: [{ x: 0, y: 3, color: BLACK, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-1-06",
    track: "tactic",
    level: 1,
    title: "轮到白棋提子",
    prompt: "白先。这次你执白，把被叫吃的黑子提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: WHITE,
    black: [[4, 4]],
    white: [[3, 4], [4, 3], [5, 4]],
    moves: [{ x: 4, y: 5, color: WHITE, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-2-01",
    track: "tactic",
    level: 2,
    title: "连接救回",
    prompt: "黑先。左边一子只剩一口气，连到右边就能活。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[3, 4], [5, 4]],
    white: [[3, 3], [3, 5], [2, 4]],
    moves: [{ x: 4, y: 4, color: BLACK, replies: [] }],
    check: { type: "survive", at: [3, 4] },
  },
  {
    id: "tactic-2-02",
    track: "tactic",
    level: 2,
    title: "打吃再提",
    prompt: "黑先。先叫吃，白棋长出一步后，再把它提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[3, 4], [4, 3], [3, 5], [5, 5]],
    white: [[4, 4]],
    moves: [
      {
        x: 5,
        y: 4,
        color: BLACK,
        replies: [
          {
            x: 4,
            y: 5,
            color: WHITE,
            replies: [{ x: 4, y: 6, color: BLACK, replies: [] }],
          },
        ],
      },
    ],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-2-03",
    track: "tactic",
    level: 2,
    title: "提子解围",
    prompt: "黑先。自己被叫吃时，把正在叫吃的那颗白子提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[4, 4], [4, 2], [5, 3]],
    white: [[4, 3], [3, 4], [5, 4]],
    moves: [{ x: 3, y: 3, color: BLACK, replies: [] }],
    check: { type: "survive", at: [4, 4] },
  },
  {
    id: "tactic-2-04",
    track: "tactic",
    level: 2,
    title: "双打吃",
    prompt: "黑先。一着同时叫吃两块白棋。白棋救一块，你提掉另一块。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[4, 2], [3, 1], [4, 4], [3, 5]],
    white: [[3, 2], [3, 4]],
    moves: [
      {
        x: 3,
        y: 3,
        color: BLACK,
        replies: [
          {
            x: 2,
            y: 2,
            color: WHITE,
            replies: [{ x: 2, y: 4, color: BLACK, replies: [] }],
          },
          {
            x: 2,
            y: 4,
            color: WHITE,
            replies: [{ x: 2, y: 2, color: BLACK, replies: [] }],
          },
        ],
      },
    ],
    check: { type: "capture" },
  },
  {
    id: "tactic-2-05",
    track: "tactic",
    level: 2,
    title: "白先收角",
    prompt: "白先。角上两颗黑子，一口气提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: WHITE,
    black: [[0, 0], [0, 1]],
    white: [[1, 0], [0, 2]],
    moves: [{ x: 1, y: 1, color: WHITE, replies: [] }],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-2-06",
    track: "tactic",
    level: 2,
    title: "提掉眼中一子",
    prompt: "黑先。白子堵在眼位里，把最后一口气补上。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 0]],
    white: [[2, 2]],
    moves: [{ x: 2, y: 1, color: BLACK, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-3-01",
    track: "tactic",
    level: 3,
    title: "征子到边",
    prompt: "黑先。这是征子：每次都叫吃，一直追到边上提掉。另一侧不是征子。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[2, 1], [3, 2]],
    white: [[3, 1]],
    moves: [
      {
        x: 4,
        y: 1,
        color: BLACK,
        replies: [
          {
            x: 3,
            y: 0,
            color: WHITE,
            replies: [
              {
                x: 4,
                y: 0,
                color: BLACK,
                replies: [
                  {
                    x: 2,
                    y: 0,
                    color: WHITE,
                    replies: [{ x: 1, y: 0, color: BLACK, replies: [] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    check: { type: "capture", min: 3 },
  },
  {
    id: "tactic-3-02",
    track: "tactic",
    level: 3,
    title: "扑吃",
    prompt: "黑先。扑进对方的气里，直接提掉一子。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[1, 0], [3, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]],
    white: [[2, 0], [1, 2], [2, 2]],
    moves: [{ x: 2, y: 1, color: BLACK, replies: [] }],
    check: { type: "capture" },
  },
  {
    id: "tactic-3-03",
    track: "tactic",
    level: 3,
    title: "白先打吃再提",
    prompt: "白先。先叫吃，黑棋长出后，再提掉。",
    source: "馆内原创",
    size: 9,
    toPlay: WHITE,
    black: [[4, 4]],
    white: [[3, 4], [4, 3], [3, 5], [5, 5]],
    moves: [
      {
        x: 5,
        y: 4,
        color: WHITE,
        replies: [
          {
            x: 4,
            y: 5,
            color: BLACK,
            replies: [{ x: 4, y: 6, color: WHITE, replies: [] }],
          },
        ],
      },
    ],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-3-04",
    track: "tactic",
    level: 3,
    title: "一子双提",
    prompt: "黑先。一个点同时是两块白棋的最后一口气。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[4, 2], [3, 1], [2, 2], [4, 4], [3, 5], [2, 4]],
    white: [[3, 2], [3, 4]],
    moves: [{ x: 3, y: 3, color: BLACK, replies: [] }],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-3-05",
    track: "tactic",
    level: 3,
    title: "边路打吃再提",
    prompt: "黑先。和二级的打吃一样，这次换到靠左边的位置。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[1, 3], [2, 2], [1, 4], [3, 4]],
    white: [[2, 3]],
    moves: [
      {
        x: 3,
        y: 3,
        color: BLACK,
        replies: [
          {
            x: 2,
            y: 4,
            color: WHITE,
            replies: [{ x: 2, y: 5, color: BLACK, replies: [] }],
          },
        ],
      },
    ],
    check: { type: "capture", min: 2 },
  },
  {
    id: "tactic-3-06",
    track: "tactic",
    level: 3,
    title: "角上三子",
    prompt: "黑先。角上三子只剩一口气，找对那个点。",
    source: "馆内原创",
    size: 9,
    toPlay: BLACK,
    black: [[2, 0], [0, 2]],
    white: [[0, 0], [1, 0], [0, 1]],
    moves: [{ x: 1, y: 1, color: BLACK, replies: [] }],
    check: { type: "capture", min: 3 },
  },
];

function parseSgf(text) {
  let i = text.indexOf("(;");
  if (i < 0) throw new Error("no game tree");
  const s = text;
  const skipWs = () => {
    while (s[i] && /\s/.test(s[i])) i += 1;
  };
  function parseTree() {
    if (s[i] !== "(") throw new Error(`expected ( at ${i}`);
    i += 1;
    skipWs();
    const sequence = [];
    while (s[i] === ";") {
      sequence.push(parseNode());
      skipWs();
    }
    const variations = [];
    while (s[i] === "(") {
      variations.push(parseTree());
      skipWs();
    }
    if (s[i] !== ")") throw new Error(`expected ) at ${i} near ${s.slice(i, i + 40)}`);
    i += 1;
    return { sequence, variations };
  }
  function parseNode() {
    i += 1;
    skipWs();
    const props = {};
    while (s[i] && /[A-Za-z]/.test(s[i])) {
      let id = "";
      while (s[i] && /[A-Za-z]/.test(s[i])) id += s[i++];
      id = id.toUpperCase();
      const values = [];
      skipWs();
      while (s[i] === "[") {
        i += 1;
        let v = "";
        while (s[i] && s[i] !== "]") {
          if (s[i] === "\\") {
            i += 1;
            v += s[i] || "";
            if (s[i]) i += 1;
          } else {
            v += s[i++];
          }
        }
        if (s[i] === "]") i += 1;
        values.push(v);
        skipWs();
      }
      props[id] = (props[id] || []).concat(values);
      skipWs();
    }
    return props;
  }
  const games = [];
  skipWs();
  while (s[i] === "(") {
    games.push(parseTree());
    skipWs();
  }
  return games;
}

function parseCoord(raw) {
  if (!raw || raw.length < 2) return null;
  const x = raw.toLowerCase().charCodeAt(0) - 97;
  const y = raw.toLowerCase().charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x > 25 || y > 25) return null;
  return [x, y];
}

function parsePL(raw) {
  const v = String(raw || "").toLowerCase();
  if (v === "w" || v === "2" || v === "white") return WHITE;
  if (v === "b" || v === "1" || v === "black") return BLACK;
  return null;
}

function toMove(node) {
  const color = node.B ? BLACK : node.W ? WHITE : 0;
  if (!color) return null;
  const raw = (node.B || node.W)[0] || "";
  if (!raw) return null;
  const pt = parseCoord(raw);
  if (!pt) return null;
  return { x: pt[0], y: pt[1], color, replies: [] };
}

function isBad(node) {
  const raw = ((node.B || node.W || [""])[0] || "").toLowerCase();
  if (!raw) return false;
  if (node.BM) return true;
  if (!node.TR) return false;
  return node.TR.some((v) => v.toLowerCase() === raw);
}

function convertMoves(tree) {
  const seq = [];
  for (const node of tree.sequence) {
    if (node.B || node.W) seq.push(node);
  }
  const children = tree.variations.flatMap((v) => convertMoves(v));
  if (!seq.length) return children;
  for (const node of seq) {
    if (isBad(node) || !toMove(node)) return [];
  }
  let replies = children;
  for (let i = seq.length - 1; i >= 0; i -= 1) {
    const mv = toMove(seq[i]);
    mv.replies = replies;
    replies = [mv];
  }
  return replies;
}

function problemFromTree(tree) {
  const setup = { size: 19, black: [], white: [], toPlay: null };
  const seq = [];
  for (const node of tree.sequence) {
    if (node.SZ) setup.size = Number.parseInt(node.SZ[0], 10) || setup.size;
    if (node.AB) {
      for (const raw of node.AB) {
        const pt = parseCoord(raw);
        if (pt) setup.black.push(pt);
      }
    }
    if (node.AW) {
      for (const raw of node.AW) {
        const pt = parseCoord(raw);
        if (pt) setup.white.push(pt);
      }
    }
    if (node.PL) setup.toPlay = parsePL(node.PL[0]);
    if (node.B || node.W) seq.push(node);
  }
  let moves = tree.variations.flatMap((v) => convertMoves(v));
  if (seq.length) {
    if (seq.some((n) => isBad(n) || !toMove(n))) return null;
    let replies = moves;
    for (let i = seq.length - 1; i >= 0; i -= 1) {
      const mv = toMove(seq[i]);
      mv.replies = replies;
      replies = [mv];
    }
    moves = replies;
  }
  if (!moves.length) return null;
  if (!setup.toPlay) setup.toPlay = moves[0].color;
  return { ...setup, moves };
}

function lineLen(moves) {
  let n = 0;
  let cur = moves;
  while (cur?.length) {
    n += 1;
    cur = cur[0].replies;
    if (n > 48) return n;
  }
  return n;
}

function loadEngine(problem) {
  const g = new GoEngine(problem.size, 0);
  const seen = new Set();
  for (const [x, y] of problem.black) {
    if (!g.inBounds(x, y)) throw new Error(`${problem.id} black OOB ${x},${y}`);
    const k = `${x},${y}`;
    if (seen.has(k)) throw new Error(`${problem.id} overlap ${k}`);
    seen.add(k);
    g.board[y][x] = BLACK;
  }
  for (const [x, y] of problem.white) {
    if (!g.inBounds(x, y)) throw new Error(`${problem.id} white OOB ${x},${y}`);
    const k = `${x},${y}`;
    if (seen.has(k)) throw new Error(`${problem.id} overlap ${k}`);
    seen.add(k);
    g.board[y][x] = WHITE;
  }
  for (let y = 0; y < g.size; y += 1) {
    for (let x = 0; x < g.size; x += 1) {
      if (g.board[y][x] && g.getGroup(x, y).liberties.size === 0) {
        throw new Error(`${problem.id} dead stone at ${x},${y}`);
      }
    }
  }
  g.toPlay = problem.toPlay;
  g.positionHistory = [g.serialize()];
  return g;
}

function assertTree(problem) {
  const walk = (g, moves) => {
    for (const m of moves || []) {
      if (g.toPlay !== m.color) {
        throw new Error(`${problem.id} turn mismatch at ${m.x},${m.y}`);
      }
      const copy = g.clone();
      const res = copy.play(m.x, m.y);
      if (!res.ok) throw new Error(`${problem.id} illegal ${m.x},${m.y}: ${res.reason}`);
      walk(copy, m.replies);
    }
  };
  const g = loadEngine(problem);
  if (g.toPlay !== problem.moves[0].color) {
    throw new Error(`${problem.id} first move color`);
  }
  walk(g, problem.moves);
  if (problem.check) checkMain(problem);
}

function playMain(problem) {
  const g = loadEngine(problem);
  let cur = problem.moves;
  while (cur?.length) {
    const m = cur[0];
    const res = g.play(m.x, m.y);
    if (!res.ok) throw new Error(`${problem.id} main illegal ${m.x},${m.y}: ${res.reason}`);
    cur = m.replies;
  }
  return g;
}

function checkMain(problem) {
  const g = playMain(problem);
  const spec = problem.check;
  if (spec.type === "capture") {
    const n = g.captures[problem.toPlay];
    if (n < (spec.min || 1)) {
      throw new Error(`${problem.id} expected capture >= ${spec.min || 1}, got ${n}`);
    }
  } else if (spec.type === "survive") {
    const [x, y] = spec.at;
    if (g.board[y][x] !== problem.toPlay) {
      throw new Error(`${problem.id} stone died`);
    }
    if (g.getGroup(x, y).liberties.size < 2) {
      throw new Error(`${problem.id} still short of liberties`);
    }
  }
}

function loadBook(file) {
  const text = gunzipSync(readFileSync(file)).toString("utf8");
  return parseSgf(text);
}

function viable(raw, id) {
  if (!raw) return null;
  const problem = {
    id,
    track: "tactic",
    level: 1,
    title: id,
    prompt: "",
    source: "",
    size: raw.size,
    toPlay: raw.toPlay,
    black: raw.black,
    white: raw.white,
    moves: raw.moves,
  };
  try {
    assertTree(problem);
    return {
      ...problem,
      lineLen: lineLen(raw.moves),
      stones: raw.black.length + raw.white.length,
    };
  } catch {
    return null;
  }
}

function spread(items, n) {
  if (items.length <= n) return items.slice();
  const out = [];
  const used = new Set();
  for (let i = 0; i < n; i += 1) {
    let idx = Math.min(items.length - 1, Math.floor(((i + 0.5) * items.length) / n));
    while (used.has(idx) && idx + 1 < items.length) idx += 1;
    while (used.has(idx) && idx > 0) idx -= 1;
    if (used.has(idx)) break;
    used.add(idx);
    out.push(items[idx]);
  }
  return out;
}

function take(pool, pred, n, used) {
  const items = pool.filter((p) => !used.has(p.key) && pred(p));
  items.sort((a, b) => a.lineLen - b.lineLen || a.stones - b.stones || a.key.localeCompare(b.key));
  const picked = spread(items, n);
  for (const p of picked) used.add(p.key);
  return picked;
}

function decorate(picked, track, level, titleOf, promptOf, source) {
  return picked.map((p, i) => ({
    id: `${track}-${level}-${String(i + 1).padStart(2, "0")}`,
    track,
    level,
    title: titleOf(p, i),
    prompt: promptOf(p),
    source,
    size: p.size,
    toPlay: p.toPlay,
    black: p.black,
    white: p.white,
    moves: p.moves,
  }));
}

const colorName = (c) => (c === BLACK ? "黑" : "白");

function classicalPrompt(p, kind) {
  return `${colorName(p.toPlay)}先。${kind}请走出谱上的主变化。解题或官子有时还有别的正着，本题对照这一谱。`;
}

function symPoint(size, x, y, kind) {
  if (kind === 1) return [size - 1 - x, y];
  if (kind === 2) return [x, size - 1 - y];
  if (kind === 3) return [size - 1 - x, size - 1 - y];
  if (kind === 4) return [y, x];
  if (kind === 5) return [size - 1 - y, x];
  if (kind === 6) return [y, size - 1 - x];
  if (kind === 7) return [size - 1 - y, size - 1 - x];
  return [x, y];
}

function walkCanon(moves, size, kind) {
  return (moves || [])
    .map((move) => {
      const [x, y] = symPoint(size, move.x, move.y, kind);
      return `${move.color}:${x},${y}(${walkCanon(move.replies, size, kind)})`;
    })
    .join("|");
}

/** Same stones and solution after rotation or reflection count as one problem. */
function canonKey(problem) {
  const size = problem.size;
  const keys = [];
  for (let kind = 0; kind < 8; kind += 1) {
    const stones = [
      ...problem.black.map(([x, y]) => `b${symPoint(size, x, y, kind).join(",")}`),
      ...problem.white.map(([x, y]) => `w${symPoint(size, x, y, kind).join(",")}`),
    ]
      .sort()
      .join(";");
    keys.push(`${size}|${problem.toPlay}|${stones}|${walkCanon(problem.moves, size, kind)}`);
  }
  keys.sort();
  return keys[0];
}

function edgeMark(margin) {
  return margin <= 0 ? "0" : "F";
}

/** Same stones and side to play, including slides along an edge. The board edge stays part of the shape; empty space beyond it does not. */
function diagramKey(problem) {
  const size = problem.size;
  let best = null;
  for (let kind = 0; kind < 8; kind += 1) {
    const stones = [
      ...problem.black.map(([x, y]) => ["b", ...symPoint(size, x, y, kind)]),
      ...problem.white.map(([x, y]) => ["w", ...symPoint(size, x, y, kind)]),
    ];
    if (!stones.length) continue;
    const xs = stones.map((stone) => stone[1]);
    const ys = stones.map((stone) => stone[2]);
    const minx = Math.min(...xs);
    const maxx = Math.max(...xs);
    const miny = Math.min(...ys);
    const maxy = Math.max(...ys);
    const margins = [
      edgeMark(minx),
      edgeMark(size - 1 - maxx),
      edgeMark(miny),
      edgeMark(size - 1 - maxy),
    ].join("");
    const body = stones.map((stone) => `${stone[0]}${stone[1] - minx},${stone[2] - miny}`).sort().join(";");
    const key = `${problem.toPlay}|${margins}|${body}`;
    if (!best || key < best) best = key;
  }
  return best;
}

function claimDiagrams(list, seen) {
  const out = [];
  let dropped = 0;
  for (const problem of list) {
    const key = diagramKey(problem);
    if (seen.has(key)) {
      dropped += 1;
      if (dropped <= 6 && String(problem.key || "").startsWith("gzp")) {
        console.log(`gzp dup ${problem.key} stones ${problem.stones} line ${problem.lineLen} same as ${seen.get(key)}`);
      }
      continue;
    }
    seen.set(key, problem.key || problem.id);
    out.push(problem);
  }
  if (dropped) console.log(`dropped ${dropped} duplicate diagrams`);
  return out;
}

function dedupe(list, seen) {
  const out = [];
  for (const problem of list) {
    const key = canonKey(problem);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(problem);
  }
  return out;
}

function byLength(items) {
  return items.slice().sort((a, b) => a.lineLen - b.lineLen || a.stones - b.stones || a.key.localeCompare(b.key));
}

function splitBands(items, bands) {
  const sorted = byLength(items);
  return bands.map((band, index) => {
    const start = Math.floor((index * sorted.length) / bands.length);
    const end = Math.floor(((index + 1) * sorted.length) / bands.length);
    return { ...band, items: sorted.slice(start, end) };
  });
}

const seenShape = new Set();
const originals = [];
for (const level of [1, 2, 3]) {
  const batch = dedupe(
    ORIGINALS.filter((problem) => problem.level === level),
    seenShape
  );
  originals.push(
    ...batch.map((problem, index) => ({
      ...problem,
      id: `tactic-${level}-${String(index + 1).padStart(2, "0")}`,
    }))
  );
  console.log(`original L${level}: ${batch.length}`);
}
const seenDiagram = new Map();
const uniqueOriginals = [];
for (const level of [1, 2, 3]) {
  const batch = claimDiagrams(
    originals.filter((problem) => problem.level === level),
    seenDiagram
  );
  uniqueOriginals.push(
    ...batch.map((problem, index) => ({
      ...problem,
      id: `tactic-${level}-${String(index + 1).padStart(2, "0")}`,
    }))
  );
  console.log(`original kept L${level}: ${batch.length}`);
}
originals.length = 0;
originals.push(...uniqueOriginals);
ORIGINALS.length = 0;
ORIGINALS.push(...originals);

function commentOf(node) {
  return (node.C || []).join(" ").replace(/\s+/g, " ").trim();
}

function isCorrectComment(text) {
  const value = String(text || "").toLowerCase();
  if (!value.includes("correct")) return false;
  return !value.includes("incorrect") && !value.includes("not correct");
}

function movesFromTree(tree) {
  const seq = tree.sequence.filter((node) => node.B || node.W);
  const children = tree.variations.flatMap((variation) => movesFromTree(variation));
  if (!seq.length) return children;
  let replies = children;
  for (let i = seq.length - 1; i >= 0; i -= 1) {
    const move = toMove(seq[i]);
    if (!move) return [];
    move.note = commentOf(seq[i]);
    move.replies = replies;
    replies = [move];
  }
  return replies;
}

function keepCorrect(moves) {
  const kept = [];
  for (const move of moves) {
    const replies = keepCorrect(move.replies || []);
    if (!isCorrectComment(move.note) && !replies.length) continue;
    kept.push({ ...move, replies });
  }
  kept.sort((a, b) => correctRank(a.note) - correctRank(b.note));
  return kept;
}

function correctRank(note) {
  const value = String(note || "").toLowerCase();
  if (value.startsWith("correct")) return 0;
  if (value.includes("also correct")) return 1;
  return 2;
}

function goalFromComment(text, toPlay) {
  const who = toPlay === BLACK ? "黑" : "白";
  const body = String(text || "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/^(black|white) to play\.?\s*/i, "")
    .trim()
    .toLowerCase();
  if (/captur/.test(body) && /race/.test(body)) return `${who}先。这是对杀，要抢先把气收完。`;
  if (/captur/.test(body) && /two/.test(body)) return `${who}先。要把对方那两子提掉。`;
  if (/captur/.test(body) && /cutting/.test(body)) return `${who}先。要把切断的棋提掉。`;
  if (/captur/.test(body)) return `${who}先。要把该吃的棋提掉。`;
  if (/connect/.test(body)) return `${who}先。要把自己的棋连回去。`;
  if (/overplay/.test(body)) return `${who}先。对方刚才走过头了，要抓住这个机会。`;
  if (/mistake/.test(body)) return `${who}先。对方刚才那手有破绽，要抓住。`;
  if (/life|live|alive/.test(body)) return `${who}先。要把这块棋做活。`;
  if (/kill/.test(body)) return `${who}先。要把对方这块棋吃掉。`;
  if (/\bko\b/.test(body)) return `${who}先。这题会走出劫。`;
  if (/ladder/.test(body)) return `${who}先。这是征子，要一路叫吃追下去。`;
  return `${who}先。这是职业棋手出的局部题，按标出的正解下完。`;
}

function loadWeekly(dir, prefix) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sgf"))
    .sort()
    .map((name) => {
      const [tree] = parseSgf(readFileSync(`${dir}/${name}`, "utf8"));
      if (!tree) return null;
      const setup = { size: 19, black: [], white: [], toPlay: null, comment: "" };
      for (const node of tree.sequence) {
        if (node.SZ) setup.size = Number.parseInt(node.SZ[0], 10) || setup.size;
        for (const raw of node.AB || []) {
          const pt = parseCoord(raw);
          if (pt) setup.black.push(pt);
        }
        for (const raw of node.AW || []) {
          const pt = parseCoord(raw);
          if (pt) setup.white.push(pt);
        }
        if (node.PL) setup.toPlay = parsePL(node.PL[0]);
        if (node.C && !setup.comment) setup.comment = commentOf(node);
      }
      const moves = keepCorrect(movesFromTree({ sequence: [], variations: tree.variations }));
      if (!moves.length) return null;
      if (!setup.toPlay) setup.toPlay = moves[0].color;
      const problem = {
        id: `${prefix}-${name}`,
        track: "tactic",
        level: 1,
        title: name,
        prompt: goalFromComment(setup.comment, setup.toPlay),
        source: "",
        size: setup.size,
        toPlay: setup.toPlay,
        black: setup.black,
        white: setup.white,
        moves,
        key: `${prefix}-${name}`,
      };
      try {
        assertTree(problem);
      } catch {
        return null;
      }
      return { ...problem, lineLen: lineLen(moves), stones: setup.black.length + setup.white.length };
    })
    .filter((problem) => problem && problem.lineLen <= 40);
}

function tagPool(games, prefix) {
  return games
    .map((tree, index) => viable(problemFromTree(tree), `${prefix}-${index}`))
    .filter((problem) => problem && problem.lineLen <= 40)
    .map((problem, index) => ({ ...problem, key: `${prefix}-${index}`, n: index + 1 }));
}

const weeklyRoot = "/tmp/ggg/weekly-go-problems";
const weeklyEasy = claimDiagrams(dedupe(loadWeekly(`${weeklyRoot}/easy`, "easy"), seenShape), seenDiagram);
const weeklyMid = claimDiagrams(dedupe(loadWeekly(`${weeklyRoot}/intermediate`, "mid"), seenShape), seenDiagram);
const weeklyHard = claimDiagrams(dedupe(loadWeekly(`${weeklyRoot}/hard`, "hard"), seenShape), seenDiagram);
const qjzm = claimDiagrams(dedupe(tagPool(loadBook("/tmp/go-sgf/qjzm-a.sgf.gz"), "qjzm"), seenShape), seenDiagram);
const xxqj = claimDiagrams(dedupe(tagPool(loadBook("/tmp/go-sgf/xxqj.sgf.gz"), "xxqj"), seenShape), seenDiagram);
const xuanlanDir = "/tmp/go-sgf/xuanlan";
const xuanlanGames = readdirSync(xuanlanDir)
  .filter((name) => name.endsWith(".sgf"))
  .sort()
  .flatMap((name) => parseSgf(readFileSync(`${xuanlanDir}/${name}`, "utf8")));
const xuanlan = claimDiagrams(dedupe(tagPool(xuanlanGames, "xl"), seenShape), seenDiagram);
const gzp = ["gzp1", "gzp2", "gzp3"]
  .flatMap((name) =>
    loadBook(`/tmp/go-sgf/${name}.sgf.gz`).map((tree, index) => viable(problemFromTree(tree), `${name}-${index}`))
  )
  .filter(Boolean)
  .map((problem, index) => ({ ...problem, key: `gzp-${index}`, book: "gzp", n: index + 1 }));
const gzpUnique = claimDiagrams(gzp, seenDiagram);

console.log(
  `weekly easy ${weeklyEasy.length} mid ${weeklyMid.length} hard ${weeklyHard.length} qjzm ${qjzm.length} xxqj ${xxqj.length} xuanlan ${xuanlan.length} gzp ${gzp.length}`
);

function half(items) {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

const GGG_CREDIT =
  "安永吉八段与 David Ormerod，Go Game Guru 每周一题。CC BY-NC-SA 4.0，抽出正解并写成中文说明。https://github.com/gogameguru/go-problems";
const weeklyBands = [
  [4, "容易 · 前半", weeklyEasy, half(weeklyEasy)[0]],
  [5, "容易 · 后半", weeklyEasy, half(weeklyEasy)[1]],
  [6, "中等 · 前半", weeklyMid, half(weeklyMid)[0]],
  [7, "中等 · 后半", weeklyMid, half(weeklyMid)[1]],
  [8, "难 · 前半", weeklyHard, half(weeklyHard)[0]],
  [9, "难 · 后半", weeklyHard, half(weeklyHard)[1]],
];

const QJZM_SOURCE = "碁经众妙（1812，公有领域；带正解的部分来自 u-go.net / Flygo）";
const XXQJ_SOURCE = "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet，u-go.net）";
const XUANLAN_SOURCE = "玄览（公有领域；谱面转录 Flygo / u-go.net）";
const xxqjBands = splitBands(xxqj, [
  { level: 11, title: "入门" },
  { level: 12, title: "进阶" },
  { level: 13, title: "深入" },
  { level: 14, title: "长谱" },
]);

const tacticClassical = [
  ...weeklyBands.flatMap(([level, title, , items]) =>
    decorate(
      items,
      "tactic",
      level,
      (_problem, index) => `每周一题 · ${title} ${index + 1}`,
      (problem) => problem.prompt,
      GGG_CREDIT
    )
  ),
  ...decorate(
    qjzm,
    "tactic",
    10,
    (_problem, index) => `碁经众妙 · ${index + 1}`,
    (problem) => classicalPrompt(problem, "这是带正解的古典题。"),
    QJZM_SOURCE
  ),
  ...xxqjBands.flatMap((band) =>
    decorate(
      band.items,
      "tactic",
      band.level,
      (_problem, index) => `玄玄棋经 · ${band.title} ${index + 1}`,
      (problem) => classicalPrompt(problem, "这是带正解的古典题。"),
      XXQJ_SOURCE
    )
  ),
  ...decorate(
    xuanlan,
    "tactic",
    15,
    (_problem, index) => `玄览 · ${index + 1}`,
    (problem) => classicalPrompt(problem, "这是带正解的古典题。"),
    XUANLAN_SOURCE
  ),
];

const N = 20;

const usedG = new Set();
const slices = [
  [(p) => p.lineLen === 1 && p.stones <= 22, 1, "一手官子"],
  [(p) => p.lineLen === 2 && p.stones <= 28, 2, "两手收官"],
  [(p) => p.lineLen >= 3 && p.lineLen <= 4, 3, "短收官"],
  [(p) => p.lineLen >= 4 && p.lineLen <= 6, 4, "先手官子"],
  [(p) => p.lineLen >= 6 && p.lineLen <= 9, 5, "局部收官"],
  [(p) => p.lineLen >= 9 && p.lineLen <= 13, 6, "进阶官子"],
  [(p) => p.lineLen >= 13 && p.lineLen <= 18, 7, "长谱官子"],
  [(p) => p.lineLen >= 18 && p.lineLen <= 36, 8, "高段官子"],
];
let yose = [];
for (const [pred, level, name] of slices) {
  let picked = take(gzpUnique, pred, N, usedG);
  if (picked.length < N) {
    picked = picked.concat(
      take(gzpUnique, (p) => p.lineLen <= 6 + level * 4 && p.stones <= 24 + level * 6, N - picked.length, usedG)
    );
  }
  console.log(`yose L${level} ${name}: ${picked.length}`);
  yose = yose.concat(
    decorate(
      picked,
      "yose",
      level,
      (_p, i) => `官子谱 · ${name} ${i + 1}`,
      (p) => classicalPrompt(p, "这是官子题。"),
      "官子谱（公有领域；谱面转录 Flygo / u-go.net）"
    )
  );
}

const PROBLEMS = [...ORIGINALS.map(({ check, ...rest }) => rest), ...tacticClassical, ...yose];

for (const p of PROBLEMS) {
  assertTree({ ...p, check: ORIGINALS.find((o) => o.id === p.id)?.check });
}

const counts = {};
for (const p of PROBLEMS) {
  const k = `${p.track}-${p.level}`;
  counts[k] = (counts[k] || 0) + 1;
}
console.log(counts);

const TRACKS = [
  {
    id: "tactic",
    name: "解题",
    intro: "局部解题。前三级是不同的基本棋形。四级到九级是每周一题。十级起是 u-go.net 上带正解的古典谱：碁经众妙、玄玄棋经、玄览。同一棋形只收一题。等级可以随时切换。",
    levels: [
      { level: 1, name: "一级 · 提子与逃气" },
      { level: 2, name: "二级 · 连接与双打" },
      { level: 3, name: "三级 · 征子与扑吃" },
      { level: 4, name: "四级 · 每周一题容易（前）" },
      { level: 5, name: "五级 · 每周一题容易（后）" },
      { level: 6, name: "六级 · 每周一题中等（前）" },
      { level: 7, name: "七级 · 每周一题中等（后）" },
      { level: 8, name: "八级 · 每周一题难（前）" },
      { level: 9, name: "九级 · 每周一题难（后）" },
      { level: 10, name: "十级 · 碁经众妙" },
      { level: 11, name: "十一级 · 玄玄棋经入门" },
      { level: 12, name: "十二级 · 玄玄棋经进阶" },
      { level: 13, name: "十三级 · 玄玄棋经深入" },
      { level: 14, name: "十四级 · 玄玄棋经长谱" },
      { level: 15, name: "十五级 · 玄览" },
    ],
  },
  {
    id: "yose",
    name: "官子",
    intro: "局部官子，不是整盘棋谱。每题说明下一手和原因；有应手就按对战继续下。等级可以随时切换，手数从短到长。",
    levels: [
      { level: 1, name: "一级 · 一手官子" },
      { level: 2, name: "二级 · 两手收官" },
      { level: 3, name: "三级 · 短收官" },
      { level: 4, name: "四级 · 先手官子" },
      { level: 5, name: "五级 · 局部收官" },
      { level: 6, name: "六级 · 进阶官子" },
      { level: 7, name: "七级 · 长谱官子" },
      { level: 8, name: "八级 · 高段官子" },
    ],
  },
];

const FILES19 = "ABCDEFGHJKLMNOPQRST";
function coordLabel(x, y, size) {
  return `${FILES19[x] || "?"}${size - y}`;
}

function neighborGroups(engine, x, y, color) {
  const seen = new Set();
  const groups = [];
  for (const [nx, ny] of engine.neighbors(x, y)) {
    if (engine.board[ny][nx] !== color) continue;
    const group = engine.getGroup(nx, ny);
    const key = group.stones.map(([sx, sy]) => `${sx},${sy}`).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push(group);
  }
  return groups;
}

function describeMove(before, after, move, res, attacker, track) {
  const who = move.color === BLACK ? "黑" : "白";
  const opp = move.color === BLACK ? WHITE : BLACK;
  const name = coordLabel(move.x, move.y, before.size);
  const defending = Boolean(attacker) && move.color !== attacker;
  if (!res?.ok) return `${who}下在 ${name}。`;
  if (res.captured?.length) {
    const reason = defending
      ? "这是对方的应手，先把能提的子提掉。"
      : "这一口就是对方最后的气，补上之后它没气了。";
    return `${who}下在 ${name}，提掉 ${res.captured.length} 子。原因：${reason}`;
  }
  const afterOpp = neighborGroups(after, move.x, move.y, opp);
  const atari = afterOpp.find((group) => group.liberties.size === 1);
  if (atari) {
    const reason = defending
      ? "对方反叫吃，下一手要应，不然这块棋会被提掉。"
      : "它只剩一口气，不应的话下一手就被提掉。";
    return `${who}下在 ${name}，把对方叫吃。原因：${reason}`;
  }
  const beforeOwn = neighborGroups(before, move.x, move.y, move.color);
  const self = after.getGroup(move.x, move.y);
  const fleeing = beforeOwn.find(
    (group) => group.liberties.size === 1 && group.liberties.has(`${move.x},${move.y}`)
  );
  if (fleeing) {
    const stillChased = self.liberties.size <= 1;
    const reason = defending
      ? stillChased
        ? "被叫吃后只能往这口气里长，长完还是被追，下一手要接着应。"
        : "被叫吃的棋只有一口气，对方把它长出去了，所以还要继续。"
      : "原来只剩一口气，先长到这里，不然会被提掉。";
    return `${who}下在 ${name}，把被叫吃的棋长出去。原因：${reason}`;
  }
  const saved = beforeOwn.some((group) => group.liberties.size <= 1 && self.liberties.size >= 2);
  if (saved) {
    const reason = defending
      ? "被叫吃的棋只有一口气，对方把它长出或连上，所以还要继续。"
      : "原来只剩一口气，不走就会被提掉。";
    return `${who}下在 ${name}，把被叫吃的棋连出或长气。原因：${reason}`;
  }
  if (beforeOwn.length >= 2) {
    return defending
      ? `${who}下在 ${name}，把己方的棋连上。原因：这是被追时的应手，连上以后你还要继续。`
      : `${who}下在 ${name}，把分开的棋连在一起。原因：连上之后这块棋的气就多了，后面的变化才成立。`;
  }
  const squeezed = afterOpp
    .map((group) => {
      const key = group.stones.map(([sx, sy]) => `${sx},${sy}`).sort().join("|");
      const prev = neighborGroups(before, move.x, move.y, opp).find(
        (item) => item.stones.map(([sx, sy]) => `${sx},${sy}`).sort().join("|") === key
      );
      if (!prev || prev.liberties.size <= group.liberties.size) return null;
      return { from: prev.liberties.size, to: group.liberties.size };
    })
    .find(Boolean);
  if (squeezed) {
    return defending
      ? `${who}下在 ${name}，紧对方的气。原因：气从 ${squeezed.from} 口减到 ${squeezed.to} 口，这是谱上的应手。`
      : `${who}下在 ${name}，紧对方的气。原因：这块棋的气从 ${squeezed.from} 口减到 ${squeezed.to} 口，所以要先占这个点。`;
  }
  if (self.liberties.size <= 1) {
    return defending
      ? `${who}下在 ${name}，走到只剩一口气的地方。原因：这是被追着走的应手，下一手可以反提。`
      : `${who}下在 ${name}。这手看着紧，但是后面能反提，所以不是送吃。`;
  }
  const edgeX = move.x === 0 || move.x === before.size - 1;
  const edgeY = move.y === 0 || move.y === before.size - 1;
  const nearEdge = move.x <= 1 || move.y <= 1 || move.x >= before.size - 2 || move.y >= before.size - 2;
  const where = edgeX && edgeY ? "角上" : edgeX || edgeY ? "边上" : nearEdge ? "靠近边角" : "中腹";
  let diagOwn = 0;
  let diagOpp = 0;
  for (const [dx, dy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const nx = move.x + dx;
    const ny = move.y + dy;
    if (!before.inBounds(nx, ny)) continue;
    if (before.board[ny][nx] === move.color) diagOwn += 1;
    else if (before.board[ny][nx]) diagOpp += 1;
  }
  const bits = [];
  if (afterOpp.length) bits.push("贴着对方");
  if (beforeOwn.length) bits.push("挨着自己的棋");
  if (!afterOpp.length && diagOpp) bits.push("斜向对着对方");
  if (!beforeOwn.length && diagOwn) bits.push("斜向靠着自己");
  const contact = bits.join("，") || "周围暂时没有直接相连的棋";
  const job = track === "yose" ? "先把这个官子点占住" : "先把这个要点占住";
  return defending
    ? `${who}下在 ${name}。原因：对方应在${where}，${contact}，守住谱上要守的点。`
    : `${who}下在 ${name}。原因：${job}。这一手在${where}，${contact}。`;
}

function terminalHint(note) {
  const text = String(note || "").toLowerCase();
  if (!text.includes("correct")) return "";
  if (text.includes("double ko")) return "谱上标成双方都做成双活。";
  if (text.includes("seki")) return "谱上标成双方都做成双活。";
  if (text.includes("ladder")) return "谱上标成这是征子。";
  if (text.includes("capturing race")) return "谱上标成对杀是这边快。";
  if (text.includes("miai")) return "谱上标成两点见合。";
  if (/\bko\b/.test(text)) return "谱上标成这手之后是劫。";
  return "";
}

function annotateTree(engine, moves, attacker, track) {
  for (const move of moves || []) {
    const copy = engine.clone();
    const res = copy.play(move.x, move.y);
    move.why = describeMove(engine, copy, move, res, attacker, track);
    const extra = terminalHint(move.note);
    if (extra) move.why = `${move.why} ${extra}`;
    delete move.note;
    if (move.replies?.length && res.ok) annotateTree(copy, move.replies, attacker, track);
  }
}

function mainLineNodes(moves) {
  const line = [];
  let cur = moves;
  let guard = 0;
  while (cur?.length && guard < 80) {
    line.push(cur[0]);
    cur = cur[0].replies;
    guard += 1;
  }
  return line;
}

function annotateProblem(problem) {
  const engine = loadEngine({ ...problem, id: problem.id || "annotate" });
  annotateTree(engine, problem.moves, problem.toPlay, problem.track);
  const line = mainLineNodes(problem.moves);
  const who = problem.toPlay === BLACK ? "黑" : "白";
  const ownMoves = line.filter((move) => move.color === problem.toPlay);
  const fight = ownMoves.length > 1;
  const first = ownMoves[0];
  const solverText = ownMoves.map((move) => move.why || "").join(" ");
  const hasCap = /提掉 \d+ 子/.test(solverText);
  const hasSave = /长气|长出去|连出|连在一起|连上/.test(solverText);
  const hasAtari = solverText.includes("把对方叫吃");
  const hasSqueeze = solverText.includes("紧对方的气");
  const yose = problem.track === "yose";
  const goal = /征子/.test(solverText)
    ? "一路叫吃，把征子走完"
    : /对杀/.test(solverText)
      ? "在对杀里抢先收气"
      : /双活/.test(solverText)
        ? "把这块棋走成双活"
        : /见合/.test(solverText)
          ? "占住见合的要点"
          : /劫/.test(solverText)
            ? "把这手走成劫"
            : hasSave && hasCap
              ? "先把危险的棋连回，再把对方吃掉"
              : hasCap
                ? fight
                  ? "把这段对战里该吃的棋提掉"
                  : "把该吃的棋提掉"
                : hasSave
                  ? "先把危险的棋连回"
                  : hasAtari
                    ? fight
                      ? "先叫吃，再把对方的应手下完"
                      : "把对方叫吃"
                    : hasSqueeze
                      ? yose
                        ? "把对方的官子气收紧"
                        : "把对方的气收紧"
                      : yose
                        ? fight
                          ? "把这个官子收完"
                          : "把这个官子占住"
                        : fight
                          ? "占住这边的要点，再应完对方"
                          : "占住这一手的要点";
  const branches = first?.replies?.length || 0;
  const battle = fight
    ? `这是对战，对方应一手，你再继续。${branches > 1 ? "对方有几种应手，这里先走谱上的第一种。" : ""}`
    : "";
  const next = first?.why ? `下一手：${first.why}` : "";
  const hasOwnGoal = problem.prompt && !problem.prompt.includes("请走出谱上的主变化");
  const genericWeekly = /按标出的正解下完/.test(problem.prompt || "");
  const authored = hasOwnGoal && !genericWeekly
    ? problem.prompt.replace(/。+$/u, "")
    : `${who}先。目标是${goal}`;
  const face = `${authored}。${battle}`.replace(/。+$/u, "。");
  problem.prompt = face;
  problem.explain = next ? `${face}${next}` : face;
  problem.lesson = ownMoves.map((move, index) => `第${index + 1}手，${move.why}`).join("");
  delete problem.check;
}

for (const problem of PROBLEMS) annotateProblem(problem);

const body = `/**
 * 围棋练习题。入门三级为馆内原创；四级起为公有领域古典解题与官子。
 * 由 games/go/tools/build-problems.mjs 生成。不要手改古典题坐标。
 * 每题的 prompt 只写目标。坐标和原因在每步 why 里，走完后写入 lesson。
 *
 * 解题四级起：Go Game Guru 每周一题，安永吉八段与 David Ormerod。
 * 许可 CC BY-NC-SA 4.0：https://creativecommons.org/licenses/by-nc-sa/4.0/
 * 原谱 https://github.com/gogameguru/go-problems
 * 这里抽出标成 Correct 的正解，写成中文目标，属于改编。
 * 十级起另收 u-go.net 上带正解的古典谱：碁经众妙有正解的一部分、玄玄棋经、玄览。
 * 官子仍用 u-go.net 的公有领域官子谱。
 * 没有整段搬 101 围棋网、goproblems，也没有收录赵治勋、李昌镐的现代题集。
 */
export const TRACKS = ${JSON.stringify(TRACKS, null, 2)};

export const PROBLEMS = ${JSON.stringify(PROBLEMS, null, 2)};
`;

writeFileSync(new URL("../js/problems.js", import.meta.url), body);
console.log(`wrote ${PROBLEMS.length} problems`);

/**
 * Build games/go/js/problems.js
 *
 * Beginner problems are original to this repo.
 * Higher ranks use public-domain classical collections, with solution lines
 * taken from the SGF transcriptions Ulrich Goertz hosts (Flygo permission):
 *   - 碁经众妙 Gokyo Shumyo / qjzm-a (Hayashi Genbi, 1812)
 *   - 玄玄棋经 Xuanxuan Qijing / xxqj (Yan Defu & Yan Tianzhang, ~1349;
 *     SGF by Jean-Pierre Vesinet)
 *   - 官子谱 Guan Zi Pu / gzp (Qing; Flygo → u-go.net)
 *
 * Modern copyrighted problem books are not included.
 */
import { readFileSync, writeFileSync } from "node:fs";
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
    if (n > 80) break;
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
  return `${colorName(p.toPlay)}先。${kind}请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。`;
}

function mapXY(x, y, size, kind) {
  if (kind === "mx") return [size - 1 - x, y];
  if (kind === "my") return [x, size - 1 - y];
  if (kind === "r180") return [size - 1 - x, size - 1 - y];
  return [x, y];
}

function mapMoves(moves, size, kind) {
  return (moves || []).map((m) => {
    const [x, y] = mapXY(m.x, m.y, size, kind);
    return { ...m, x, y, replies: mapMoves(m.replies, size, kind) };
  });
}

function transformProblem(src, kind, id, title) {
  const size = src.size;
  const mapList = (pts) => pts.map(([x, y]) => mapXY(x, y, size, kind));
  const check = src.check
    ? src.check.at
      ? { ...src.check, at: mapXY(src.check.at[0], src.check.at[1], size, kind) }
      : { ...src.check }
    : undefined;
  return {
    ...src,
    id,
    title,
    black: mapList(src.black),
    white: mapList(src.white),
    moves: mapMoves(src.moves, size, kind),
    check,
  };
}

function shapeKey(p) {
  const stones = [
    ...p.black.map(([x, y]) => `b${x},${y}`),
    ...p.white.map(([x, y]) => `w${x},${y}`),
  ].sort();
  const m = p.moves[0];
  return `${p.toPlay}|${stones.join(";")}|${m.x},${m.y}`;
}

function expandOriginals(list, want) {
  const out = [];
  const seen = new Set();
  for (const kind of ["id", "mx", "my", "r180"]) {
    for (const src of list) {
      const title = kind === "id" ? src.title : `${src.title} · 换个角落`;
      const p = transformProblem(src, kind, `${src.id}-${kind}`, title);
      const key = shapeKey(p);
      if (seen.has(key)) continue;
      try {
        assertTree(p);
      } catch {
        continue;
      }
      seen.add(key);
      out.push(p);
      if (out.length >= want) return out;
    }
  }
  return out;
}

const PER_LEVEL = 12;
let originals = [];
for (const level of [1, 2, 3]) {
  const batch = expandOriginals(
    ORIGINALS.filter((p) => p.level === level),
    PER_LEVEL
  );
  originals = originals.concat(
    batch.map((p, i) => ({
      ...p,
      id: `tactic-${level}-${String(i + 1).padStart(2, "0")}`,
    }))
  );
  console.log(`original L${level}: ${batch.length}`);
}
ORIGINALS.length = 0;
ORIGINALS.push(...originals);

const qjzm = loadBook("/tmp/go-sgf/qjzm-a.sgf.gz")
  .map((t, i) => viable(problemFromTree(t), `qjzm-${i}`))
  .filter(Boolean)
  .map((p, i) => ({ ...p, key: `qjzm-${i}`, book: "qjzm", n: i + 1 }));
const xxqj = loadBook("/tmp/go-sgf/xxqj.sgf.gz")
  .map((t, i) => viable(problemFromTree(t), `xxqj-${i}`))
  .filter(Boolean)
  .map((p, i) => ({ ...p, key: `xxqj-${i}`, book: "xxqj", n: i + 1 }));
const gzp = ["gzp1", "gzp2", "gzp3"]
  .flatMap((name) =>
    loadBook(`/tmp/go-sgf/${name}.sgf.gz`).map((t, i) => viable(problemFromTree(t), `${name}-${i}`))
  )
  .filter(Boolean)
  .map((p, i) => ({ ...p, key: `gzp-${i}`, book: "gzp", n: i + 1 }));

console.log(`viable qjzm ${qjzm.length} xxqj ${xxqj.length} gzp ${gzp.length}`);

const N = PER_LEVEL;
const usedQ = new Set();
const t4 = take(qjzm, (p) => p.lineLen <= 3 && p.stones <= 18, N, usedQ);
const t5 = take(qjzm, (p) => p.lineLen >= 3 && p.lineLen <= 7 && p.stones <= 26, N, usedQ);
const t6 = take(qjzm, (p) => p.lineLen >= 6 && p.stones <= 42, N, usedQ);
const usedX = new Set();
const t7 = take(xxqj, (p) => p.lineLen >= 3 && p.lineLen <= 9 && p.stones <= 30, N, usedX);
const t8 = take(xxqj, (p) => p.lineLen >= 8 && p.stones <= 46, N, usedX);
for (const [name, bucket, pool, pred] of [
  ["t4", t4, qjzm, (p) => p.lineLen <= 8 && p.stones <= 30],
  ["t5", t5, qjzm, (p) => p.stones <= 40],
  ["t6", t6, qjzm, () => true],
  ["t7", t7, xxqj, (p) => p.lineLen <= 12 && p.stones <= 40],
  ["t8", t8, xxqj, () => true],
]) {
  if (bucket.length < N) {
    const used = name.startsWith("t7") || name.startsWith("t8") ? usedX : usedQ;
    bucket.push(...take(pool, pred, N - bucket.length, used));
  }
  console.log(name, bucket.length);
}

const tacticClassical = [
  ...decorate(
    t4,
    "tactic",
    4,
    (_p, i) => `碁经众妙 · 入门 ${i + 1}`,
    (p) => classicalPrompt(p, "古典死活，适合从入门往上走。"),
    "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）"
  ),
  ...decorate(
    t5,
    "tactic",
    5,
    (_p, i) => `碁经众妙 · 进阶 ${i + 1}`,
    (p) => classicalPrompt(p, "这一级手数更长。"),
    "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）"
  ),
  ...decorate(
    t6,
    "tactic",
    6,
    (_p, i) => `碁经众妙 · 深入 ${i + 1}`,
    (p) => classicalPrompt(p, "这一级更接近实战复杂死活。"),
    "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）"
  ),
  ...decorate(
    t7,
    "tactic",
    7,
    (_p, i) => `玄玄棋经 · 入门 ${i + 1}`,
    (p) => classicalPrompt(p, "玄玄棋经是高段死活。"),
    "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）"
  ),
  ...decorate(
    t8,
    "tactic",
    8,
    (_p, i) => `玄玄棋经 · 深入 ${i + 1}`,
    (p) => classicalPrompt(p, "手数更长的玄玄棋经。"),
    "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）"
  ),
];

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
  let picked = take(gzp, pred, N, usedG);
  if (picked.length < N) {
    picked = picked.concat(
      take(gzp, (p) => p.lineLen <= 6 + level * 4 && p.stones <= 24 + level * 6, N - picked.length, usedG)
    );
  }
  console.log(`yose L${level} ${name}: ${picked.length}`);
  yose = yose.concat(
    decorate(
      picked,
      "yose",
      level,
      (_p, i) => `官子谱 · ${name} ${i + 1}`,
      (p) => classicalPrompt(p, "这是官子残局。"),
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
    name: "死活战术",
    intro: "局部死活。等级可以随时切换，不必解锁。一到三级是入门形，后面是古典死活。",
    levels: [
      { level: 1, name: "一级 · 提子与逃气" },
      { level: 2, name: "二级 · 连接与双打" },
      { level: 3, name: "三级 · 征子与扑吃" },
      { level: 4, name: "四级 · 碁经众妙入门" },
      { level: 5, name: "五级 · 碁经众妙进阶" },
      { level: 6, name: "六级 · 碁经众妙深入" },
      { level: 7, name: "七级 · 玄玄棋经入门" },
      { level: 8, name: "八级 · 玄玄棋经深入" },
    ],
  },
  {
    id: "yose",
    name: "官子残局",
    intro: "局部官子，不是整盘棋谱。等级可以随时切换。手数从短到长。",
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

const body = `/**
 * 围棋练习题。入门三级为馆内原创；四级起为公有领域古典死活与官子。
 * 由 games/go/tools/build-problems.mjs 生成。不要手改古典题坐标。
 *
 * 来源：
 * - 碁经众妙 Gokyo Shumyo（Hayashi Genbi，1812）
 * - 玄玄棋经 Xuanxuan Qijing（严德甫、晏天章，约 1349；SGF：Jean-Pierre Vesinet）
 * - 官子谱（公有领域；Flygo 转录，Ulrich Goertz 汇总于 u-go.net）
 * 未收录近代受版权保护的死活题集。
 */
export const TRACKS = ${JSON.stringify(TRACKS, null, 2)};

export const PROBLEMS = ${JSON.stringify(PROBLEMS, null, 2)};
`;

writeFileSync(new URL("../js/problems.js", import.meta.url), body);
console.log(`wrote ${PROBLEMS.length} problems`);

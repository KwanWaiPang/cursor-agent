/**
 * Build games/go/js/kifu.js from public-domain full-board records.
 *
 * Sources (Andries Brouwer, CWI: "I do not claim any rights on this
 * collection. The games here are in the public domain."):
 *   https://homepages.cwi.nl/~aeb/go/games/
 * - 当湖十局、清代名局、烂柯：ancient/old_chinese
 * - 秀策耳赤之局与御城棋：Shusaku
 * - 道策御城棋：Dosaku
 *
 * Only 19×19 games whose main line replays legally on this engine are kept.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { GoEngine } from "../js/engine.js";

const BLACK = 1;
const WHITE = 2;

const FILES = [
  { file: "/tmp/kifu/cn/DH01.sgf", group: "当湖十局", title: "当湖十局 · 第一局" },
  { file: "/tmp/kifu/cn/DH02.sgf", group: "当湖十局", title: "当湖十局 · 第二局" },
  { file: "/tmp/kifu/cn/DH03.sgf", group: "当湖十局", title: "当湖十局 · 第三局" },
  { file: "/tmp/kifu/cn/DH04.sgf", group: "当湖十局", title: "当湖十局 · 第四局" },
  { file: "/tmp/kifu/cn/DH05.sgf", group: "当湖十局", title: "当湖十局 · 第五局" },
  { file: "/tmp/kifu/cn/DH06.sgf", group: "当湖十局", title: "当湖十局 · 第六局" },
  { file: "/tmp/kifu/cn/DH07.sgf", group: "当湖十局", title: "当湖十局 · 第七局" },
  { file: "/tmp/kifu/cn/DH08.sgf", group: "当湖十局", title: "当湖十局 · 第八局" },
  { file: "/tmp/kifu/cn/DH09.sgf", group: "当湖十局", title: "当湖十局 · 第九局" },
  { file: "/tmp/kifu/cn/DH10.sgf", group: "当湖十局", title: "当湖十局 · 第十局" },
  { file: "/tmp/kifu/cn/20.sgf", group: "清代名局", title: "施襄夏 对 程兰如" },
  { file: "/tmp/kifu/cn/21.sgf", group: "清代名局", title: "徐星友 对 程兰如" },
  { file: "/tmp/kifu/cn/2.sgf", group: "早期传说", title: "烂柯" },
  { file: "/tmp/kifu/126.sgf", group: "秀策名局", title: "耳赤之局", noteAt: 127 },
  { file: "/tmp/kifu/castle/245.sgf", group: "秀策御城棋", title: "御城棋 · 对安井算知" },
  { file: "/tmp/kifu/castle/270.sgf", group: "秀策御城棋", title: "御城棋 · 对伊藤松和" },
  { file: "/tmp/kifu/castle/323.sgf", group: "秀策御城棋", title: "御城棋 · 井上因硕先" },
  { file: "/tmp/kifu/castle/358.sgf", group: "秀策御城棋", title: "御城棋 · 安井算知先" },
  { file: "/tmp/kifu/dosaku/022.sgf", group: "道策御城棋", title: "道策御城棋 · 对安井算哲" },
];

const MORE = [
  ...["246", "269", "310", "311", "324", "357", "375", "388", "425", "431", "450", "451", "457", "468", "469"].map(
    (n) => ({ file: `/tmp/kifu/more/castle/${n}.sgf`, group: "秀策御城棋" })
  ),
  ...["035", "051", "059", "062", "069", "079"].map((n) => ({
    file: `/tmp/kifu/more/dosaku/${n}.sgf`,
    group: "道策御城棋",
  })),
  ...["001", "010", "020"].map((n) => ({
    file: `/tmp/kifu/more/jowa/${n}.sgf`,
    group: "江户对局",
  })),
  ...["082", "086", "093", "104", "109", "111", "120", "122", "128"].map((n) => ({
    file: `/tmp/kifu/more/dosaku2/${n}.sgf`,
    group: "道策御城棋",
  })),
  ...["cg136", "cg138", "cg139", "cg141", "cg143", "cg145", "cg147"].map((n) => ({
    file: `/tmp/kifu/more/shuhaku/${n}.sgf`,
    group: "秀伯御城棋",
  })),
  {
    file: "/tmp/kifu/more/jowa2/243.sgf",
    group: "丈和名局",
    title: "赤星因彻 对 本因坊丈和",
  },
  {
    file: "/tmp/kifu/more/jowa2/276.sgf",
    group: "丈和名局",
    title: "赤星因彻 对 本因坊丈和（1835）",
    blurb: "1835 年赤星因彻执黑对本因坊丈和的一局名局。这是 19 路全谱，可以整盘打谱。",
  },
  {
    file: "/tmp/kifu/more/jowa2/285.sgf",
    group: "丈和名局",
    title: "本因坊秀和 对 本因坊丈和",
  },
  ...["291", "292", "293"].map((n) => ({
    file: `/tmp/kifu/more/jowa2/${n}.sgf`,
    group: "丈和名局",
  })),
  ...["325", "326", "327", "328", "329", "330", "331", "332", "333", "334", "335", "336", "337", "339", "340", "341", "342", "343", "344", "345", "346", "352", "356"].map(
    (n) => ({
      file: `/tmp/kifu/more/ota/${n}.sgf`,
      group: "秀策三十番棋",
    })
  ),
  ...["434", "435", "436", "437", "438", "439", "440", "441", "443", "444"].map((n) => ({
    file: `/tmp/kifu/more/ebizawa/${n}.sgf`,
    group: "秀策对海老泽",
  })),
  ...["458", "459", "460", "461", "462", "463", "464", "465", "466", "467"].map((n) => ({
    file: `/tmp/kifu/more/murase/${n}.sgf`,
    group: "秀策对秀甫",
  })),
  ...[
    ["1", "早期传说"],
    ["3", "唐代名局"],
    ["4", "唐代名局"],
    ["5", "宋代名局"],
    ["11", "宋代名局"],
    ["12", "宋代名局"],
  ].map(([n, group]) => ({
    file: `/tmp/kifu/more/cn/${n}.sgf`,
    group,
  })),
];

for (const item of MORE) FILES.push(item);

const NAMES = [
  [/Fan Xiping/i, "范西屏"],
  [/Shi Dingan/i, "施襄夏"],
  [/Cheng Lanru/i, "程兰如"],
  [/Xu Xingyou/i, "徐星友"],
  [/Honinbo Shusaku|Yasuda Shusaku|Kuwahara Shusaku/i, "本因坊秀策"],
  [/Inoue Gennan Inseki/i, "井上幻庵因硕"],
  [/Inoue Matsumoto Inseki/i, "井上松本因硕"],
  [/Yasui Sanchi/i, "安井算知"],
  [/Ito Showa/i, "伊藤松和"],
  [/Sakaguchi Sentoku/i, "阪口仙得"],
  [/Hayashi Hakuei/i, "林柏悦"],
  [/Hayashi Yubi/i, "林有美"],
  [/Hattori Seitetsu/i, "服部正彻"],
  [/Honinbo Dosaku/i, "本因坊道策"],
  [/Yasui Chitetsu/i, "安井算哲"],
  [/An Immortal/i, "仙人"],
  [/Yasui Santetsu/i, "安井算哲"],
  [/Honinbo Jowa/i, "本因坊丈和"],
  [/Ota Yuzo/i, "太田雄藏"],
  [/Gu Shiyan/i, "顾师言"],
  [/Yan Jingshi/i, "阎景实"],
  [/Jia Xuan/i, "贾玄"],
  [/Yang Xican/i, "杨希粲"],
  [/Li Baixiang/i, "李百祥"],
  [/Guo Fan/i, "郭范"],
  [/Akaboshi Intetsu/i, "赤星因彻"],
  [/Honinbo Shuwa/i, "本因坊秀和"],
  [/Honinbo Shuhaku/i, "本因坊秀伯"],
  [/Murase Shuho/i, "村濑秀甫"],
  [/Honinbo Shuho/i, "本因坊秀甫"],
  [/Ebizawa Kenzo/i, "海老泽健造"],
  [/Yasui Shunchi/i, "安井春知"],
  [/Yasui Shuntetsu Senkaku/i, "安井春哲仙角"],
  [/Yasui Senkaku/i, "安井仙角"],
  [/Honinbo Doetsu/i, "本因坊道悦"],
  [/Inoue Shunseki/i, "井上春硕"],
  [/Hayashi Monri/i, "林门入"],
  [/Honinbo Genjo/i, "本因坊元丈"],
  [/Yang Zhonghe/i, "杨中和"],
  [/Wang Jue/i, "王珏"],
  [/Sun Shen/i, "孙侁"],
  [/Liu Zhongfu/i, "刘仲甫"],
  [/Kadono Matsunosuke/i, "葛野松之助"],
  [/Nagasaka Inosuke/i, "长坂猪之助"],
  [/Sun Ce/i, "孙策"],
  [/L[uü] Fan/i, "吕范"],
  [/Ito Naoki/i, "伊藤难西"],
];

function personName(raw) {
  const text = String(raw || "")
    .replace(/\s+\d+[dp]\b/i, "")
    .replace(/\s+Meijin\b/i, "")
    .trim();
  if (!text) return "未知";
  if (text.includes("&")) return text.split("&").map((part) => personName(part.trim())).join("、");
  for (const [re, zh] of NAMES) {
    if (re.test(text)) return zh;
  }
  const cjk = text.match(/[\u4e00-\u9fff]{2,}/);
  if (cjk) return cjk[0];
  return text;
}

function formatResult(re) {
  const v = String(re || "").trim();
  const pts = v.match(/^([BW])\+(\d+)$/i);
  if (pts) return `${pts[1].toUpperCase() === "B" ? "黑" : "白"}胜${pts[2]}目`;
  if (/^B\+R/i.test(v)) return "黑中盘胜";
  if (/^W\+R/i.test(v)) return "白中盘胜";
  if (/^B\+/i.test(v)) return "黑胜";
  if (/^W\+/i.test(v)) return "白胜";
  if (/jigo/i.test(v) || v === "0" || /^Draw$/i.test(v)) return "和棋";
  if (!v) return "结果未记";
  return v;
}

function parseSgf(text) {
  let i = text.indexOf("(;");
  if (i < 0) i = text.indexOf("(");
  if (i < 0) throw new Error("no tree");
  const s = text;
  const skip = () => {
    while (s[i] && /\s/.test(s[i])) i += 1;
  };
  function tree() {
    if (s[i] !== "(") throw new Error(`( at ${i}`);
    i += 1;
    skip();
    const sequence = [];
    while (s[i] === ";") {
      sequence.push(node());
      skip();
    }
    while (s[i] === "(") {
      tree();
      skip();
    }
    if (s[i] !== ")") throw new Error(`) at ${i}`);
    i += 1;
    return sequence;
  }
  function node() {
    i += 1;
    skip();
    const props = {};
    while (s[i] && /[A-Za-z]/.test(s[i])) {
      let id = "";
      while (s[i] && /[A-Za-z]/.test(s[i])) id += s[i++];
      id = id.toUpperCase();
      const values = [];
      skip();
      while (s[i] === "[") {
        i += 1;
        let v = "";
        while (s[i] && s[i] !== "]") {
          if (s[i] === "\\") {
            i += 1;
            v += s[i] || "";
            if (s[i]) i += 1;
          } else v += s[i++];
        }
        if (s[i] === "]") i += 1;
        values.push(v);
        skip();
      }
      props[id] = (props[id] || []).concat(values);
    }
    return props;
  }
  return tree();
}

function coord(raw) {
  if (!raw || raw.length < 2) return null;
  const x = raw.toLowerCase().charCodeAt(0) - 97;
  const y = raw.toLowerCase().charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x > 18 || y > 18) return null;
  return [x, y];
}

function loadGame(spec) {
  const text = readFileSync(spec.file, "utf8");
  const seq = parseSgf(text);
  const meta = {};
  const black = [];
  const white = [];
  const moves = [];
  for (const node of seq) {
    for (const key of ["PB", "PW", "BR", "WR", "RE", "DT", "EV", "PC", "KM", "SZ", "GC"]) {
      if (node[key] && meta[key] == null) meta[key] = node[key][0];
    }
    for (const raw of node.AB || []) {
      const pt = coord(raw);
      if (pt) black.push(pt);
    }
    for (const raw of node.AW || []) {
      const pt = coord(raw);
      if (pt) white.push(pt);
    }
    if (node.B || node.W) {
      const color = node.B ? BLACK : WHITE;
      const raw = (node.B || node.W)[0] || "";
      if (!raw) moves.push({ pass: true, color });
      else {
        const pt = coord(raw);
        if (!pt) throw new Error(`${spec.file} bad coord ${raw}`);
        moves.push({ x: pt[0], y: pt[1], color });
      }
    }
  }
  const size = Number.parseInt(meta.SZ || "19", 10) || 19;
  if (size !== 19) throw new Error(`${spec.file} size ${size}`);
  const toPlay = moves[0]?.color || BLACK;
  const g = new GoEngine(size, Number(meta.KM || 0) || 0);
  const seen = new Set();
  for (const [x, y] of black) {
    if (seen.has(`${x},${y}`)) throw new Error("overlap");
    seen.add(`${x},${y}`);
    g.board[y][x] = BLACK;
  }
  for (const [x, y] of white) {
    if (seen.has(`${x},${y}`)) throw new Error("overlap");
    seen.add(`${x},${y}`);
    g.board[y][x] = WHITE;
  }
  g.toPlay = toPlay;
  g.positionHistory = [g.serialize()];
  for (let i = 0; i < moves.length; i += 1) {
    const m = moves[i];
    if (g.toPlay !== m.color) throw new Error(`${spec.file} turn at ${i + 1}`);
    const res = m.pass ? g.pass() : g.play(m.x, m.y);
    if (!res.ok) throw new Error(`${spec.file} illegal #${i + 1}: ${res.reason}`);
  }
  if (moves.length < 40) throw new Error(`${spec.file} too short ${moves.length}`);
  if (spec.noteAt && moves[spec.noteAt - 1]) {
    moves[spec.noteAt - 1] = {
      ...moves[spec.noteAt - 1],
      note: "耳赤之手。秀策下在右边，同时照应上下。观战的医生说因硕耳朵红了，黑棋最终胜2目。",
    };
  }
  const seat = black.length + white.length > 0;
  const blackName = personName(meta.PB);
  const whiteName = personName(meta.PW);
  const handicap = Number.parseInt(meta.HA || "0", 10) || 0;
  const given = handicap >= 2 && black.length >= 3 && white.length === 0;
  const summary = spec.blurb
    ? spec.blurb
    : given
      ? `19路让${handicap}子棋。黑方先摆了 ${black.length} 子，通常白先。可以整盘打谱，看让子棋怎么走全局。`
      : seat
        ? "19路全谱。四角（或星位）已有座子，通常白先。打谱时看双方如何从全局拆边、攻逼。"
        : "19路全谱，空枰黑先。可以逐步打谱，猜下一手，或执一方跟谱；下偏后由 AI 接上。";
  let title = spec.title || `${blackName} 对 ${whiteName}`;
  title = title.replace(/吐血/g, "");
  return {
    id: spec.file.split("/").pop().replace(".sgf", "").toLowerCase() + "-" + spec.group.length,
    group: spec.group,
    title,
    blackName,
    whiteName,
    date: String(meta.DT || "").split(",")[0] || "",
    place: meta.PC || "",
    result: formatResult(meta.RE),
    komi: Number(meta.KM || 0) || 0,
    size: 19,
    toPlay,
    seat,
    summary,
    source: "公有领域棋谱，Andries Brouwer 整理（CWI）",
    black,
    white,
    moves,
  };
}

const games = [];
for (const spec of FILES) {
  try {
    readFileSync(spec.file);
  } catch {
    console.error("SKIP missing", spec.file);
    continue;
  }
  try {
    const game = loadGame(spec);
    games.push(game);
    console.log(`ok ${game.title} ${game.moves.length}手 ${game.result} 座子:${game.seat}`);
  } catch (err) {
    console.error("SKIP", spec.file, err.message);
  }
}

const GROUP_ORDER = [
  "当湖十局",
  "清代名局",
  "早期传说",
  "唐代名局",
  "宋代名局",
  "秀策名局",
  "秀策御城棋",
  "秀策三十番棋",
  "秀策对海老泽",
  "秀策对秀甫",
  "道策御城棋",
  "秀伯御城棋",
  "江户对局",
  "丈和名局",
];

const unique = [];
const ids = new Set();
const ordered = games
  .map((g, i) => ({ g, i }))
  .sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a.g.group);
    const ib = GROUP_ORDER.indexOf(b.g.group);
    const oa = ia < 0 ? GROUP_ORDER.length : ia;
    const ob = ib < 0 ? GROUP_ORDER.length : ib;
    return oa - ob || a.i - b.i;
  })
  .map((item) => item.g);
for (const g of ordered) {
  let id = g.id;
  let n = 2;
  while (ids.has(id)) id = `${g.id}-${n++}`;
  ids.add(id);
  unique.push({ ...g, id });
}

const body = `/**
 * 19 路经典全谱。解题是局部，这些是整盘。
 * 由 games/go/tools/build-kifu.mjs 生成。
 * 来源：Andries Brouwer（CWI）公开的公有领域棋谱，
 * https://homepages.cwi.nl/~aeb/go/games/
 * 含当湖十局、唐宋棋、秀策耳赤之局与御城棋、秀策番棋、道策与秀伯御城棋、丈和名局。
 */
export const KIFU_GROUPS = ${JSON.stringify([...new Set(unique.map((g) => g.group))], null, 2)};

export const KIFU = ${JSON.stringify(unique)};
`;

writeFileSync(new URL("../js/kifu.js", import.meta.url), body);
console.log(`wrote ${unique.length} games`);

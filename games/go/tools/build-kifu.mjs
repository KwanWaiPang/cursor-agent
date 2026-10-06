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
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

const EXACT_NAMES = new Map([
  ["Guo Tisheng", "过惕生"],
  ["Chen Zude", "陈祖德"],
  ["Wu Songsheng", "吴淞笙"],
  ["Chen Ximing", "陈锡明"],
  ["Nie Weiping", "聂卫平"],
  ["Ma Xiaochun", "马晓春"],
  ["Cao Dayuan", "曹大元"],
  ["Liu Xiaoguang", "刘小光"],
  ["Yu Bin", "俞斌"],
  ["Shao Weigang", "邵炜刚"],
  ["Shao Zhenzhong", "邵震中"],
  ["Wang Runan", "王汝南"],
  ["Hua Xueming", "华学明"],
  ["Jiang Zhujiu", "江铸久"],
  ["Rui Naiwei", "芮乃伟"],
  ["Chang Hao", "常昊"],
  ["Gu Li", "古力"],
  ["Kong Jie", "孔杰"],
  ["Luo Xihe", "罗洗河"],
  ["Wang Lei", "王磊"],
  ["Qiu Jun", "邱峻"],
  ["Zhou Heyang", "周鹤洋"],
  ["Chen Yaoye", "陈耀烨"],
  ["Zhou Ruiyang", "周睿羊"],
  ["Tuo Jiaxi", "柁嘉熹"],
  ["Piao Wenyao", "朴文垚"],
  ["Jiang Weijie", "江维杰"],
  ["Shi Yue", "时越"],
  ["Tang Weixing", "唐韦星"],
  ["Mi Yuting", "芈昱廷"],
  ["Fan Tingyu", "范廷钰"],
  ["Lian Xiao", "连笑"],
  ["Yang Dingxin", "杨鼎新"],
  ["Gu Zihao", "辜梓豪"],
  ["Ke Jie", "柯洁"],
  ["Xie Ke", "谢科"],
  ["Xie Erhao", "谢尔豪"],
  ["Dang Yifei", "党毅飞"],
  ["Li Xuanhao", "李轩豪"],
  ["Yu Zhiying", "於之莹"],
  ["Ding Hao", "丁浩"],
  ["Zhang Wendong", "张文东"],
  ["Hu Yaoyu", "胡耀宇"],
  ["Peng Quan", "彭荃"],
  ["Liu Xing", "刘星"],
  ["Lee Changho", "李昌镐"],
  ["Lee Sedol", "李世石"],
  ["Park Yeonghun", "朴永训"],
  ["Park Junghwan", "朴廷桓"],
  ["Cho Hunhyun", "曹薰铉"],
  ["Cho Chikun", "赵治勋"],
  ["Cho U", "张栩"],
  ["Cho Hanseung", "赵汉乘"],
  ["Yoda Norimoto", "依田纪基"],
  ["Kobayashi Koichi", "小林光一"],
  ["Kobayashi Satoru", "小林觉"],
  ["Rin Kaiho", "林海峰"],
  ["Lin Haifeng", "林海峰"],
  ["O Rissei", "王立诚"],
  ["O Meien", "王铭琬"],
  ["Kato Masao", "加藤正夫"],
  ["Iyama Yuta", "井山裕太"],
  ["Yamashita Keigo", "山下敬吾"],
  ["Takemiya Masaki", "武宫正树"],
  ["Otake Hideo", "大竹英雄"],
  ["Ishida Yoshio", "石田芳夫"],
  ["Hane Naoki", "羽根直树"],
  ["Yuki Satoshi", "结城聪"],
  ["Ichiriki Ryo", "一力辽"],
  ["Shin Jinseo", "申真谞"],
  ["Shin Minjun", "申旻埈"],
  ["Byun Sangil", "卞相壹"],
  ["Kim Jiseok", "金志锡"],
  ["Choi Cheolhan", "崔哲瀚"],
  ["Kang Dongyun", "姜东润"],
  ["Yoo Changhyuk", "刘昌赫"],
  ["Seo Bongsoo", "徐奉洙"],
  ["Won Seongjin", "元晟溱"],
  ["Mok Jinseok", "睦镇硕"],
  ["Choi Jeong", "崔精"],
  ["Na Hyun", "罗玄"],
  ["Wang Yuanjun", "王元均"],
  ["Lin Junyan", "林君谚"],
  ["Zhou Junxun", "周俊勋"],
  ["Xiao Zhenghao", "萧正浩"],
  ["Chen Shiyuan", "陈诗渊"],
  ["Fujisawa Hideyuki", "藤泽秀行"],
  ["Fujisawa Shuko", "藤泽秀行"],
  ["Sakata Eio", "坂田荣男"],
  ["Go Seigen", "吴清源"],
  ["Wu Qingyuan", "吴清源"],
  ["Hashimoto Utaro", "桥本宇太郎"],
  ["Hashimoto Shoji", "桥本昌二"],
  ["Kitani Minoru", "木谷实"],
  ["Takao Shinji", "高尾绅路"],
  ["Yamashiro Hiroshi", "山城宏"],
  ["Imamura Toshiya", "今村俊也"],
  ["Kudo Norio", "工藤纪夫"],
  ["Awaji Shuzo", "淡路修三"],
  ["Sugiuchi Masao", "杉内雅男"],
  ["Ohira Shuzo", "大平修三"],
  ["Miyazawa Goro", "宫泽吾朗"],
  ["Kajiwara Takeo", "梶原武雄"],
  ["Fujisawa Hosai", "藤泽朋斋"],
  ["Takagawa Shukaku", "高川秀格"],
  ["Takagawa Kaku", "高川格"],
  ["Maeda Nobuaki", "前田陈尔"],
  ["Ishii Kunio", "石井邦生"],
  ["Honda Kunihisa", "本田邦久"],
  ["Hane Yasumasa", "羽根泰正"],
  ["Sonoda Yuichi", "园田泰一"],
  ["Komatsu Hideki", "小松英树"],
  ["Yamada Kimio", "山田规三生"],
  ["Kono Rin", "河野临"],
  ["Shibano Toramaru", "芝野虎丸"],
  ["Ryu Shikun", "柳时熏"],
  ["Heo Yeongho", "许映皓"],
  ["Kim Myeonghoon", "金明训"],
  ["An Sungjun", "安成浚"],
  ["Tong Mengcheng", "童梦成"],
  ["Tan Xiao", "檀啸"],
  ["Xu Jiayang", "许嘉阳"],
  ["Li Qincheng", "李钦诚"],
]);

function knownName(raw) {
  const text = String(raw || "")
    .replace(/\s+\d+[dp]\b/i, "")
    .replace(/\s+Meijin\b/i, "")
    .trim();
  if (!text) return "";
  if (EXACT_NAMES.has(text)) return EXACT_NAMES.get(text);
  for (const [re, zh] of NAMES) if (re.test(text)) return zh;
  return "";
}

function personName(raw) {
  const text = String(raw || "")
    .replace(/\s+\d+[dp]\b/i, "")
    .replace(/\s+Meijin\b/i, "")
    .trim();
  if (!text) return "未知";
  if (EXACT_NAMES.has(text)) return EXACT_NAMES.get(text);
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
    for (const key of ["PB", "PW", "BR", "WR", "RE", "DT", "EV", "PC", "KM", "SZ", "GC", "HA"]) {
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
  const nameOf = spec.ancient ? ancientPerson : personName;
  const blackName = nameOf(meta.PB);
  const whiteName = nameOf(meta.PW);
  if (spec.ancient && (!blackName || !whiteName || /[A-Za-z]/.test(blackName + whiteName))) {
    throw new Error(`unnamed ${meta.PB} / ${meta.PW}`);
  }
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
  if (spec.titleExtra) title = `${title} · ${spec.titleExtra}`;
  title = title.replace(/吐血/g, "");
  return {
    id: (spec.file.includes("/cn-kifu/")
      ? spec.file.replace(/^\/tmp\/cn-kifu\/games\//, "").replace(/\.sgf$/i, "")
      : `${spec.file.split("/").pop().replace(/\.sgf$/i, "")}-${spec.group.length}`
    )
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase(),
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
    level: studyLevel(moves, black, white, meta),
    era: eraOf(spec, meta),
    rankText: rankText(meta.BR, meta.WR),
    black,
    white,
    moves,
  };
}

const DAN_DIGIT = "零一二三四五六七八九";

function danNumber(rank) {
  const found = String(rank || "").match(/(\d+)\s*[dp]/i);
  return found ? Number(found[1]) : 0;
}

function danLabel(rank) {
  const n = danNumber(rank);
  if (!n) return "";
  return `${n <= 9 ? DAN_DIGIT[n] : n}段`;
}

function rankText(blackRank, whiteRank) {
  const black = danLabel(blackRank);
  const white = danLabel(whiteRank);
  if (black && white) return `黑${black} · 白${white}`;
  if (black) return `黑${black}`;
  if (white) return `白${white}`;
  return "";
}

function studyLevel(moves, black, white, meta) {
  const handicap = Number.parseInt(meta.HA || "0", 10) || 0;
  if (handicap >= 2 || (black.length >= 2 && white.length === 0)) return "初级";
  const dans = [danNumber(meta.BR), danNumber(meta.WR)].filter((n) => n > 0);
  if (dans.length) {
    const weaker = Math.min(...dans);
    if (weaker <= 4) return "初级";
    if (weaker <= 6) return "中级";
    return "高级";
  }
  if (moves.length < 100) return "初级";
  if (moves.length < 200) return "中级";
  return "高级";
}

const CLASSIC_ERA = {
  当湖十局: "古代中国",
  清代名局: "古代中国",
  早期传说: "古代中国",
  唐代名局: "古代中国",
  宋代名局: "古代中国",
};

function eraFromYear(year) {
  if (year < 1603) return "明代及以前";
  if (year < 1716) return "江户前期";
  if (year < 1789) return "江户中期";
  if (year < 1868) return "江户后期";
  if (year < 1912) return "明治";
  if (year < 1945) return "近代";
  return "现代中国";
}

function eraOf(spec, meta) {
  if (spec.era) return spec.era;
  if (CLASSIC_ERA[spec.group]) return CLASSIC_ERA[spec.group];
  const year = Number(String(meta.DT || "").slice(0, 4));
  if (year >= 600 && year <= 2100) return eraFromYear(year);
  if (spec.eraFallback) return spec.eraFallback;
  return "其他";
}

const CHINESE_MASTERS = [
  ["Guo Tisheng", "过惕生", 8],
  ["Chen Zude", "陈祖德", 8],
  ["Wu Songsheng", "吴淞笙", 8],
  ["Chen Ximing", "陈锡明", 4],
  ["Wang Runan", "王汝南", 4],
  ["Nie Weiping", "聂卫平", 10],
  ["Ma Xiaochun", "马晓春", 10],
  ["Cao Dayuan", "曹大元", 6],
  ["Liu Xiaoguang", "刘小光", 6],
  ["Yu Bin", "俞斌", 6],
  ["Shao Weigang", "邵炜刚", 6],
  ["Shao Zhenzhong", "邵震中", 4],
  ["Hua Xueming", "华学明", 4],
  ["Jiang Zhujiu", "江铸久", 4],
  ["Rui Naiwei", "芮乃伟", 6],
  ["Zhang Wendong", "张文东", 4],
  ["Hu Yaoyu", "胡耀宇", 4],
  ["Chang Hao", "常昊", 8],
  ["Gu Li", "古力", 8],
  ["Kong Jie", "孔杰", 6],
  ["Luo Xihe", "罗洗河", 6],
  ["Wang Lei", "王磊", 4],
  ["Qiu Jun", "邱峻", 6],
  ["Zhou Heyang", "周鹤洋", 6],
  ["Peng Quan", "彭荃", 4],
  ["Liu Xing", "刘星", 4],
  ["Chen Yaoye", "陈耀烨", 8],
  ["Zhou Ruiyang", "周睿羊", 6],
  ["Tuo Jiaxi", "柁嘉熹", 6],
  ["Piao Wenyao", "朴文垚", 6],
  ["Jiang Weijie", "江维杰", 6],
  ["Shi Yue", "时越", 6],
  ["Tang Weixing", "唐韦星", 6],
  ["Mi Yuting", "芈昱廷", 6],
  ["Fan Tingyu", "范廷钰", 6],
  ["Lian Xiao", "连笑", 6],
  ["Yang Dingxin", "杨鼎新", 6],
  ["Gu Zihao", "辜梓豪", 6],
  ["Dang Yifei", "党毅飞", 4],
  ["Ke Jie", "柯洁", 8],
  ["Xie Erhao", "谢尔豪", 4],
  ["Xie Ke", "谢科", 4],
  ["Li Xuanhao", "李轩豪", 6],
  ["Ding Hao", "丁浩", 4],
  ["Yu Zhiying", "於之莹", 4],
];

function eventLabel(ev) {
  const text = String(ev || "");
  const cups = [
    [/Super\s*Go/i, "中日超级对抗"],
    [/Go Exchange|Japan-China/i, "中日交流"],
    [/Fujitsu/i, "富士通杯"],
    [/Ing/i, "应氏杯"],
    [/Samsung/i, "三星杯"],
    [/\bLG\b/i, "LG杯"],
    [/Chunlan/i, "春兰杯"],
    [/Mlily/i, "梦百合杯"],
    [/Bailing/i, "百灵杯"],
    [/Bingsheng/i, "兵圣杯"],
    [/Limin/i, "利民杯"],
    [/Nie Weiping/i, "聂卫平杯"],
    [/Mingren/i, "中日名人"],
    [/Agon/i, "阿含桐山杯"],
    [/Tengen/i, "天元"],
  ];
  for (const [re, zh] of cups) if (re.test(text)) return zh;
  return "";
}

function headerOf(file) {
  const head = readFileSync(file, "utf8").slice(0, 2500);
  if (/gogod/i.test(head)) return null;
  const prop = (key) => {
    const found = head.match(new RegExp(`${key}\\[([^\\]]*)\\]`));
    return found ? found[1].trim() : "";
  };
  return {
    pb: prop("PB"),
    pw: prop("PW"),
    dt: prop("DT"),
    ev: prop("EV"),
    re: prop("RE"),
    sz: prop("SZ"),
  };
}

function spreadPick(list, cap) {
  if (list.length <= cap) return list;
  const out = [];
  const used = new Set();
  for (let i = 0; i < cap; i += 1) {
    const idx = Math.round((i * (list.length - 1)) / (cap - 1));
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(list[idx]);
  }
  return out;
}

function chineseMasterSpecs() {
  const root = "/tmp/cn-kifu/games";
  if (!existsSync(root)) {
    console.error("SKIP chinese masters: /tmp/cn-kifu/games is missing");
    return [];
  }
  const byMaster = new Map(CHINESE_MASTERS.map(([en]) => [en, []]));
  const skipped = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name === "Go_Seigen") continue;
        walk(path);
        continue;
      }
      if (!name.endsWith(".sgf")) continue;
      const meta = headerOf(path);
      if (!meta) continue;
      if (meta.sz && meta.sz !== "19") continue;
      const hit = [meta.pb, meta.pw].filter((player) => byMaster.has(player));
      if (!hit.length) continue;
      const namesOk = [meta.pb, meta.pw].every((player) => knownName(player));
      if (!namesOk) {
        for (const player of [meta.pb, meta.pw]) {
          if (!knownName(player)) skipped.set(player, (skipped.get(player) || 0) + 1);
        }
        continue;
      }
      const owner = hit.sort((a, b) => CHINESE_MASTERS.findIndex((row) => row[0] === a) - CHINESE_MASTERS.findIndex((row) => row[0] === b))[0];
      byMaster.get(owner).push({ path, meta });
    }
  };
  walk(root);
  const specs = [];
  for (const [en, zh, cap] of CHINESE_MASTERS) {
    const rows = byMaster.get(en).sort((a, b) => String(a.meta.dt).localeCompare(String(b.meta.dt)));
    for (const row of spreadPick(rows, cap)) {
      const cup = eventLabel(row.meta.ev);
      const year = String(row.meta.dt || "").slice(0, 4);
      specs.push({
        file: row.path,
        group: zh,
        era: "现代中国",
        blurb: `${year && year !== "0000" ? `${year} 年。` : ""}${cup || "公开对局"}。19 路全谱，可以打谱或猜下一手。`,
        titleExtra: [cup, year && year !== "0000" ? year : ""].filter(Boolean).join(" · "),
      });
    }
  }
  const unseen = [...skipped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  if (unseen.length) console.log("untranslated opponents", unseen.map(([name, n]) => `${n} ${name}`).join(" | "));
  return specs;
}

for (const spec of chineseMasterSpecs()) FILES.push(spec);

const ANCIENT_GIVEN = {
  Shuwa: "秀和",
  Shuei: "秀荣",
  Shuho: "秀甫",
  Shusaku: "秀策",
  Jowa: "丈和",
  Dosaku: "道策",
  Doetsu: "道悦",
  Dochi: "道知",
  Chihaku: "知伯",
  Hakugen: "伯元",
  Genjo: "元丈",
  Sansa: "算砂",
  Sanetsu: "算悦",
  Satsugen: "察元",
  Retsugen: "烈元",
  Shuhaku: "秀伯",
  Josaku: "丈策",
  Sakugen: "策元",
  Shuetsu: "秀悦",
  Shugen: "秀元",
  Doteki: "道的",
  Sanchi: "算知",
  Santetsu: "算哲",
  Chitetsu: "知哲",
  Senkaku: "仙角",
  Shunchi: "春知",
  Shuntetsu: "春哲",
  Chitoku: "知得",
  Sanei: "算英",
  Sentetsu: "仙哲",
  Senchi: "仙知",
  Chisen: "知仙",
  Genbi: "元美",
  Monri: "门入",
  Monetsu: "门悦",
  Hakuei: "柏悦",
  Yubi: "有美",
  Yugen: "友元",
  Bokunyu: "朴入",
  Monnyu: "门入",
  Incho: "因长",
  Tetsugen: "铁元",
  Hakuetsu: "白悦",
  Tennyu: "天入",
  Genetsu: "元悦",
  Fumiko: "文子",
  Rittetsu: "立彻",
  Seitetsu: "正彻",
  Inshuku: "因硕",
  Yusetsu: "雄节",
  Hajime: "肇",
  Intetsu: "因彻",
  Yakichi: "弥吉",
  Yuzo: "雄藏",
  Showa: "松和",
  Matsujiro: "松次郎",
  Tetsujiro: "铁次郎",
  Sentoku: "仙得",
  Kamesaburo: "龟三郎",
  Sendayu: "仙太夫",
  Matsunosuke: "松之助",
  Inosuke: "猪之助",
  Hasseki: "八硕",
  Saburosuke: "三郎助",
  Genjiro: "源次郎",
  Nuiji: "缝次",
  Kaizen: "快禅",
  Taisaku: "太策",
  Kinesaburo: "金三郎",
  Iho: "伊保",
  Chitatsu: "知达",
  Yasuhisa: "安久",
  Shurei: "秀丽",
  Hanjuro: "半十郎",
  Shohei: "昌平",
  Yasujiro: "安次郎",
  Saichiro: "才一郎",
  Yonezo: "米藏",
  Kotaro: "小太郎",
  Shunsaku: "春策",
  Ginjiro: "银次郎",
  Junichi: "顺一",
  Chisaku: "知策",
  Takujun: "卓顺",
  Mototora: "元虎",
  Unosuke: "卯之助",
  Kenzo: "健造",
  Junsetsu: "顺节",
  Chiteki: "知的",
  Heijiro: "平次郎",
  Tetsunosuke: "铁之助",
  Konosuke: "幸之助",
  Torajiro: "虎次郎",
  Hosaku: "秀策",
  Mitsugoro: "满五郎",
  Tokujiro: "德次郎",
  Genkichi: "元吉",
  Kei: "圭",
  Kinemon: "喜右卫门",
  Kenryo: "见了",
  Yuseki: "幽石",
  Yohee: "与平",
  Choko: "长光",
  Suekichi: "季吉",
  Dowa: "道和",
  Josei: "女仙",
  Chuzaemon: "忠左卫门",
  Eisuke: "荣助",
  Ryosaku: "良策",
  Kaseki: "可硕",
  Shusuke: "周助",
  Ryujiro: "柳次郎",
  Hanjiro: "半次郎",
  Okisaburo: "冲三郎",
  Takanosuke: "鹰之助",
  Shutetsu: "秀彻",
  Ansetsu: "安节",
  Insetsu: "因节",
  Intatsu: "因达",
  Shuntatsu: "春达",
  Dosetsu: "道节",
  Shunseki: "春硕",
  Rigen: "理元",
  Inchiku: "因竹",
  Sano: "佐野",
  Senji: "仙次",
  Bungoemon: "文五右卫门",
  Ichiro: "一郎",
  Insa: "因砂",
  Nanko: "南湖",
  Shonosuke: "庄之助",
  Shingoemon: "新五右卫门",
  Zezan: "是山",
  Junei: "顺英",
  Sansetsu: "三节",
  Tsunejiro: "常次郎",
  Tanomo: "田之母",
  Kosaburo: "小三郎",
  Kinzaburo: "金三郎",
  Yasujiro: "安次郎",
  Kichijiro: "吉次郎",
  Hakuta: "白太",
  Gorosaku: "五郎作",
  Junsei: "顺正",
  Ueomon: "上右卫门",
  Kangoro: "勘五郎",
  Kinzo: "金藏",
  Seikichi: "清吉",
  Otojiro: "音次郎",
  Zenkichi: "善吉",
  Senko: "仙香",
  Yoneko: "米子",
  Kametaro: "龟太郎",
  Kentaro: "健太郎",
  Keijiro: "庆次郎",
  Momosaburo: "桃三郎",
  Tokuji: "德治",
  Kitoku: "喜德",
  Chuji: "忠治",
  Kosai: "光彩",
  Yoshiaki: "义明",
  Senwa: "仙和",
  Kanetaro: "金太郎",
  Junsaku: "顺策",
  Kisaburo: "喜三郎",
  Iwase: "岩濑",
  Zensaku: "善作",
  Zushonosuke: "主水助",
  Hanzo: "半藏",
  Ryuwa: "柳和",
  Yasaburo: "弥三郎",
  Daizaburo: "大三郎",
  Tamejiro: "为次郎",
  Noboru: "升",
  Shuetsu: "秀悦",
  Shutoku: "秀德",
  Suetomo: "季知",
  Sotosaburo: "外三郎",
  Genzaburo: "源三郎",
  Bunnosuke: "文之助",
  Matagoro: "又五郎",
  Takuren: "卓莲",
  Chujiro: "忠次郎",
  Takeshi: "武",
  Hachisaburo: "八三郎",
  Tsunesaburo: "常三郎",
  Satonushi: "里主",
  Kisshomaru: "吉胜丸",
  Nichiren: "日莲",
  Nobuyuki: "信幸",
  Masayuki: "昌幸",
  Masanobu: "昌信",
  Shingen: "信玄",
  Okkyun: "玉均",
  Itsuro: "逸郎",
  Iwanosuke: "岩之助",
  Heima: "平马",
  Shuhei: "周平",
  Kunitsugu: "国次",
  Toranosuke: "虎之助",
  Sukeemon: "助右卫门",
  Chiyosaburo: "千代三郎",
  Saburosuke: "三郎助",
  Shunsetsu: "顺节",
  Kurakichi: "仓吉",
  Ikkei: "一圭",
  Doseki: "道硕",
  Masaki: "正树",
  Tsunesaburo: "常三郎",
  Zensaku: "善作",
  Zushonosuke: "主水助",
  Hanzo: "半藏",
  Yasaburo: "弥三郎",
  Suetomo: "季知",
  Sotosaburo: "外三郎",
  Bunnosuke: "文之助",
  Matagoro: "又五郎",
  Chujiro: "忠次郎",
  Takeshi: "武",
  Doteki: "道的",
  Kinzo: "金藏",
  Chisen: "知仙",
  Genko: "元光",
  Bungoemon: "文五右卫门",
  Ichiro: "一郎",
  Insa: "因砂",
  Nanko: "南湖",
  Shonosuke: "庄之助",
  Shingoemon: "新五右卫门",
};

const ANCIENT_COMPOUND = {
  "Gennan Inseki": "幻庵因硕",
  "Matsumoto Inseki": "松本因硕",
  "Dosa Inseki": "道砂因硕",
  "Shunseki Inseki": "春硕因硕",
  "Shuntatsu Inseki": "春达因硕",
  "Dosetsu Inseki": "道节因硕",
  "Insa Inseki": "因砂因硕",
  "Intatsu Inseki": "因达因硕",
  "Insetsu Inseki": "因节因硕",
  "Setsuzan Inseki": "雪山因硕",
  "Shunsaku Inseki": "春策因硕",
  "Shuntetsu Senkaku": "春哲仙角",
  "Senchi Senkaku": "仙知仙角",
  "Hakuei Monnyu": "柏悦门入",
  "Tetsugen Monnyu": "铁元门入",
  "Genetsu Monnyu": "元悦门入",
  "Kadono Jowa": "本因坊丈和",
  "Tsuchiya Shuwa": "本因坊秀和",
  "Hayashi Shuei": "林秀荣",
  "Murase Yakichi": "村濑弥吉",
  "Murase Shuho": "村濑秀甫",
  "Ota Yuzo": "太田雄藏",
  "Inoue Gennan Inseki": "井上幻庵因硕",
  "Lord Sakai of Iwami": "石见酒井",
  "An Immortal": "仙人",
  "Kim Okkyun": "金玉均",
  "Yara no Satonushi": "屋良里主",
  "Nikkai, 1st Honinbo Sansa": "本因坊算砂",
  "1st Honinbo Sansa": "本因坊算砂",
};

const ANCIENT_HOUSE = [
  [/^Honinbo (.+)$/, "本因坊"],
  [/^Yasui (.+)$/, "安井"],
  [/^Inoue (.+)$/, "井上"],
  [/^Hayashi (.+)$/, "林"],
  [/^Hattori (.+)$/, "服部"],
  [/^Kadono (.+)$/, "葛野"],
  [/^Murase (.+)$/, "村濑"],
  [/^Ota (.+)$/, "太田"],
  [/^Sakaguchi (.+)$/, "阪口"],
  [/^Ito (.+)$/, "伊藤"],
  [/^Nakagawa (.+)$/, "中川"],
  [/^Tsuchiya (.+)$/, "土屋"],
  [/^Kobayashi (.+)$/, "小林"],
  [/^Sekiyama (.+)$/, "关山"],
  [/^Mizutani (.+)$/, "水谷"],
  [/^Ishii (.+)$/, "石井"],
  [/^Hoshiai (.+)$/, "星合"],
  [/^Komatsu (.+)$/, "小松"],
  [/^Yokozeki (.+)$/, "横关"],
  [/^Nagasaka (.+)$/, "长坂"],
  [/^Akaboshi (.+)$/, "赤星"],
  [/^Ebizawa (.+)$/, "海老泽"],
  [/^Kuzuno (.+)$/, "葛野"],
  [/^Nakamura (.+)$/, "中村"],
  [/^Sakai (.+)$/, "酒井"],
  [/^Kishimoto (.+)$/, "岸本"],
  [/^Kono (.+)$/, "河野"],
  [/^Shinomiya (.+)$/, "四宫"],
  [/^Kuroda (.+)$/, "黑田"],
  [/^Osawa (.+)$/, "大泽"],
  [/^Karigane (.+)$/, "雁金"],
  [/^Okunuki (.+)$/, "奥贯"],
  [/^Sakurai (.+)$/, "樱井"],
  [/^Tamura (.+)$/, "田村"],
  [/^Kajikawa (.+)$/, "梶川"],
  [/^Yoshida (.+)$/, "吉田"],
  [/^Takasaki (.+)$/, "高崎"],
  [/^Takahashi (.+)$/, "高桥"],
  [/^Hiki (.+)$/, "比企"],
  [/^Hirose (.+)$/, "广濑"],
  [/^Katayama (.+)$/, "片山"],
  [/^Saito (.+)$/, "齐藤"],
  [/^Kawakita (.+)$/, "川北"],
  [/^Iwasaki (.+)$/, "岩崎"],
  [/^Wada (.+)$/, "和田"],
  [/^Fujita (.+)$/, "藤田"],
  [/^Ozawa (.+)$/, "小泽"],
  [/^Sanai (.+)$/, "佐内"],
  [/^Yamamoto (.+)$/, "山本"],
  [/^Iwasa (.+)$/, "岩佐"],
  [/^Imai (.+)$/, "今井"],
  [/^Higuchi (.+)$/, "樋口"],
  [/^Sato (.+)$/, "佐藤"],
  [/^Kashio (.+)$/, "樫尾"],
  [/^Izumi (.+)$/, "泉"],
  [/^Umezu (.+)$/, "梅津"],
  [/^Uchigaki (.+)$/, "内垣"],
  [/^Suzuki (.+)$/, "铃木"],
  [/^Katsuta (.+)$/, "胜田"],
  [/^Tsugaru (.+)$/, "津轻"],
  [/^Aihara (.+)$/, "相原"],
  [/^Kato (.+)$/, "加藤"],
  [/^Seki (.+)$/, "关"],
  [/^Tanaka (.+)$/, "田中"],
  [/^Furuya (.+)$/, "古屋"],
  [/^Kawase (.+)$/, "川濑"],
  [/^Fukui (.+)$/, "福井"],
  [/^Narabayashi (.+)$/, "奈良林"],
  [/^Tsuruoka (.+)$/, "鹤冈"],
  [/^Funabashi (.+)$/, "船桥"],
  [/^Tahara (.+)$/, "田原"],
  [/^Wakasugi (.+)$/, "若杉"],
  [/^Yamana (.+)$/, "山名"],
  [/^Sase (.+)$/, "佐濑"],
  [/^Takegawa (.+)$/, "竹川"],
  [/^Nomura (.+)$/, "野村"],
  [/^Yamazaki (.+)$/, "山崎"],
  [/^Yoshihara (.+)$/, "吉原"],
  [/^Horie (.+)$/, "堀江"],
  [/^Ikeda (.+)$/, "池田"],
  [/^Ogawa (.+)$/, "小川"],
  [/^Nakabo (.+)$/, "中坊"],
  [/^Hasegawa (.+)$/, "长谷川"],
  [/^Fukuo (.+)$/, "福尾"],
  [/^Nakanishi (.+)$/, "中西"],
  [/^Oyama (.+)$/, "大山"],
  [/^Matsubara (.+)$/, "松原"],
  [/^Yahata (.+)$/, "八幡"],
  [/^Ishikawa (.+)$/, "石川"],
];

for (const spec of chineseMasterSpecs()) FILES.push(spec);

function ancientPerson(raw) {
  const source = String(raw || "");
  if (source.includes("&") || source.includes(",")) {
    const parts = source.split(/\s*(?:&|,)\s*/).map((part) => part.trim()).filter(Boolean);
    const names = parts.map((part) => ancientPerson(part));
    if (names.some((name) => !name)) return "";
    return names.join("、");
  }
  let text = source
    .replace(/\s+\d+[dp]\b/i, "")
    .replace(/\s+(IX|VIII|VII|VI|IV|V|III|II|I|jr\.)$/i, "")
    .replace(/^(1st|2nd|3rd|4th)\s+/i, "")
    .replace(/\s+Meijin\b/i, "")
    .trim();
  if (!text) return "";
  if (ANCIENT_COMPOUND[text]) return ANCIENT_COMPOUND[text];
  if (EXACT_NAMES.has(text)) return EXACT_NAMES.get(text);
  if (ANCIENT_GIVEN[text]) return ANCIENT_GIVEN[text];
  for (const [re, zh] of NAMES) {
    if (re.test(text)) {
      const named = personName(text);
      if (named && !/[A-Za-z]/.test(named)) return named;
    }
  }
  for (const [re, prefix] of ANCIENT_HOUSE) {
    const found = text.match(re);
    if (!found) continue;
    const rest = found[1];
    if (ANCIENT_COMPOUND[rest]) return prefix + ANCIENT_COMPOUND[rest];
    const bits = rest.split(/\s+/);
    if (bits.length === 1 && ANCIENT_GIVEN[bits[0]]) return prefix + ANCIENT_GIVEN[bits[0]];
    if (bits.length > 1 && ANCIENT_COMPOUND[rest]) return prefix + ANCIENT_COMPOUND[rest];
    const last = bits[bits.length - 1];
    if (ANCIENT_GIVEN[last] && bits.slice(0, -1).every((bit) => ANCIENT_GIVEN[bit] || bit === "Inseki")) {
      const head = bits
        .slice(0, -1)
        .map((bit) => (bit === "Inseki" ? "因硕" : ANCIENT_GIVEN[bit]))
        .join("");
      return prefix + head + ANCIENT_GIVEN[last];
    }
  }
  return "";
}

const ANCIENT_FOLDERS = {
  Honinbo_Sansa: ["本因坊算砂", "安土桃山"],
  Honinbo_Sanetsu: ["本因坊算悦", "江户前期"],
  Honinbo_Doetsu: ["本因坊道悦", "江户前期"],
  Honinbo_Dosaku: ["本因坊道策", "江户前期"],
  Honinbo_Dochi: ["本因坊道知", "江户前期"],
  Honinbo_Chihaku: ["本因坊知伯", "江户前期"],
  Honinbo_Hakugen: ["本因坊伯元", "江户前期"],
  Honinbo_Jowa: ["本因坊丈和", "江户后期"],
  Honinbo_Genjo: ["本因坊元丈", "江户后期"],
  Honinbo_Satsugen: ["本因坊察元", "江户后期"],
  Honinbo_Retsugen: ["本因坊烈元", "江户后期"],
  Honinbo_Shuwa: ["本因坊秀和", "江户后期"],
  Honinbo_Shuhaku: ["本因坊秀伯", "江户后期"],
  Honinbo_Shuho: ["本因坊秀甫", "明治"],
  Honinbo_Shuei: ["本因坊秀荣", "明治"],
  Honinbo_Shugen: ["本因坊秀元", "明治"],
  Hayashi_Genbi: ["林元美", "江户后期"],
  Sekiyama_Sendayu: ["关山仙太夫", "江户后期"],
  Hoshiai_Hasseki: ["星合八硕", "江户前期"],
  Komatsu_Kaizen: ["小松快禅", "江户前期"],
  Yokozeki_Iho: ["横关伊保", "江户前期"],
  castle: ["御城棋", ""],
  old_chinese: ["古代中国", "古代中国"],
};

function ancientSpecs() {
  const root = "/tmp/ancient-sgf/games/ancient";
  if (!existsSync(root)) {
    console.error("SKIP ancient: /tmp/ancient-sgf/games/ancient is missing");
    return [];
  }
  const specs = [];
  const skipped = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!name.endsWith(".sgf")) continue;
      const folder = dir.slice(root.length).split("/").filter(Boolean)[0] || "";
      const mapped = ANCIENT_FOLDERS[folder];
      const group = mapped ? mapped[0] : "古代散局";
      const eraFallback = mapped ? mapped[1] : "明代及以前";
      const head = readFileSync(path, "utf8").slice(0, 1600);
      if (/gogod/i.test(head)) continue;
      const pb = (head.match(/PB\[([^\]]*)\]/) || [])[1] || "";
      const pw = (head.match(/PW\[([^\]]*)\]/) || [])[1] || "";
      if (!ancientPerson(pb) || !ancientPerson(pw)) {
        for (const player of [pb, pw]) {
          if (player && !ancientPerson(player)) skipped.set(player, (skipped.get(player) || 0) + 1);
        }
        continue;
      }
      specs.push({
        file: path,
        group: folder === "old_chinese" ? "古代中国" : group,
        era: folder === "old_chinese" ? "古代中国" : "",
        eraFallback,
        ancient: true,
        blurb: "古代全谱。段位按谱上所记；没有段位的，让子和短谱算初级，分先长谱算高级。",
      });
    }
  };
  walk(root);
  const unseen = [...skipped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  if (unseen.length) console.log("ancient unnamed", unseen.map(([name, n]) => `${n} ${name}`).join(" | "));
  console.log(`ancient candidates ${specs.length}`);
  return specs;
}

for (const spec of ancientSpecs()) FILES.push(spec);

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
  "古代中国",
  "古代散局",
  "本因坊算砂",
  "本因坊算悦",
  "本因坊道悦",
  "本因坊道策",
  "本因坊道知",
  "本因坊知伯",
  "本因坊伯元",
  "星合八硕",
  "小松快禅",
  "横关伊保",
  "御城棋",
  "本因坊丈和",
  "本因坊元丈",
  "本因坊察元",
  "本因坊烈元",
  "本因坊秀和",
  "本因坊秀伯",
  "林元美",
  "关山仙太夫",
  "本因坊秀甫",
  "本因坊秀荣",
  "本因坊秀元",
  ...CHINESE_MASTERS.map((row) => row[1]),
];

const unique = [];
const ids = new Set();
const seenBoards = new Set();
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
let duplicateBoards = 0;
for (const g of ordered) {
  const boardKey = `${g.black.map(([x, y]) => `b${x},${y}`).join(".")}|${g.white
    .map(([x, y]) => `w${x},${y}`)
    .join(".")}|${g.moves.map((move) => (move.pass ? "p" : `${move.x},${move.y}`)).join(";")}`;
  if (seenBoards.has(boardKey)) {
    duplicateBoards += 1;
    continue;
  }
  seenBoards.add(boardKey);
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
 * 含当湖十局、唐宋棋、秀策耳赤之局与御城棋、秀策番棋、道策与秀伯御城棋、丈和名局，
 * 以及中日交流、富士通杯、应氏杯、三星杯、LG杯、春兰杯等公开赛里的中国高手对局。
 * 古代谱尽量收全本因坊家、御城棋和清代以前的中国全谱。
 * level 是打谱等级：有段位时按双方较低的一段，四段及以下为初级，五六段为中级，七段及以上为高级。
 * 没有段位时，让子和不足 100 手为初级，100 到 199 手为中级，200 手及以上为高级。
 */
export const KIFU_GROUPS = ${JSON.stringify([...new Set(unique.map((g) => g.group))], null, 2)};

export const KIFU = ${JSON.stringify(unique)};
`;

writeFileSync(new URL("../js/kifu.js", import.meta.url), body);
console.log(`wrote ${unique.length} games, skipped ${duplicateBoards} duplicate boards`);

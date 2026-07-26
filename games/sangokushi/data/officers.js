/**
 * 历史武将（汉末三国人物）
 * 五维：统 lead / 武 force / 智 int / 政 pol / 魅 charm
 * 个性为自研演绎；数值为致敬向平衡，非原作搬抄。
 */

function o(id, name, stats, traits, extra = {}) {
  const [lead, force, int, pol, charm] = stats;
  return {
    id,
    name,
    lead,
    force,
    int,
    pol,
    charm,
    traits,
    birth: extra.birth || null,
    death: extra.death || null,
    courtesy: extra.courtesy || "",
    home: extra.home || "",
    ...extra,
  };
}

export const OFFICERS = {
  // —— 曹魏 ——
  caocao: o("caocao", "曹操", [96, 72, 94, 91, 96], ["jianxiong", "xiongcai", "qinzheng"], {
    courtesy: "孟德",
    home: "沛国谯",
    birth: 155,
    death: 220,
  }),
  xiahoudun: o("xiahoudun", "夏侯惇", [90, 92, 60, 55, 70], ["yongmeng", "jianren"], {
    courtesy: "元让",
    home: "沛国谯",
  }),
  xiahouyuan: o("xiahouyuan", "夏侯渊", [88, 90, 58, 50, 62], ["tujin", "yongmeng"], {
    courtesy: "妙才",
    home: "沛国谯",
  }),
  caoren: o("caoren", "曹仁", [91, 85, 55, 52, 68], ["jianren", "yongmeng"], { courtesy: "子孝" }),
  caoHong: o("caoHong", "曹洪", [78, 82, 42, 48, 55], ["yongmeng"], { courtesy: "子廉" }),
  xuchu: o("xuchu", "许褚", [70, 97, 30, 28, 45], ["yongmeng", "jianren"], { courtesy: "仲康" }),
  dianwei: o("dianwei", "典韦", [68, 98, 28, 22, 40], ["yongmeng"], {}),
  zhangliao: o("zhangliao", "张辽", [92, 93, 72, 58, 75], ["yongmeng", "tujin", "baqi"], {
    courtesy: "文远",
  }),
  xuhuang: o("xuhuang", "徐晃", [89, 90, 65, 50, 60], ["yongmeng", "jianren"], { courtesy: "公明" }),
  zhanghe: o("zhanghe", "张郃", [90, 88, 70, 55, 62], ["yongmeng", "jizhi"], { courtesy: "儁乂" }),
  yuejin: o("yuejin", "乐进", [85, 86, 50, 45, 55], ["tujin", "yongmeng"], { courtesy: "文谦" }),
  yujin: o("yujin", "于禁", [86, 80, 62, 58, 55], ["jianren"], { courtesy: "文则" }),
  xunyu: o("xunyu", "荀彧", [60, 20, 95, 96, 88], ["qinzheng", "wenzhao", "jizhi"], {
    courtesy: "文若",
  }),
  xunyou: o("xunyou", "荀攸", [55, 18, 94, 90, 70], ["jizhi", "qinzheng"], { courtesy: "公达" }),
  guojia: o("guojia", "郭嘉", [52, 22, 98, 78, 72], ["jizhi", "qinxue"], { courtesy: "奉孝" }),
  jiaxu: o("jiaxu", "贾诩", [70, 35, 97, 85, 50], ["jizhi", "huaiyi"], { courtesy: "文和" }),
  simayi: o("simayi", "司马懿", [94, 55, 98, 95, 80], ["zhongda", "jizhi", "qinzheng"], {
    courtesy: "仲达",
  }),
  caopi: o("caopi", "曹丕", [78, 50, 82, 88, 80], ["wenzhao", "gangao"], { courtesy: "子桓" }),
  caozhi: o("caozhi", "曹植", [40, 25, 88, 70, 90], ["wenzhao", "qinxue"], { courtesy: "子建" }),

  // —— 蜀汉 ——
  liubei: o("liubei", "刘备", [80, 75, 75, 78, 99], ["renhou", "mingsheng", "xunliang"], {
    courtesy: "玄德",
    home: "涿郡",
  }),
  guanyu: o("guanyu", "关羽", [92, 98, 75, 55, 85], ["shenjiang", "yongmeng", "gangao"], {
    courtesy: "云长",
  }),
  zhangfei: o("zhangfei", "张飞", [85, 99, 45, 30, 50], ["yongmeng", "baqi", "caoshuai"], {
    courtesy: "翼德",
  }),
  zhaoyun: o("zhaoyun", "赵云", [90, 96, 70, 55, 80], ["yongmeng", "jianren", "tujin"], {
    courtesy: "子龙",
  }),
  machao: o("machao", "马超", [88, 97, 45, 35, 70], ["yongmeng", "tujin"], { courtesy: "孟起" }),
  huangzhong: o("huangzhong", "黄忠", [86, 94, 50, 40, 60], ["yongmeng"], { courtesy: "汉升" }),
  zhugeliang: o("zhugeliang", "诸葛亮", [92, 38, 100, 95, 92], ["wolong", "qinzheng", "jizhi"], {
    courtesy: "孔明",
  }),
  pangtong: o("pangtong", "庞统", [78, 40, 97, 80, 65], ["fengchu", "jizhi"], { courtesy: "士元" }),
  fazheng: o("fazheng", "法正", [72, 42, 94, 82, 55], ["jizhi", "huaiyi"], { courtesy: "孝直" }),
  weiyan: o("weiyan", "魏延", [84, 90, 60, 40, 45], ["yongmeng", "gangao"], { courtesy: "文长" }),
  jiangwei: o("jiangwei", "姜维", [88, 85, 90, 70, 68], ["jizhi", "yongmeng", "qinxue"], {
    courtesy: "伯约",
  }),
  liushan: o("liushan", "刘禅", [30, 15, 40, 45, 70], ["xunliang", "caoshuai"], { courtesy: "公嗣" }),
  xushu: o("xushu", "徐庶", [70, 45, 90, 75, 72], ["jizhi", "xunliang"], { courtesy: "元直" }),
  humao: o("humao", "马谡", [55, 40, 85, 60, 55], ["jizhi", "gangao"], { courtesy: "幼常" }),

  // —— 东吴 ——
  sunjian: o("sunjian", "孙坚", [90, 93, 65, 60, 80], ["yongmeng", "baqi", "tujin"], {
    courtesy: "文台",
  }),
  sunce: o("sunce", "孙策", [92, 95, 70, 65, 90], ["baqi", "yongmeng", "mingsheng"], {
    courtesy: "伯符",
  }),
  sunquan: o("sunquan", "孙权", [85, 60, 80, 88, 92], ["xiongcai", "qinzheng", "mingsheng"], {
    courtesy: "仲谋",
  }),
  zhouyu: o("zhouyu", "周瑜", [95, 70, 96, 80, 92], ["jizhi", "wenzhao", "yongmeng"], {
    courtesy: "公瑾",
  }),
  lusu: o("lusu", "鲁肃", [78, 45, 90, 88, 85], ["wenzhao", "qinzheng", "renhou"], {
    courtesy: "子敬",
  }),
  lvmeng: o("lvmeng", "吕蒙", [90, 82, 88, 70, 70], ["qinxue", "jizhi", "yongmeng"], {
    courtesy: "子明",
  }),
  lvxun: o("lvxun", "陆逊", [94, 60, 95, 85, 78], ["jizhi", "qinzheng", "jianren"], {
    courtesy: "伯言",
  }),
  ganning: o("ganning", "甘宁", [82, 94, 55, 35, 60], ["yongmeng", "tujin"], { courtesy: "兴霸" }),
  taishici: o("taishici", "太史慈", [85, 95, 55, 40, 70], ["yongmeng", "jianren"], {
    courtesy: "子义",
  }),
  huanggai: o("huanggai", "黄盖", [80, 88, 60, 50, 65], ["yongmeng", "jianren"], { courtesy: "公覆" }),
  chengpu: o("chengpu", "程普", [84, 86, 58, 55, 68], ["jianren"], { courtesy: "德谋" }),
  hanzang: o("hanzang", "韩当", [78, 85, 45, 40, 55], ["yongmeng"], { courtesy: "义公" }),
  zhoutai: o("zhoutai", "周泰", [76, 90, 40, 30, 55], ["yongmeng", "jianren"], { courtesy: "幼平" }),

  // —— 群雄 ——
  yuanshao: o("yuanshao", "袁绍", [82, 55, 70, 75, 88], ["mingsheng", "gangao", "huaiyi"], {
    courtesy: "本初",
  }),
  yuanShu: o("yuanShu", "袁术", [70, 50, 55, 60, 65], ["gangao", "tanlan"], { courtesy: "公路" }),
  dongzhuo: o("dongzhuo", "董卓", [85, 88, 50, 40, 30], ["baqi", "tanlan", "huaiyi"], {
    courtesy: "仲颖",
  }),
  lvbu: o("lvbu", "吕布", [80, 100, 35, 20, 55], ["wushuang", "yongmeng", "huaiyi"], {
    courtesy: "奉先",
  }),
  zhangjiao: o("zhangjiao", "张角", [75, 40, 88, 70, 90], ["mingsheng", "jizhi"], {}),
  gongsunzan: o("gongsunzan", "公孙瓒", [82, 88, 55, 50, 65], ["yongmeng", "tujin"], {
    courtesy: "伯珪",
  }),
  liubiao: o("liubiao", "刘表", [70, 40, 75, 80, 78], ["wenzhao", "caoshuai"], { courtesy: "景升" }),
  liuzhang: o("liuzhang", "刘璋", [55, 30, 60, 70, 65], ["xunliang", "caoshuai"], { courtesy: "季玉" }),
  mateng: o("mateng", "马腾", [80, 85, 50, 55, 70], ["yongmeng"], { courtesy: "寿成" }),
  hanSui: o("hanSui", "韩遂", [78, 80, 55, 50, 60], ["yongmeng"], { courtesy: "文约" }),
  zhanglu: o("zhanglu", "张鲁", [65, 45, 75, 70, 80], ["mingsheng", "qinzheng"], { courtesy: "公祺" }),
  shixie: o("shixie", "士燮", [60, 30, 80, 88, 75], ["qinzheng", "wenzhao"], { courtesy: "威彦" }),
  menghuo: o("menghuo", "孟获", [70, 85, 40, 35, 70], ["yongmeng", "baqi"], {}),
  zhurong: o("zhurong", "祝融", [65, 90, 35, 25, 70], ["yongmeng"], {}),
  huaxiong: o("huaxiong", "华雄", [72, 92, 30, 20, 40], ["yongmeng"], {}),
  yanliang: o("yanliang", "颜良", [75, 94, 30, 20, 45], ["yongmeng"], {}),
  wenchou: o("wenchou", "文丑", [74, 93, 28, 18, 42], ["yongmeng"], {}),
  guoyuan: o("guoyuan", "田丰", [50, 20, 92, 80, 55], ["jizhi", "gangao"], { courtesy: "元皓" }),
  jushou: o("jushou", "沮授", [55, 25, 90, 85, 60], ["jizhi", "qinzheng"], {}),
  chenGong: o("chenGong", "陈宫", [70, 40, 90, 75, 55], ["jizhi"], { courtesy: "公台" }),
  diaochan: o("diaochan", "貂蝉", [20, 10, 70, 45, 98], ["mingsheng"], {}),
  huatuo: o("huatuo", "华佗", [30, 15, 85, 40, 70], ["jizhi", "jibing"], {}),
  caiyan: o("caiyan", "蔡琰", [25, 10, 88, 70, 90], ["wenzhao"], { courtesy: "文姬" }),
};

export function officerById(id) {
  return OFFICERS[id] || null;
}

export function allOfficers() {
  return Object.values(OFFICERS);
}

export function officerPower(o) {
  if (!o) return 0;
  return o.lead * 0.3 + o.force * 0.25 + o.int * 0.2 + o.pol * 0.15 + o.charm * 0.1;
}

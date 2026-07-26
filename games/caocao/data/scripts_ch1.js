/**
 * 第一章关卡脚本事件（mengde 风格条件触发）
 */

export function scriptEventsFor(id) {
  const table = {
    yingchuan: [
      {
        condition: (g) => g.turn >= 3,
        handler: (g) => {
          g.speakQueue.push({ speaker: "张角", text: "黄天佑我！中军再进！" });
          // 黄巾小兵略微前压
          for (const u of g.units) {
            if (u.team === "enemy" && !u.boss && u.alive && u.y < g.height - 3) {
              u.aiMode = "random";
            }
          }
        },
      },
      {
        condition: (g) => {
          const zb = g.units.find((u) => u.generalId === "zhangbao");
          return zb && !zb.alive;
        },
        handler: (g) => {
          g.speakQueue.push({ speaker: "曹操", text: "张宝已除，可取太平道书！" });
        },
      },
    ],
    sishui: [
      {
        condition: (g) => {
          const sj = g.units.find((u) => u.generalId === "sunjian" && u.alive);
          return sj && sj.hp < sj.hpMax * 0.5;
        },
        handler: (g) => {
          const sj = g.units.find((u) => u.generalId === "sunjian");
          if (sj?.alive) {
            sj.hp = Math.min(sj.hpMax, sj.hp + 20);
            g.speakQueue.push({
              speaker: "孙坚",
              text: "哼……江东子弟岂会轻易倒下！",
            });
          }
        },
      },
      {
        condition: (g) => g.turn >= 4,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "华雄",
            text: "关下鼠辈，再来送死么！",
          });
          const hx = g.units.find((u) => u.generalId === "huaxiong");
          if (hx) hx.aiMode = "random";
        },
      },
    ],
    hulao: [
      {
        condition: (g) => g.turn === 1,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "刘备",
            text: "吕布骁勇，宜稳扎稳打，不可冒进。",
          });
        },
      },
      {
        condition: (g) => {
          const lb = g.units.find((u) => u.generalId === "lvbu" && u.alive);
          return lb && (g.turn >= 3 || lb.hp < lb.hpMax * 0.7);
        },
        handler: (g) => {
          const lb = g.units.find((u) => u.generalId === "lvbu");
          if (lb) lb.aiMode = "random";
          g.speakQueue.push({ speaker: "吕布", text: "来得好！看戟！" });
        },
      },
    ],
    dongzhuo_chase: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "曹操",
            text: "林中、山上、河边皆有伏兵，分而击之！",
          });
        },
      },
      {
        condition: (g) => {
          const lb = g.units.find((u) => u.name === "吕布" && u.alive);
          return lb && g.turn >= 5;
        },
        handler: (g) => {
          g.speakQueue.push({
            speaker: "吕布",
            text: "曹阿瞒好胆色，竟敢追来！",
          });
        },
      },
    ],
    qingzhou: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "荀彧",
            text: "黄巾分据左右，宜各个击破。",
          });
        },
      },
    ],
    xuzhou_revenge: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "曹操",
            text: "陶谦既守城，便困而破之！",
          });
        },
      },
    ],
    puyang1: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({ speaker: "典韦", text: "张辽何在？来与某大战三百合！" });
        },
      },
    ],
    puyang3: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          const lb = g.units.find((u) => u.name === "吕布");
          if (lb) lb.aiMode = "hold_position";
          g.speakQueue.push({
            speaker: "曹操",
            text: "诱吕布出城，勿被其冲阵！",
          });
        },
      },
      {
        condition: (g) => g.turn >= 5,
        handler: (g) => {
          const lb = g.units.find((u) => u.name === "吕布");
          if (lb) lb.aiMode = "random";
          g.speakQueue.push({ speaker: "吕布", text: "城中有人反了？可恶！" });
        },
      },
    ],
    xiandi: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "曹操",
            text: "天子蒙尘，诸军护驾！",
          });
        },
      },
    ],
    zhangxiu1: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "典韦",
            text: "主公先走！典韦断后！",
          });
        },
      },
    ],
    yuanshu: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "袁术",
            text: "孤乃皇帝，尔等反贼安敢犯驾！",
          });
        },
      },
    ],
    xuzhou_rescue: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "夏侯惇",
            text: "左眼虽伤，右眼尚能杀敌！",
          });
        },
      },
    ],
    lvbu_encircle: [
      {
        condition: (g) => g.turn >= 2,
        handler: (g) => {
          g.speakQueue.push({
            speaker: "曹操",
            text: "四面合围，今日必要擒下吕布！",
          });
        },
      },
      {
        condition: (g) => {
          const lb = g.units.find((u) => u.generalId === "lvbu");
          return lb && lb.alive && lb.hp < lb.hpMax * 0.4;
        },
        handler: (g) => {
          g.speakQueue.push({
            speaker: "吕布",
            text: "侯成……魏续……你们！",
          });
        },
      },
    ],
  };
  return table[id] || [];
}

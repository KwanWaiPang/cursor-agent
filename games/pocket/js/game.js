/**
 * 口袋冒险 — 多地图 / 多剧情 / 图鉴 / 训练家战。
 */
import {
  SPECIES,
  STARTERS,
  MOVES,
  TYPE_ZH,
  DEX_ORDER,
  RIVAL_STARTER,
  makePartyMon,
  applyXp,
  catchRate,
} from "./data.js";
import { Battle } from "./battle.js";
import { MAPS, tileAt, isSolid, isTallGrass, pickWild } from "./maps.js";
import { drawTile, drawPlayer, drawNpc, drawPokemon } from "./sprites.js";

const SAVE_KEY = "pocket-adventure-v2";
const SAVE_KEY_OLD = "pocket-adventure-v1";
const TILE = 32;
const ENCOUNTER_CHANCE = 0.13;
const VIEW_W = 15;
const VIEW_H = 11;
const STAT_ZH = { atk: "攻击", def: "防御", spe: "速度", acc: "命中率" };

function defaultFlags() {
  return {
    metOak: false,
    gotStarter: false,
    rivalBattled: false,
    hasParcel: false,
    gotPokedex: false,
    beatRoute1Kid: false,
    beatRoute2Bug: false,
    beatForestBug: false,
    beatGymGuide: false,
    beatBrock: false,
    balls: 0,
    badgeBoulder: false,
  };
}

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.keys = new Set();
    this.mode = "title";
    this.mapId = "bedroom";
    this.player = { x: 5, y: 4, facing: "down", moving: false };
    this.party = [];
    this.flags = defaultFlags();
    this.dex = { seen: {}, owned: {} };
    this.dialogue = null;
    this.battle = null;
    this.battleUi = null;
    this.trainerQueue = null;
    this.starterSelect = 0;
    this.menuIndex = 0;
    this.dexIndex = 0;
    this.frame = 0;
    this.moveCooldown = 0;
    this.anim = { t: 0, from: null, to: null };
    this.msgQueue = [];
    this._bind();
    this.resize();
    this.refreshContinueBtn();
    requestAnimationFrame((t) => this.loop(t));
  }

  refreshContinueBtn() {
    const has = !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(SAVE_KEY_OLD));
    if (this.ui.btnContinue) this.ui.btnContinue.disabled = !has;
  }

  _bind() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter", "z", "x", "escape"].includes(k) ||
        e.code.startsWith("Arrow")
      ) {
        e.preventDefault();
      }
      this.keys.add(normalizeKey(e));
      this.onKey(normalizeKey(e), true);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(normalizeKey(e)));
    window.addEventListener("resize", () => this.resize());
    this.ui.btnNew?.addEventListener("click", () => this.newGame());
    this.ui.btnContinue?.addEventListener("click", () => this.continueGame());
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const maxW = Math.min(wrap.clientWidth || 480, 640);
    const scale = Math.floor(maxW / (VIEW_W * TILE)) || 1;
    const w = VIEW_W * TILE;
    const h = VIEW_H * TILE;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * Math.max(1, Math.min(scale, 2))}px`;
    this.canvas.style.height = `${h * Math.max(1, Math.min(scale, 2))}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  map() {
    return MAPS[this.mapId];
  }

  markSeen(id) {
    if (SPECIES[id]) this.dex.seen[id] = true;
  }
  markOwned(id) {
    if (SPECIES[id]) {
      this.dex.seen[id] = true;
      this.dex.owned[id] = true;
    }
  }

  newGame() {
    this.mapId = "bedroom";
    const sp = MAPS.bedroom.spawn;
    this.player = { x: sp.x, y: sp.y, facing: sp.facing, moving: false };
    this.party = [];
    this.flags = defaultFlags();
    this.dex = { seen: {}, owned: {} };
    this.mode = "play";
    this.hideOverlays();
    this.ui.title?.classList.add("hidden");
    this.queueLines([
      "……清晨的阳光照进房间。",
      "今天，是冒险开始的日子。",
      "提示：去北边大木研究所领取伙伴，再经 1 号道路前往常青市。",
      "X 键打开菜单（队伍 / 图鉴 / 任务）。",
    ]);
    this.save();
  }

  continueGame() {
    if (!this.load()) {
      this.queueLines(["没有找到存档，开始新的冒险吧。"]);
      this.newGame();
      return;
    }
    this.mode = "play";
    this.hideOverlays();
    this.ui.title?.classList.add("hidden");
  }

  hideOverlays() {
    this.ui.starter?.classList.add("hidden");
    this.ui.battle?.classList.add("hidden");
    this.ui.menu?.classList.add("hidden");
    this.ui.dex?.classList.add("hidden");
    this.ui.dialog?.classList.add("hidden");
  }

  save() {
    const data = {
      v: 2,
      mapId: this.mapId,
      player: { x: this.player.x, y: this.player.y, facing: this.player.facing },
      party: this.party,
      flags: this.flags,
      dex: this.dex,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    this.refreshContinueBtn();
  }

  load() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) raw = localStorage.getItem(SAVE_KEY_OLD);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.mapId = data.mapId || "bedroom";
      this.player = { ...data.player, moving: false };
      this.party = data.party || [];
      this.flags = { ...defaultFlags(), ...(data.flags || {}) };
      this.dex = data.dex || { seen: {}, owned: {} };
      for (const p of this.party) {
        this.markOwned(p.species);
        if (p.xp == null) p.xp = 0;
      }
      return true;
    } catch {
      return false;
    }
  }

  onKey(key, down) {
    if (!down) return;
    if (this.mode === "title") {
      if (key === "z" || key === "enter" || key === " ") this.newGame();
      return;
    }
    if (this.mode === "dialogue") {
      if (key === "z" || key === "enter" || key === " ") this.advanceDialogue();
      return;
    }
    if (this.mode === "starter") {
      if (key === "left" || key === "a") this.starterSelect = (this.starterSelect + 2) % 3;
      if (key === "right" || key === "d") this.starterSelect = (this.starterSelect + 1) % 3;
      if (key === "z" || key === "enter" || key === " ") this.confirmStarter();
      if (key === "x" || key === "escape") {
        this.mode = "play";
        this.ui.starter?.classList.add("hidden");
      }
      this.renderStarterPanel();
      return;
    }
    if (this.mode === "menu") {
      this.menuKey(key);
      return;
    }
    if (this.mode === "dex") {
      this.dexKey(key);
      return;
    }
    if (this.mode === "battle") {
      this.battleKey(key);
      return;
    }
    if (this.mode === "play") {
      if (key === "z" || key === "enter" || key === " ") this.interact();
      if (key === "x" || key === "escape") this.openMenu();
    }
  }

  openMenu() {
    this.mode = "menu";
    this.menuIndex = 0;
    this.ui.menu?.classList.remove("hidden");
    this.renderMenu();
  }

  closeMenu() {
    this.ui.menu?.classList.add("hidden");
    this.mode = "play";
  }

  menuKey(key) {
    const items = 4;
    if (key === "up" || key === "w") this.menuIndex = (this.menuIndex + items - 1) % items;
    if (key === "down" || key === "s") this.menuIndex = (this.menuIndex + 1) % items;
    if (key === "x" || key === "escape") this.closeMenu();
    if (key === "z" || key === "enter" || key === " ") {
      if (this.menuIndex === 0) this.closeMenu();
      else if (this.menuIndex === 1) {
        this.closeMenu();
        this.openDex();
      } else if (this.menuIndex === 2) {
        this.closeMenu();
        this.queueLines(this.questLines());
      } else {
        this.save();
        this.closeMenu();
        this.queueLines(["进度已保存。"]);
      }
    }
    this.renderMenu();
  }

  renderMenu() {
    const labels = ["队伍", "图鉴", "任务", "保存"];
    const box = this.ui.menuList;
    if (!box) return;
    box.innerHTML = "";
    labels.forEach((lab, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "menu-item" + (i === this.menuIndex ? " active" : "");
      b.textContent = lab;
      b.addEventListener("click", () => {
        this.menuIndex = i;
        this.menuKey("z");
      });
      box.appendChild(b);
    });
    const party = this.party.length
      ? this.party.map((p) => `${p.name} Lv${p.level}  ${p.hp}/${p.stats.hp}`).join("\n")
      : "（尚无伙伴）";
    this.ui.menuDetail.textContent =
      this.menuIndex === 0
        ? party
        : this.menuIndex === 1
          ? `已见 ${Object.keys(this.dex.seen).length} / 拥有 ${Object.keys(this.dex.owned).length} / 共 ${DEX_ORDER.length}`
          : this.menuIndex === 2
            ? this.questLines().join(" ")
            : `精灵球 ×${this.flags.balls}　徽章：${this.flags.badgeBoulder ? "灰色" : "无"}`;
  }

  questLines() {
    const lines = ["—— 当前目标 ——"];
    if (!this.flags.gotStarter) lines.push("• 去大木研究所领取最初的伙伴");
    else if (!this.flags.rivalBattled) lines.push("• 在研究所和劲敌对战");
    else if (!this.flags.hasParcel && !this.flags.gotPokedex) lines.push("• 前往常青市商店取大木的包裹");
    else if (this.flags.hasParcel && !this.flags.gotPokedex) lines.push("• 把包裹交还大木博士，领取图鉴");
    else if (!this.flags.beatBrock) lines.push("• 穿过常青森林，在尼比道馆击败小刚");
    else lines.push("• 灰色徽章入手！更多地区正在筹备中……");
    if (this.flags.gotPokedex) lines.push(`• 图鉴进度 ${Object.keys(this.dex.seen).length}/${DEX_ORDER.length}`);
    return lines;
  }

  openDex() {
    if (!this.flags.gotPokedex) {
      this.queueLines(["还没有图鉴。把大木博士的包裹送回去就能得到。"]);
      return;
    }
    this.mode = "dex";
    this.dexIndex = 0;
    this.ui.dex?.classList.remove("hidden");
    this.renderDex();
  }

  dexKey(key) {
    const n = DEX_ORDER.length;
    if (key === "up" || key === "w") this.dexIndex = (this.dexIndex + n - 1) % n;
    if (key === "down" || key === "s") this.dexIndex = (this.dexIndex + 1) % n;
    if (key === "left" || key === "a") this.dexIndex = (this.dexIndex + n - 5) % n;
    if (key === "right" || key === "d") this.dexIndex = (this.dexIndex + 5) % n;
    if (key === "x" || key === "escape" || key === "z" || key === "enter" || key === " ") {
      this.ui.dex?.classList.add("hidden");
      this.mode = "play";
      return;
    }
    this.renderDex();
  }

  renderDex() {
    const id = DEX_ORDER[this.dexIndex];
    const sp = SPECIES[id];
    const seen = !!this.dex.seen[id];
    const owned = !!this.dex.owned[id];
    this.ui.dexNum.textContent = `No.${String(sp.num).padStart(3, "0")}`;
    this.ui.dexName.textContent = seen ? sp.name : "？？？";
    this.ui.dexTypes.textContent = seen ? sp.types.map((t) => TYPE_ZH[t]).join(" / ") : "—";
    this.ui.dexBlurb.textContent = owned ? sp.blurb : seen ? "见过，尚未收服。" : "尚未遇见的宝可梦。";
    this.ui.dexProg.textContent = `${this.dexIndex + 1} / ${DEX_ORDER.length}　←→ 翻页　Z 关闭`;
    const c = this.ui.dexCanvas.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 160, 120);
    c.fillStyle = "#1a2218";
    c.fillRect(0, 0, 160, 120);
    if (seen) {
      const g = c.createLinearGradient(0, 0, 0, 120);
      g.addColorStop(0, "#dfefff");
      g.addColorStop(1, "#b8d4a8");
      c.fillStyle = g;
      c.fillRect(0, 0, 160, 120);
      drawPokemon(c, id, 80, 68, 70, 1);
      if (!owned) {
        c.fillStyle = "rgba(0,0,0,0.35)";
        c.fillRect(0, 0, 160, 120);
      }
    } else {
      c.fillStyle = "#3a4038";
      c.font = "48px sans-serif";
      c.textAlign = "center";
      c.fillText("?", 80, 75);
    }
  }

  queueLines(lines, onDone) {
    this.msgQueue = lines.map((t) => String(t));
    this._dialogueDone = onDone || null;
    this.mode = "dialogue";
    this.advanceDialogue();
  }

  advanceDialogue() {
    if (!this.msgQueue.length) {
      this.ui.dialog?.classList.add("hidden");
      this.dialogue = null;
      const done = this._dialogueDone;
      this._dialogueDone = null;
      if (this.mode === "dialogue") this.mode = "play";
      done?.();
      return;
    }
    this.dialogue = this.msgQueue.shift();
    this.ui.dialogText.textContent = this.dialogue;
    this.ui.dialog?.classList.remove("hidden");
  }

  facingTile() {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[this.player.facing];
    return { x: this.player.x + d[0], y: this.player.y + d[1] };
  }

  interact() {
    const map = this.map();
    const f = this.facingTile();
    const npc = map.npcs.find((n) => n.x === f.x && n.y === f.y);
    if (npc) {
      this.talkNpc(npc);
      return;
    }
    const here = map.warps.find((w) => w.x === this.player.x && w.y === this.player.y);
    if (here) this.doWarp(here);
  }

  talkNpc(npc) {
    if (npc.trainer && !this.flags[npc.trainer.beatenFlag]) {
      this.startTrainer(npc);
      return;
    }
    if (npc.id === "oak") return this.talkOak();
    if (npc.id === "rival") return this.talkRival();
    if (npc.id === "mom") return this.talkMom();
    if (npc.id === "nurse") return this.healParty();
    if (npc.id === "clerk") return this.talkClerk();
    if (npc.id === "brock") {
      if (this.flags.beatBrock) {
        this.queueLines(["小刚：灰色徽章在你手上闪光呢。继续前进吧！"]);
        return;
      }
      this.startTrainer(npc);
      return;
    }
    if (npc.id?.startsWith("ball-")) {
      this.talkBall(npc.id.replace("ball-", ""));
      return;
    }
    this.queueLines(npc.lines?.length ? npc.lines : ["……"]);
  }

  talkMom() {
    if (!this.flags.gotStarter) {
      this.queueLines(["妈妈：大木博士在找你，去北边研究所吧。"]);
    } else if (!this.flags.gotPokedex) {
      this.queueLines(["妈妈：听说常青市商店有大木博士的包裹。"]);
    } else {
      this.queueLines(["妈妈：随时回来休息。妈妈永远支持你！", "（队伍体力恢复了。）"]);
      this.healSilent();
    }
  }

  talkOak() {
    if (!this.flags.gotStarter) {
      this.flags.metOak = true;
      this.queueLines(
        [
          "大木博士：啊，来得正好！",
          "这个世界生活着被称为「宝可梦」的奇妙生物。",
          "先从桌上选一只伙伴吧！",
        ],
        () => this.save()
      );
      return;
    }
    if (!this.flags.rivalBattled) {
      this.queueLines(["大木博士：你的劲敌好像有话要说——去和他聊聊。"]);
      return;
    }
    if (this.flags.hasParcel && !this.flags.gotPokedex) {
      this.flags.hasParcel = false;
      this.flags.gotPokedex = true;
      this.flags.balls = Math.max(this.flags.balls, 5);
      this.queueLines(
        [
          "大木博士：哦！是我的包裹，谢谢你！",
          "作为谢礼，这是宝可梦图鉴——自动记录你见过的宝可梦。",
          "再送你 5 个精灵球。去丰富图鉴吧！",
          "穿过常青森林，挑战尼比市的小刚道馆！",
        ],
        () => this.save()
      );
      return;
    }
    if (!this.flags.gotPokedex) {
      this.queueLines([
        "大木博士：我有个包裹寄到了常青市商店。",
        "能帮我取回来吗？图鉴的事……取回来再说！",
      ]);
      return;
    }
    if (this.flags.beatBrock) {
      this.queueLines([
        `大木博士：灰色徽章！了不起！图鉴已记录 ${Object.keys(this.dex.seen).length} 种。`,
        "更远的旅程正在编写中——先把图鉴填得更满吧！",
      ]);
      return;
    }
    this.queueLines([
      `大木博士：图鉴进度 ${Object.keys(this.dex.seen).length}/${DEX_ORDER.length}。`,
      "南边森林通往尼比市，去挑战岩石道馆吧！",
    ]);
  }

  talkRival() {
    if (!this.flags.gotStarter) {
      this.queueLines(["劲敌：哼，我也要挑一只最强的！你先选吧。"]);
      return;
    }
    if (this.flags.rivalBattled) {
      this.queueLines(["劲敌：下次在路上再见！我才不会输！"]);
      return;
    }
    const foe = RIVAL_STARTER[this.party[0].species] || "charmander";
    this.queueLines(["劲敌：等等！我也选好了——来对战！"], () => {
      this.startBattle({
        wild: { species: foe, level: 5 },
        canRun: false,
        trainer: true,
        trainerName: "劲敌",
        onWin: () => {
          this.flags.rivalBattled = true;
          this.save();
          this.queueLines([
            "劲敌：可恶，算你走运……",
            "大木博士：很好的对战！去常青市帮我取个包裹吧。",
          ]);
        },
      });
    });
  }

  talkClerk() {
    if (this.flags.gotPokedex || this.flags.hasParcel) {
      this.queueLines(["店员：欢迎光临！今天只浏览不卖货（暂）。"]);
      return;
    }
    if (!this.flags.gotStarter || !this.flags.rivalBattled) {
      this.queueLines(["店员：有个包裹要给大木博士……他还没派人来取。"]);
      return;
    }
    this.flags.hasParcel = true;
    this.queueLines(
      ["店员：你是大木博士派来的吗？", "这个包裹就交给你了——请尽快送回真新镇！"],
      () => this.save()
    );
  }

  healParty() {
    this.healSilent();
    this.queueLines(["护士：你的宝可梦恢复精神了！请保重！"]);
    this.save();
  }

  healSilent() {
    for (const p of this.party) {
      p.hp = p.stats.hp;
      p.moves = p.moves.map((m) => ({ id: m.id, pp: MOVES[m.id].pp }));
    }
  }

  talkBall(speciesId) {
    if (!this.flags.metOak) {
      this.queueLines(["还是先和大木博士谈谈吧。"]);
      return;
    }
    if (this.flags.gotStarter) {
      this.queueLines(["你已经选过最初的伙伴了。"]);
      return;
    }
    this.starterSelect = Math.max(0, STARTERS.indexOf(speciesId));
    this.openStarter();
  }

  openStarter() {
    this.mode = "starter";
    this.ui.starter?.classList.remove("hidden");
    this.renderStarterPanel();
  }

  renderStarterPanel() {
    const id = STARTERS[this.starterSelect];
    const sp = SPECIES[id];
    this.ui.starterName.textContent = sp.name;
    this.ui.starterTypes.textContent = sp.types.map((t) => TYPE_ZH[t] || t).join(" / ");
    this.ui.starterBlurb.textContent = sp.blurb;
    const c = this.ui.starterCanvas.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 160, 120);
    const g = c.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, "#dfefff");
    g.addColorStop(1, "#b8d4a8");
    c.fillStyle = g;
    c.fillRect(0, 0, 160, 120);
    drawPokemon(c, id, 80, 68, 70, 1);
    this.ui.starterTabs.innerHTML = "";
    STARTERS.forEach((sid, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "starter-tab" + (i === this.starterSelect ? " active" : "");
      b.textContent = SPECIES[sid].name;
      b.addEventListener("click", () => {
        this.starterSelect = i;
        this.renderStarterPanel();
      });
      this.ui.starterTabs.appendChild(b);
    });
  }

  confirmStarter() {
    const id = STARTERS[this.starterSelect];
    const mon = makePartyMon(id, 5);
    this.party = [mon];
    this.markOwned(id);
    this.flags.gotStarter = true;
    this.flags.metOak = true;
    this.ui.starter?.classList.add("hidden");
    this.mode = "play";
    this.save();
    this.queueLines([
      `你选择了 ${mon.name}！`,
      "大木博士：很好的选择！",
      "劲敌似乎也选好了——去和他对话吧。",
    ]);
  }

  startTrainer(npc) {
    const t = npc.trainer;
    if (!t || this.flags[t.beatenFlag]) {
      this.queueLines(npc.lines?.length ? npc.lines : t?.win || ["……"]);
      return;
    }
    this.trainerQueue = {
      npc,
      party: t.party.map((p) => ({ ...p })),
      index: 0,
      name: t.name,
      beatenFlag: t.beatenFlag,
      win: t.win,
      lose: t.lose,
    };
    this.queueLines(t.intro || [`${t.name} 要挑战！`], () => this.advanceTrainerBattle());
  }

  advanceTrainerBattle() {
    const q = this.trainerQueue;
    if (!q) return;
    if (q.index >= q.party.length) {
      this.flags[q.beatenFlag] = true;
      if (q.beatenFlag === "beatBrock") this.flags.badgeBoulder = true;
      const winLines = q.win || ["赢了！"];
      this.trainerQueue = null;
      this.save();
      this.queueLines(winLines);
      return;
    }
    const foe = q.party[q.index];
    this.startBattle({
      wild: foe,
      canRun: false,
      trainer: true,
      trainerName: q.name,
      onWin: () => {
        q.index += 1;
        if (q.index < q.party.length) {
          this.queueLines([`${q.name} 派出了 ${SPECIES[q.party[q.index].species].name}！`], () =>
            this.advanceTrainerBattle()
          );
        } else {
          this.advanceTrainerBattle();
        }
      },
      onLose: () => {
        this.trainerQueue = null;
        this.queueLines(q.lose || ["失败了……"]);
      },
    });
  }

  tryMove(dx, dy) {
    if (this.mode !== "play" || this.player.moving || this.moveCooldown > 0) return;
    if (dx === 1) this.player.facing = "right";
    if (dx === -1) this.player.facing = "left";
    if (dy === 1) this.player.facing = "down";
    if (dy === -1) this.player.facing = "up";
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    const map = this.map();
    const ch = tileAt(map, nx, ny);
    if (isSolid(ch)) return;
    if (map.npcs.some((n) => n.solid && n.x === nx && n.y === ny)) return;
    const warp = map.warps.find((w) => w.x === nx && w.y === ny);
    this.player.moving = true;
    this.anim = {
      t: 0,
      from: { x: this.player.x, y: this.player.y },
      to: { x: nx, y: ny },
      warp: warp || null,
      tall: isTallGrass(ch),
    };
  }

  finishStep() {
    const { to, warp, tall } = this.anim;
    this.player.x = to.x;
    this.player.y = to.y;
    this.player.moving = false;
    this.anim = { t: 0, from: null, to: null };
    this.moveCooldown = 0.05;
    if (warp) {
      this.doWarp(warp);
      return;
    }
    if (tall && this.flags.gotStarter && this.party.some((p) => p.hp > 0)) {
      if (Math.random() < ENCOUNTER_CHANCE) this.startWildBattle();
    }
    this.save();
  }

  doWarp(warp) {
    if (!MAPS[warp.to]) return;
    this.mapId = warp.to;
    this.player.x = warp.tx;
    this.player.y = warp.ty;
    if (warp.facing) this.player.facing = warp.facing;
    this.player.moving = false;
    this.save();
  }

  lead() {
    return this.party.find((p) => p.hp > 0) || this.party[0];
  }

  startWildBattle() {
    const enc = pickWild(this.map());
    if (!enc) return;
    this.startBattle({ wild: enc, canRun: true, trainer: false });
  }

  startBattle({ wild, canRun, trainer, trainerName, onWin, onLose }) {
    const lead = this.lead();
    if (!lead || lead.hp <= 0) {
      this.queueLines(["没有能战斗的宝可梦……去宝可梦中心休息吧。"]);
      return;
    }
    this.markSeen(wild.species);
    this._battleCallbacks = { onWin, onLose };
    this.battle = new Battle({
      player: {
        species: lead.species,
        level: lead.level,
        hp: lead.hp,
        moves: lead.moves,
      },
      wild,
      canRun,
      trainer,
      seed: (Math.random() * 1e9) | 0,
    });
    const foeName = SPECIES[wild.species].name;
    const intro = trainer
      ? [`${trainerName || "训练家"} 派出了 ${foeName}！`, `去吧，${lead.name}！`]
      : [`野生的 ${foeName} 出现了！`, `去吧，${lead.name}！`];
    this.battleUi = {
      menu: "main",
      cursor: 0,
      log: intro,
      busy: false,
      trainer: !!trainer,
      trainerName: trainerName || "",
      canCatch: !trainer && this.flags.gotPokedex && this.flags.balls > 0,
    };
    this.mode = "battle";
    this.ui.battle?.classList.remove("hidden");
    this.renderBattle();
  }

  battleKey(key) {
    const ui = this.battleUi;
    if (!ui) return;
    if (ui.log.length) {
      if (key === "z" || key === "enter" || key === " ") this.flushBattleLog();
      return;
    }
    if (ui.busy) return;
    const mainOpts = ui.trainer
      ? ["战斗"]
      : ui.canCatch
        ? ["战斗", "捕捉", "逃跑"]
        : ["战斗", "逃跑"];
    if (ui.menu === "main") {
      if (key === "up" || key === "w") ui.cursor = (ui.cursor + mainOpts.length - 1) % mainOpts.length;
      if (key === "down" || key === "s") ui.cursor = (ui.cursor + 1) % mainOpts.length;
      if (key === "z" || key === "enter" || key === " ") {
        const choice = mainOpts[ui.cursor];
        if (choice === "战斗") {
          ui.menu = "fight";
          ui.cursor = 0;
        } else if (choice === "捕捉") this.tryCatch();
        else this.resolveBattleAction({ type: "run" });
      }
      this.renderBattle();
      return;
    }
    if (ui.menu === "fight") {
      const n = this.battle.player.moves.length;
      if (key === "up" || key === "w") ui.cursor = (ui.cursor + n - 2) % n;
      if (key === "down" || key === "s") ui.cursor = (ui.cursor + 2) % n;
      if (key === "left" || key === "a") ui.cursor = (ui.cursor + n - 1) % n;
      if (key === "right" || key === "d") ui.cursor = (ui.cursor + 1) % n;
      if (key === "x" || key === "escape") {
        ui.menu = "main";
        ui.cursor = 0;
      }
      if (key === "z" || key === "enter" || key === " ") {
        this.resolveBattleAction({ type: "move", index: ui.cursor });
      }
      this.renderBattle();
    }
  }

  async tryCatch() {
    const ui = this.battleUi;
    if (!ui || this.flags.balls <= 0) return;
    ui.busy = true;
    this.flags.balls -= 1;
    ui.log.push("使用了精灵球！");
    await this.waitLogClear();
    const foe = this.battle.wild;
    const rate = catchRate(foe.hp, foe.stats.hp, true);
    if (Math.random() < rate) {
      ui.log.push(`恭喜！捕捉到了 ${foe.name}！`);
      await this.waitLogClear();
      this.markOwned(foe.species);
      if (this.party.length < 6) {
        this.party.push(makePartyMon(foe.species, foe.level, foe.stats.hp));
      } else {
        ui.log.push("队伍已满，已登记图鉴（未入队）。");
        await this.waitLogClear();
      }
      this.battle.result = "caught";
      this.endBattle(false, "caught");
    } else {
      ui.log.push("啊！被挣脱了！");
      await this.waitLogClear();
      // foe gets a free hit
      const events = [];
      this.battle.act(this.battle.wild, this.battle.player, this.battle.pickWildMove(), events);
      this.battle.checkEnd(events);
      for (const ev of events) await this.playBattleEvent(ev);
      this.syncLeadFromBattle();
      if (this.battle.result === "defeat") {
        ui.log.push(`${this.battle.player.name} 倒下了……`);
        await this.waitLogClear();
        this.endBattle(true);
      } else {
        ui.busy = false;
        ui.menu = "main";
        ui.cursor = 0;
        ui.canCatch = this.flags.balls > 0;
        this.renderBattle();
      }
    }
    this.save();
  }

  flushBattleLog() {
    if (!this.battleUi?.log?.length) return;
    this.battleUi.log.shift();
    this.renderBattle();
  }

  syncLeadFromBattle() {
    const lead = this.lead();
    if (!lead || !this.battle) return;
    lead.hp = this.battle.player.hp;
    lead.moves = this.battle.player.moves.map((m) => ({ ...m }));
  }

  async resolveBattleAction(action) {
    const ui = this.battleUi;
    ui.busy = true;
    const events = this.battle.turn(action);
    for (const ev of events) {
      await this.playBattleEvent(ev);
      if (this.battle.result) break;
    }
    this.syncLeadFromBattle();

    if (this.battle.result === "victory") {
      const xpLines = applyXp(this.lead(), this.battle.wild.level * 12 + 8);
      for (const line of xpLines) {
        ui.log.push(line);
        await this.waitLogClear();
      }
      ui.log.push("赢了！");
      await this.waitLogClear();
      this.endBattle(false, "victory");
    } else if (this.battle.result === "fled") {
      ui.log.push(ui.trainer ? "训练家战不能逃跑！" : "安全地逃走了！");
      await this.waitLogClear();
      this.endBattle(false, "fled");
    } else if (this.battle.result === "defeat") {
      ui.log.push(`${this.battle.player.name} 倒下了……`);
      await this.waitLogClear();
      this.endBattle(true, "defeat");
    } else {
      ui.busy = false;
      ui.menu = "main";
      ui.cursor = 0;
      ui.canCatch = !ui.trainer && this.flags.gotPokedex && this.flags.balls > 0;
      this.renderBattle();
    }
  }

  playBattleEvent(ev) {
    const ui = this.battleUi;
    const push = (t) => ui.log.push(t);
    const foeLabel = ui.trainer ? this.battle.wild.name : `野生的${this.battle.wild.name}`;
    if (ev.kind === "move") {
      const who = ev.side === "player" ? this.battle.player.name : foeLabel;
      if (ev.missed) push(`${who} 的 ${ev.moveName} 没有命中！`);
      else {
        push(`${who} 使用了 ${ev.moveName}！`);
        if (ev.crit) push("会心一击！");
        if (ev.effectiveness > 1) push("效果拔群！");
        else if (ev.effectiveness > 0 && ev.effectiveness < 1) push("效果不太好……");
        else if (ev.effectiveness === 0) push("没有效果……");
      }
    } else if (ev.kind === "stat") {
      const tgt = ev.target === "player" ? this.battle.player.name : foeLabel;
      if (ev.failed) push("但是失败了！");
      else push(`${tgt} 的 ${STAT_ZH[ev.stat] || ev.stat} ${ev.delta < 0 ? "下降了" : "提升了"}！`);
    } else if (ev.kind === "run") {
      push(ev.success ? "逃跑成功！" : this.battleUi.trainer ? "无法逃跑！" : "逃不掉！");
    } else if (ev.kind === "faint") {
      const name = ev.side === "player" ? this.battle.player.name : foeLabel;
      push(`${name} 倒下了！`);
    }
    this.renderBattle();
    return this.waitLogClear();
  }

  waitLogClear() {
    return new Promise((resolve) => {
      const auto = setInterval(() => {
        if (!this.battleUi) {
          clearInterval(auto);
          resolve();
          return;
        }
        if (this.battleUi.log.length) this.flushBattleLog();
        else {
          clearInterval(auto);
          resolve();
        }
      }, 750);
    });
  }

  endBattle(blackout = false, result = null) {
    const cb = this._battleCallbacks;
    this._battleCallbacks = null;
    this.ui.battle?.classList.add("hidden");
    this.battle = null;
    this.battleUi = null;
    this.mode = "play";
    if (blackout) {
      this.healSilent();
      this.mapId = "house";
      const sp = MAPS.house.spawn;
      this.player.x = sp.x;
      this.player.y = sp.y;
      this.player.facing = "down";
      this.trainerQueue = null;
      this.queueLines(["你匆匆赶回了家……", "妈妈：没事吧？好好休息。", "宝可梦恢复了精神。"], () => {
        cb?.onLose?.();
      });
    } else if (result === "victory" || result === "caught") {
      this.save();
      cb?.onWin?.();
    } else {
      this.save();
    }
    this.save();
  }

  renderBattle() {
    const b = this.battle;
    const ui = this.battleUi;
    if (!b || !ui) return;
    const c = this.ui.battleCanvas.getContext("2d");
    const W = this.ui.battleCanvas.width;
    const H = this.ui.battleCanvas.height;
    c.imageSmoothingEnabled = false;
    const sky = c.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, "#8ec8f0");
    sky.addColorStop(1, "#c8e8a8");
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#6aaa3e";
    c.beginPath();
    c.ellipse(W * 0.72, H * 0.38, 70, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#8bc34a";
    c.beginPath();
    c.ellipse(W * 0.28, H * 0.72, 80, 26, 0, 0, Math.PI * 2);
    c.fill();
    drawPokemon(c, b.wild.species, W * 0.72, H * 0.32, 78, -1);
    drawPokemon(c, b.player.species, W * 0.28, H * 0.68, 88, 1);
    this.ui.enemyHud.innerHTML = monHud(b.wild, !ui.trainer);
    this.ui.playerHud.innerHTML = monHud(b.player, false);
    this.ui.battleLog.textContent = ui.log[0] || " ";
    const menu = this.ui.battleMenu;
    menu.innerHTML = "";
    if (!ui.log.length && !ui.busy) {
      if (ui.menu === "main") {
        const opts = ui.trainer
          ? ["战斗"]
          : ui.canCatch
            ? ["战斗", "捕捉", "逃跑"]
            : ["战斗", "逃跑"];
        opts.forEach((label, i) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "battle-btn" + (ui.cursor === i ? " active" : "");
          btn.textContent = label === "捕捉" ? `捕捉（球×${this.flags.balls}）` : label;
          btn.addEventListener("click", () => {
            ui.cursor = i;
            this.battleKey("z");
          });
          menu.appendChild(btn);
        });
      } else {
        b.player.moves.forEach((m, i) => {
          const def = MOVES[m.id];
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "battle-btn fight" + (ui.cursor === i ? " active" : "");
          btn.innerHTML = `<strong>${def.name}</strong><span>${TYPE_ZH[def.type]} · PP ${m.pp}</span>`;
          btn.addEventListener("click", () => {
            ui.cursor = i;
            this.battleKey("z");
          });
          menu.appendChild(btn);
        });
      }
    }
  }

  update(dt) {
    this.frame++;
    if (this.moveCooldown > 0) this.moveCooldown -= dt;
    if (this.mode === "play" && !this.player.moving) {
      if (this.keys.has("up") || this.keys.has("w")) this.tryMove(0, -1);
      else if (this.keys.has("down") || this.keys.has("s")) this.tryMove(0, 1);
      else if (this.keys.has("left") || this.keys.has("a")) this.tryMove(-1, 0);
      else if (this.keys.has("right") || this.keys.has("d")) this.tryMove(1, 0);
    }
    if (this.player.moving && this.anim.from) {
      this.anim.t += dt / 0.14;
      if (this.anim.t >= 1) this.finishStep();
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.fillStyle = "#1a2218";
    ctx.fillRect(0, 0, W, H);
    if (this.mode === "title") {
      ctx.fillStyle = "#2d4a28";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const map = this.map();
    let px = this.player.x;
    let py = this.player.y;
    if (this.player.moving && this.anim.from) {
      const t = Math.min(1, this.anim.t);
      px = this.anim.from.x + (this.anim.to.x - this.anim.from.x) * t;
      py = this.anim.from.y + (this.anim.to.y - this.anim.from.y) * t;
    }
    const camX = px - (VIEW_W - 1) / 2;
    const camY = py - (VIEW_H - 1) / 2;
    const ox = -((camX % 1) + (camX < 0 ? 1 : 0)) * TILE;
    const oy = -((camY % 1) + (camY < 0 ? 1 : 0)) * TILE;
    const startX = Math.floor(camX);
    const startY = Math.floor(camY);
    for (let j = 0; j <= VIEW_H; j++) {
      for (let i = 0; i <= VIEW_W; i++) {
        drawTile(ctx, tileAt(map, startX + i, startY + j), i, j, TILE, ox, oy);
      }
    }
    for (const n of map.npcs) {
      if (n.id === "rival" && this.flags.rivalBattled && this.mapId === "lab") continue;
      const sx = (n.x - camX) * TILE;
      const sy = (n.y - camY) * TILE;
      if (sx < -TILE || sy < -TILE || sx > W || sy > H) continue;
      let kind = n.id || "npc";
      if (n.name === "告示牌" || n.name === "电脑" || n.name === "电视") kind = "sign";
      if (n.trainer) kind = n.id?.startsWith("trainer") ? n.id : "trainer";
      ctx.save();
      ctx.translate(sx, sy);
      drawNpc(ctx, 0, 0, TILE, kind);
      ctx.restore();
    }
    ctx.save();
    ctx.translate((px - camX) * TILE, (py - camY) * TILE);
    drawPlayer(ctx, 0, 0, TILE, this.player.facing, (this.frame / 10) | 0);
    ctx.restore();

    ctx.fillStyle = "rgba(20,16,12,0.55)";
    ctx.fillRect(8, 8, 168, 22);
    ctx.fillStyle = "#f4efe6";
    ctx.font = "12px sans-serif";
    ctx.fillText(map.name, 16, 23);
    if (this.party[0]) {
      const p = this.lead() || this.party[0];
      ctx.fillStyle = "rgba(20,16,12,0.55)";
      ctx.fillRect(W - 158, 8, 150, 22);
      ctx.fillStyle = "#f4efe6";
      ctx.fillText(`${p.name} ${p.hp}/${p.stats.hp}`, W - 150, 23);
    }
    if (this.flags.badgeBoulder) {
      ctx.fillStyle = "rgba(20,16,12,0.55)";
      ctx.fillRect(8, H - 28, 72, 20);
      ctx.fillStyle = "#d0d0d0";
      ctx.fillText("灰色徽章", 14, H - 14);
    }
  }

  loop(t) {
    if (!this._last) this._last = t;
    const dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;
    this.update(dt);
    this.draw();
    if (this.mode === "battle") this.renderBattle();
    requestAnimationFrame((nt) => this.loop(nt));
  }
}

function normalizeKey(e) {
  const k = e.key.toLowerCase();
  if (k === "arrowup") return "up";
  if (k === "arrowdown") return "down";
  if (k === "arrowleft") return "left";
  if (k === "arrowright") return "right";
  return k;
}

function monHud(c, wildPrefix) {
  const pct = Math.max(0, c.hp / c.stats.hp);
  const col = pct > 0.5 ? "#5dce6a" : pct > 0.2 ? "#e0c040" : "#e05040";
  const name = wildPrefix ? `野生的 ${c.name}` : c.name;
  return `
    <div class="mh-name">${name} <small>Lv${c.level}</small></div>
    <div class="mh-bar"><i style="width:${(pct * 100).toFixed(1)}%;background:${col}"></i></div>
    ${wildPrefix ? "" : `<div class="mh-hp">${c.hp}/${c.stats.hp}</div>`}
  `;
}

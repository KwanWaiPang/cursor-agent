/**
 * 口袋冒险 — 俯视大地图 + 对话 + 选御三家 + 野战。
 */
import { SPECIES, STARTERS, MOVES, TYPE_ZH, makePartyMon } from "./data.js";
import { Battle } from "./battle.js";
import { MAPS, tileAt, isSolid, isTallGrass, pickWild } from "./maps.js";
import { drawTile, drawPlayer, drawNpc, drawPokemon } from "./sprites.js";

const SAVE_KEY = "pocket-adventure-v1";
const TILE = 32;
const ENCOUNTER_CHANCE = 0.14;
const VIEW_W = 15;
const VIEW_H = 11;

const STAT_ZH = { atk: "攻击", def: "防御", spe: "速度", acc: "命中率" };

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.keys = new Set();
    this.mode = "title"; // title | play | dialogue | battle | starter | menu
    this.mapId = "bedroom";
    this.player = { x: 5, y: 4, facing: "down", moving: false };
    this.party = [];
    this.flags = { metOak: false, gotStarter: false };
    this.dialogue = null;
    this.battle = null;
    this.battleUi = null;
    this.starterSelect = 0;
    this.frame = 0;
    this.moveCooldown = 0;
    this.anim = { t: 0, from: null, to: null };
    this.msgQueue = [];
    this._bind();
    this.resize();
    const hasSave = !!localStorage.getItem(SAVE_KEY);
    if (this.ui.btnContinue) this.ui.btnContinue.disabled = !hasSave;
    requestAnimationFrame((t) => this.loop(t));
  }

  _bind() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter", "z", "x", "escape"].includes(k) || e.code.startsWith("Arrow")) {
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

  newGame() {
    this.mapId = "bedroom";
    const sp = MAPS.bedroom.spawn;
    this.player = { x: sp.x, y: sp.y, facing: sp.facing, moving: false };
    this.party = [];
    this.flags = { metOak: false, gotStarter: false };
    this.mode = "play";
    this.hideTitle();
    this.queueLines([
      "……清晨的阳光照进房间。",
      "今天，是冒险开始的日子。",
      "用方向键或 WASD 移动，Z / 空格 / 回车 确认，X / Esc 取消。",
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
    this.hideTitle();
  }

  hideTitle() {
    this.ui.title?.classList.add("hidden");
  }

  showTitle() {
    this.mode = "title";
    this.ui.title?.classList.remove("hidden");
    const has = !!localStorage.getItem(SAVE_KEY);
    if (this.ui.btnContinue) this.ui.btnContinue.disabled = !has;
  }

  save() {
    const data = {
      mapId: this.mapId,
      player: { x: this.player.x, y: this.player.y, facing: this.player.facing },
      party: this.party,
      flags: this.flags,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.mapId = data.mapId || "bedroom";
      this.player = { ...data.player, moving: false };
      this.party = data.party || [];
      this.flags = data.flags || { metOak: false, gotStarter: false };
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
    if (this.mode === "battle") {
      this.battleKey(key);
      return;
    }
    if (this.mode === "play") {
      if (key === "z" || key === "enter" || key === " ") this.interact();
      if (key === "x" || key === "escape") this.openPause();
    }
  }

  openPause() {
    this.queueLines([
      `队伍：${this.party.length ? this.party.map((p) => `${p.name} Lv${p.level} ${p.hp}/${p.stats.hp}`).join(" · ") : "（空）"}`,
      this.flags.gotStarter ? "进度已自动保存。" : "先去大木研究所领取最初的伙伴吧。",
      "（按确认关闭）",
    ]);
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
    const d = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    }[this.player.facing];
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
    const warp = map.warps.find((w) => w.x === f.x && w.y === f.y);
    // also allow standing on door
    const here = map.warps.find((w) => w.x === this.player.x && w.y === this.player.y);
    if (here) this.doWarp(here);
  }

  talkNpc(npc) {
    if (npc.id === "oak") {
      this.talkOak();
      return;
    }
    if (npc.id?.startsWith("ball-")) {
      this.talkBall(npc.id.replace("ball-", ""));
      return;
    }
    const lines = npc.lines?.length ? npc.lines : ["……"];
    this.queueLines(lines);
  }

  talkOak() {
    if (!this.flags.gotStarter) {
      this.flags.metOak = true;
      this.queueLines(
        [
          "大木博士：啊，来得正好！",
          "这个世界生活着被称为「宝可梦」的奇妙生物。",
          "我需要你帮忙完成图鉴——先从桌上选一只伙伴吧！",
          "靠近精灵球，按确认键选择。",
        ],
        () => this.save()
      );
    } else {
      const mon = this.party[0];
      this.queueLines([
        `大木博士：${mon.name} 看起来很信任你。`,
        "南边的 1 号道路上有野生宝可梦，去锻炼一下吧！",
        "记得多休息——倒下了会回到家里。",
      ]);
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
    // backdrop
    const g = c.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, "#dfefff");
    g.addColorStop(1, "#b8d4a8");
    c.fillStyle = g;
    c.fillRect(0, 0, 160, 120);
    drawPokemon(c, id, 80, 68, 70, 1);
    // tabs
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
    this.flags.gotStarter = true;
    this.flags.metOak = true;
    this.ui.starter?.classList.add("hidden");
    this.mode = "play";
    this.save();
    this.queueLines([
      `你选择了 ${mon.name}！`,
      "大木博士：很好的选择！去 1 号道路试试身手吧。",
      `${mon.name} 加入了队伍。`,
    ]);
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

    // warp when stepping onto door
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
    if (tall && this.flags.gotStarter && this.party[0]?.hp > 0) {
      if (Math.random() < ENCOUNTER_CHANCE) this.startWildBattle();
    }
    this.save();
  }

  doWarp(warp) {
    this.mapId = warp.to;
    this.player.x = warp.tx;
    this.player.y = warp.ty;
    if (warp.facing) this.player.facing = warp.facing;
    this.player.moving = false;
    this.save();
  }

  startWildBattle() {
    const enc = pickWild(this.map());
    if (!enc) return;
    const lead = this.party[0];
    if (!lead || lead.hp <= 0) {
      this.queueLines(["没有能战斗的宝可梦……回家休息吧。"]);
      return;
    }
    this.battle = new Battle({
      player: {
        species: lead.species,
        level: lead.level,
        hp: lead.hp,
        moves: lead.moves,
      },
      wild: enc,
      seed: (Math.random() * 1e9) | 0,
    });
    this.battleUi = {
      phase: "intro",
      menu: "main", // main | fight
      cursor: 0,
      log: [`野生的 ${SPECIES[enc.species].name} 出现了！`, `去吧，${lead.name}！`],
      busy: false,
    };
    this.mode = "battle";
    this.ui.battle?.classList.remove("hidden");
    this.renderBattle();
  }

  battleKey(key) {
    const ui = this.battleUi;
    if (!ui) return;
    // Log always advances on confirm, even while a turn is resolving.
    if (ui.log.length) {
      if (key === "z" || key === "enter" || key === " ") this.flushBattleLog();
      return;
    }
    if (ui.busy) return;
    if (ui.menu === "main") {
      if (key === "up" || key === "w" || key === "down" || key === "s") ui.cursor = ui.cursor ? 0 : 1;
      if (key === "z" || key === "enter" || key === " ") {
        if (ui.cursor === 0) {
          ui.menu = "fight";
          ui.cursor = 0;
        } else {
          this.resolveBattleAction({ type: "run" });
        }
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

  flushBattleLog() {
    if (!this.battleUi?.log?.length) return;
    this.battleUi.log.shift();
    this.renderBattle();
  }

  async resolveBattleAction(action) {
    const ui = this.battleUi;
    ui.busy = true;
    const events = this.battle.turn(action);
    for (const ev of events) {
      await this.playBattleEvent(ev);
      if (this.battle.result) break;
    }
    // sync party HP
    if (this.party[0]) this.party[0].hp = this.battle.player.hp;
    if (this.party[0]) this.party[0].moves = this.battle.player.moves.map((m) => ({ ...m }));

    if (this.battle.result === "victory") {
      ui.log.push("赢了！");
      await this.waitLogClear();
      this.endBattle();
    } else if (this.battle.result === "fled") {
      ui.log.push("安全地逃走了！");
      await this.waitLogClear();
      this.endBattle();
    } else if (this.battle.result === "defeat") {
      ui.log.push(`${this.battle.player.name} 倒下了……`);
      ui.log.push("你匆匆赶回了家……");
      await this.waitLogClear();
      this.endBattle(true);
    } else {
      ui.busy = false;
      ui.menu = "main";
      ui.cursor = 0;
      this.renderBattle();
    }
  }

  playBattleEvent(ev) {
    const ui = this.battleUi;
    const push = (t) => ui.log.push(t);
    if (ev.kind === "move") {
      const who = ev.side === "player" ? this.battle.player.name : `野生的${this.battle.wild.name}`;
      if (ev.missed) push(`${who} 的 ${ev.moveName} 没有命中！`);
      else {
        push(`${who} 使用了 ${ev.moveName}！`);
        if (ev.crit) push("会心一击！");
        if (ev.effectiveness > 1) push("效果拔群！");
        else if (ev.effectiveness > 0 && ev.effectiveness < 1) push("效果不太好……");
        else if (ev.effectiveness === 0) push("没有效果……");
      }
    } else if (ev.kind === "stat") {
      const tgt = ev.target === "player" ? this.battle.player.name : `野生的${this.battle.wild.name}`;
      if (ev.failed) push("但是失败了！");
      else push(`${tgt} 的 ${STAT_ZH[ev.stat] || ev.stat} ${ev.delta < 0 ? "下降了" : "提升了"}！`);
    } else if (ev.kind === "run") {
      push(ev.success ? "逃跑成功！" : "逃不掉！");
    } else if (ev.kind === "faint") {
      const name = ev.side === "player" ? this.battle.player.name : `野生的${this.battle.wild.name}`;
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
      }, 850);
    });
  }

  endBattle(blackout = false) {
    this.ui.battle?.classList.add("hidden");
    this.battle = null;
    this.battleUi = null;
    this.mode = "play";
    if (blackout) {
      if (this.party[0]) this.party[0].hp = this.party[0].stats.hp;
      this.mapId = "house";
      const sp = MAPS.house.spawn;
      this.player.x = sp.x;
      this.player.y = sp.y;
      this.player.facing = "down";
      this.queueLines(["妈妈：没事吧？好好休息……", "宝可梦的体力恢复了。"]);
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
    // field
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

    // HUD bars
    this.ui.enemyHud.innerHTML = monHud(b.wild, true);
    this.ui.playerHud.innerHTML = monHud(b.player, false);

    const log = ui.log[0] || "";
    this.ui.battleLog.textContent = log || " ";

    const menu = this.ui.battleMenu;
    menu.innerHTML = "";
    if (!ui.log.length && !ui.busy) {
      if (ui.menu === "main") {
        ["战斗", "逃跑"].forEach((label, i) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "battle-btn" + (ui.cursor === i ? " active" : "");
          btn.textContent = label;
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
        const tx = startX + i;
        const ty = startY + j;
        const ch = tileAt(map, tx, ty);
        drawTile(ctx, ch, i, j, TILE, ox, oy);
      }
    }

    // NPCs
    for (const n of map.npcs) {
      const sx = (n.x - camX) * TILE;
      const sy = (n.y - camY) * TILE;
      if (sx < -TILE || sy < -TILE || sx > W || sy > H) continue;
      const kind =
        n.id ||
        (n.name === "告示牌" || n.name === "电脑" || n.name === "电视" ? "sign" : "npc");
      // draw at pixel pos
      ctx.save();
      ctx.translate(sx, sy);
      drawNpc(ctx, 0, 0, TILE, kind === "sign" ? "sign" : kind);
      ctx.restore();
    }

    // player
    const ppx = (px - camX) * TILE;
    const ppy = (py - camY) * TILE;
    ctx.save();
    ctx.translate(ppx, ppy);
    drawPlayer(ctx, 0, 0, TILE, this.player.facing, (this.frame / 10) | 0);
    ctx.restore();

    // location chip
    ctx.fillStyle = "rgba(20,16,12,0.55)";
    ctx.fillRect(8, 8, 140, 22);
    ctx.fillStyle = "#f4efe6";
    ctx.font = "12px sans-serif";
    ctx.fillText(map.name, 16, 23);

    if (this.party[0]) {
      const p = this.party[0];
      ctx.fillStyle = "rgba(20,16,12,0.55)";
      ctx.fillRect(W - 148, 8, 140, 22);
      ctx.fillStyle = "#f4efe6";
      ctx.fillText(`${p.name} ${p.hp}/${p.stats.hp}`, W - 140, 23);
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

function monHud(c, enemy) {
  const pct = Math.max(0, c.hp / c.stats.hp);
  const col = pct > 0.5 ? "#5dce6a" : pct > 0.2 ? "#e0c040" : "#e05040";
  return `
    <div class="mh-name">${enemy ? "野生的 " : ""}${c.name} <small>Lv${c.level}</small></div>
    <div class="mh-bar"><i style="width:${(pct * 100).toFixed(1)}%;background:${col}"></i></div>
    ${enemy ? "" : `<div class="mh-hp">${c.hp}/${c.stats.hp}</div>`}
  `;
}

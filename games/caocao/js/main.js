import { CAMPAIGN, choiceBeforeStage } from "../data/campaign.js";
import { STAGES, getStage, stagesForMenu } from "../data/stages.js";
import {
  createBattleState,
  selectUnit,
  tryMove,
  cancelMove,
  waitUnit,
  beginAttack,
  beginMagicPick,
  selectMagic,
  confirmAttack,
  confirmMagic,
  unitAt,
  getUnit,
  clearSelection,
  endPlayerTurnManual,
  runEnemyPhaseAsync,
} from "./engine.js";
import { createRenderer, describeTile, formatUnit, drawPortrait } from "./render.js";
import { createFx } from "./fx.js";
import { TERRAIN, terrainMoveCost } from "../data/classes.js";
import { GENERALS, isHostile } from "../data/generals.js";
import { inventoryToGear } from "../data/equipment.js";
import {
  createDeployState,
  availableForSlot,
  assignSlot,
  clearSlot,
  finalizeDeploy,
  rosterFromSave,
} from "./deploy.js";

const SAVE_KEY = "caocao_campaign_v2";

const els = {
  menu: document.getElementById("menu"),
  deploy: document.getElementById("deploy"),
  deployBoard: document.getElementById("deployBoard"),
  deploySlots: document.getElementById("deploySlots"),
  deployPool: document.getElementById("deployPool"),
  deployHint: document.getElementById("deployHint"),
  btnDeployStart: document.getElementById("btnDeployStart"),
  btnDeployCancel: document.getElementById("btnDeployCancel"),
  battle: document.getElementById("battle"),
  canvas: document.getElementById("board"),
  stageList: document.getElementById("stageList"),
  campaignMeta: document.getElementById("campaignMeta"),
  turnLabel: document.getElementById("turnLabel"),
  phaseLabel: document.getElementById("phaseLabel"),
  objective: document.getElementById("objective"),
  unitInfo: document.getElementById("unitInfo"),
  tileInfo: document.getElementById("tileInfo"),
  log: document.getElementById("battleLog"),
  actionBar: document.getElementById("actionBar"),
  btnAttack: document.getElementById("btnAttack"),
  btnMagic: document.getElementById("btnMagic"),
  btnWait: document.getElementById("btnWait"),
  btnCancel: document.getElementById("btnCancel"),
  btnEndTurn: document.getElementById("btnEndTurn"),
  btnMenu: document.getElementById("btnMenu"),
  magicBar: document.getElementById("magicBar"),
  magicList: document.getElementById("magicList"),
  dialog: document.getElementById("dialog"),
  dialogSpeaker: document.getElementById("dialogSpeaker"),
  dialogText: document.getElementById("dialogText"),
  dialogNext: document.getElementById("dialogNext"),
  dialogChoices: document.getElementById("dialogChoices"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultBody: document.getElementById("resultBody"),
  btnResultOk: document.getElementById("btnResultOk"),
  btnResetSave: document.getElementById("btnResetSave"),
  portrait: document.getElementById("portrait"),
  phaseBanner: document.getElementById("phaseBanner"),
  phaseBannerText: document.getElementById("phaseBannerText"),
};

const renderer = createRenderer(els.canvas);
const deployRenderer = createRenderer(els.deployBoard);
const fx = createFx();

let state = null;
let hover = null;
let talkQueue = [];
let talkMode = null; // intro | victory | choice | battleChoice | branch
let pendingStageId = null;
let pendingChoice = null;
let deployState = null;
let inputLocked = false;

function defaultSave() {
  return {
    cleared: [],
    red: 0,
    blue: 0,
    route: null, // null | 'red' | 'blue'
    inventory: [{ id: "yitian", name: "倚天剑" }],
    choicesDone: [],
  };
}

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...raw };
  } catch {
    return defaultSave();
  }
}

function writeSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function clearedSet(save = loadSave()) {
  return new Set(save.cleared || []);
}

function markCleared(id) {
  const save = loadSave();
  if (!save.cleared.includes(id)) save.cleared.push(id);
  writeSave(save);
}

function addLoot(items) {
  if (!items?.length) return;
  const save = loadSave();
  for (const item of items) {
    if (!save.inventory.some((g) => g.id === item.id)) {
      save.inventory.push(item);
    }
  }
  writeSave(save);
}

function applyChoiceDelta(opt) {
  const save = loadSave();
  if (opt.color === "red") save.red += opt.delta ?? 1;
  else if (opt.color === "blue") save.blue += opt.delta ?? 1;
  writeSave(save);
}

function resolveRoute() {
  const save = loadSave();
  if (save.route) return save.route;
  // 原作：红多走奸臣，蓝多走忠臣；平局偏蓝（忠臣）
  save.route = save.red > save.blue ? "red" : "blue";
  writeSave(save);
  return save.route;
}

function isUnlocked(stage, save = loadSave()) {
  const cleared = clearedSet(save);
  if (stage.route) {
    if (!save.route) return false;
    if (stage.route !== save.route) return false;
  }
  if (!stage.unlockAfter) return true;
  // 第一章首关前可有开场选择，但仍可进
  return cleared.has(stage.unlockAfter);
}

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function updateCampaignMeta() {
  const save = loadSave();
  const routeLabel =
    save.route === "red"
      ? "奸臣路线"
      : save.route === "blue"
        ? "忠臣路线"
        : "尚未分歧（马超战后）";
  const cleared = save.cleared.length;
  const total = stagesForMenu(save.route).length;
  els.campaignMeta.innerHTML = `
    <span class="chip">忠 ${save.blue} · 奸 ${save.red}</span>
    <span class="chip">${routeLabel}</span>
    <span class="chip">通关 ${cleared}/${total}</span>
    <span class="chip">宝物 ${save.inventory.length}</span>
  `;
}

function renderMenu() {
  const save = loadSave();
  updateCampaignMeta();
  els.stageList.innerHTML = "";

  const chapters = CAMPAIGN.chapters.filter((ch) => {
    if (!ch.route) return true;
    return save.route === ch.route;
  });

  for (const ch of chapters) {
    const head = document.createElement("h3");
    head.className = "chapter-head";
    head.textContent = ch.name;
    els.stageList.appendChild(head);

    for (const id of ch.stages) {
      const stage = getStage(id);
      if (!stage) continue;
      const unlocked = isUnlocked(stage, save);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "stage-card" + (unlocked ? "" : " locked");
      card.disabled = !unlocked;
      const badge = stage.handcrafted
        ? "手绘地图"
        : stage.status === "playable"
          ? "精修"
          : stage.optional
            ? "可选"
            : "可通";
      card.innerHTML = `
        <span class="chapter">第 ${stage.no} 关 · ${badge}</span>
        <strong>${stage.name}</strong>
        <p>${stage.objective}</p>
        <span class="flag">${
          clearedSet(save).has(stage.id)
            ? "已通关"
            : unlocked
              ? "可出征"
              : "未解锁"
        }</span>
      `;
      if (unlocked) card.addEventListener("click", () => tryStartStage(stage.id));
      els.stageList.appendChild(card);
    }
  }
}

function tryStartStage(id) {
  const choice = choiceBeforeStage(id);
  const save = loadSave();
  if (choice && !save.choicesDone.includes(choice.id)) {
    pendingStageId = id;
    showChoiceDialog(choice, "choice");
    return;
  }
  startStage(id);
}

function showChoiceDialog(choice, mode) {
  talkMode = mode;
  pendingChoice = choice;
  hide(els.dialogNext);
  els.dialogSpeaker.textContent = choice.title || "抉择";
  els.dialogText.textContent = choice.prompt;
  els.dialogChoices.innerHTML = "";
  show(els.dialogChoices);
  for (const opt of choice.options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn choice-btn choice-${opt.color || "neutral"}`;
    btn.textContent = opt.text;
    btn.addEventListener("click", () => onChoicePicked(opt));
    els.dialogChoices.appendChild(btn);
  }
  show(els.dialog);
}

function onChoicePicked(opt) {
  applyChoiceDelta(opt);
  if (pendingChoice?.id) {
    const save = loadSave();
    if (!save.choicesDone.includes(pendingChoice.id)) {
      save.choicesDone.push(pendingChoice.id);
      writeSave(save);
    }
  }
  hide(els.dialogChoices);
  show(els.dialogNext);
  els.dialogChoices.innerHTML = "";
  pendingChoice = null;

  if (talkMode === "battleChoice") {
    talkMode = null;
    hide(els.dialog);
    refresh();
    return;
  }

  if (talkMode === "branch") {
    const route = resolveRoute();
    talkMode = null;
    hide(els.dialog);
    els.resultTitle.textContent = "路线分歧";
    els.resultBody.textContent =
      route === "red"
        ? "奸臣之气更盛——自此走向称霸之路（奸臣路线）。"
        : "忠义之心更重——自此辅佐汉室（忠臣路线）。";
    show(els.result);
    // 复用结果按钮返回选关
    talkMode = "branchDone";
    return;
  }

  const id = pendingStageId;
  talkMode = null;
  hide(els.dialog);
  if (id) startStage(id);
}

function startStage(id) {
  pendingStageId = id;
  const stage = getStage(id);
  const save = loadSave();
  deployState = createDeployState(stage, rosterFromSave(save));
  hide(els.menu);
  hide(els.battle);
  hide(els.result);
  show(els.deploy);
  els.deployHint.textContent = `【${stage.name}】点选空位，再从武将池指定出战人选。锁定武将不可更换。`;
  renderDeploy();
}

function renderDeploy() {
  if (!deployState) return;
  deployRenderer.drawDeployPreview(deployState.stage, deployState, null);
  els.deploySlots.innerHTML = "";

  for (const [i, p] of deployState.locked.entries()) {
    const tpl = GENERALS[p.generalId];
    const row = document.createElement("div");
    row.className = "deploy-slot locked";
    row.textContent = `锁定·${tpl?.name || p.generalId}（${p.x},${p.y}）`;
    els.deploySlots.appendChild(row);
    void i;
  }

  for (const [i, s] of deployState.slots.entries()) {
    const tpl = s.generalId ? GENERALS[s.generalId] : null;
    const row = document.createElement("button");
    row.type = "button";
    row.className =
      "deploy-slot" + (deployState.selectedSlot === i ? " active" : "");
    row.textContent = tpl
      ? `空位${i + 1}·${tpl.name}`
      : `空位${i + 1}·（未指定）`;
    row.addEventListener("click", () => {
      deployState.selectedSlot = i;
      renderDeploy();
    });
    els.deploySlots.appendChild(row);
  }

  els.deployPool.innerHTML = "";
  const avail = availableForSlot(deployState, deployState.selectedSlot);
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "清空当前空位";
  clearBtn.addEventListener("click", () => {
    clearSlot(deployState, deployState.selectedSlot);
    renderDeploy();
  });
  els.deployPool.appendChild(clearBtn);

  for (const id of avail) {
    const tpl = GENERALS[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${tpl.name} · ${tpl.classId}`;
    btn.addEventListener("click", () => {
      assignSlot(deployState, deployState.selectedSlot, id);
      renderDeploy();
    });
    els.deployPool.appendChild(btn);
  }
}

function confirmDeployAndBattle() {
  if (!deployState) return;
  const players = finalizeDeploy(deployState);
  if (!players?.length) {
    alert("请至少部署一名武将。");
    return;
  }
  const stage = deployState.stage;
  const save = loadSave();
  hide(els.deploy);
  state = createBattleState(stage, {
    gear: inventoryToGear(save.inventory),
    player: players,
  });
  renderer.resize(state);
  show(els.battle);
  els.objective.textContent = stage.objective;
  els.log.innerHTML = "";
  pushLog(`出征：${stage.name}`);
  deployState = null;

  if (stage.intro?.length) {
    talkMode = "intro";
    talkQueue = [...stage.intro];
    showTalk();
  } else {
    maybeBattleChoice();
  }
}

function maybeBattleChoice() {
  const bc = state?.stage?.battleChoice;
  if (!bc) {
    refresh();
    return;
  }
  showChoiceDialog(
    {
      id: `battle_${state.stage.id}`,
      title: "战前计议",
      prompt: bc.prompt,
      options: bc.options,
    },
    "battleChoice"
  );
}

function showTalk() {
  hide(els.dialogChoices);
  show(els.dialogNext);
  if (!talkQueue.length) {
    hide(els.dialog);
    if (talkMode === "victory") {
      afterVictoryTalk();
    } else if (talkMode === "intro") {
      talkMode = null;
      maybeBattleChoice();
    } else if (talkMode === "event") {
      talkMode = null;
      refresh();
    } else {
      talkMode = null;
      refresh();
    }
    return;
  }
  const line = talkQueue.shift();
  els.dialogSpeaker.textContent = line.speaker;
  els.dialogText.textContent = line.text;
  show(els.dialog);
}

function afterVictoryTalk() {
  talkMode = null;
  if (state?.stage) {
    markCleared(state.stage.id);
    if (state.lootGained?.length) addLoot(state.lootGained);
    if (state.stage.branchAfter) {
      hide(els.battle);
      const save = loadSave();
      showChoiceDialog(
        {
          id: "route_branch",
          title: "马超既破",
          prompt: `累计倾向：忠 ${save.blue} / 奸 ${save.red}。确认进入分歧路线？`,
          options: [
            { text: "依对话倾向决定路线", color: "red", delta: 0 },
            { text: "仍依倾向决定（忠多走忠臣）", color: "blue", delta: 0 },
          ],
        },
        "branch"
      );
      return;
    }
  }
  hide(els.battle);
  show(els.menu);
  renderMenu();
}

function finishVictory() {
  if (state?.stage?.victoryTalk?.length) {
    talkMode = "victory";
    talkQueue = [...state.stage.victoryTalk];
    showTalk();
  } else {
    afterVictoryTalk();
  }
}

function pushLog(text) {
  const div = document.createElement("div");
  div.textContent = text;
  els.log.prepend(div);
}

async function showPhaseBanner(text, tone = "player") {
  if (!els.phaseBanner || !els.phaseBannerText) {
    await fx.sleep(280);
    return;
  }
  els.phaseBannerText.textContent = text;
  els.phaseBanner.dataset.tone = tone;
  els.phaseBanner.classList.remove("hidden", "out");
  // reflow for restart animation
  void els.phaseBanner.offsetWidth;
  els.phaseBanner.classList.add("show");
  await fx.sleep(720);
  els.phaseBanner.classList.add("out");
  await fx.sleep(280);
  els.phaseBanner.classList.add("hidden");
  els.phaseBanner.classList.remove("show", "out");
}

async function playAiEvent(evt) {
  if (!evt) return;
  if (evt.type === "banner") {
    await showPhaseBanner(evt.text, evt.tone || "enemy");
    refresh();
    return;
  }
  if (evt.type === "move" && evt.from && evt.to) {
    await fx.playMove(evt.unit.id, evt.from, evt.to, renderer.TILE);
    return;
  }
  if (evt.type === "attack") {
    await fx.playAttack(evt, renderer.TILE);
    if (evt.miss) {
      pushLog(`${evt.attacker.name} 攻击 ${evt.defender.name}，未命中！`);
    } else {
      pushLog(
        `${evt.attacker.name} 攻击 ${evt.defender.name}，伤害 ${evt.damage}${
          evt.crit ? "（暴击）" : ""
        }${evt.dual ? "（连击）" : ""}`
      );
      if (!evt.defender.alive) pushLog(`${evt.defender.name} 被击破！`);
    }
    refresh();
  }
}

async function drainEnemyPhase() {
  if (!state?.queueEnemyPhase || state.result) return;
  inputLocked = true;
  refresh();
  await runEnemyPhaseAsync(state, playAiEvent);
  inputLocked = false;
  refresh();
}

function paint() {
  if (!state || els.battle.classList.contains("hidden")) return;
  fx.update();
  renderer.draw(state, hover, fx);
}

function refresh() {
  if (!state) return;
  paint();
  els.turnLabel.textContent = `第 ${state.turn} 回合`;
  const phase =
    state.phase === "player"
      ? "我军阶段"
      : state.phase === "enemy"
        ? "敌军阶段"
        : state.phase === "ally"
          ? "友军阶段"
          : "—";
  els.phaseLabel.textContent = phase;
  els.phaseLabel.dataset.phase = state.phase || "";

  const sel = getUnit(state, state.selectedId);
  let shown = sel;
  if (!shown && hover) shown = unitAt(state, hover.x, hover.y);
  if (shown) {
    els.unitInfo.textContent = formatUnit(shown);
    drawPortrait(els.portrait, shown);
  } else {
    els.unitInfo.textContent = "点击己方武将行动";
    if (els.portrait) {
      const ctx = els.portrait.getContext("2d");
      ctx.clearRect(0, 0, els.portrait.width, els.portrait.height);
    }
  }

  if (hover) {
    const tid = state.tiles[hover.y][hover.x];
    const cls = getUnit(state, state.selectedId)?.classId || "infantry";
    const cost = terrainMoveCost(tid, cls);
    els.tileInfo.textContent = `${describeTile(state, hover.x, hover.y)} · 移动消耗 ${
      cost >= 9 ? "不可进入" : cost
    }`;
  } else {
    els.tileInfo.textContent = "移动鼠标查看地形";
  }

  const inAction =
    state.mode === "action" ||
    state.mode === "attack" ||
    state.mode === "magic" ||
    state.mode === "magicPick";
  els.actionBar.classList.toggle("hidden", !inAction && state.mode !== "move");
  const busy = inputLocked || fx.isBusy();
  els.btnAttack.disabled =
    busy || !(state.mode === "action" && state.attackTargets.length);
  els.btnMagic.disabled =
    busy || !(state.mode === "action" && state.magicList?.length);
  els.btnWait.disabled =
    busy ||
    !(
      state.mode === "action" ||
      state.mode === "attack" ||
      state.mode === "magic" ||
      state.mode === "magicPick"
    );
  els.btnCancel.disabled =
    busy ||
    !(
      state.mode === "move" ||
      state.mode === "action" ||
      state.mode === "attack" ||
      state.mode === "magic" ||
      state.mode === "magicPick"
    );
  els.btnEndTurn.disabled = busy || state.phase !== "player";

  if (state.mode === "magicPick") {
    show(els.magicBar);
    els.magicList.innerHTML = "";
    for (const m of state.magicList) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = `${m.name}（MP ${m.mp}）`;
      b.disabled = busy;
      b.addEventListener("click", () => {
        selectMagic(state, m.id);
        refresh();
      });
      els.magicList.appendChild(b);
    }
  } else {
    hide(els.magicBar);
  }

  flushSpeakQueue();

  if (state.result) {
    els.resultTitle.textContent = state.result.win ? "胜利" : "败北";
    els.resultBody.textContent = state.result.text;
    show(els.result);
  }
}

function tickLoop() {
  if (state && !els.battle.classList.contains("hidden")) {
    paint();
  }
  requestAnimationFrame(tickLoop);
}
requestAnimationFrame(tickLoop);

function flushSpeakQueue() {
  if (!state?.speakQueue?.length || talkMode) return;
  const lines = state.speakQueue.splice(0, state.speakQueue.length);
  talkMode = "event";
  talkQueue = lines;
  showTalk();
}

function canvasPos(evt) {
  const rect = els.canvas.getBoundingClientRect();
  const scaleX = els.canvas.width / rect.width;
  const scaleY = els.canvas.height / rect.height;
  const x = Math.floor(((evt.clientX - rect.left) * scaleX) / renderer.TILE);
  const y = Math.floor(((evt.clientY - rect.top) * scaleY) / renderer.TILE);
  return { x, y };
}

els.canvas.addEventListener("mousemove", (e) => {
  if (!state || state.phase !== "player") return;
  const p = canvasPos(e);
  if (p.x < 0 || p.y < 0 || p.x >= state.width || p.y >= state.height) {
    hover = null;
  } else hover = p;
  // 悬停只刷新侧栏文案，画面由 rAF 绘制
  if (!inputLocked) refreshSidebarHover();
});

function refreshSidebarHover() {
  if (!state) return;
  const sel = getUnit(state, state.selectedId);
  let shown = sel;
  if (!shown && hover) shown = unitAt(state, hover.x, hover.y);
  if (shown) {
    els.unitInfo.textContent = formatUnit(shown);
    drawPortrait(els.portrait, shown);
  }
  if (hover) {
    const tid = state.tiles[hover.y][hover.x];
    const cls = getUnit(state, state.selectedId)?.classId || "infantry";
    const cost = terrainMoveCost(tid, cls);
    els.tileInfo.textContent = `${describeTile(state, hover.x, hover.y)} · 移动消耗 ${
      cost >= 9 ? "不可进入" : cost
    }`;
  }
}

els.canvas.addEventListener("click", async (e) => {
  if (!state || state.phase !== "player" || talkMode || inputLocked || fx.isBusy()) return;
  const { x, y } = canvasPos(e);
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return;

  if (state.mode === "select" || state.mode === "move") {
    const u = unitAt(state, x, y);
    if (state.mode === "select") {
      if (u && u.team === "player") selectUnit(state, u);
    } else if (state.mode === "move") {
      if (u && u.team === "player" && !u.done) {
        selectUnit(state, u);
      } else {
        const moved = tryMove(state, x, y);
        if (moved) {
          inputLocked = true;
          refresh();
          await fx.playMove(moved.unit.id, moved.from, moved.to, renderer.TILE);
          inputLocked = false;
        }
      }
    }
  } else if (state.mode === "attack") {
    const t = unitAt(state, x, y);
    const atk = getUnit(state, state.selectedId);
    if (t && atk && isHostile(atk, t)) {
      const evt = confirmAttack(state, t);
      if (evt) {
        inputLocked = true;
        refresh();
        await fx.playAttack(evt, renderer.TILE);
        if (evt.miss) {
          pushLog(`${evt.attacker.name} 攻击 ${evt.defender.name}，未命中！`);
        } else {
          pushLog(
            `${evt.attacker.name} 攻击 ${evt.defender.name}，伤害 ${evt.damage}${
              evt.crit ? "（暴击）" : ""
            }${evt.dual ? "（连击）" : ""}`
          );
          if (!evt.defender.alive) pushLog(`${evt.defender.name} 被击破！`);
        }
        inputLocked = false;
      }
    }
  } else if (state.mode === "magic") {
    const t = unitAt(state, x, y);
    if (t) {
      const evt = confirmMagic(state, t);
      if (evt) {
        inputLocked = true;
        refresh();
        await fx.playMagic(evt, renderer.TILE);
        if (evt.miss) {
          pushLog(`${evt.caster.name} 施展「${evt.magic.name}」失败`);
        } else if (evt.heal) {
          pushLog(
            `${evt.caster.name}「${evt.magic.name}」回复 ${evt.target.name} ${evt.heal}`
          );
        } else {
          pushLog(
            `${evt.caster.name}「${evt.magic.name}」对 ${evt.target.name} 造成 ${evt.damage}`
          );
          if (!evt.target.alive) pushLog(`${evt.target.name} 被击破！`);
        }
        inputLocked = false;
      }
    }
  }
  refresh();
  await drainEnemyPhase();
});

els.btnAttack.addEventListener("click", () => {
  if (inputLocked || fx.isBusy()) return;
  beginAttack(state);
  refresh();
});
els.btnMagic.addEventListener("click", () => {
  if (inputLocked || fx.isBusy()) return;
  beginMagicPick(state);
  refresh();
});
els.btnWait.addEventListener("click", async () => {
  if (inputLocked || fx.isBusy()) return;
  waitUnit(state);
  pushLog("待机");
  refresh();
  await drainEnemyPhase();
});
els.btnCancel.addEventListener("click", () => {
  if (inputLocked || fx.isBusy()) return;
  if (state.mode === "attack" || state.mode === "magic" || state.mode === "magicPick") {
    state.mode = "action";
    state.pendingMagic = null;
    const unit = getUnit(state, state.selectedId);
    if (unit) state.attackTargets = [];
  } else if (state.mode === "action" || state.mode === "move") {
    cancelMove(state);
  } else clearSelection(state);
  refresh();
});
els.btnEndTurn.addEventListener("click", async () => {
  if (!state || state.phase !== "player" || inputLocked || fx.isBusy()) return;
  endPlayerTurnManual(state);
  pushLog("结束回合");
  refresh();
  await drainEnemyPhase();
  if (state && !state.result) pushLog("敌军行动完毕");
});
els.btnMenu.addEventListener("click", () => {
  if (!confirm("返回战役选择？当前战斗进度将丢失。")) return;
  state = null;
  talkMode = null;
  hide(els.battle);
  hide(els.deploy);
  hide(els.result);
  hide(els.dialog);
  show(els.menu);
  renderMenu();
});

els.dialogNext.addEventListener("click", () => showTalk());
els.btnResultOk.addEventListener("click", () => {
  hide(els.result);
  if (talkMode === "branchDone") {
    talkMode = null;
    hide(els.battle);
    show(els.menu);
    renderMenu();
    return;
  }
  if (state?.result?.win) {
    finishVictory();
  } else {
    hide(els.battle);
    show(els.menu);
    renderMenu();
  }
});

els.btnResetSave?.addEventListener("click", () => {
  if (!confirm("清空战役进度、忠奸值与宝物？")) return;
  writeSave(defaultSave());
  renderMenu();
});

els.btnDeployStart?.addEventListener("click", () => confirmDeployAndBattle());
els.btnDeployCancel?.addEventListener("click", () => {
  deployState = null;
  hide(els.deploy);
  show(els.menu);
  renderMenu();
});

// 迁移旧存档键
try {
  const old = localStorage.getItem("caocao_cleared_stages");
  if (old && !localStorage.getItem(SAVE_KEY)) {
    const save = defaultSave();
    save.cleared = JSON.parse(old);
    // 旧两关 id 映射
    save.cleared = save.cleared.map((id) => {
      if (id === "s01_yingchuan") return "yingchuan";
      if (id === "s02_sishui") return "sishui";
      return id;
    });
    writeSave(save);
  }
} catch {
  /* ignore */
}

renderMenu();

// 避免未使用告警（调试时可在控制台查看）
void STAGES;

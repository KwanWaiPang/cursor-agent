import { STAGES, getStage } from "../data/stages.js";
import {
  createBattleState,
  selectUnit,
  tryMove,
  cancelMove,
  waitUnit,
  beginAttack,
  confirmAttack,
  unitAt,
  getUnit,
  clearSelection,
  endPlayerTurnManual,
} from "./engine.js";
import { createRenderer, describeTile, formatUnit } from "./render.js";
import { TERRAIN } from "../data/classes.js";

const els = {
  menu: document.getElementById("menu"),
  battle: document.getElementById("battle"),
  canvas: document.getElementById("board"),
  stageList: document.getElementById("stageList"),
  turnLabel: document.getElementById("turnLabel"),
  phaseLabel: document.getElementById("phaseLabel"),
  objective: document.getElementById("objective"),
  unitInfo: document.getElementById("unitInfo"),
  tileInfo: document.getElementById("tileInfo"),
  log: document.getElementById("battleLog"),
  actionBar: document.getElementById("actionBar"),
  btnAttack: document.getElementById("btnAttack"),
  btnWait: document.getElementById("btnWait"),
  btnCancel: document.getElementById("btnCancel"),
  btnEndTurn: document.getElementById("btnEndTurn"),
  btnMenu: document.getElementById("btnMenu"),
  dialog: document.getElementById("dialog"),
  dialogSpeaker: document.getElementById("dialogSpeaker"),
  dialogText: document.getElementById("dialogText"),
  dialogNext: document.getElementById("dialogNext"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultBody: document.getElementById("resultBody"),
  btnResultOk: document.getElementById("btnResultOk"),
};

const CLEARED_KEY = "caocao_cleared_stages";
const renderer = createRenderer(els.canvas);

let state = null;
let hover = null;
let talkQueue = [];
let talkMode = null; // intro | victory
let pendingStageId = null;

function clearedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLEARED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markCleared(id) {
  const s = clearedSet();
  s.add(id);
  localStorage.setItem(CLEARED_KEY, JSON.stringify([...s]));
}

function isUnlocked(stage) {
  if (!stage.unlockAfter) return true;
  return clearedSet().has(stage.unlockAfter);
}

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function renderMenu() {
  const cleared = clearedSet();
  els.stageList.innerHTML = "";
  for (const stage of STAGES) {
    const unlocked = isUnlocked(stage);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "stage-card" + (unlocked ? "" : " locked");
    card.disabled = !unlocked;
    card.innerHTML = `
      <span class="chapter">${stage.chapter}</span>
      <strong>${stage.name}</strong>
      <p>${stage.objective}</p>
      <span class="flag">${cleared.has(stage.id) ? "已通关" : unlocked ? "可出征" : "未解锁"}</span>
    `;
    if (unlocked) card.addEventListener("click", () => startStage(stage.id));
    els.stageList.appendChild(card);
  }
}

function startStage(id) {
  pendingStageId = id;
  const stage = getStage(id);
  state = createBattleState(stage);
  renderer.resize(state);
  hide(els.menu);
  hide(els.result);
  show(els.battle);
  els.objective.textContent = stage.objective;
  els.log.innerHTML = "";
  pushLog(`出征：${stage.name}`);
  if (stage.intro?.length) {
    talkMode = "intro";
    talkQueue = [...stage.intro];
    showTalk();
  } else {
    refresh();
  }
}

function showTalk() {
  if (!talkQueue.length) {
    hide(els.dialog);
    if (talkMode === "victory") {
      finishVictory();
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

function finishVictory() {
  talkMode = null;
  if (state?.stage) markCleared(state.stage.id);
  hide(els.battle);
  show(els.menu);
  renderMenu();
}

function pushLog(text) {
  const div = document.createElement("div");
  div.textContent = text;
  els.log.prepend(div);
}

function refresh() {
  if (!state) return;
  renderer.draw(state, hover);
  els.turnLabel.textContent = `第 ${state.turn} 回合`;
  els.phaseLabel.textContent =
    state.phase === "player" ? "我军阶段" : state.phase === "enemy" ? "敌军阶段" : "—";

  const sel = getUnit(state, state.selectedId);
  if (sel) {
    els.unitInfo.textContent = formatUnit(sel);
  } else if (hover) {
    const u = unitAt(state, hover.x, hover.y);
    els.unitInfo.textContent = u ? formatUnit(u) : "未选择武将";
  } else {
    els.unitInfo.textContent = "点击己方武将行动";
  }

  if (hover) {
    const tid = state.tiles[hover.y][hover.x];
    const t = TERRAIN[tid];
    els.tileInfo.textContent = `${describeTile(state, hover.x, hover.y)} · 移动消耗 ${t.moveCost}${
      t.defBonus ? ` · 防御+${Math.round(t.defBonus * 100)}%` : ""
    }`;
  } else {
    els.tileInfo.textContent = "移动鼠标查看地形";
  }

  const inAction = state.mode === "action" || state.mode === "attack";
  els.actionBar.classList.toggle("hidden", !inAction && state.mode !== "move");
  els.btnAttack.disabled = !(state.mode === "action" && state.attackTargets.length);
  els.btnWait.disabled = !(state.mode === "action" || state.mode === "attack");
  els.btnCancel.disabled = !(state.mode === "move" || state.mode === "action" || state.mode === "attack");

  if (state.result) {
    els.resultTitle.textContent = state.result.win ? "胜利" : "败北";
    els.resultBody.textContent = state.result.text;
    show(els.result);
  }
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
  refresh();
});

els.canvas.addEventListener("click", (e) => {
  if (!state || state.phase !== "player" || talkMode) return;
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
        tryMove(state, x, y);
      }
    }
  } else if (state.mode === "attack") {
    const t = unitAt(state, x, y);
    if (t && t.team === "enemy") {
      const evt = confirmAttack(state, t);
      if (evt) {
        pushLog(
          `${evt.attacker.name} 攻击 ${evt.defender.name}，伤害 ${evt.damage}${
            evt.crit ? "（暴击）" : ""
          }`
        );
        if (!evt.defender.alive) pushLog(`${evt.defender.name} 被击破！`);
      }
    }
  }
  refresh();
});

els.btnAttack.addEventListener("click", () => {
  beginAttack(state);
  refresh();
});
els.btnWait.addEventListener("click", () => {
  waitUnit(state);
  pushLog("待机");
  refresh();
});
els.btnCancel.addEventListener("click", () => {
  if (state.mode === "attack") {
    state.mode = "action";
  } else if (state.mode === "action" || state.mode === "move") {
    cancelMove(state);
  } else clearSelection(state);
  refresh();
});
els.btnEndTurn.addEventListener("click", () => {
  if (!state || state.phase !== "player") return;
  endPlayerTurnManual(state);
  pushLog("结束回合，敌军行动完毕");
  refresh();
});
els.btnMenu.addEventListener("click", () => {
  if (!confirm("返回战役选择？当前战斗进度将丢失。")) return;
  state = null;
  hide(els.battle);
  hide(els.result);
  hide(els.dialog);
  show(els.menu);
  renderMenu();
});

els.dialogNext.addEventListener("click", () => showTalk());
els.btnResultOk.addEventListener("click", () => {
  hide(els.result);
  if (state?.result?.win && state.stage.victoryTalk?.length) {
    talkMode = "victory";
    talkQueue = [...state.stage.victoryTalk];
    showTalk();
  } else if (state?.result?.win) {
    finishVictory();
  } else {
    hide(els.battle);
    show(els.menu);
    renderMenu();
  }
});

renderMenu();

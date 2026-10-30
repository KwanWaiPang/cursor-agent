import { audio } from "./audio.js";
import { VIEW_H, VIEW_W, createGame, pressStart, stepGame } from "./engine.js";
import { computeFitScale } from "./fit.js";
import { drawGame } from "./render.js";

const STEP = 1 / 60;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const frame = document.getElementById("frame");
const hud = document.getElementById("hud");
const overlay = document.getElementById("overlay");
const ovKicker = document.getElementById("ovKicker");
const ovTitle = document.getElementById("ovTitle");
const ovBody = document.getElementById("ovBody");
const ovBtn = document.getElementById("ovBtn");
const stageName = document.getElementById("stageName");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const hpEl = document.getElementById("hp");
const nadesEl = document.getElementById("nades");
const progressEl = document.getElementById("progress");
const bossbar = document.getElementById("bossbar");
const bossName = document.getElementById("bossName");
const bossFill = document.getElementById("bossFill");
const btnPause = document.getElementById("btnPause");
const btnSound = document.getElementById("btnSound");

const KEY = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyK: "jump",
  KeyZ: "jump",
  KeyJ: "fire",
  KeyX: "fire",
  KeyC: "grenade",
  KeyQ: "grenade",
  KeyG: "grenade",
  Enter: "start",
  KeyP: "pause",
  Escape: "pause",
  KeyM: "mute",
};
const PREVENT = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

const codes = new Set();
const touchHeld = new Set();
const pointers = new Map();
const edges = { jump: false, grenade: false, start: false, pause: false, mute: false };
let mouseDown = false;
let mouseAim = null;

const state = createGame(1);
const params = new URLSearchParams(location.search);
const soundKey = "steel-shell-sound";
try {
  if (sessionStorage.getItem(soundKey) === "0") audio.setEnabled(false);
} catch {
  /* private mode */
}

function heldAct(act) {
  for (const code of codes) if (KEY[code] === act) return true;
  return touchHeld.has(act);
}

function readInput() {
  const input = {
    left: heldAct("left"),
    right: heldAct("right"),
    up: heldAct("up"),
    down: heldAct("down"),
    jumpHeld: heldAct("jump"),
    fire: heldAct("fire") || mouseDown,
    jump: edges.jump,
    grenade: edges.grenade,
    start: edges.start,
    pause: edges.pause,
  };
  edges.jump = false;
  edges.grenade = false;
  edges.start = false;
  edges.pause = false;
  return input;
}

function markEdge(act) {
  if (act === "jump") edges.jump = true;
  if (act === "grenade") edges.grenade = true;
  if (act === "start") edges.start = true;
  if (act === "pause") edges.pause = true;
  if (act === "mute") edges.mute = true;
}

window.addEventListener("keydown", (e) => {
  const act = KEY[e.code];
  if (!act) return;
  if (PREVENT.has(e.code)) e.preventDefault();
  const was = codes.has(e.code);
  codes.add(e.code);
  if (!was && !e.repeat) markEdge(act);
});
window.addEventListener("keyup", (e) => codes.delete(e.code));
window.addEventListener("blur", () => {
  codes.clear();
  mouseDown = false;
});

function syncTouch() {
  touchHeld.clear();
  for (const act of pointers.values()) touchHeld.add(act);
}

for (const btn of document.querySelectorAll("[data-act]")) {
  const act = btn.dataset.act;
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    audio.unlock();
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pointers.set(e.pointerId, act);
    syncTouch();
    markEdge(act);
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    syncTouch();
  };
  btn.addEventListener("pointerup", end);
  btn.addEventListener("pointercancel", end);
}

function aimFromEvent(e) {
  if (!e || e.pointerType === "touch") return;
  const rect = canvas.getBoundingClientRect();
  const inside =
    e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside || rect.width < 2) {
    mouseAim = null;
    return;
  }
  mouseAim = {
    x: ((e.clientX - rect.left) / rect.width) * VIEW_W + state.camX,
    y: ((e.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch") return;
  if (e.button !== 0) return;
  audio.unlock();
  mouseDown = true;
  aimFromEvent(e);
});
canvas.addEventListener("pointermove", aimFromEvent);
canvas.addEventListener("pointerleave", () => {
  mouseAim = null;
});
window.addEventListener("pointerup", (e) => {
  if (e.pointerType !== "touch") mouseDown = false;
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

btnPause.addEventListener("click", () => {
  audio.unlock();
  edges.pause = true;
});
btnSound.addEventListener("click", () => {
  audio.unlock();
  audio.setEnabled(!audio.enabled);
  try {
    sessionStorage.setItem(soundKey, audio.enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  syncSoundLabel();
});
ovBtn.addEventListener("click", () => {
  audio.unlock();
  if (state.mode === "pause") edges.pause = true;
  else edges.start = true;
});

function syncSoundLabel() {
  btnSound.textContent = audio.enabled ? "声音" : "静音";
  btnSound.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
}

function layout() {
  const wrap = frame.parentElement;
  const rect = wrap.getBoundingClientRect();
  const scale = computeFitScale(Math.max(1, rect.width - 6), Math.max(1, rect.height - 6));
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}

function pips(hp, max) {
  let html = "";
  for (let i = 0; i < max; i++) html += `<i class="${i < hp ? "on" : ""}"></i>`;
  return html;
}

function syncHud() {
  const playing = state.player && state.mode !== "title";
  hud.hidden = !playing;
  if (!playing) {
    bossbar.hidden = true;
    return;
  }
  const lv = state.level;
  stageName.textContent = lv ? `${lv.indexLabel} · ${lv.name}` : "";
  scoreEl.textContent = String(state.score).padStart(6, "0");
  livesEl.textContent = `命 × ${state.lives}`;
  hpEl.innerHTML = pips(state.player.hp, state.player.maxHp);
  nadesEl.textContent = `榴弹 ${state.player.grenades}`;
  const denom = Math.max(1, lv.boss.trigger);
  progressEl.style.width = `${Math.max(0, Math.min(1, state.player.x / denom)) * 100}%`;
  const boss = state.boss;
  const showBoss = !!(boss?.alive && state.bossEngaged && (state.mode === "play" || state.mode === "dying"));
  bossbar.hidden = !showBoss;
  if (showBoss) {
    bossName.textContent = boss.name;
    bossFill.style.width = `${Math.max(0, boss.hp / boss.maxHp) * 100}%`;
  }
  frame.classList.toggle("low-hp", state.player.hp > 0 && state.player.hp <= 2);
  btnPause.disabled = state.mode === "title" || state.mode === "over" || state.mode === "win";
}

function syncOverlay() {
  const mode = state.mode;
  const show = mode === "title" || mode === "intro" || mode === "pause" || mode === "clear" || mode === "over" || mode === "win";
  overlay.hidden = !show;
  if (!show) return;
  const lv = state.level;
  if (mode === "title") {
    ovKicker.textContent = "游戏馆 · 横版跑打";
    ovTitle.textContent = "钢壳奇兵";
    ovBody.textContent =
      "斥候青岚推进废土三关。步枪无限，榴弹有限。下蹲躲开平射，向上瞄准对付浮空目标。致敬街机跑打手感，并非商业街机的官方作品。";
    ovBtn.textContent = "开始任务";
  } else if (mode === "intro" && lv) {
    ovKicker.textContent = lv.indexLabel;
    ovTitle.textContent = lv.name;
    ovBody.textContent = lv.blurb;
    ovBtn.textContent = "投入战斗";
  } else if (mode === "pause") {
    ovKicker.textContent = lv ? lv.name : "暂停";
    ovTitle.textContent = "暂停";
    ovBody.textContent = "A D 移动，空格跳跃，S 下蹲，J 射击，C 榴弹。鼠标瞄准并按住左键亦可开火。";
    ovBtn.textContent = "继续";
  } else if (mode === "clear" && lv) {
    ovKicker.textContent = "关卡通过";
    ovTitle.textContent = lv.name;
    ovBody.textContent = `战绩 +1500${state.lifeGained ? "，命数 +1" : ""}。当前得分 ${state.score}。`;
    ovBtn.textContent = state.stageIndex + 1 >= 3 ? "完成任务" : "下一关";
  } else if (mode === "win") {
    ovKicker.textContent = "战线肃清";
    ovTitle.textContent = "钢壳奇兵";
    ovBody.textContent = `三关通过。总分 ${state.score}。`;
    ovBtn.textContent = "再来一局";
  } else if (mode === "over") {
    ovKicker.textContent = "任务失败";
    ovTitle.textContent = "再来一局";
    ovBody.textContent = `得分 ${state.score}。命数已尽。`;
    ovBtn.textContent = "再来一局";
  }
}

let last = performance.now();
let acc = 0;

function frameLoop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  if (edges.mute) {
    edges.mute = false;
    audio.setEnabled(!audio.enabled);
    try {
      sessionStorage.setItem(soundKey, audio.enabled ? "1" : "0");
    } catch {
      /* ignore */
    }
    syncSoundLabel();
  }
  let guard = 0;
  while (acc >= STEP && guard < 5) {
    state.pointerAim = mouseAim;
    const input = readInput();
    stepGame(state, input, STEP);
    audio.play(state.events);
    const musicOn = state.mode === "play" || state.mode === "intro" || state.mode === "clear";
    audio.tickMusic(STEP, musicOn);
    acc -= STEP;
    guard += 1;
  }
  if (guard === 5) acc = 0;
  drawGame(ctx, state);
  syncHud();
  syncOverlay();
  requestAnimationFrame(frameLoop);
}

function boot() {
  layout();
  syncSoundLabel();
  window.addEventListener("resize", layout);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", layout);
  if (params.get("autostart") === "1") {
    pressStart(state);
    pressStart(state);
  }
  requestAnimationFrame(frameLoop);
}

window.__STEEL__ = {
  state,
  pressStart,
  stepGame,
  edges,
  audio,
};

boot();

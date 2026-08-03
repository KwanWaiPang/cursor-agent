import { Game } from "./game.js";

const canvas = document.getElementById("game");
const ui = {
  title: document.getElementById("title"),
  btnNew: document.getElementById("btnNew"),
  btnContinue: document.getElementById("btnContinue"),
  dialog: document.getElementById("dialog"),
  dialogText: document.getElementById("dialogText"),
  starter: document.getElementById("starter"),
  starterCanvas: document.getElementById("starterCanvas"),
  starterName: document.getElementById("starterName"),
  starterTypes: document.getElementById("starterTypes"),
  starterBlurb: document.getElementById("starterBlurb"),
  starterTabs: document.getElementById("starterTabs"),
  starterConfirm: document.getElementById("starterConfirm"),
  battle: document.getElementById("battle"),
  battleCanvas: document.getElementById("battleCanvas"),
  enemyHud: document.getElementById("enemyHud"),
  playerHud: document.getElementById("playerHud"),
  battleLog: document.getElementById("battleLog"),
  battleMenu: document.getElementById("battleMenu"),
};

const game = new Game(canvas, ui);
window.__POCKET_GAME__ = game;

ui.starterConfirm?.addEventListener("click", () => {
  if (game.mode === "starter") game.confirmStarter();
});

document.getElementById("dialog")?.addEventListener("click", () => {
  if (game.mode === "dialogue") game.advanceDialogue();
});

// touch D-pad
document.querySelectorAll("[data-pad]").forEach((btn) => {
  const key = btn.getAttribute("data-pad");
  const press = (on) => {
    if (on) {
      game.keys.add(key);
      game.onKey(key, true);
    } else game.keys.delete(key);
  };
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    press(true);
  });
  btn.addEventListener("pointerup", () => press(false));
  btn.addEventListener("pointercancel", () => press(false));
});

document.getElementById("btnA")?.addEventListener("click", () => game.onKey("z", true));
document.getElementById("btnB")?.addEventListener("click", () => game.onKey("x", true));

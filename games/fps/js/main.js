import { Game } from "./game.js";

const menu = document.getElementById("menu");
const pause = document.getElementById("pause");
const result = document.getElementById("result");
const webglFail = document.getElementById("webgl-fail");
const resultTitle = document.getElementById("resultTitle");
const resultBody = document.getElementById("resultBody");

let game = null;
let lastMode = "assault";

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function start(mode) {
  lastMode = mode;
  hide(menu);
  hide(result);
  hide(pause);
  if (game) {
    game.dispose();
    game = null;
  }
  try {
    game = new Game({
      mode,
      onEnd: (r) => {
        resultTitle.textContent = r.win ? "任务完成" : "行动终止";
        resultBody.textContent = r.detail || "";
        show(result);
      },
    });
  } catch (e) {
    if (String(e.message) === "WEBGL") {
      hide(menu);
      show(webglFail);
      return;
    }
    console.error(e);
    show(menu);
  }
}

function quitToMenu() {
  if (game) {
    game.dispose();
    game = null;
  }
  hide(pause);
  hide(result);
  show(menu);
}

document.querySelectorAll(".mode-card").forEach((btn) => {
  btn.addEventListener("click", () => start(btn.dataset.mode));
});

document.getElementById("btnResume")?.addEventListener("click", () => {
  game?.resume();
});

document.getElementById("btnQuit")?.addEventListener("click", quitToMenu);
document.getElementById("btnMenu")?.addEventListener("click", quitToMenu);
document.getElementById("btnAgain")?.addEventListener("click", () => start(lastMode));

// 旧链接提示
if (!window.WebGLRenderingContext) {
  hide(menu);
  show(webglFail);
}

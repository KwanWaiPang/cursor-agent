import { Game } from "./engine.js";

const canvas = document.getElementById("game");
if (canvas) {
  const game = new Game(canvas);
  window.__REDCAP__ = game;
}

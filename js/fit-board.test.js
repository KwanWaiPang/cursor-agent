import { fitBoardEdge, layoutIsStacked } from "./fit-board.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const phone = fitBoardEdge({ innerW: 360, availH: 700, aspect: 1 });
assert(phone.width === 360 && phone.height === 360, `phone square ${phone.width}x${phone.height}`);

const landscape = fitBoardEdge({ innerW: 700, availH: 280, aspect: 1 });
assert(landscape.width === 280, `short screen uses height, got ${landscape.width}`);

const desktop = fitBoardEdge({ innerW: 1400, availH: 900, aspect: 1 });
assert(desktop.width === 900, `desktop grows to the viewport, got ${desktop.width}`);

const tall = fitBoardEdge({ innerW: 400, availH: 800, aspect: 1.9 });
assert(tall.width === 400, `tall board uses width on a phone, got ${tall.width}`);
assert(tall.height === 760, `tall board height ${tall.height}`);

const tallShort = fitBoardEdge({ innerW: 800, availH: 500, aspect: 1.9 });
assert(tallShort.height <= 500, "tall board stays inside a short viewport");

assert(layoutIsStacked("952px") === true, "one resolved column is stacked");
assert(layoutIsStacked("640.5px 576px") === false, "two resolved columns sit side by side");
assert(layoutIsStacked("none") === true, "no template is stacked");
assert(layoutIsStacked("") === true, "empty template is stacked");
assert(layoutIsStacked("minmax(0px, 1fr) 320px") === null, "unresolved template is left to geometry");

console.log("fit-board tests passed");

import { SCENARIO_190 } from "../data/factions.js";
import { totalRegions } from "../data/cities.js";
import {
  createGame,
  playerFaction,
  formArmy,
  setMarchTarget,
  endTurn,
  recallArmy,
  getOfficerView,
  landCount,
  cityOwner,
  incomeOf,
  cityById,
  pushLog,
} from "./engine.js";
import { createMapRenderer } from "./render.js";
import { officerById } from "../data/officers.js";

const els = {
  menu: document.getElementById("menu"),
  game: document.getElementById("game"),
  factionPick: document.getElementById("factionPick"),
  map: document.getElementById("map"),
  dateChip: document.getElementById("dateChip"),
  landChip: document.getElementById("landChip"),
  cityChip: document.getElementById("cityChip"),
  factionChip: document.getElementById("factionChip"),
  goldChip: document.getElementById("goldChip"),
  foodChip: document.getElementById("foodChip"),
  cityInfo: document.getElementById("cityInfo"),
  officerList: document.getElementById("officerList"),
  officerDetail: document.getElementById("officerDetail"),
  officerPortrait: document.getElementById("officerPortrait"),
  officerName: document.getElementById("officerName"),
  officerStats: document.getElementById("officerStats"),
  officerTraits: document.getElementById("officerTraits"),
  officerDesc: document.getElementById("officerDesc"),
  btnForm: document.getElementById("btnForm"),
  btnRecall: document.getElementById("btnRecall"),
  btnEnd: document.getElementById("btnEnd"),
  btnMenu: document.getElementById("btnMenu"),
  log: document.getElementById("battleLog"),
  result: document.getElementById("result"),
  resultTitle: document.getElementById("resultTitle"),
  resultBody: document.getElementById("resultBody"),
  btnResultOk: document.getElementById("btnResultOk"),
};

const renderer = createMapRenderer(els.map);
let state = null;
let hover = null;
let selectedOfficers = new Set();
let focusOfficer = null;
let dragging = false;
let lastPan = null;
let dragMoved = false;

function show(el) {
  el.classList.remove("hidden");
}
function hide(el) {
  el.classList.add("hidden");
}

function renderMenu() {
  els.factionPick.innerHTML = "";
  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = `地图含 ${SCENARIO_190 ? 46 : 46} 都市 · ${totalRegions()} 地区（府）`;
  // place note above via prepend on panel — append into grid as full width not needed
  for (const id of SCENARIO_190.playable) {
    const f = SCENARIO_190.factions[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "faction-card";
    const ruler = officerById(f.ruler);
    const face = ruler?.portrait
      ? `<img class="faction-face" src="${ruler.portrait}" alt="${ruler.name}" width="48" height="48" />`
      : "";
    btn.innerHTML = `
      <div class="faction-card-head">${face}<strong><span class="swatch" style="background:${f.color}"></span>${f.name}</strong></div>
      <p class="hint" style="margin:0.35rem 0 0">君主 ${ruler?.name || "—"} · 初始都市 ${f.cities.length} · 武将 ${f.officers.length}</p>
    `;
    btn.addEventListener("click", () => startGame(id));
    els.factionPick.appendChild(btn);
  }
}

function startGame(factionId) {
  state = createGame(factionId);
  selectedOfficers = new Set();
  focusOfficer = null;
  hover = null;
  renderer.resetView();
  hide(els.menu);
  show(els.game);
  refresh();
  loop();
}

function refresh() {
  if (!state) return;
  renderer.draw(state, hover);
  const f = playerFaction(state);
  els.dateChip.textContent = `${state.year}年${state.month}月`;
  els.landChip.textContent = `领地 ${landCount(state, f.id)}`;
  els.cityChip.textContent = `都市 ${f.cities.length}/46`;
  els.factionChip.textContent = f.name;
  els.goldChip.textContent = `金 ${f.gold}`;
  els.foodChip.textContent = `粮 ${f.food}`;

  const city = state.selectedCityId ? cityById(state.selectedCityId) : null;
  if (city) {
    const owner = cityOwner(state, city.id);
    const mine = owner === f.id;
    const inc = incomeOf(state, f.id);
    const bio = city.biome;
    els.cityInfo.textContent = mine
      ? `${city.name}（${city.zhou} · ${bio}）可出征。本旬预估收入 金${inc.gold} / 粮${inc.food}。`
      : `${city.name}（${city.zhou}）属 ${state.factions[owner]?.name || "无主"}。点己城出征，再点敌城攻略。`;
  } else {
    els.cityInfo.textContent = "点选己方都市以编成部队";
  }

  renderOfficers();
  renderLog();

  els.btnForm.disabled = !state.selectedCityId || selectedOfficers.size === 0;
  els.btnRecall.disabled = !state.selectedArmyId;

  if (state.result) {
    els.resultTitle.textContent = state.result.win ? "大捷" : "败局";
    els.resultBody.textContent = state.result.text;
    show(els.result);
  }
}

function renderOfficers() {
  const f = playerFaction(state);
  els.officerList.innerHTML = "";
  for (const o of f.officers) {
    if (!o) continue;
    const tpl = officerById(o.id);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "officer-row" + (selectedOfficers.has(o.id) ? " active" : "");
    row.disabled = o.status === "army";
    const thumb = tpl.portrait
      ? `<img src="${tpl.portrait}" alt="${tpl.name}" loading="lazy" />`
      : `<span class="thumb-fallback">${tpl.name.slice(0, 1)}</span>`;
    row.innerHTML = `${thumb}<span><strong>${tpl.name}</strong> · 统${tpl.lead} 武${tpl.force} · ${
      o.status === "army" ? "出征中" : "待命"
    }</span>`;
    row.addEventListener("click", () => {
      focusOfficer = o.id;
      if (o.status === "idle") {
        if (selectedOfficers.has(o.id)) selectedOfficers.delete(o.id);
        else selectedOfficers.add(o.id);
      }
      showOfficerDetail(o.id);
      refresh();
    });
    els.officerList.appendChild(row);
  }
  if (focusOfficer) showOfficerDetail(focusOfficer);
  else hide(els.officerDetail);
}

function showOfficerDetail(id) {
  const view = getOfficerView(id);
  if (!view) {
    hide(els.officerDetail);
    return;
  }
  show(els.officerDetail);
  els.officerName.textContent = view.name;
  if (view.portrait) {
    els.officerPortrait.hidden = false;
    els.officerPortrait.src = view.portrait;
    els.officerPortrait.alt = view.name;
  } else {
    els.officerPortrait.hidden = true;
    els.officerPortrait.removeAttribute("src");
  }
  els.officerStats.innerHTML = `
    <div class="stat">统<strong>${view.lead}</strong></div>
    <div class="stat">武<strong>${view.force}</strong></div>
    <div class="stat">智<strong>${view.int}</strong></div>
    <div class="stat">政<strong>${view.pol}</strong></div>
    <div class="stat">魅<strong>${view.charm}</strong></div>
  `;
  els.officerTraits.innerHTML = view.traitDetails
    .map(
      (t) =>
        `<span class="trait ${t.tier}" title="${t.desc}">${t.kind === "treasure" ? "宝·" : ""}${t.name}</span>`
    )
    .join("");
  const apt = view.apt
    ? `适性 枪${view.apt.gun} 戟${view.apt.halberd} 弩${view.apt.crossbow} 骑${view.apt.ride} 兵器${view.apt.weapons} 水军${view.apt.water}`
    : "";
  const bio = (view.bio || "").split("\n")[0];
  els.officerDesc.textContent = `综合 ${view.power}${apt ? " · " + apt : ""}
${view.traitDetails.map((t) => `【${t.name}】${t.desc}`).join(" ")}
${bio}`;
}

function renderLog() {
  els.log.innerHTML = "";
  for (const line of state.log.slice(0, 12)) {
    const d = document.createElement("div");
    d.textContent = line.text;
    els.log.appendChild(d);
  }
}

function loop() {
  if (state && !els.game.classList.contains("hidden")) {
    renderer.draw(state, hover);
  }
  requestAnimationFrame(loop);
}

els.map.addEventListener("mousemove", (e) => {
  if (!state) return;
  if (dragging && lastPan) {
    const dx = e.clientX - lastPan.x;
    const dy = e.clientY - lastPan.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
    renderer.pan(dx, dy);
    lastPan = { x: e.clientX, y: e.clientY };
    return;
  }
  hover = renderer.screenToCell(state, e.clientX, e.clientY);
});

els.map.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    dragging = true;
    dragMoved = false;
    lastPan = { x: e.clientX, y: e.clientY };
    els.map.classList.add("dragging");
  }
});

window.addEventListener("mouseup", () => {
  dragging = false;
  lastPan = null;
  els.map.classList.remove("dragging");
});

els.map.addEventListener("click", (e) => {
  if (!state || state.result) return;
  if (dragMoved) {
    dragMoved = false;
    return;
  }
  const cell = renderer.screenToCell(state, e.clientX, e.clientY);
  if (!cell) return;
  const mapCell = state.map.cells[cell.y * state.map.cols + cell.x];
  if (!mapCell?.land) return;

  if (mapCell.isCity) {
    const owner = cityOwner(state, mapCell.cityId);
    if (owner === state.playerId) {
      state.selectedCityId = mapCell.cityId;
      selectedOfficers = new Set();
      pushLog(state, `选中都市 ${cityById(mapCell.cityId).name}`);
    } else if (state.selectedArmyId) {
      setMarchTarget(state, cell.x, cell.y);
      state.mode = "march";
    } else {
      state.selectedCityId = mapCell.cityId;
    }
  } else if (state.selectedArmyId) {
    setMarchTarget(state, cell.x, cell.y);
  } else {
    // 点选军队
    const army = state.armies.find(
      (a) => a.factionId === state.playerId && a.x === cell.x && a.y === cell.y
    );
    if (army) state.selectedArmyId = army.id;
  }
  refresh();
});

els.map.addEventListener(
  "wheel",
  (e) => {
    if (!state) return;
    e.preventDefault();
    const rect = els.map.getBoundingClientRect();
    renderer.zoomAt(e.deltaY > 0 ? 0.9 : 1.1, e.clientX - rect.left, e.clientY - rect.top);
  },
  { passive: false }
);

els.btnForm.addEventListener("click", () => {
  if (!state?.selectedCityId) return;
  const army = formArmy(state, state.selectedCityId, [...selectedOfficers], 3500);
  if (army) {
    selectedOfficers = new Set();
    pushLog(state, "已出征：请在地图点击目标地点或敌城。");
  } else {
    pushLog(state, "出征失败：粮草不足或无待命武将。");
  }
  refresh();
});

els.btnRecall.addEventListener("click", () => {
  if (state?.selectedArmyId) recallArmy(state, state.selectedArmyId);
  refresh();
});

els.btnEnd.addEventListener("click", () => {
  if (!state || state.result) return;
  endTurn(state);
  refresh();
});

els.btnMenu.addEventListener("click", () => {
  if (!confirm("返回势力选择？当前进度将丢失。")) return;
  state = null;
  hide(els.game);
  hide(els.result);
  show(els.menu);
});

els.btnResultOk.addEventListener("click", () => {
  hide(els.result);
  state = null;
  hide(els.game);
  show(els.menu);
});

renderMenu();

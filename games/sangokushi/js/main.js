import { SCENARIO_190 } from "../data/factions.js";
import { totalRegions, CITY_COUNT } from "../data/cities.js";
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
  siegeControlOf,
} from "./engine.js";
import { createMapRenderer } from "./render.js";
import { officerById, relationNames } from "../data/officers.js";

const els = {
  menu: document.getElementById("menu"),
  game: document.getElementById("game"),
  factionPick: document.getElementById("factionPick"),
  map: document.getElementById("map"),
  dateChip: document.getElementById("dateChip"),
  landChip: document.getElementById("landChip"),
  cityChip: document.getElementById("cityChip"),
  modeChip: document.getElementById("modeChip"),
  goalChip: document.getElementById("goalChip"),
  factionChip: document.getElementById("factionChip"),
  btnFocus: document.getElementById("btnFocus"),
  factionLegend: document.getElementById("factionLegend"),
  goldChip: document.getElementById("goldChip"),
  foodChip: document.getElementById("foodChip"),
  cityInfo: document.getElementById("cityInfo"),
  officerList: document.getElementById("officerList"),
  officerDetail: document.getElementById("officerDetail"),
  officerPortrait: document.getElementById("officerPortrait"),
  officerName: document.getElementById("officerName"),
  officerBelong: document.getElementById("officerBelong"),
  officerStats: document.getElementById("officerStats"),
  officerTraits: document.getElementById("officerTraits"),
  officerRelations: document.getElementById("officerRelations"),
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
  const panel = els.factionPick.parentElement;
  panel?.querySelector(".menu-map-note")?.remove();
  const note = document.createElement("p");
  note.className = "hint menu-map-note";
  note.textContent = `中原战区 · ${CITY_COUNT} 城池 · ${totalRegions()} 地区（府）· 大色块占田 · 可攻占无主城`;
  panel?.insertBefore(note, els.factionPick);
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
      <p class="hint" style="margin:0.35rem 0 0">君主 ${ruler?.name || "—"} · 都市 ${f.cities.length} · 武将全员 ${f.officers.length}</p>
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
  hide(els.menu);
  show(els.game);
  renderer.focusFaction(state, factionId);
  refresh();
  loop();
}

function refresh() {
  if (!state) return;
  renderer.draw(state, hover);
  const f = playerFaction(state);
  els.dateChip.textContent = `${state.year}年${state.month}月`;
  els.landChip.textContent = `领地 ${landCount(state, f.id)}`;
  els.cityChip.textContent = `都市 ${f.cities.length}/${CITY_COUNT}`;
  if (els.modeChip) {
    els.modeChip.textContent = state.selectedArmyId
      ? "模式 进军"
      : state.selectedCityId
        ? "模式 选城"
        : "模式 眺望";
  }
  if (els.goalChip) {
    const need = Math.max(24, Math.ceil(CITY_COUNT * 0.25));
    els.goalChip.textContent = `目标 ${f.cities.length}/${need}`;
  }
  els.factionChip.textContent = f.name;
  els.goldChip.textContent = `金 ${f.gold}`;
  els.foodChip.textContent = `粮 ${f.food}`;

  const city = state.selectedCityId ? cityById(state.selectedCityId) : null;
  if (city) {
    const owner = cityOwner(state, city.id);
    const mine = owner === f.id;
    const inc = incomeOf(state, f.id);
    const bio = city.biome;
    const ctrl = Math.floor(siegeControlOf(state, city.id, f.id) * 100);
    if (mine) {
      els.cityInfo.textContent = `${city.name}（${city.zhou} · ${bio}）可出征。本旬预估 金${inc.gold} / 粮${inc.food}。`;
    } else {
      const who = owner ? state.factions[owner]?.name : "无主";
      els.cityInfo.textContent = `${city.name}（${city.zhou}）属 ${who} · 我方周边控制 ${ctrl}%。出征后点此城攻略。`;
    }
  } else if (state.selectedArmyId) {
    els.cityInfo.textContent = "已选部队：点击敌城/无主城攻略，或点击空地涂色进军。";
  } else {
    els.cityInfo.textContent = "点选己方都市以编成部队";
  }

  renderOfficers();
  renderLog();
  renderFactionLegend();

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
  const cityId = state.selectedCityId;
  const here = [];
  const elsewhere = [];
  for (const o of f.officers) {
    if (!o) continue;
    if (!cityId || !o.cityId || o.cityId === cityId || o.status === "army") here.push(o);
    else elsewhere.push(o);
  }
  const list = cityId ? [...here, ...elsewhere.slice(0, 8)] : f.officers.filter(Boolean).slice(0, 24);
  for (const o of list) {
    const tpl = officerById(o.id);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "officer-row" + (selectedOfficers.has(o.id) ? " active" : "");
    const canPick = o.status === "idle" && (!o.cityId || o.cityId === cityId);
    row.disabled = o.status === "army" || (cityId && o.cityId && o.cityId !== cityId);
    const thumb = tpl.portrait
      ? `<img src="${tpl.portrait}" alt="${tpl.name}" loading="lazy" />`
      : `<span class="thumb-fallback">${tpl.name.slice(0, 1)}</span>`;
    const post = o.status === "army" ? "出征中" : o.cityId && o.cityId !== cityId ? `驻${cityById(o.cityId)?.name || "外"}` : "待命";
    row.innerHTML = `${thumb}<span><strong>${tpl.name}</strong> · 统${tpl.lead} 武${tpl.force} · ${post}</span>`;
    row.addEventListener("click", () => {
      focusOfficer = o.id;
      if (canPick) {
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
  const life =
    view.birth || view.death
      ? `${view.birth || "?"}–${view.death || "?"}`
      : "";
  els.officerBelong.textContent = [
    `所属 ${view.powerName || "—"}`,
    view.affinity != null ? `相性 ${view.affinity}` : "",
    view.home ? `籍贯 ${view.home}` : "",
    life,
  ]
    .filter(Boolean)
    .join(" · ");

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

  const father = view.fatherId ? officerById(view.fatherId)?.name : view.fatherName;
  const children = relationNames(view.childIds || []);
  const likes = relationNames(view.likeIds || []);
  const hates = relationNames(view.hateIds || []);
  const bondOnly = relationNames(
    (view.bondIds || []).filter(
      (id) => !(view.likeIds || []).includes(id) && !(view.hateIds || []).includes(id)
    )
  );
  const relParts = [];
  if (father) relParts.push(`父：${father}`);
  if (children.length) relParts.push(`子：${children.join("、")}`);
  if (likes.length) relParts.push(`亲爱：${likes.join("、")}`);
  if (hates.length) relParts.push(`厌恶：${hates.join("、")}`);
  if (!likes.length && !hates.length && (view.bondIds || []).length) {
    relParts.push(`关系：${relationNames(view.bondIds).join("、")}`);
  } else if (bondOnly.length) {
    relParts.push(`关联：${bondOnly.join("、")}`);
  }
  els.officerRelations.textContent = relParts.length ? relParts.join(" ｜ ") : "关系：—";

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

function renderFactionLegend() {
  if (!els.factionLegend || !state) return;
  const rows = Object.values(state.factions)
    .filter((f) => f.alive)
    .sort((a, b) => b.cities.length - a.cities.length);
  els.factionLegend.innerHTML = rows
    .map((f) => {
      const mine = f.id === state.playerId ? " mine" : "";
      return `<div class="faction-legend-row${mine}"><span class="swatch" style="background:${f.color}"></span><span>${f.name}</span><span class="muted">${f.cities.length}城</span></div>`;
    })
    .join("");
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
  const next = renderer.screenToCell(state, e.clientX, e.clientY);
  hover = next;
  // 悬停城池时轻量刷新城情
  if (next) {
    const mc = state.map.cells[next.y * state.map.cols + next.x];
    if (mc?.isCity) {
      const city = cityById(mc.cityId);
      const owner = cityOwner(state, mc.cityId);
      const who = owner ? state.factions[owner]?.name : "无主";
      const ctrl = Math.floor(siegeControlOf(state, mc.cityId, state.playerId) * 100);
      els.map.title = `${city.name} · ${who} · 控制${ctrl}%`;
    } else {
      els.map.title = mc?.zhou ? `${mc.zhou}` : "";
    }
  }
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
      // 允许点选无主/敌城查看控制进度
      state.selectedCityId = mapCell.cityId;
      const who = owner ? state.factions[owner]?.name : "无主";
      pushLog(
        state,
        `察看 ${cityById(mapCell.cityId).name}（${who}）控制 ${Math.floor(siegeControlOf(state, mapCell.cityId, state.playerId) * 100)}%`
      );
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

els.btnFocus?.addEventListener("click", () => {
  if (!state) return;
  renderer.focusFaction(state, state.playerId);
  refresh();
});

els.btnEnd.addEventListener("click", () => {
  if (!state || state.result) return;
  endTurn(state);
  refresh();
});

window.addEventListener("keydown", (e) => {
  if (!state || state.result) return;
  if (e.key === "Enter" && !e.repeat) {
    endTurn(state);
    refresh();
  } else if (e.key === "f" || e.key === "F") {
    renderer.focusFaction(state, state.playerId);
    refresh();
  } else if (e.key === "Escape" && state.selectedArmyId) {
    state.selectedArmyId = null;
    refresh();
  }
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

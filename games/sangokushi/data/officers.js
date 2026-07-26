/**
 * 武将库：接入 R-C-Group/shuju（san11）自研数值表
 * 头像：R-C-Group/touxiang/san/311_s
 */

import { RC_OFFICERS } from "./rc/officers_data.js";
import { RC_LEGACY_IDS } from "./rc/legacy_ids.js";
import { RC_TRICKS } from "./rc/tricks_data.js";
import { RC_PORTRAITS } from "./rc/portraits_data.js";
import { RC_TREASURES } from "./rc/treasures_data.js";
import { RC_TRICK_TYPES } from "./rc/trick_types_data.js";
import { RC_POWER_FACTIONS } from "./rc/power_factions.js";

const TRICK_BY_ID = new Map(RC_TRICKS.map((t) => [t.id, t]));
const TYPE_BY_ID = new Map(RC_TRICK_TYPES.map((t) => [t.id, t]));
const TREASURES_BY_GENERAL = new Map();
for (const t of RC_TREASURES) {
  if (t.generalId == null) continue;
  if (!TREASURES_BY_GENERAL.has(t.generalId)) TREASURES_BY_GENERAL.set(t.generalId, []);
  TREASURES_BY_GENERAL.get(t.generalId).push(t);
}

/** 特技类型 → 战斗/涂色效果（自研映射，非原作公式） */
const TRICK_TYPE_EFFECTS = {
  1: { moveBonus: 1, paintBonus: 1 },
  2: { atkAura: 0.08, forceMul: 1.05 },
  3: { defAura: 0.1 },
  4: { schemeBonus: 0.12, intMul: 1.08 },
  5: { moraleAura: 0.08 },
  6: { polMul: 1.1 },
  7: { goldMul: 1.08 },
  8: { defAura: 0.05 },
  9: { charmMul: 1.08, loyaltyBonus: 5 },
};

function levelTier(level) {
  if (level >= 4) return "gold";
  if (level >= 3) return "blue";
  return "blue";
}

function enrich(raw) {
  const trick = raw.trickId >= 0 ? TRICK_BY_ID.get(raw.trickId) || null : null;
  const effects = trick
    ? { ...(TRICK_TYPE_EFFECTS[trick.typeId] || {}), ...(trick.level >= 4 ? { atkAura: 0.05 } : {}) }
    : {};
  const traits = [];
  if (trick) {
    traits.push({
      id: `trick_${trick.id}`,
      name: trick.name,
      tier: levelTier(trick.level),
      desc: trick.text || TYPE_BY_ID.get(trick.typeId)?.name || "特技",
      effects,
      kind: "trick",
    });
  }
  const treasures = TREASURES_BY_GENERAL.get(raw.id) || [];
  for (const tr of treasures) {
    traits.push({
      id: `treasure_${tr.id}`,
      name: tr.name,
      tier: "gold",
      desc: tr.desc || "宝物",
      effects: { forceMul: 1.04, charmMul: 1.03 },
      kind: "treasure",
    });
  }

  const portraitFile = RC_PORTRAITS[String(raw.id)] || null;
  return {
    id: raw.id,
    name: raw.name,
    lead: raw.lead,
    force: raw.force,
    int: raw.int,
    pol: raw.pol,
    charm: raw.charm,
    trickId: raw.trickId,
    powerId: raw.powerId,
    apt: raw.apt,
    bio: raw.bio,
    traits: traits.map((t) => t.id),
    traitDetails: traits,
    treasures,
    trick,
    portrait: portraitFile ? `./assets/portraits/${portraitFile}` : null,
    courtesy: "",
    home: "",
  };
}

const BY_ID = new Map();
const BY_NAME = new Map();
for (const raw of RC_OFFICERS) {
  const o = enrich(raw);
  BY_ID.set(o.id, o);
  BY_ID.set(String(o.id), o);
  BY_NAME.set(o.name, o);
}

/** 数据集缺士燮时补一条本地占位，供交州剧本使用 */
if (!BY_NAME.has("士燮")) {
  const stub = enrich({
    id: 9001,
    name: "士燮",
    lead: 72,
    force: 40,
    int: 80,
    pol: 88,
    charm: 85,
    trickId: -1,
    powerId: 38,
    apt: { gun: "C", halberd: "C", crossbow: "C", ride: "C", weapons: "B", water: "B" },
    bio: "交趾太守，保境安民，岭南士族领袖。",
    pic: "",
  });
  BY_ID.set(stub.id, stub);
  BY_ID.set(String(stub.id), stub);
  BY_NAME.set(stub.name, stub);
}

for (const [slug, nid] of Object.entries(RC_LEGACY_IDS)) {
  const o = BY_ID.get(nid);
  if (o) BY_ID.set(slug, o);
}
BY_ID.set("shixie", BY_NAME.get("士燮"));
BY_ID.set("guoyuan", BY_NAME.get("郭图")); // 旧剧本键名曾指向田丰，现对齐郭图

export const OFFICERS = Object.fromEntries(
  [...BY_ID.entries()].filter(([k]) => typeof k === "number").map(([k, v]) => [k, v])
);

export const POWER_FACTIONS = RC_POWER_FACTIONS;

export function officerById(id) {
  if (id == null) return null;
  return BY_ID.get(id) || BY_ID.get(Number(id)) || BY_NAME.get(id) || null;
}

export function officerByName(name) {
  return BY_NAME.get(name) || null;
}

export function allOfficers() {
  return RC_OFFICERS.map((r) => BY_ID.get(r.id)).filter(Boolean);
}

export function officersOfPower(powerId, limit = 16) {
  const list = allOfficers()
    .filter((o) => o.powerId === powerId)
    .sort((a, b) => officerPower(b) - officerPower(a));
  return list.slice(0, limit);
}

export function officerPower(o) {
  if (!o) return 0;
  return o.lead * 0.3 + o.force * 0.25 + o.int * 0.2 + o.pol * 0.15 + o.charm * 0.1;
}

export function describeOfficerTraits(o) {
  return o?.traitDetails || [];
}

/**
 * 武将库：R-C-Group/shuju（san11）全量数据 + touxiang 头像
 * 含所属势力、相性、亲爱/厌恶、父子关系
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
const POWER_BY_ID = new Map(RC_POWER_FACTIONS.map((p) => [p.powerId, p]));
const TREASURES_BY_GENERAL = new Map();
for (const t of RC_TREASURES) {
  if (t.generalId == null) continue;
  if (!TREASURES_BY_GENERAL.has(t.generalId)) TREASURES_BY_GENERAL.set(t.generalId, []);
  TREASURES_BY_GENERAL.get(t.generalId).push(t);
}

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

const BY_ID = new Map();
const BY_NAME = new Map();

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

  const power = POWER_BY_ID.get(raw.powerId) || null;
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
    powerName: power?.name || (raw.powerId === 38 ? "其他" : `势力${raw.powerId}`),
    apt: raw.apt,
    bio: raw.bio,
    affinity: raw.affinity ?? null,
    birth: raw.birth ?? null,
    death: raw.death ?? null,
    appear: raw.appear ?? null,
    home: raw.home || "",
    fatherId: raw.fatherId ?? null,
    fatherName: raw.father || null,
    childIds: raw.childIds || [],
    likeIds: raw.likeIds || [],
    hateIds: raw.hateIds || [],
    bondIds: raw.bondIds || [],
    traits: traits.map((t) => t.id),
    traitDetails: traits,
    treasures,
    trick,
    portrait: portraitFile ? `./assets/portraits/${portraitFile}` : null,
    courtesy: "",
  };
}

for (const raw of RC_OFFICERS) {
  const o = enrich(raw);
  BY_ID.set(o.id, o);
  BY_ID.set(String(o.id), o);
  BY_NAME.set(o.name, o);
}

/** 数据集缺士燮时补一条，供交州剧本 */
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
    affinity: 70,
    birth: 137,
    death: 226,
    appear: 184,
    home: "苍梧",
    father: null,
    fatherId: null,
    childIds: [],
    likeIds: [],
    hateIds: [],
    bondIds: [],
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
BY_ID.set("guoyuan", BY_NAME.get("郭图"));

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

/** 某势力全部武将（按综合能力排序） */
export function officersOfPower(powerId, limit = Infinity) {
  const list = allOfficers()
    .filter((o) => o.powerId === powerId)
    .sort((a, b) => officerPower(b) - officerPower(a));
  return Number.isFinite(limit) ? list.slice(0, limit) : list;
}

export function officerPower(o) {
  if (!o) return 0;
  return o.lead * 0.3 + o.force * 0.25 + o.int * 0.2 + o.pol * 0.15 + o.charm * 0.1;
}

export function describeOfficerTraits(o) {
  return o?.traitDetails || [];
}

export function relationNames(ids = []) {
  return ids.map((id) => officerById(id)?.name).filter(Boolean);
}

/**
 * 出征部署（参考 mengde deploy：固定武将 + 可选空位）
 */

import { GENERALS } from "../data/generals.js";

const DEFAULT_POOL = [
  "xiahou_dun",
  "dianwei",
  "xunyu",
  "xiahou_yuan",
  "xuchu",
  "guojia",
  "zhangliao",
];

/** 从关卡生成部署方案 */
export function buildDeployPlan(stage, rosterIds) {
  const pool = (rosterIds?.length ? rosterIds : DEFAULT_POOL).filter(
    (id) => GENERALS[id] && id !== "caocao"
  );

  if (stage.deploy) {
    return {
      locked: stage.deploy.locked || [],
      slots: stage.deploy.slots || [],
      pool,
      minFill: stage.deploy.minFill ?? 0,
    };
  }

  const players = stage.player || [];
  // 默认：曹操等前 max(2, n-2) 锁定，其余为空位
  const lockCount = Math.min(players.length, Math.max(2, players.length - 2));
  const locked = players.slice(0, lockCount).map((p) => ({ ...p, locked: true }));
  const slots = players.slice(lockCount).map((p) => ({
    x: p.x,
    y: p.y,
    level: p.level,
    generalId: null,
  }));

  // 若没有空位，制造 1 个可选位（用锁定最后一人的邻格）
  if (!slots.length && players.length) {
    const last = players[players.length - 1];
    slots.push({
      x: Math.min(stage.width - 1, last.x + 1),
      y: last.y,
      level: last.level,
      generalId: null,
    });
  }

  return { locked, slots, pool, minFill: 0 };
}

export function createDeployState(stage, rosterIds) {
  const plan = buildDeployPlan(stage, rosterIds);
  // 预填空位：按 pool 顺序
  let pi = 0;
  const used = new Set(plan.locked.map((p) => p.generalId));
  const slots = plan.slots.map((s) => {
    if (s.generalId) {
      used.add(s.generalId);
      return { ...s };
    }
    while (pi < plan.pool.length && used.has(plan.pool[pi])) pi++;
    const gid = plan.pool[pi++] || null;
    if (gid) used.add(gid);
    return { ...s, generalId: gid };
  });
  return {
    stageId: stage.id,
    stage,
    locked: plan.locked,
    slots,
    pool: plan.pool,
    minFill: plan.minFill,
    selectedSlot: 0,
  };
}

export function availableForSlot(deploy, slotIndex) {
  const used = new Set([
    ...deploy.locked.map((p) => p.generalId),
    ...deploy.slots.map((s, i) => (i === slotIndex ? null : s.generalId)),
  ]);
  return deploy.pool.filter((id) => !used.has(id));
}

export function assignSlot(deploy, slotIndex, generalId) {
  if (slotIndex < 0 || slotIndex >= deploy.slots.length) return;
  deploy.slots[slotIndex] = { ...deploy.slots[slotIndex], generalId };
}

export function clearSlot(deploy, slotIndex) {
  if (slotIndex < 0 || slotIndex >= deploy.slots.length) return;
  deploy.slots[slotIndex] = { ...deploy.slots[slotIndex], generalId: null };
}

export function finalizeDeploy(deploy) {
  const filled = deploy.slots.filter((s) => s.generalId);
  if (filled.length < deploy.minFill) return null;
  const players = [
    ...deploy.locked.map((p) => ({
      generalId: p.generalId,
      x: p.x,
      y: p.y,
      level: p.level || 1,
    })),
    ...filled.map((s) => ({
      generalId: s.generalId,
      x: s.x,
      y: s.y,
      level: s.level || 1,
    })),
  ];
  // 保证有曹操
  if (!players.some((p) => p.generalId === "caocao")) {
    const cao = deploy.stage.player.find((p) => p.generalId === "caocao");
    if (cao) players.unshift({ ...cao });
  }
  return players;
}

export function rosterFromSave(save) {
  const base = [...DEFAULT_POOL];
  const unlocked = save?.roster || [];
  for (const id of unlocked) {
    if (!base.includes(id) && GENERALS[id]) base.push(id);
  }
  // 通关后逐步解锁
  const cleared = new Set(save?.cleared || []);
  if (cleared.has("puyang1") && !base.includes("zhangliao")) base.push("zhangliao");
  return base;
}

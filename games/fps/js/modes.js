import * as THREE from "three";
import { Enemy, LootCrate } from "./enemy.js";
import { createSafeZoneVisual } from "./world.js";
import { createLoadout, isWeaponLoot } from "./weapons.js";

function pruneGone(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].gone) list.splice(i, 1);
  }
}

function spawnUnit(ctx, team, baseSp, opts = {}) {
  const { scene, world } = ctx;
  const sp = baseSp.clone();
  sp.x += (Math.random() - 0.5) * (opts.jitter ?? 6);
  sp.z += (Math.random() - 0.5) * (opts.jitter ?? 6);
  sp.y = 0;
  world.resolvePosition(sp, 0.45);
  const e = new Enemy(scene, world, sp, {
    team,
    hp: opts.hp ?? 70,
    speed: opts.speed ?? 3.5,
    damage: opts.damage ?? 6,
    reactRange: opts.reactRange ?? 48,
    fireRange: opts.fireRange ?? 36,
    holdZone: opts.holdZone || null,
  });
  ctx.enemies.push(e);
  return e;
}

/**
 * @param {{ center?: THREE.Vector3, radius?: number, preferInside?: boolean }} bias
 */
function spawnLootField(ctx, kinds, spread, bias = {}) {
  const { scene, world } = ctx;
  const center = bias.center || new THREE.Vector3(0, 0, 0);
  const radius = bias.radius ?? spread * 0.45;
  for (let i = 0; i < kinds.length; i++) {
    let p;
    if (bias.preferInside !== false && Math.random() < 0.78) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * Math.max(6, radius * 0.85);
      p = new THREE.Vector3(center.x + Math.cos(ang) * r, 0, center.z + Math.sin(ang) * r);
    } else {
      p = new THREE.Vector3(
        center.x + (Math.random() - 0.5) * spread,
        0,
        center.z + (Math.random() - 0.5) * spread
      );
    }
    world.resolvePosition(p, 0.6);
    ctx.loot.push(new LootCrate(scene, p, kinds[i]));
  }
}

function applyLoot(ctx, kind, hud, sfx) {
  sfx.pickup();
  if (kind === "ammo") {
    ctx.loadout.reserve += ctx.loadout.def.magSize * 2;
    hud.toast("获得弹药补给");
    return;
  }
  if (kind === "health") {
    const result = ctx.player.takeMedkit?.(40);
    if (result === "stored") {
      hud.toast(`收纳急救包 ×${ctx.player.medkits}（生命已满）`);
    } else {
      hud.toast("使用急救包");
    }
    return;
  }
  if (isWeaponLoot(kind)) {
    const keepReserve = ctx.loadout.reserve;
    ctx.loadout = createLoadout(kind);
    // 换枪时保留一部分备弹手感，但不无限叠
    ctx.loadout.reserve = Math.max(
      ctx.loadout.reserve,
      Math.min(keepReserve, ctx.loadout.def.reserve)
    );
    const names = {
      rifle: "AK-47",
      m4: "M4",
      shotgun: "霰弹枪",
      sniper: "栓狙",
      pistol: "手枪",
    };
    hud.toast(`拾取 ${names[kind] || kind}`);
    ctx._game?.syncViewModel?.();
  }
}

function playerYaw(player) {
  return player?.controls?.getObject?.()?.rotation?.y ?? 0;
}

export function createAssaultMode(ctx) {
  const { world, player, hud, sfx } = ctx;
  let wave = 1;
  let kills = 0;
  let capture = 0;
  const captureNeed = 100;
  let spawnTimer = 0;
  let allyTimer = 0;
  let enemiesAlive = 0;
  let leaveZoneTimer = 0;
  const maxWave = 5;
  const allyCount = 3;

  ctx.loadout = createLoadout("rifle"); // 备弹 200
  player.grantSpawnProtect?.(4.5);
  player.medkits = 0;

  hud.setMode("据点清剿 · 红方");
  hud.toast("站桩占领中央战术区即可胜利 · 波次为压力 · 开局短暂无敌");
  player.getObject().position.set(0, player.eyeHeight, 26);

  // 多数补给靠近战术区
  spawnLootField(
    ctx,
    ["ammo", "health", "ammo", "m4", "shotgun", "health", "sniper", "ammo"],
    world.size * 0.5,
    { center: world.zoneCenter, radius: world.zoneRadius + 14, preferInside: true }
  );

  function spawnAllies() {
    const alive = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
    const need = allyCount - alive;
    for (let i = 0; i < need; i++) {
      const sp = player.position.clone();
      sp.x += (i - 1) * 3.5;
      sp.z += 4 + i;
      spawnUnit(ctx, "red", sp, {
        hp: 80,
        speed: 3.5,
        damage: 7,
        jitter: 2.5,
        holdZone: world.zoneCenter.clone(),
      });
    }
  }

  function spawnWave() {
    pruneGone(ctx.enemies);
    spawnAllies();
    const count = 2 + wave;
    for (let i = 0; i < count; i++) {
      const sp = world.spawnPoints[(i * 3) % world.spawnPoints.length].clone();
      if (sp.distanceTo(player.position) < 26) {
        sp.x = -sp.x;
        sp.z = -sp.z;
      }
      if (sp.distanceTo(player.position) < 22) {
        sp.x += sp.x >= 0 ? 18 : -18;
        sp.z += sp.z >= 0 ? 18 : -18;
      }
      spawnUnit(ctx, "blue", sp, {
        hp: 50 + wave * 8,
        speed: 3.2 + wave * 0.15,
        damage: 4 + Math.floor(wave * 0.8),
        reactRange: 44,
        fireRange: 32,
        jitter: 6,
      });
      enemiesAlive += 1;
    }
    hud.toast(`第 ${wave} 波蓝方进入 · 占领中央区即可获胜`);
  }

  spawnAllies();
  spawnWave();

  return {
    id: "assault",
    update(dt) {
      for (const crate of ctx.loot) {
        crate.update(dt);
        const kind = crate.tryPickup(player.position);
        if (kind) applyLoot(ctx, kind, hud, sfx);
      }

      const inZone =
        Math.hypot(player.position.x - world.zoneCenter.x, player.position.z - world.zoneCenter.z) <=
        world.zoneRadius;

      const bluesInZone = ctx.enemies.filter((e) => {
        if (!e.alive || e.team !== "blue") return false;
        return (
          Math.hypot(e.position.x - world.zoneCenter.x, e.position.z - world.zoneCenter.z) <=
          world.zoneRadius + 1.2
        );
      }).length;

      let capNote = "";
      if (inZone && player.alive) {
        leaveZoneTimer = 0;
        if (bluesInZone > 0) {
          capture = Math.min(captureNeed, capture + dt * 4);
          capNote = "争夺中";
        } else {
          capture = Math.min(captureNeed, capture + dt * 12);
          capNote = "占领中";
        }
      } else {
        leaveZoneTimer += dt;
        // 离区约 1.6 秒缓冲后再缓慢掉进度
        if (leaveZoneTimer > 1.6) {
          capture = Math.max(0, capture - dt * 1.15);
        }
      }

      enemiesAlive = ctx.enemies.filter((e) => e.alive && e.team === "blue").length;
      const alliesAlive = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
      if (enemiesAlive === 0) {
        spawnTimer += dt;
        if (spawnTimer > 2.5 && wave < maxWave) {
          wave += 1;
          spawnTimer = 0;
          spawnWave();
        }
      }
      if (alliesAlive < allyCount) {
        allyTimer += dt;
        if (allyTimer > 9) {
          allyTimer = 0;
          spawnAllies();
        }
      } else {
        allyTimer = 0;
      }

      hud.setZoneHint?.({
        dx: world.zoneCenter.x - player.position.x,
        dz: world.zoneCenter.z - player.position.z,
        dist: Math.hypot(
          world.zoneCenter.x - player.position.x,
          world.zoneCenter.z - player.position.z
        ),
        outside: !inZone,
        yaw: playerYaw(player),
        label: inZone ? capNote || "战术区" : "前往战术区",
      });

      hud.setObjective(
        `占领 ${Math.min(100, capture).toFixed(0)}%${capNote ? `（${capNote}）` : ""} · 波次 ${wave}/${maxWave} · 蓝 ${enemiesAlive} · 红 ${alliesAlive + (player.alive ? 1 : 0)}`
      );
      hud.setScore(`${kills} 清除`);

      if (capture >= captureNeed) {
        return {
          done: true,
          win: true,
          detail: `完成据点占领 · 击杀 ${kills} · 波次 ${wave}/${maxWave}`,
        };
      }
      if (!player.alive) {
        return { done: true, win: false, detail: `行动失败 · 击杀 ${kills} · 占领 ${capture.toFixed(0)}%` };
      }
      return { done: false };
    },
    onKill() {
      kills += 1;
    },
    dispose() {
      for (const c of ctx.loot) c.dispose?.();
      ctx.loot.length = 0;
    },
  };
}

export function createRoyaleMode(ctx) {
  const { scene, world, player, hud, sfx } = ctx;
  let kills = 0;
  const zone = createSafeZoneVisual(scene);
  let radius = 72;
  let targetRadius = 72;
  const center = new THREE.Vector3(
    (Math.random() - 0.5) * 16,
    0,
    (Math.random() - 0.5) * 16
  );
  zone.setCenter(center.x, center.z);
  zone.setRadius(radius);

  let phase = 0;
  let phaseTimer = 0;
  const phases = [
    { t: 55, r: 48 },
    { t: 48, r: 30 },
    { t: 42, r: 16 },
    { t: 38, r: 6 },
  ];

  ctx.loadout = createLoadout("rifle"); // 备弹 200
  player.grantSpawnProtect?.(5);
  player.medkits = 0;
  hud.toast("红方小队 · 清剿全部蓝方即可获胜 · 注意安全区（开局无敌）");

  const start = world.spawnPoints[Math.floor(Math.random() * world.spawnPoints.length)].clone();
  player.getObject().position.set(start.x, player.eyeHeight, start.z);

  for (let i = 0; i < 3; i++) {
    const sp = start.clone();
    sp.x += (i - 1) * 4;
    sp.z += 3;
    spawnUnit(ctx, "red", sp, {
      hp: 90,
      speed: 3.6,
      damage: 7,
      reactRange: 48,
      fireRange: 34,
      jitter: 2,
    });
  }

  const botCount = 10;
  for (let i = 0; i < botCount; i++) {
    const sp = world.spawnPoints[(i + 2) % world.spawnPoints.length].clone();
    if (sp.distanceTo(start) < 28) {
      sp.x = -sp.x;
      sp.z = -sp.z;
    }
    if (sp.distanceTo(start) < 24) {
      sp.x += 30;
      sp.z -= 20;
    }
    spawnUnit(ctx, "blue", sp, {
      hp: 70,
      speed: 3.4,
      damage: 5,
      reactRange: 46,
      fireRange: 32,
      jitter: 14,
    });
  }

  const kinds = ["ammo", "ammo", "health", "m4", "shotgun", "health", "rifle", "sniper", "pistol", "ammo"];
  spawnLootField(ctx, kinds, world.size - 24, {
    center,
    radius,
    preferInside: true,
  });

  hud.setMode("迷你大逃杀 · 红方");

  return {
    id: "royale",
    zone,
    update(dt) {
      phaseTimer += dt;
      if (phase < phases.length && phaseTimer >= phases[phase].t) {
        targetRadius = phases[phase].r;
        phase += 1;
        phaseTimer = 0;
        hud.toast(`安全区收缩 → 半径 ${targetRadius.toFixed(0)}`);
        center.x += (Math.random() - 0.5) * 6;
        center.z += (Math.random() - 0.5) * 6;
        zone.setCenter(center.x, center.z);
      }

      radius = THREE.MathUtils.lerp(radius, targetRadius, dt * 0.15);
      zone.setRadius(radius);

      const dist = Math.hypot(player.position.x - center.x, player.position.z - center.z);
      const outside = dist > radius;
      if (outside && player.alive) {
        player.damage(6 * dt, center);
        hud.flashDamage(center, playerYaw(player), player.position);
      }

      hud.setZoneHint?.({
        dx: center.x - player.position.x,
        dz: center.z - player.position.z,
        dist,
        outside,
        radius,
        yaw: playerYaw(player),
        label: outside ? "返回安全区" : "安全区内",
      });

      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        const ed = Math.hypot(e.position.x - center.x, e.position.z - center.z);
        if (ed > radius) e.damageBy(8 * dt);
      }

      for (const crate of ctx.loot) {
        crate.update(dt);
        const kind = crate.tryPickup(player.position);
        if (kind) applyLoot(ctx, kind, hud, sfx);
      }

      const aliveBlue = ctx.enemies.filter((e) => e.alive && e.team === "blue").length;
      const aliveRed = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
      hud.setObjective(
        `安全区 ${radius.toFixed(0)}m · 蓝方 ${aliveBlue} · 红方 ${aliveRed + (player.alive ? 1 : 0)}`
      );
      hud.setScore(`${kills} 淘汰`);

      if (!player.alive) {
        return { done: true, win: false, detail: `被淘汰 · 淘汰数 ${kills}` };
      }
      if (aliveBlue === 0) {
        return { done: true, win: true, detail: `清剿全部蓝方 · 淘汰 ${kills}` };
      }
      return { done: false };
    },
    onKill() {
      kills += 1;
    },
    dispose() {
      zone.dispose?.();
      for (const c of ctx.loot) c.dispose?.();
      ctx.loot.length = 0;
    },
  };
}

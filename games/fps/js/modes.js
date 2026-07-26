import * as THREE from "three";
import { Enemy, LootCrate } from "./enemy.js";
import { createSafeZoneVisual } from "./world.js";
import { createLoadout } from "./weapons.js";

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
    damage: opts.damage ?? 8,
    reactRange: opts.reactRange ?? 48,
    fireRange: opts.fireRange ?? 36,
  });
  ctx.enemies.push(e);
  return e;
}

export function createAssaultMode(ctx) {
  const { scene, world, player, hud, sfx } = ctx;
  let wave = 1;
  let kills = 0;
  let capture = 0;
  const captureNeed = 100;
  let spawnTimer = 0;
  let allyTimer = 0;
  let enemiesAlive = 0;
  const maxWave = 5;
  const allyCount = 3;

  hud.setMode("据点清剿 · 红方");
  hud.toast("红方为我方 · 蓝方为敌方 · 占领中央战术区");
  player.getObject().position.set(0, player.eyeHeight, 24);

  function spawnAllies() {
    const alive = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
    const need = allyCount - alive;
    for (let i = 0; i < need; i++) {
      const sp = player.position.clone();
      sp.x += (i - 1) * 3.5;
      sp.z += 4 + i;
      spawnUnit(ctx, "red", sp, {
        hp: 75,
        speed: 3.6,
        damage: 8,
        jitter: 2.5,
      });
    }
  }

  function spawnWave() {
    pruneGone(ctx.enemies);
    spawnAllies();
    const count = 3 + wave * 2;
    for (let i = 0; i < count; i++) {
      const sp = world.spawnPoints[(i * 3) % world.spawnPoints.length].clone();
      if (sp.distanceTo(player.position) < 18) {
        sp.x = -sp.x;
        sp.z = -sp.z;
      }
      spawnUnit(ctx, "blue", sp, {
        hp: 55 + wave * 10,
        speed: 3.4 + wave * 0.2,
        damage: 6 + wave,
        reactRange: 48,
        fireRange: 36,
        jitter: 6,
      });
      enemiesAlive += 1;
    }
    hud.toast(`第 ${wave} 波蓝方进入 · 红方队友协同作战`);
  }

  spawnAllies();
  spawnWave();

  return {
    id: "assault",
    update(dt) {
      const inZone =
        Math.hypot(player.position.x - world.zoneCenter.x, player.position.z - world.zoneCenter.z) <=
        world.zoneRadius;

      if (inZone && player.alive) {
        capture = Math.min(captureNeed, capture + dt * 12);
      } else {
        capture = Math.max(0, capture - dt * 4);
      }

      enemiesAlive = ctx.enemies.filter((e) => e.alive && e.team === "blue").length;
      const alliesAlive = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
      if (enemiesAlive === 0) {
        spawnTimer += dt;
        if (spawnTimer > 2.2 && wave < maxWave) {
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

      hud.setObjective(
        `占领 ${Math.min(100, capture).toFixed(0)}% · 波次 ${wave}/${maxWave} · 蓝方 ${enemiesAlive} · 红方 ${alliesAlive + (player.alive ? 1 : 0)}`
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
    { t: 50, r: 48 },
    { t: 45, r: 30 },
    { t: 40, r: 16 },
    { t: 35, r: 6 },
  ];

  ctx.loadout = createLoadout("rifle");
  hud.toast("红方小队 · 清除全部蓝方 · 注意安全区");

  const start = world.spawnPoints[Math.floor(Math.random() * world.spawnPoints.length)].clone();
  player.getObject().position.set(start.x, player.eyeHeight, start.z);

  // 我方红（含玩家视角）
  for (let i = 0; i < 3; i++) {
    const sp = start.clone();
    sp.x += (i - 1) * 4;
    sp.z += 3;
    spawnUnit(ctx, "red", sp, {
      hp: 85,
      speed: 3.7,
      damage: 9,
      reactRange: 50,
      fireRange: 38,
      jitter: 2,
    });
  }

  // 敌方蓝
  const botCount = 12;
  for (let i = 0; i < botCount; i++) {
    const sp = world.spawnPoints[(i + 2) % world.spawnPoints.length].clone();
    if (sp.distanceTo(start) < 20) {
      sp.x = -sp.x;
      sp.z = -sp.z;
    }
    spawnUnit(ctx, "blue", sp, {
      hp: 80,
      speed: 3.7,
      damage: 9,
      reactRange: 50,
      fireRange: 38,
      jitter: 14,
    });
  }

  const kinds = ["ammo", "ammo", "health", "rifle", "ammo", "health", "rifle", "ammo"];
  for (let i = 0; i < kinds.length; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * (world.size - 20),
      0,
      (Math.random() - 0.5) * (world.size - 20)
    );
    ctx.loot.push(new LootCrate(scene, p, kinds[i]));
  }

  hud.setMode("迷你大逃杀 · 红方");

  return {
    id: "royale",
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
      if (dist > radius && player.alive) {
        player.damage(8 * dt);
        hud.flashDamage();
      }

      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        const ed = Math.hypot(e.position.x - center.x, e.position.z - center.z);
        if (ed > radius) e.damageBy(10 * dt);
      }

      for (const crate of ctx.loot) {
        crate.update(dt);
        const kind = crate.tryPickup(player.position);
        if (!kind) continue;
        sfx.pickup();
        if (kind === "ammo") {
          ctx.loadout.reserve += ctx.loadout.def.magSize;
          hud.toast("获得弹药补给");
        } else if (kind === "health") {
          if (typeof player.heal === "function") player.heal(40);
          else player.hp = Math.min(player.maxHp, player.hp + 40);
          hud.toast("使用急救包");
        } else if (kind === "rifle") {
          const keepReserve = ctx.loadout.reserve;
          ctx.loadout = createLoadout("rifle");
          ctx.loadout.reserve = Math.min(200, Math.max(ctx.loadout.reserve, keepReserve + 60));
          hud.toast("补充 AK-47 弹药");
        }
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
        return { done: true, win: true, detail: `红方胜利 · 淘汰 ${kills}` };
      }
      return { done: false };
    },
    onKill() {
      kills += 1;
    },
  };
}

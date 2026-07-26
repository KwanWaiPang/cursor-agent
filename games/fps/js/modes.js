import * as THREE from "three";
import { Enemy, LootCrate } from "./enemy.js";
import { createSafeZoneVisual } from "./world.js";
import { createLoadout } from "./weapons.js";

export function createAssaultMode(ctx) {
  const { scene, world, player, hud, sfx } = ctx;
  let wave = 1;
  let kills = 0;
  let capture = 0;
  const captureNeed = 100;
  let spawnTimer = 0;
  let enemiesAlive = 0;
  const maxWave = 5;

  hud.setMode("据点清剿");
  hud.toast("占领中央战术区 · 清除敌方单位");
  player.getObject().position.set(0, player.eyeHeight, 16);

  function spawnWave() {
    // 必须原地删元素，不能替换数组，否则会与 Game.enemies 脱钩
    for (let i = ctx.enemies.length - 1; i >= 0; i--) {
      if (ctx.enemies[i].gone) ctx.enemies.splice(i, 1);
    }
    const count = 3 + wave * 2;
    for (let i = 0; i < count; i++) {
      const sp = world.spawnPoints[(i * 3) % world.spawnPoints.length].clone();
      sp.x += (Math.random() - 0.5) * 6;
      sp.z += (Math.random() - 0.5) * 6;
      // 远离玩家出生
      if (sp.distanceTo(player.position) < 12) {
        sp.x = -sp.x;
        sp.z = -sp.z;
      }
      sp.y = 0;
      world.resolvePosition(sp, 0.45);
      const e = new Enemy(scene, world, sp, {
        hp: 55 + wave * 10,
        speed: 2.8 + wave * 0.15,
        damage: 6 + wave,
      });
      ctx.enemies.push(e);
      enemiesAlive += 1;
    }
    hud.toast(`第 ${wave} 波敌方单位进入`);
  }

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

      enemiesAlive = ctx.enemies.filter((e) => e.alive).length;
      if (enemiesAlive === 0) {
        spawnTimer += dt;
        if (spawnTimer > 2.2 && wave < maxWave) {
          wave += 1;
          spawnTimer = 0;
          spawnWave();
        }
      }

      hud.setObjective(
        `占领 ${Math.min(100, capture).toFixed(0)}% · 波次 ${wave}/${maxWave} · 击杀 ${kills}`
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
  let radius = 38;
  let targetRadius = 38;
  const center = new THREE.Vector3(
    (Math.random() - 0.5) * 10,
    0,
    (Math.random() - 0.5) * 10
  );
  zone.setCenter(center.x, center.z);
  zone.setRadius(radius);

  let phase = 0;
  let phaseTimer = 0;
  const phases = [
    { t: 45, r: 28 },
    { t: 40, r: 18 },
    { t: 35, r: 10 },
    { t: 30, r: 4 },
  ];

  // 开局即装备 AK-47（备弹 200）
  ctx.loadout = createLoadout("rifle");
  hud.toast("AK-47 就位 · 搜寻补给 · 注意安全区收缩");

  // 分散出生
  const start = world.spawnPoints[Math.floor(Math.random() * world.spawnPoints.length)].clone();
  player.getObject().position.set(start.x, player.eyeHeight, start.z);

  // AI
  const botCount = 10;
  for (let i = 0; i < botCount; i++) {
    const sp = world.spawnPoints[i % world.spawnPoints.length].clone();
    sp.x += (Math.random() - 0.5) * 10;
    sp.z += (Math.random() - 0.5) * 10;
    ctx.enemies.push(
      new Enemy(scene, world, sp, {
        hp: 80,
        speed: 3.1,
        damage: 9,
        reactRange: 32,
      })
    );
  }

  // 补给箱
  const kinds = ["ammo", "ammo", "health", "rifle", "ammo", "health", "rifle", "ammo"];
  for (let i = 0; i < kinds.length; i++) {
    const p = new THREE.Vector3(
      (Math.random() - 0.5) * (world.size - 20),
      0,
      (Math.random() - 0.5) * (world.size - 20)
    );
    ctx.loot.push(new LootCrate(scene, p, kinds[i]));
  }

  hud.setMode("迷你大逃杀");

  return {
    id: "royale",
    update(dt) {
      phaseTimer += dt;
      if (phase < phases.length && phaseTimer >= phases[phase].t) {
        targetRadius = phases[phase].r;
        phase += 1;
        phaseTimer = 0;
        hud.toast(`安全区收缩 → 半径 ${targetRadius.toFixed(0)}`);
        // 中心轻微漂移
        center.x += (Math.random() - 0.5) * 6;
        center.z += (Math.random() - 0.5) * 6;
        zone.setCenter(center.x, center.z);
      }

      radius = THREE.MathUtils.lerp(radius, targetRadius, dt * 0.15);
      zone.setRadius(radius);

      const dx = player.position.x - center.x;
      const dz = player.position.z - center.z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius && player.alive) {
        player.damage(8 * dt);
        hud.flashDamage();
      }

      // AI 也吃圈伤
      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        const ed = Math.hypot(e.position.x - center.x, e.position.z - center.z);
        if (ed > radius) e.damageBy(10 * dt);
      }

      // 拾取
      for (const crate of ctx.loot) {
        crate.update(dt);
        const kind = crate.tryPickup(player.position);
        if (!kind) continue;
        sfx.pickup();
        if (kind === "ammo") {
          ctx.loadout.reserve += ctx.loadout.def.magSize;
          hud.toast("获得弹药补给");
        } else if (kind === "health") {
          player.heal(40);
          hud.toast("使用急救包");
        } else if (kind === "rifle") {
          const keepReserve = ctx.loadout.reserve;
          ctx.loadout = createLoadout("rifle");
          ctx.loadout.reserve = Math.min(200, Math.max(ctx.loadout.reserve, keepReserve + 60));
          hud.toast("补充 AK-47 弹药");
        }
      }

      const aliveBots = ctx.enemies.filter((e) => e.alive).length;
      hud.setObjective(`安全区 ${radius.toFixed(0)}m · 存活敌方 ${aliveBots}`);
      hud.setScore(`${kills} 淘汰`);

      if (!player.alive) {
        return { done: true, win: false, detail: `被淘汰 · 淘汰数 ${kills}` };
      }
      if (aliveBots === 0) {
        return { done: true, win: true, detail: `吃鸡成功 · 淘汰 ${kills}` };
      }
      return { done: false };
    },
    onKill() {
      kills += 1;
    },
  };
}

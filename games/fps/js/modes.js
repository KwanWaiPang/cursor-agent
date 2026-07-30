import * as THREE from "three";
import { Enemy, LootCrate } from "./enemy.js";
import { createSafeZoneVisual } from "./world.js";
import { createArsenal, pickupWeapon, isWeaponLoot, distributeAmmo } from "./weapons.js";

function pruneGone(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].gone) list.splice(i, 1);
  }
}

/** 补给权重：栓狙稀有 */
const LOOT_WEIGHTS = [
  { kind: "ammo", w: 34 },
  { kind: "health", w: 22 },
  { kind: "m4", w: 14 },
  { kind: "rifle", w: 12 },
  { kind: "shotgun", w: 10 },
  { kind: "pistol", w: 6 },
  { kind: "sniper", w: 1 },
];

function rollLootKind() {
  const total = LOOT_WEIGHTS.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of LOOT_WEIGHTS) {
    r -= x.w;
    if (r <= 0) return x.kind;
  }
  return "ammo";
}

/** 生成补给种类列表；整场最多 maxSniper 把栓狙 */
function makeLootKinds(count, { maxSniper = 1 } = {}) {
  const kinds = [];
  let snipers = 0;
  for (let i = 0; i < count; i++) {
    let k = rollLootKind();
    if (k === "sniper") {
      if (snipers >= maxSniper) k = Math.random() < 0.5 ? "m4" : "shotgun";
      else snipers += 1;
    }
    kinds.push(k);
  }
  // 保底弹药/急救各至少 1
  if (!kinds.includes("ammo")) kinds[0] = "ammo";
  if (!kinds.includes("health")) kinds[Math.min(1, kinds.length - 1)] = "health";
  return kinds;
}

function pickAiStartWeapon(team) {
  const r = Math.random();
  if (team === "red") {
    if (r < 0.55) return "rifle";
    if (r < 0.82) return "m4";
    if (r < 0.94) return "pistol";
    return "shotgun";
  }
  if (r < 0.48) return "rifle";
  if (r < 0.72) return "m4";
  if (r < 0.88) return "pistol";
  return "shotgun";
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
    damage: opts.damage,
    reactRange: opts.reactRange ?? 48,
    fireRange: opts.fireRange ?? 36,
    holdZone: opts.holdZone || null,
    weaponId: opts.weaponId || pickAiStartWeapon(team),
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
    const filled = distributeAmmo(ctx.arsenal);
    if (!filled.length) {
      hud.toast("弹药已满");
    } else if (filled.length === 1) {
      hud.toast(`弹药 → ${filled[0].name} +${filled[0].gained}`);
    } else {
      hud.toast(`弹药分配：${filled.map((f) => f.name).join("、")}`);
    }
    hud.setArsenal?.(ctx.arsenal);
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
    const arsenal = ctx.arsenal || ctx._game?.arsenal;
    const result = pickupWeapon(arsenal, kind);
    if (!result) return;
    if (result.status === "ammo") {
      hud.toast(`补充 ${result.name} 弹药`);
    } else {
      hud.toast(`入库 ${result.name} · 按 ${result.slot} 切换（不自动换枪）`);
    }
    hud.setArsenal?.(arsenal);
    // 不自动切换当前武器
  }
}

function playerYaw(player) {
  return player?.controls?.getObject?.()?.rotation?.y ?? 0;
}

const STREAK_REWARDS = [
  { at: 3, id: "uav", label: "连杀×3 · 侦察支援（标出附近敌人 12 秒）" },
  { at: 5, id: "care", label: "连杀×5 · 战术补给箱空投至身边" },
  { at: 7, id: "strike", label: "连杀×7 · 区域压制（附近蓝方受创）" },
];

function flashUav(ctx, seconds = 12) {
  const until = performance.now() + seconds * 1000;
  ctx._uavUntil = until;
  for (const e of ctx.enemies) {
    if (!e.alive || e.team !== "blue") continue;
    e._uavMark = until;
    // 短暂提亮，便于辨认
    e.root?.traverse?.((o) => {
      if (o.isMesh && o.material && o.material.emissive) {
        o.material.emissive.setHex(0x2244aa);
        o.material.emissiveIntensity = 0.55;
      }
    });
  }
}

function dropCarePackage(ctx, near) {
  const kinds = ["ammo", "health", Math.random() < 0.5 ? "m4" : "shotgun"];
  if (Math.random() < 0.35) kinds.push("sniper");
  for (let i = 0; i < kinds.length; i++) {
    const p = near.clone();
    p.x += (Math.random() - 0.5) * 4;
    p.z += 2 + i * 1.2 + (Math.random() - 0.5);
    p.y = 0;
    ctx.world.resolvePosition(p, 0.6);
    ctx.loot.push(new LootCrate(ctx.scene, p, kinds[i]));
  }
}

function tacticalStrike(ctx, origin, radius = 30, dmg = 38) {
  let hit = 0;
  for (const e of ctx.enemies) {
    if (!e.alive || e.team !== "blue") continue;
    const d = Math.hypot(e.position.x - origin.x, e.position.z - origin.z);
    if (d <= radius) {
      e.damageBy(dmg, { hitZone: "body", from: origin });
      hit += 1;
    }
  }
  return hit;
}

export function createAssaultMode(ctx) {
  const { world, player, hud, sfx } = ctx;
  let wave = 1;
  let kills = 0;
  let streak = 0;
  let bestStreak = 0;
  let capture = 0;
  const captureNeed = 100;
  let spawnTimer = 0;
  let allyTimer = 0;
  let enemiesAlive = 0;
  let leaveZoneTimer = 0;
  let lives = 3;
  let respawnTimer = 0;
  let respawning = false;
  const claimedStreaks = new Set();
  const maxWave = 5;
  const allyCount = 9;
  const teamSize = 10;

  ctx.arsenal = createArsenal("rifle");
  player.grantSpawnProtect?.(4.5);
  player.medkits = 0;
  hud.setKills?.(0);
  hud.setStreak?.(0);
  hud.setLives?.(lives);
  hud.setArsenal?.(ctx.arsenal);
  hud.clearKillFeed?.();

  hud.setMode("据点清剿 · 红方");
  hud.toast("COD 风据点战 · 3 条命 · 连杀可呼叫支援 · 占领中央区获胜");
  hud.setCapture?.(0, "");
  player.getObject().position.set(0, player.eyeHeight, 26);

  spawnLootField(
    ctx,
    makeLootKinds(9, { maxSniper: Math.random() < 0.25 ? 1 : 0 }),
    world.size * 0.5,
    { center: world.zoneCenter, radius: world.zoneRadius + 14, preferInside: true }
  );

  function spawnAllies() {
    const alive = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
    const need = allyCount - alive;
    for (let i = 0; i < need; i++) {
      const ang = ((alive + i) / allyCount) * Math.PI * 2;
      const sp = player.position.clone();
      const ring = 9 + (i % 3) * 2.2;
      sp.x += Math.cos(ang) * ring;
      sp.z += Math.sin(ang) * ring + 3;
      spawnUnit(ctx, "red", sp, {
        hp: 80,
        speed: 3.5,
        damage: 7,
        jitter: 2.2,
        holdZone: world.zoneCenter.clone(),
      });
    }
  }

  function spawnWave() {
    pruneGone(ctx.enemies);
    spawnAllies();
    const count = teamSize;
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
        hp: 52 + wave * 10,
        speed: 3.25 + wave * 0.18,
        damage: 4 + Math.floor(wave * 0.9),
        reactRange: 46,
        fireRange: 34,
        jitter: 6,
      });
      enemiesAlive += 1;
    }
    hud.toast(`第 ${wave} 波蓝方突入（${count} 人）· 守住并占领战术区`);
    hud.pushKillFeed?.(`—— 波次 ${wave}/${maxWave} 开始 ——`);
  }

  function grantStreakReward(reward) {
    if (claimedStreaks.has(reward.id)) return;
    claimedStreaks.add(reward.id);
    hud.toast(reward.label);
    hud.pushKillFeed?.(reward.label);
    if (reward.id === "uav") flashUav(ctx, 12);
    if (reward.id === "care") dropCarePackage(ctx, player.position.clone());
    if (reward.id === "strike") {
      const n = tacticalStrike(ctx, player.position.clone(), 32, 40);
      hud.toast(n > 0 ? `区域压制命中 ${n} 名蓝方` : "区域压制未命中存活目标");
    }
  }

  spawnAllies();
  spawnWave();

  return {
    id: "assault",
    update(dt) {
      // 侦察标记衰减
      if (ctx._uavUntil && performance.now() > ctx._uavUntil) {
        for (const e of ctx.enemies) {
          if (!e._uavMark) continue;
          e.root?.traverse?.((o) => {
            if (o.isMesh && o.material && o.material.emissive) {
              o.material.emissive.setHex(0x000000);
              o.material.emissiveIntensity = 0;
            }
          });
          delete e._uavMark;
        }
        ctx._uavUntil = 0;
      }

      for (const crate of ctx.loot) {
        crate.update(dt);
        if (player.alive) {
          const kind = crate.tryPickup(player.position);
          if (kind) applyLoot(ctx, kind, hud, sfx);
        }
      }

      // 残机复活
      if (!player.alive) {
        if (!respawning) {
          lives -= 1;
          streak = 0;
          claimedStreaks.clear();
          hud.setStreak?.(0);
          hud.setLives?.(Math.max(0, lives));
          hud.pushKillFeed?.(lives > 0 ? `你被击倒 · 剩余 ${lives} 条命` : "你被击倒 · 行动失败");
          if (lives <= 0) {
            return {
              done: true,
              win: false,
              detail: `行动失败 · 击杀 ${kills} · 最高连杀 ${bestStreak} · 占领 ${((capture / captureNeed) * 100).toFixed(0)}%`,
            };
          }
          respawning = true;
          respawnTimer = 4.2;
          hud.toast(`${respawnTimer.toFixed(0)} 秒后重生`);
        } else {
          respawnTimer -= dt;
          hud.setObjective(`重生倒计时 ${Math.max(0, respawnTimer).toFixed(1)}s · 剩余命 ${lives}`);
          if (respawnTimer <= 0) {
            const sp = world.spawnPoints[Math.floor(Math.random() * world.spawnPoints.length)];
            let x = sp.x;
            let z = sp.z + 8;
            if (Math.hypot(x, z - 26) < 8) z = 26;
            player.respawnAt(x, z, 4.5);
            world.resolvePosition(player.position, 0.45);
            player.getObject().position.y = player.eyeHeight;
            respawning = false;
            hud.toast("已重生 · 短暂无敌");
            hud.pushKillFeed?.("你已重生");
          }
        }
        return { done: false };
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

      const redsInZone = ctx.enemies.filter((e) => {
        if (!e.alive || e.team !== "red") return false;
        return (
          Math.hypot(e.position.x - world.zoneCenter.x, e.position.z - world.zoneCenter.z) <=
          world.zoneRadius + 1.2
        );
      }).length;

      const friendsInZone = redsInZone + (inZone ? 1 : 0);
      let capNote = "";
      if (friendsInZone > 0) {
        leaveZoneTimer = 0;
        if (bluesInZone > 0) {
          const net = friendsInZone - bluesInZone;
          const rate = net > 0 ? 5.5 + Math.min(6, net) * 1.25 : 2.4;
          capture = Math.min(captureNeed, capture + dt * rate);
          capNote = "争夺中";
        } else {
          capture = Math.min(captureNeed, capture + dt * (11 + Math.min(6, friendsInZone) * 1.15));
          capNote = "占领中";
        }
      } else {
        leaveZoneTimer += dt;
        if (leaveZoneTimer > 1.6) capture = Math.max(0, capture - dt * 1.15);
      }

      enemiesAlive = ctx.enemies.filter((e) => e.alive && e.team === "blue").length;
      const alliesAlive = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
      if (enemiesAlive === 0) {
        spawnTimer += dt;
        if (spawnTimer > 2.0 && wave < maxWave) {
          wave += 1;
          spawnTimer = 0;
          // 清波小额占领奖励
          capture = Math.min(captureNeed, capture + 6);
          spawnWave();
        } else if (spawnTimer > 2.0 && wave >= maxWave) {
          // 末波清光后加快占领
          capture = Math.min(captureNeed, capture + dt * 4);
        }
      }
      if (alliesAlive < allyCount) {
        allyTimer += dt;
        if (allyTimer > 8) {
          allyTimer = 0;
          spawnAllies();
        }
      } else allyTimer = 0;

      const capPct = Math.min(100, (capture / captureNeed) * 100);
      hud.setCapture?.(capPct, capNote || (friendsInZone > 0 ? "战术区" : ""));
      hud.setZoneHint?.({
        dx: world.zoneCenter.x - player.position.x,
        dz: world.zoneCenter.z - player.position.z,
        dist: Math.hypot(
          world.zoneCenter.x - player.position.x,
          world.zoneCenter.z - player.position.z
        ),
        outside: !inZone,
        yaw: playerYaw(player),
        label: inZone ? capNote || "战术区" : friendsInZone > 0 ? "队友占领中" : "前往战术区",
      });

      hud.setObjective(
        `波次 ${wave}/${maxWave} · 蓝 ${enemiesAlive} · 红 ${alliesAlive + 1} · 命 ${lives} · 连杀 ${streak}`
      );
      hud.setKills?.(kills);
      hud.setStreak?.(streak);
      hud.setLives?.(lives);

      if (capture >= captureNeed) {
        return {
          done: true,
          win: true,
          detail: `完成据点占领 · 击杀 ${kills} · 最高连杀 ${bestStreak} · 波次 ${wave}/${maxWave}`,
        };
      }
      return { done: false };
    },
    onKill() {
      kills += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      hud.setKills?.(kills);
      hud.setStreak?.(streak);
      hud.pushKillFeed?.(`击破蓝方 · 连杀 ${streak}`);
      for (const reward of STREAK_REWARDS) {
        if (streak >= reward.at) grantStreakReward(reward);
      }
    },
    dispose() {
      for (const c of ctx.loot) c.dispose?.();
      ctx.loot.length = 0;
      hud.setStreak?.(0);
      hud.clearKillFeed?.();
    },
  };
}

export function createRoyaleMode(ctx) {
  const { scene, world, player, hud, sfx } = ctx;
  let kills = 0;
  let streak = 0;
  const zone = createSafeZoneVisual(scene);
  let radius = 78;
  let targetRadius = 78;
  const center = new THREE.Vector3(
    (Math.random() - 0.5) * 18,
    0,
    (Math.random() - 0.5) * 18
  );
  const nextCenter = center.clone();
  let nextRadius = 52;
  zone.setCenter(center.x, center.z);
  zone.setRadius(radius);
  zone.clearNextZone?.();

  let phase = 0;
  let phaseTimer = 0;
  let warned = false;
  let airdropsDone = 0;
  // wait / shrinkTo / dmgPerSec / warnBefore
  const phases = [
    { wait: 42, r: 52, dmg: 7, warn: 12 },
    { wait: 36, r: 32, dmg: 11, warn: 10 },
    { wait: 30, r: 16, dmg: 16, warn: 9 },
    { wait: 26, r: 6, dmg: 24, warn: 8 },
  ];

  ctx.arsenal = createArsenal("rifle");
  player.grantSpawnProtect?.(5);
  player.medkits = 0;
  hud.setKills?.(0);
  hud.setStreak?.(0);
  hud.setLives?.(null);
  hud.setArsenal?.(ctx.arsenal);
  hud.setCapture?.(0, "");
  hud.clearKillFeed?.();
  hud.toast("大逃杀：注意白圈预告与毒圈 · 空投会携带高级补给 · 清剿蓝方获胜");

  const start = world.spawnPoints[Math.floor(Math.random() * world.spawnPoints.length)].clone();
  player.getObject().position.set(start.x, player.eyeHeight, start.z);

  const allyCount = 9;
  for (let i = 0; i < allyCount; i++) {
    const ang = (i / allyCount) * Math.PI * 2;
    const sp = start.clone();
    const ring = 8.5 + (i % 3) * 2;
    sp.x += Math.cos(ang) * ring;
    sp.z += Math.sin(ang) * ring;
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

  const kinds = makeLootKinds(14, { maxSniper: Math.random() < 0.45 ? 1 : 0 });
  spawnLootField(ctx, kinds, world.size - 24, {
    center,
    radius,
    preferInside: true,
  });

  function planNextZone(r) {
    nextRadius = r;
    const pull = Math.min(14, Math.max(4, (radius - r) * 0.35));
    nextCenter.set(
      center.x + (Math.random() - 0.5) * pull,
      0,
      center.z + (Math.random() - 0.5) * pull
    );
    // 下一圈中心尽量落在当前圈内
    const d = Math.hypot(nextCenter.x - center.x, nextCenter.z - center.z);
    const maxOff = Math.max(2, radius - nextRadius - 2);
    if (d > maxOff) {
      nextCenter.x = center.x + ((nextCenter.x - center.x) / d) * maxOff;
      nextCenter.z = center.z + ((nextCenter.z - center.z) / d) * maxOff;
    }
    zone.setNextZone?.(nextCenter.x, nextCenter.z, nextRadius);
  }

  function spawnAirdrop() {
    airdropsDone += 1;
    const dropAt = nextCenter.clone();
    dropAt.x += (Math.random() - 0.5) * Math.min(10, nextRadius * 0.4);
    dropAt.z += (Math.random() - 0.5) * Math.min(10, nextRadius * 0.4);
    const airdropKinds = ["ammo", "health", "m4", Math.random() < 0.55 ? "shotgun" : "rifle"];
    if (Math.random() < 0.5) airdropKinds.push("sniper");
    spawnLootField(ctx, airdropKinds, 8, {
      center: dropAt,
      radius: 5,
      preferInside: true,
    });
    hud.toast(`空投 #${airdropsDone} 降落 · 前往白圈附近搜寻`);
    hud.pushKillFeed?.(`空投降临 · 高级补给`);
    hud.setPhaseBanner?.(`空投已落地 · 白圈预告下一安全区`, true);
  }

  // 开局预告第一圈
  if (phases[0]) planNextZone(phases[0].r);

  hud.setMode("迷你大逃杀 · 红方");

  return {
    id: "royale",
    zone,
    update(dt) {
      const cur = phases[phase] || phases[phases.length - 1];
      phaseTimer += dt;

      // 缩圈预警
      if (phase < phases.length && !warned && phaseTimer >= cur.wait - cur.warn) {
        warned = true;
        planNextZone(cur.r);
        hud.toast(`缩圈预警 ${cur.warn}s · 白圈为下一安全区`);
        hud.setPhaseBanner?.(`缩圈倒计时 · 前往白圈`, true);
        hud.pushKillFeed?.(`缩圈预警 · 目标半径 ${cur.r}m`);
      }

      if (phase < phases.length && phaseTimer >= cur.wait) {
        targetRadius = cur.r;
        center.copy(nextCenter);
        zone.setCenter(center.x, center.z);
        zone.clearNextZone?.();
        phase += 1;
        phaseTimer = 0;
        warned = false;
        hud.toast(`安全区收缩中 → ${targetRadius.toFixed(0)}m`);
        hud.setPhaseBanner?.(`第 ${phase} 圈收缩`, false);
        // 每圈空投一次（前 3 圈）
        if (airdropsDone < 3) spawnAirdrop();
        if (phase < phases.length) {
          // 预埋再下一圈位置，等下次预警再显示
        }
      }

      const shrinkSpeed = phase >= 3 ? 0.28 : 0.16;
      radius = THREE.MathUtils.lerp(radius, targetRadius, dt * shrinkSpeed);
      zone.setRadius(radius);

      const zoneDmg = (phases[Math.max(0, phase - 1)] || phases[0]).dmg;
      const dist = Math.hypot(player.position.x - center.x, player.position.z - center.z);
      const outside = dist > radius;
      if (outside && player.alive) {
        player.damage(zoneDmg * dt, center);
        hud.flashDamage(center, playerYaw(player), player.position);
      }

      hud.setZoneHint?.({
        dx: (warned ? nextCenter.x : center.x) - player.position.x,
        dz: (warned ? nextCenter.z : center.z) - player.position.z,
        dist: Math.hypot(
          (warned ? nextCenter.x : center.x) - player.position.x,
          (warned ? nextCenter.z : center.z) - player.position.z
        ),
        outside,
        radius,
        yaw: playerYaw(player),
        label: warned ? "前往下一安全区" : outside ? "返回安全区" : "安全区内",
      });

      for (const e of ctx.enemies) {
        if (!e.alive) continue;
        const ed = Math.hypot(e.position.x - center.x, e.position.z - center.z);
        if (ed > radius) {
          e.damageBy((zoneDmg + 2) * dt);
          e.holdZone = (warned ? nextCenter : center).clone();
          e.patrolTarget = e.holdZone.clone();
          e.seekCoverUntil = 0;
          e.state = "patrol";
          e.sprintBoost = Math.max(e.sprintBoost || 1, 1.5);
        }
      }

      for (const crate of ctx.loot) {
        crate.update(dt);
        const kind = crate.tryPickup(player.position);
        if (kind) applyLoot(ctx, kind, hud, sfx);
      }

      const aliveBlue = ctx.enemies.filter((e) => e.alive && e.team === "blue").length;
      const aliveRed = ctx.enemies.filter((e) => e.alive && e.team === "red").length;
      const phaseLabel = phase >= phases.length ? "终圈" : `第 ${phase + 1} 圈`;
      const left = phase < phases.length ? Math.max(0, cur.wait - phaseTimer) : 0;
      hud.setObjective(
        `${phaseLabel} · 区 ${radius.toFixed(0)}m · 蓝 ${aliveBlue} · 红 ${aliveRed + (player.alive ? 1 : 0)}${
          warned ? ` · 缩圈 ${left.toFixed(0)}s` : left > 0 ? ` · 下圈 ${left.toFixed(0)}s` : ""
        }`
      );
      hud.setKills?.(kills);
      hud.setStreak?.(streak);

      if (!player.alive) {
        return { done: true, win: false, detail: `被淘汰 · 击杀 ${kills} · 存活至 ${phaseLabel}` };
      }
      if (aliveBlue === 0) {
        return {
          done: true,
          win: true,
          detail: `吃鸡成功 · 击杀 ${kills} · 空投 ${airdropsDone} · ${phaseLabel}`,
        };
      }
      return { done: false };
    },
    onKill() {
      kills += 1;
      streak += 1;
      hud.setKills?.(kills);
      hud.setStreak?.(streak);
      hud.pushKillFeed?.(`淘汰蓝方 · 击杀 ${kills}`);
    },
    dispose() {
      zone.dispose?.();
      for (const c of ctx.loot) c.dispose?.();
      ctx.loot.length = 0;
      hud.setStreak?.(0);
      hud.setPhaseBanner?.("", false);
      hud.clearKillFeed?.();
    },
  };
}

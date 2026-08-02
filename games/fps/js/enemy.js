import * as THREE from "three";
import { WEAPONS, isWeaponLoot } from "./weapons.js";

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _move = new THREE.Vector3();
const _shotDir = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _closest = new THREE.Vector3();

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.08,
  });
}

/** AI 世界空间枪模：按种类外形可辨 */
export function buildWorldGun(weaponId = "rifle") {
  const gun = new THREE.Group();
  gun.name = `worldGun_${weaponId}`;
  const metal = mat(0x2a2e28, { roughness: 0.45, metalness: 0.55 });
  const dark = mat(0x141814, { roughness: 0.5, metalness: 0.4 });
  const wood = mat(0x6b4f32, { roughness: 0.85, metalness: 0.05 });
  const polymer = mat(0x3d4650, { roughness: 0.55, metalness: 0.25 });

  if (weaponId === "pistol") {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.16), metal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.11;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), wood);
    grip.position.set(0, -0.06, 0.02);
    gun.add(slide, barrel, grip);
  } else if (weaponId === "m4") {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.26), polymer);
    const carry = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.14), dark);
    carry.position.set(0, 0.05, -0.02);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.22, 6), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.24;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.045), dark);
    mag.position.set(0, -0.08, 0.02);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.12), polymer);
    stock.position.z = 0.18;
    gun.add(receiver, carry, barrel, mag, stock);
  } else if (weaponId === "shotgun") {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.22), metal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.26;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), metal);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.03, -0.18);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.1), wood);
    pump.position.set(0, -0.02, -0.12);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.16), wood);
    stock.position.z = 0.16;
    gun.add(receiver, barrel, tube, pump, stock);
  } else if (weaponId === "sniper") {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.24), polymer);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.42, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.34;
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), dark);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.05, -0.02);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.04), dark);
    mag.position.set(0, -0.07, 0.02);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.055, 0.18), polymer);
    stock.position.z = 0.18;
    gun.add(receiver, barrel, scope, mag, stock);
  } else {
    // AK / rifle default
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.28), metal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.26, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.26;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.055), dark);
    mag.position.set(0, -0.09, 0.02);
    mag.rotation.z = 0.2;
    const woodStock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.16), wood);
    woodStock.position.z = 0.18;
    const hg = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.12), wood);
    hg.position.z = -0.1;
    gun.add(receiver, barrel, mag, woodStock, hg);
  }

  gun.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  gun.position.set(0.22, 1.0, 0.2);
  gun.rotation.set(0.1, -0.4, 0.15);
  gun.userData.weaponId = weaponId;
  return gun;
}

/**
 * 阵营角色：我方红 / 敌方蓝
 * team: "red" | "blue"
 */
function makeTeamCharacter(team = "blue", weaponId = "rifle") {
  const g = new THREE.Group();
  const isRed = team === "red";

  const skin = mat(0xd2b48c);
  const pants = mat(isRed ? 0x3a1818 : 0x152033);
  const shirt = mat(isRed ? 0x8b2a2a : 0x2a4a72);
  const vest = mat(isRed ? 0xd32f2f : 0x1e88e5, { roughness: 0.65, metalness: 0.18 });
  const boot = mat(0x1a1410);
  const headCover = mat(isRed ? 0x6b1515 : 0x1a3a5c);
  const accent = mat(isRed ? 0xffc107 : 0xb3e5fc);

  const legGeo = new THREE.CapsuleGeometry(0.11, 0.45, 3, 6);
  const legL = new THREE.Mesh(legGeo, pants);
  const legR = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.12, 0.45, 0);
  legR.position.set(0.12, 0.45, 0);
  legL.castShadow = legR.castShadow = true;
  legL.userData.hitZone = "limb";
  legR.userData.hitZone = "limb";
  g.add(legL, legR);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), boot);
  const bootR = bootL.clone();
  bootL.position.set(-0.12, 0.06, 0.04);
  bootR.position.set(0.12, 0.06, 0.04);
  bootL.userData.hitZone = "limb";
  bootR.userData.hitZone = "limb";
  g.add(bootL, bootR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.28), shirt);
  torso.position.y = 1.05;
  torso.castShadow = true;
  torso.userData.hitZone = "body";
  g.add(torso);

  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.32), vest);
  vestMesh.position.y = 1.12;
  vestMesh.castShadow = true;
  vestMesh.userData.hitZone = "body";
  g.add(vestMesh);

  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), accent);
  pouch.position.set(0.14, 1.0, 0.18);
  g.add(pouch);
  const pouch2 = pouch.clone();
  pouch2.position.x = -0.14;
  g.add(pouch2);

  const armGeo = new THREE.CapsuleGeometry(0.08, 0.38, 3, 6);
  const armL = new THREE.Mesh(armGeo, shirt);
  const armR = new THREE.Mesh(armGeo, shirt);
  armL.position.set(-0.3, 1.05, 0);
  armR.position.set(0.3, 1.05, 0);
  armL.rotation.z = 0.15;
  armR.rotation.z = -0.15;
  armL.castShadow = armR.castShadow = true;
  armL.userData.hitZone = "limb";
  armR.userData.hitZone = "limb";
  g.add(armL, armR);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), headCover);
  helmet.position.y = 1.58;
  helmet.castShadow = true;
  helmet.userData.hitZone = "head";
  g.add(helmet);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skin);
  face.position.set(0, 1.5, 0.06);
  face.userData.hitZone = "head";
  g.add(face);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.05, 0.08),
    mat(isRed ? 0x4a1010 : 0x223344, { metalness: 0.4 })
  );
  visor.position.set(0, 1.56, 0.18);
  visor.userData.hitZone = "head";
  g.add(visor);

  const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.18), vest);
  pauldron.position.set(0, 1.38, 0);
  pauldron.userData.hitZone = "body";
  g.add(pauldron);

  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  headHit.position.y = 1.56;
  headHit.userData.hitZone = "head";
  g.add(headHit);

  const gun = buildWorldGun(weaponId);
  g.add(gun);

  g.scale.setScalar(1.12);

  g.userData.body = vestMesh;
  g.userData.head = helmet;
  g.userData.headHit = headHit;
  g.userData.team = team;
  g.userData.gun = gun;

  // 红方描边：远处也好认，减少挡枪口误伤感
  if (isRed) {
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const outline = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.9, 4, 8), outlineMat);
    outline.position.y = 1.05;
    outline.scale.set(1.15, 1.05, 1.15);
    outline.renderOrder = 1;
    g.add(outline);
    g.userData.outline = outline;
  }

  return g;
}

/** 射线是否打中站立角色（胸/头球体），与弹道一致 */
export function rayHitsStandingTarget(origin, dir, pos, maxDist) {
  const points = [
    { y: 1.28, r: 0.48, head: false },
    { y: 1.72, r: 0.32, head: true },
  ];
  let best = null;
  for (const p of points) {
    _aim.set(pos.x, p.y, pos.z);
    _tmp.copy(_aim).sub(origin);
    const t = _tmp.dot(dir);
    if (t < 0.05 || t > maxDist) continue;
    _closest.copy(origin).addScaledVector(dir, t);
    if (_closest.distanceTo(_aim) <= p.r) {
      if (!best || t < best.dist) best = { dist: t, headshot: p.head };
    }
  }
  return best;
}

function hasLineOfSight(world, origin, targetPos, maxDist) {
  _shotDir.copy(targetPos).sub(origin);
  const dist = _shotDir.length();
  if (dist < 0.2) return true;
  _shotDir.multiplyScalar(1 / dist);
  const wall = world.raycastSolid(origin, _shotDir, Math.min(dist, maxDist));
  return !(Number.isFinite(wall) && wall + 0.12 < dist);
}

export class Enemy {
  constructor(scene, world, position, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.team = opts.team === "red" ? "red" : "blue";
    const startWeapon = opts.weaponId || "rifle";
    this.mesh = makeTeamCharacter(this.team, startWeapon);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0;
    scene.add(this.mesh);
    this.hp = opts.hp ?? 70;
    this.maxHp = this.hp;
    this.speed = opts.speed ?? 3.6;
    this.alive = true;
    this.radius = 0.4;
    this.fireCd = 0.35 + Math.random() * 0.5;
    this.state = "patrol";
    this.patrolTarget = position.clone();
    this.reactRange = opts.reactRange ?? 56;
    this.fireRange = opts.fireRange ?? 42;
    this.fade = 1;
    this.scoreValue = opts.scoreValue ?? 1;
    this.walkPhase = Math.random() * Math.PI * 2;
    this._flashTimers = [];

    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.tacticCd = Math.random() * 0.6;
    this.idealRange = 8 + Math.random() * 8;
    this.moveDir = new THREE.Vector3();
    this.lastPos = position.clone();
    this.stuckTimer = 0;
    this.sprintBoost = 1;
    this.currentTarget = null;
    this.seekCoverUntil = 0;
    this.coverTarget = null;
    /** 玩家 H 求助截止时间与集火目标 */
    this.helpUntil = 0;
    this.helpFocus = null;
    /** 据点模式：优先靠近战术区 */
    this.holdZone = opts.holdZone || null;
    this.lootCd = 0.4 + Math.random() * 0.8;
    this.equipWeapon(startWeapon, { silent: true, damageOverride: opts.damage });
  }

  get position() {
    return this.mesh.position;
  }

  get isAlly() {
    return this.team === "red";
  }

  /** 武器强度分：决定 AI 是否换枪 */
  static weaponRank(id) {
    return { pistol: 1, rifle: 2, m4: 3, shotgun: 3, sniper: 4 }[id] || 0;
  }

  equipWeapon(weaponId, opts = {}) {
    const def = WEAPONS[weaponId] || WEAPONS.rifle;
    this.weaponId = def.id;
    this.weaponDef = def;
    if (opts.damageOverride != null) {
      this.damage = opts.damageOverride;
    } else if (def.pellets) {
      // 霰弹：一次齐射折算
      this.damage = Math.max(8, Math.round(def.damage * def.pellets * 0.2));
    } else {
      this.damage = Math.max(4, Math.round(def.damage * 0.3));
    }
    // AI 射程略低于玩家同枪，但比过去更敢远射（0.55 / 上限 72）
    this.fireRange = Math.min(72, Math.max(22, def.range * 0.55));
    this.baseFireGap = def.chamberMs
      ? Math.max(0.85, def.chamberMs / 1000)
      : Math.max(0.1, 60 / def.rpm);
    this.shotSpread = (def.spread || 0.014) * (def.hipSpreadMul || 1) * 1.45;
    if (def.id === "shotgun") this.idealRange = 5 + Math.random() * 4;
    else if (def.id === "sniper") this.idealRange = 16 + Math.random() * 10;
    else if (def.id === "pistol") this.idealRange = 6 + Math.random() * 5;
    else this.idealRange = 8 + Math.random() * 8;

    const old = this.mesh.userData.gun;
    if (old) {
      this.mesh.remove(old);
      old.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
    const gun = buildWorldGun(def.id);
    this.mesh.add(gun);
    this.mesh.userData.gun = gun;
  }

  /**
   * AI 拾取附近补给：枪则换装；急救则回血。
   * @returns {string|null} 拾取到的 kind
   */
  tryLoot(lootList, radius = 1.9) {
    if (!this.alive || !lootList?.length) return null;
    let best = null;
    let bestDist = radius;
    for (const crate of lootList) {
      if (!crate.alive || crate.taken) continue;
      const dx = crate.mesh.position.x - this.position.x;
      const dz = crate.mesh.position.z - this.position.z;
      const d = Math.hypot(dx, dz);
      if (d < bestDist) {
        bestDist = d;
        best = crate;
      }
    }
    if (!best) return null;
    const kind = best.kind;
    // 枪：比现有强，或同级有小概率换口味
    if (isWeaponLoot(kind)) {
      const cur = Enemy.weaponRank(this.weaponId);
      const next = Enemy.weaponRank(kind);
      if (next < cur && Math.random() > 0.12) return null;
      if (next === cur && kind === this.weaponId) return null;
      const got = best.tryPickup(this.position, radius + 0.2);
      if (!got) return null;
      this.equipWeapon(got);
      return got;
    }
    if (kind === "health") {
      if (this.hp >= this.maxHp * 0.92) return null;
      const got = best.tryPickup(this.position, radius + 0.2);
      if (!got) return null;
      this.hp = Math.min(this.maxHp, this.hp + 35);
      return got;
    }
    // ammo：AI 不持弹匣数，忽略
    return null;
  }

  damageBy(amount, opts = {}) {
    if (!this.alive) return false;
    const zone = opts.hitZone || (opts.headshot ? "head" : "body");
    const mul =
      opts.zoneMul != null
        ? opts.zoneMul
        : zone === "head"
          ? 2
          : zone === "limb"
            ? 0.72
            : 1;
    const dmg = amount * mul;
    const headshot = zone === "head";
    this.hp -= dmg;
    const flashTarget = headshot ? this.mesh.userData.head : this.mesh.userData.body;
    if (flashTarget?.material) {
      const tint = headshot ? 0xffcc66 : zone === "limb" ? 0xc9b896 : 0xddc27a;
      flashTarget.material.emissive = new THREE.Color(tint);
      flashTarget.material.emissiveIntensity = headshot ? 0.85 : zone === "limb" ? 0.4 : 0.55;
      const tid = setTimeout(() => {
        if (flashTarget.material) flashTarget.material.emissiveIntensity = 0;
      }, 80);
      this._flashTimers.push(tid);
    }
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
      this.state = "down";
      return true;
    }
    this.state = "chase";
    this.strafeSign *= -1;
    this.tacticCd = 0;
    this.sprintBoost = 1.35;
    // 残血才长时间躲掩体；血厚时只短暂侧闪，保持进攻压力
    const hpFrac = this.hp / Math.max(1, this.maxHp);
    if (hpFrac < 0.45) {
      this.seekCoverUntil = performance.now() + 1400 + Math.random() * 900;
      this.pickCoverAwayFrom(opts.from || null);
    } else {
      this.seekCoverUntil = performance.now() + 350 + Math.random() * 350;
      this.coverTarget = null;
    }
    return false;
  }

  /** 玩家按 H：清掩体、赶往玩家，并优先集火指定蓝方 */
  respondToHelp(player, focusBlue, until) {
    if (!this.alive || this.team !== "red") return;
    this.helpUntil = until || performance.now() + 14000;
    this.helpFocus = focusBlue || null;
    this.seekCoverUntil = 0;
    this.coverTarget = null;
    this.sprintBoost = 1.45;
    this.reactRange = Math.max(this.reactRange, 64);
    if (player?.position) {
      this.patrolTarget.copy(player.position);
      this.patrolTarget.x += (Math.random() - 0.5) * 5;
      this.patrolTarget.z += (Math.random() - 0.5) * 5;
    }
    this.state = focusBlue?.alive ? "chase" : "patrol";
  }

  pickCoverAwayFrom(threatPos) {
    const cover = this.world.coverPoints;
    if (!cover?.length) return;
    let best = null;
    let bestScore = -Infinity;
    for (const c of cover) {
      const away = threatPos
        ? c.distanceTo(threatPos) - this.position.distanceTo(c) * 0.35
        : -this.position.distanceTo(c);
      if (away > bestScore) {
        bestScore = away;
        best = c;
      }
    }
    if (best) {
      this.coverTarget = best.clone();
      this.coverTarget.x += (Math.random() - 0.5) * 1.5;
      this.coverTarget.z += (Math.random() - 0.5) * 1.5;
    }
  }

  pickPatrol() {
    const sp = this.world.spawnPoints;
    const cover = this.world.coverPoints;
    if (this.holdZone && Math.random() < 0.7) {
      this.patrolTarget = this.holdZone.clone();
      this.patrolTarget.x += (Math.random() - 0.5) * 5;
      this.patrolTarget.z += (Math.random() - 0.5) * 5;
      return;
    }
    if (cover?.length && Math.random() < 0.55) {
      this.patrolTarget = cover[Math.floor(Math.random() * cover.length)].clone();
    } else {
      this.patrolTarget = sp[Math.floor(Math.random() * sp.length)].clone();
    }
    this.patrolTarget.x += (Math.random() - 0.5) * 4;
    this.patrolTarget.z += (Math.random() - 0.5) * 4;
  }

  replanCombat(toTarget, dist) {
    const fwd = _tmp2.copy(toTarget).normalize();
    _side.set(-fwd.z, 0, fwd.x).multiplyScalar(this.strafeSign);

    if (dist < this.idealRange - 2.5) {
      // 过近才小幅后撤，多数时间侧向压制
      this.moveDir.copy(_side).multiplyScalar(1.05).addScaledVector(fwd, -0.35);
      this.sprintBoost = 1.15;
    } else if (dist > this.idealRange + 4) {
      this.moveDir.copy(fwd).multiplyScalar(1.2).addScaledVector(_side, 0.55);
      this.sprintBoost = 1.35;
    } else {
      const press = 0.25 + Math.random() * 0.55;
      this.moveDir.copy(_side).multiplyScalar(0.95).addScaledVector(fwd, press);
      this.sprintBoost = 1.15;
    }

    if (this.moveDir.lengthSq() > 0.0001) this.moveDir.normalize();
    if (Math.random() < 0.28) this.strafeSign *= -1;
    this.tacticCd = 0.55 + Math.random() * 1.1;
  }

  pickTarget(player, units) {
    let best = null;
    let bestDist = Infinity;
    const helping = this.helpUntil && performance.now() < this.helpUntil;
    const range = helping ? Math.max(this.reactRange, 70) : this.reactRange;

    // 求助集火：优先打玩家指定的蓝方
    if (helping && this.helpFocus?.alive && !this.helpFocus.gone) {
      const d = this.position.distanceTo(this.helpFocus.position);
      if (d < range + 12) {
        return { kind: "unit", ref: this.helpFocus, dist: d };
      }
    }

    if (this.team === "blue" && player?.alive) {
      const d = this.position.distanceTo(player.position);
      if (d < range && d < bestDist) {
        bestDist = d;
        best = { kind: "player", ref: player, dist: d };
      }
    }

    for (const u of units) {
      if (!u || u === this || !u.alive || u.gone) continue;
      if (u.team === this.team) continue;
      const d = this.position.distanceTo(u.position);
      if (d < range && d < bestDist) {
        bestDist = d;
        best = { kind: "unit", ref: u, dist: d };
      }
    }
    return best;
  }

  update(dt, player, units, onFire) {
    if (!this.alive) {
      this.fade -= dt * 0.7;
      this.mesh.rotation.x = THREE.MathUtils.lerp(this.mesh.rotation.x, Math.PI / 2, dt * 3);
      this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 0.15, dt * 2);
      this.mesh.traverse((o) => {
        if (o.material) {
          o.material.transparent = true;
          o.material.opacity = Math.max(0, this.fade);
        }
      });
      if (this.fade <= 0) this.remove();
      return;
    }

    const now = performance.now();
    const seekingCover = now < this.seekCoverUntil && this.coverTarget;

    const target = this.pickTarget(player, units || []);
    this.currentTarget = target;

    let toTarget = null;
    let dist = Infinity;
    let los = false;
    const originProbe = _tmp2.set(this.position.x, 1.48, this.position.z);

    if (target) {
      const tp = target.ref.position;
      toTarget = _tmp.copy(tp).sub(this.position);
      toTarget.y = 0;
      dist = toTarget.length();
      const aimY = target.kind === "player" ? target.ref.eyeHeight ?? 1.7 : 1.45;
      los = hasLineOfSight(
        this.world,
        originProbe,
        _aim.set(tp.x, aimY, tp.z),
        this.fireRange + 4
      );
      // 丢视线时短侧移找角度，而不是长时间躲起来
      if (!los && !seekingCover && Math.random() < 0.35) {
        this.seekCoverUntil = now + 500 + Math.random() * 400;
        this.pickCoverAwayFrom(tp);
      }
      this.state = dist < this.fireRange * 0.55 ? "attack" : "chase";
    } else if (this.state !== "patrol") {
      this.state = "patrol";
    }

    // 求助中：向玩家靠拢
    if (this.isAlly && this.helpUntil && now < this.helpUntil && player?.position) {
      const toHelp = _tmp2.copy(player.position).sub(this.position);
      toHelp.y = 0;
      if (toHelp.length() > 10) {
        this.patrolTarget.copy(player.position);
        this.patrolTarget.x += (Math.random() - 0.5) * 4;
        this.patrolTarget.z += (Math.random() - 0.5) * 4;
        if (!target) this.state = "patrol";
      }
    }

    // 无交火时，朝更强的枪箱走两步
    if ((!target || dist > this.fireRange * 0.9) && this._lootList?.length && Math.random() < 0.02) {
      let upgrade = null;
      let bestScore = Enemy.weaponRank(this.weaponId);
      for (const c of this._lootList) {
        if (!c.alive || !isWeaponLoot(c.kind)) continue;
        const rank = Enemy.weaponRank(c.kind);
        if (rank <= bestScore) continue;
        const d = Math.hypot(c.mesh.position.x - this.position.x, c.mesh.position.z - this.position.z);
        if (d < 28) {
          bestScore = rank;
          upgrade = c;
        }
      }
      if (upgrade) {
        this.patrolTarget.set(upgrade.mesh.position.x, 0, upgrade.mesh.position.z);
        if (!target) this.state = "patrol";
      }
    }

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.tacticCd = Math.max(0, this.tacticCd - dt);
    this.sprintBoost = THREE.MathUtils.lerp(this.sprintBoost, 1, dt * 1.8);
    let moving = false;

    if (seekingCover && this.coverTarget) {
      const to = _tmp2.copy(this.coverTarget).sub(this.position);
      to.y = 0;
      if (to.length() < 1.2) {
        this.seekCoverUntil = 0;
      } else {
        to.normalize();
        this.position.addScaledVector(to, this.speed * 1.15 * dt);
        this.mesh.lookAt(this.position.x + to.x, this.position.y, this.position.z + to.z);
        moving = true;
      }
    } else if (this.state === "patrol") {
      if (this.isAlly && player?.position) {
        const toP = _tmp2.copy(player.position).sub(this.position);
        toP.y = 0;
        const nearPlayer = toP.length();
        // 太近则侧移，减少挡在玩家准星前
        if (nearPlayer < 3.2 && nearPlayer > 0.05) {
          toP.normalize();
          _side.set(-toP.z, 0, toP.x).multiplyScalar(this.strafeSign);
          this.position.addScaledVector(_side, this.speed * 1.1 * dt);
          this.position.addScaledVector(toP, -0.35 * this.speed * dt);
          this.mesh.lookAt(this.position.x + toP.x, this.position.y, this.position.z + toP.z);
          moving = true;
        } else if (this.holdZone) {
          const toZ = _tmp2.copy(this.holdZone).sub(this.position);
          toZ.y = 0;
          if (toZ.length() > 6) {
            this.patrolTarget.copy(this.holdZone);
            this.patrolTarget.x += (Math.random() - 0.5) * 4;
            this.patrolTarget.z += (Math.random() - 0.5) * 4;
          }
        } else if (toP.length() > 14) {
          this.patrolTarget.copy(player.position);
          this.patrolTarget.x += (Math.random() - 0.5) * 6;
          this.patrolTarget.z += (Math.random() - 0.5) * 6;
        }
      }
      if (!moving) {
        const to = _tmp2.copy(this.patrolTarget).sub(this.position);
        to.y = 0;
        if (to.length() < 1.4) this.pickPatrol();
        else {
          to.normalize();
          _side.set(-to.z, 0, to.x).multiplyScalar(Math.sin(this.walkPhase * 0.35) * 0.35);
          _move.copy(to).add(_side).normalize();
          this.position.addScaledVector(_move, this.speed * 0.7 * dt);
          this.mesh.lookAt(this.position.x + to.x, this.position.y, this.position.z + to.z);
          moving = true;
        }
      }
    } else if (toTarget) {
      if (dist > 0.01) {
        this.mesh.lookAt(
          this.position.x + toTarget.x,
          this.position.y,
          this.position.z + toTarget.z
        );
      }

      if (this.tacticCd <= 0 || this.moveDir.lengthSq() < 0.01) {
        this.replanCombat(toTarget, dist);
      }

      const step = this.speed * this.sprintBoost * dt;
      this.position.addScaledVector(this.moveDir, step);
      moving = true;

      const moved = this.position.distanceTo(this.lastPos);
      if (moved < step * 0.2) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.35) {
          this.strafeSign *= -1;
          this.replanCombat(toTarget, dist);
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }
      this.lastPos.copy(this.position);

      // 有视线才开火；命中由真实射线判定（与弹道一致）
      if (los && dist < this.fireRange && this.fireCd <= 0) {
        const gap = this.baseFireGap || 0.45;
        const burst = !this.weaponDef?.chamberMs && this.weaponId !== "shotgun" && Math.random() < 0.55;
        this.fireCd = burst ? gap * 0.38 : gap * (0.7 + Math.random() * 0.3);

        const origin = new THREE.Vector3(this.position.x, 1.48, this.position.z);
        const aimPos =
          target.kind === "player"
            ? _aim.set(player.position.x, player.eyeHeight ?? 1.7, player.position.z)
            : _aim.set(target.ref.position.x, 1.45, target.ref.position.z);
        _shotDir.subVectors(aimPos, origin);
        const spread = (this.shotSpread || 0.025) + dist * 0.0011;
        _shotDir.x += (Math.random() - 0.5) * spread;
        _shotDir.y += (Math.random() - 0.5) * spread * 0.7;
        _shotDir.z += (Math.random() - 0.5) * spread;
        _shotDir.normalize();

        const wallDist = this.world.raycastSolid(origin, _shotDir, this.fireRange + 2);
        const maxShot = Number.isFinite(wallDist) ? wallDist : this.fireRange + 2;
        const hitInfo = rayHitsStandingTarget(origin, _shotDir, target.ref.position, maxShot);
        const hit =
          !!hitInfo &&
          (!Number.isFinite(wallDist) || hitInfo.dist + 0.05 <= wallDist);

        onFire?.({
          damage: this.damage,
          hit,
          headshot: !!(hit && hitInfo.headshot),
          origin,
          dir: _shotDir.clone(),
          dist,
          traceDist: hit
            ? hitInfo.dist
            : Math.min(Number.isFinite(wallDist) ? wallDist : dist + 2, this.fireRange + 4),
          team: this.team,
          weaponId: this.weaponId,
          targetKind: target.kind,
          targetUnit: target.kind === "unit" ? target.ref : null,
        });
      }
    }

    // 顺路捡补给
    this.lootCd = Math.max(0, (this.lootCd || 0) - dt);
    if (this.lootCd <= 0 && this._lootList) {
      this.tryLoot(this._lootList);
      this.lootCd = 0.55 + Math.random() * 0.7;
    }

    if (moving) {
      this.walkPhase += dt * 9;
      this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.04;
    } else {
      this.mesh.position.y = 0;
    }

    this.world.resolvePosition(this.position, this.radius);
  }

  remove() {
    for (const tid of this._flashTimers) clearTimeout(tid);
    this._flashTimers.length = 0;
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
        else o.material.dispose?.();
      }
    });
    this.gone = true;
  }
}

const LOOT_COLORS = {
  ammo: 0xc4a574,
  health: 0x6bbf7a,
  rifle: 0xc4a574,
  m4: 0x90a4ae,
  shotgun: 0x8d6e63,
  sniper: 0x546e7a,
  pistol: 0xb0bec5,
};

const LOOT_LABEL = {
  ammo: "AMMO",
  health: "MED",
  rifle: "AK",
  m4: "M4",
  shotgun: "SG",
  sniper: "SR",
  pistol: "P",
};

function makeCrateMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.35,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

function buildLootCrateMesh(kind) {
  const accent = LOOT_COLORS[kind] ?? 0x7ec8e3;
  const root = new THREE.Group();

  const bodyMat = makeCrateMat(0x4a5340, { roughness: 0.62, metalness: 0.28 });
  const lidMat = makeCrateMat(0x3d4536, { roughness: 0.58, metalness: 0.32 });
  const trimMat = makeCrateMat(0x2a2e28, { roughness: 0.45, metalness: 0.55 });
  const accentMat = makeCrateMat(accent, {
    roughness: 0.4,
    metalness: 0.25,
    emissive: accent,
    emissiveIntensity: 0.22,
  });
  const latchMat = makeCrateMat(0xb8a06a, { roughness: 0.35, metalness: 0.7 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.62, 0.78), bodyMat);
  body.position.y = 0.31;
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.1, 0.82), lidMat);
  lid.position.y = 0.67;
  lid.castShadow = true;
  root.add(lid);

  const cornerGeo = new THREE.BoxGeometry(0.08, 0.64, 0.08);
  for (const [x, y, z] of [
    [-0.48, 0.32, -0.35],
    [0.48, 0.32, -0.35],
    [-0.48, 0.32, 0.35],
    [0.48, 0.32, 0.35],
  ]) {
    const c = new THREE.Mesh(cornerGeo, trimMat);
    c.position.set(x, y, z);
    c.castShadow = true;
    root.add(c);
  }

  const bandGeo = new THREE.BoxGeometry(1.07, 0.06, 0.8);
  for (const y of [0.18, 0.48]) {
    const band = new THREE.Mesh(bandGeo, trimMat);
    band.position.y = y;
    root.add(band);
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.04), accentMat);
  stripe.position.set(0, 0.34, 0.4);
  root.add(stripe);

  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.12), latchMat);
  latch.position.set(0, 0.74, 0.28);
  root.add(latch);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.06), latchMat);
  handle.position.set(0, 0.74, -0.05);
  root.add(handle);

  const bead = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 10),
    makeCrateMat(accent, {
      roughness: 0.25,
      metalness: 0.4,
      emissive: accent,
      emissiveIntensity: 0.65,
    })
  );
  bead.position.set(0.36, 0.78, 0);
  root.add(bead);

  const footGeo = new THREE.BoxGeometry(0.14, 0.06, 0.14);
  for (const [x, z] of [
    [-0.4, -0.28],
    [0.4, -0.28],
    [-0.4, 0.28],
    [0.4, 0.28],
  ]) {
    const foot = new THREE.Mesh(footGeo, trimMat);
    foot.position.set(x, 0.03, z);
    root.add(foot);
  }

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 28),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.03;
  root.add(halo);

  const light = new THREE.PointLight(accent, 0.55, 6, 2);
  light.position.set(0, 0.9, 0);
  root.add(light);

  // 顶部种类标签（便于远处辨认）
  const label = LOOT_LABEL[kind] || "LOOT";
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 48;
  const ctx2d = canvas.getContext("2d");
  ctx2d.clearRect(0, 0, 128, 48);
  ctx2d.fillStyle = "rgba(12,16,10,0.72)";
  ctx2d.fillRect(8, 8, 112, 32);
  ctx2d.strokeStyle = `#${accent.toString(16).padStart(6, "0")}`;
  ctx2d.lineWidth = 3;
  ctx2d.strokeRect(8, 8, 112, 32);
  ctx2d.fillStyle = "#eef5d8";
  ctx2d.font = "bold 22px monospace";
  ctx2d.textAlign = "center";
  ctx2d.textBaseline = "middle";
  ctx2d.fillText(label, 64, 24);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.26),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  tag.position.set(0, 1.05, 0);
  root.add(tag);

  root.userData = { bead, halo, light, accent, label, tag };
  return root;
}

export class LootCrate {
  constructor(scene, position, kind = "ammo") {
    this.scene = scene;
    this.kind = kind;
    this.alive = true;
    this.taken = false;
    this.mesh = buildLootCrateMesh(kind);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0;
    scene.add(this.mesh);
    this.pulse = Math.random() * Math.PI * 2;
    this.baseY = 0;
  }

  update(dt) {
    if (!this.alive) return;
    this.pulse += dt * 1.6;
    const bob = 0.04 + Math.sin(this.pulse) * 0.05;
    this.mesh.position.y = this.baseY + bob;
    this.mesh.rotation.y += dt * 0.45;
    const u = this.mesh.userData;
    if (u?.tag) {
      // 标签始终朝上，不随箱子滚转文字
      u.tag.rotation.y = -this.mesh.rotation.y;
    }
    if (u?.halo?.material) {
      u.halo.material.opacity = 0.22 + Math.sin(this.pulse * 1.4) * 0.16;
      u.halo.scale.setScalar(1 + Math.sin(this.pulse) * 0.06);
    }
    if (u?.light) {
      u.light.intensity = 0.4 + Math.sin(this.pulse * 1.7) * 0.2;
    }
    if (u?.bead?.material) {
      u.bead.material.emissiveIntensity = 0.45 + Math.sin(this.pulse * 2) * 0.35;
    }
  }

  tryPickup(playerPos, radius = 1.75) {
    if (!this.alive) return null;
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    if (dx * dx + dz * dz <= radius * radius) {
      this.alive = false;
      this.taken = true;
      // 先立刻从场景摘掉，GPU/贴图释放放到空闲帧，避免捡物卡顿一帧
      this.hideForPickup();
      return this.kind;
    }
    return null;
  }

  hideForPickup() {
    if (!this.mesh) return;
    const mesh = this.mesh;
    mesh.visible = false;
    if (mesh.parent) this.scene.remove(mesh);
    this.mesh = null;
    const dispose = () => this._disposeObject(mesh);
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(dispose, { timeout: 240 });
    } else {
      setTimeout(dispose, 0);
    }
  }

  _disposeObject(root) {
    if (!root) return;
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        if (!m) continue;
        if (m.map) m.map.dispose?.();
        m.dispose?.();
      }
    });
  }

  disposeMesh() {
    if (!this.mesh) return;
    if (this.mesh.parent) this.scene.remove(this.mesh);
    this._disposeObject(this.mesh);
    this.mesh = null;
  }

  dispose() {
    if (!this.taken) this.disposeMesh();
    this.alive = false;
    this.taken = true;
    this.gone = true;
  }
}

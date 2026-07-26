import * as THREE from "three";

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _move = new THREE.Vector3();
const _shotDir = new THREE.Vector3();

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.08,
  });
}

/**
 * 偏 CS 风格低模角色
 * variant: "t" 恐怖分子（头套+迷彩） / "ct" 反恐部队（头盔+蓝背心）
 */
function makeCSCharacter(variant = "t") {
  const g = new THREE.Group();
  const isT = variant === "t";

  const skin = mat(0xd2b48c);
  const pants = mat(isT ? 0x5c4a2e : 0x243044);
  const shirt = mat(isT ? 0x7a8f4a : 0xe8ecf2);
  const vest = mat(isT ? 0x6b5a30 : 0x3a6ea8, { roughness: 0.7, metalness: 0.15 });
  const boot = mat(0x2a2418);
  const headCover = mat(isT ? 0x222222 : 0x445566);
  const accent = mat(isT ? 0xc45c2a : 0xd0d6e0);

  const legGeo = new THREE.CapsuleGeometry(0.11, 0.45, 3, 6);
  const legL = new THREE.Mesh(legGeo, pants);
  const legR = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.12, 0.45, 0);
  legR.position.set(0.12, 0.45, 0);
  legL.castShadow = legR.castShadow = true;
  g.add(legL, legR);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), boot);
  const bootR = bootL.clone();
  bootL.position.set(-0.12, 0.06, 0.04);
  bootR.position.set(0.12, 0.06, 0.04);
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
  armL.userData.hitZone = "body";
  armR.userData.hitZone = "body";
  g.add(armL, armR);

  let headMesh;
  if (isT) {
    const balaclava = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), headCover);
    balaclava.position.y = 1.56;
    balaclava.castShadow = true;
    balaclava.userData.hitZone = "head";
    g.add(balaclava);
    headMesh = balaclava;
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), mat(0x111111));
    eyes.position.set(0, 1.58, 0.16);
    eyes.userData.hitZone = "head";
    g.add(eyes);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.16), mat(0x3a4028));
    pack.position.set(0, 1.15, -0.22);
    pack.userData.hitZone = "body";
    g.add(pack);
  } else {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), headCover);
    helmet.position.y = 1.58;
    helmet.castShadow = true;
    helmet.userData.hitZone = "head";
    g.add(helmet);
    headMesh = helmet;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skin);
    face.position.set(0, 1.5, 0.06);
    face.userData.hitZone = "head";
    g.add(face);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.08), mat(0x223344, { metalness: 0.4 }));
    visor.position.set(0, 1.56, 0.18);
    visor.userData.hitZone = "head";
    g.add(visor);
  }

  const headHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  headHit.position.y = 1.56;
  headHit.userData.hitZone = "head";
  g.add(headHit);

  const gun = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), mat(0x222522, { metalness: 0.6 }));
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), mat(0x111111, { metalness: 0.7 }));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.22;
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.06), mat(0x1a1a1a));
  mag.position.set(0, -0.08, 0);
  gun.add(receiver, barrel, mag);
  gun.position.set(0.22, 1.0, 0.2);
  gun.rotation.set(0.1, -0.4, 0.15);
  g.add(gun);

  g.scale.setScalar(1.12);

  g.userData.body = vestMesh;
  g.userData.head = headMesh;
  g.userData.headHit = headHit;
  g.userData.variant = variant;
  return g;
}

export class Enemy {
  constructor(scene, world, position, opts = {}) {
    this.scene = scene;
    this.world = world;
    const variant = opts.variant || (Math.random() < 0.65 ? "t" : "ct");
    this.mesh = makeCSCharacter(variant);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0;
    scene.add(this.mesh);
    this.hp = opts.hp ?? 70;
    this.maxHp = this.hp;
    this.speed = opts.speed ?? 3.6;
    this.damage = opts.damage ?? 8;
    this.alive = true;
    this.radius = 0.4;
    this.fireCd = 0.2 + Math.random() * 0.4;
    this.state = "patrol";
    this.patrolTarget = position.clone();
    this.reactRange = opts.reactRange ?? 42;
    this.fireRange = opts.fireRange ?? 34;
    this.fade = 1;
    this.scoreValue = opts.scoreValue ?? 1;
    this.walkPhase = Math.random() * Math.PI * 2;

    // 机动
    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.tacticCd = Math.random() * 0.6;
    this.idealRange = 8 + Math.random() * 8;
    this.moveDir = new THREE.Vector3();
    this.lastPos = position.clone();
    this.stuckTimer = 0;
    this.sprintBoost = 1;
  }

  get position() {
    return this.mesh.position;
  }

  damageBy(amount, opts = {}) {
    if (!this.alive) return false;
    const headshot = !!opts.headshot;
    const dmg = headshot ? amount * 2 : amount;
    this.hp -= dmg;
    const flashTarget = headshot ? this.mesh.userData.head : this.mesh.userData.body;
    if (flashTarget?.material) {
      flashTarget.material.emissive = new THREE.Color(headshot ? 0xffcc66 : 0xddc27a);
      flashTarget.material.emissiveIntensity = headshot ? 0.85 : 0.55;
      setTimeout(() => {
        if (flashTarget.material) flashTarget.material.emissiveIntensity = 0;
      }, 80);
    }
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
      this.state = "down";
      return true;
    }
    // 受击后立刻变招：换侧移方向并拉开/压上
    this.state = "chase";
    this.strafeSign *= -1;
    this.tacticCd = 0;
    this.sprintBoost = 1.35;
    return false;
  }

  pickPatrol() {
    const sp = this.world.spawnPoints;
    const cover = this.world.coverPoints;
    if (cover?.length && Math.random() < 0.55) {
      this.patrolTarget = cover[Math.floor(Math.random() * cover.length)].clone();
    } else {
      this.patrolTarget = sp[Math.floor(Math.random() * sp.length)].clone();
    }
    this.patrolTarget.x += (Math.random() - 0.5) * 4;
    this.patrolTarget.z += (Math.random() - 0.5) * 4;
  }

  /** 重新规划战斗步法：侧移 / 包抄 / 后撤 / 突进 */
  replanCombat(toPlayer, dist) {
    const fwd = _tmp2.copy(toPlayer).normalize();
    _side.set(-fwd.z, 0, fwd.x).multiplyScalar(this.strafeSign);

    if (dist < this.idealRange - 2.5) {
      // 过近：边撤边横移
      this.moveDir
        .copy(_side)
        .multiplyScalar(0.9)
        .addScaledVector(fwd, -0.85);
      this.sprintBoost = 1.2;
    } else if (dist > this.idealRange + 4) {
      // 过远：斜插逼近（锯齿包抄）
      this.moveDir
        .copy(fwd)
        .multiplyScalar(1.05)
        .addScaledVector(_side, 0.75);
      this.sprintBoost = 1.25;
    } else {
      // 理想距离：绕射 / 小幅前压
      const press = (Math.random() - 0.35) * 0.45;
      this.moveDir
        .copy(_side)
        .multiplyScalar(1.15)
        .addScaledVector(fwd, press);
      this.sprintBoost = 1.05;
    }

    if (this.moveDir.lengthSq() > 0.0001) this.moveDir.normalize();
    if (Math.random() < 0.28) this.strafeSign *= -1;
    this.tacticCd = 0.55 + Math.random() * 1.1;
  }

  update(dt, player, onFire) {
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

    const toPlayer = _tmp.copy(player.position).sub(this.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    if (dist < this.reactRange) {
      this.state = dist < this.fireRange * 0.4 ? "attack" : "chase";
    } else if (this.state !== "patrol") {
      this.state = "patrol";
    }

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.tacticCd = Math.max(0, this.tacticCd - dt);
    this.sprintBoost = THREE.MathUtils.lerp(this.sprintBoost, 1, dt * 1.8);
    let moving = false;

    if (this.state === "patrol") {
      const to = _tmp2.copy(this.patrolTarget).sub(this.position);
      to.y = 0;
      if (to.length() < 1.4) this.pickPatrol();
      else {
        to.normalize();
        // 巡逻也带轻微侧摆，避免直线滑行
        _side.set(-to.z, 0, to.x).multiplyScalar(Math.sin(this.walkPhase * 0.35) * 0.35);
        _move.copy(to).add(_side).normalize();
        this.position.addScaledVector(_move, this.speed * 0.7 * dt);
        this.mesh.lookAt(this.position.x + to.x, this.position.y, this.position.z + to.z);
        moving = true;
      }
    } else {
      if (dist > 0.01) {
        this.mesh.lookAt(
          this.position.x + toPlayer.x,
          this.position.y,
          this.position.z + toPlayer.z
        );
      }

      if (this.tacticCd <= 0 || this.moveDir.lengthSq() < 0.01) {
        this.replanCombat(toPlayer, dist);
      }

      const step = this.speed * this.sprintBoost * dt;
      this.position.addScaledVector(this.moveDir, step);
      moving = true;

      // 卡死检测：换侧向再突围
      const moved = this.position.distanceTo(this.lastPos);
      if (moved < step * 0.2) {
        this.stuckTimer += dt;
        if (this.stuckTimer > 0.35) {
          this.strafeSign *= -1;
          this.replanCombat(toPlayer, dist);
          this.position.x += this.strafeSign * 0.6;
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }
      this.lastPos.copy(this.position);

      // 射击：始终出可见弹道，命中另算
      if (dist < this.fireRange && this.fireCd <= 0) {
        const burst = Math.random() < 0.42;
        this.fireCd = burst ? 0.1 + Math.random() * 0.07 : 0.4 + Math.random() * 0.35;

        const origin = new THREE.Vector3(this.position.x, 1.48, this.position.z);
        const aimY = (player.eyeHeight ?? 1.7) + (Math.random() - 0.5) * 0.25;
        _shotDir.set(player.position.x - origin.x, aimY - origin.y, player.position.z - origin.z);
        const spread = 0.03 + dist * 0.0018;
        _shotDir.x += (Math.random() - 0.5) * spread;
        _shotDir.y += (Math.random() - 0.5) * spread * 0.7;
        _shotDir.z += (Math.random() - 0.5) * spread;
        _shotDir.normalize();

        const hitChance = THREE.MathUtils.clamp(1.05 - dist / this.fireRange, 0.18, 0.78);
        onFire?.({
          damage: this.damage,
          hit: Math.random() < hitChance,
          origin,
          dir: _shotDir.clone(),
          dist,
          traceDist: Math.min(dist + 2, this.fireRange + 4),
        });
      }
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
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.gone = true;
  }
}

export class LootCrate {
  constructor(scene, position, kind = "ammo") {
    this.scene = scene;
    this.kind = kind;
    this.alive = true;
    const color = kind === "health" ? 0x6fae6a : kind === "rifle" ? 0xc4a574 : 0x7ec8e3;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.7, 1.1),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 })
    );
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.35;
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.pulse = Math.random() * Math.PI;
  }

  update(dt) {
    if (!this.alive) return;
    this.pulse += dt * 2;
    this.mesh.position.y = 0.35 + Math.sin(this.pulse) * 0.08;
    this.mesh.rotation.y += dt * 0.8;
  }

  tryPickup(playerPos, radius = 1.6) {
    if (!this.alive) return null;
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    if (dx * dx + dz * dz <= radius * radius) {
      this.alive = false;
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      return this.kind;
    }
    return null;
  }
}

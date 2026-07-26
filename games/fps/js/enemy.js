import * as THREE from "three";

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();

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

  // 提高对比度，远处也能和亮色地面区分开
  const skin = mat(0xd2b48c);
  const pants = mat(isT ? 0x5c4a2e : 0x243044);
  const shirt = mat(isT ? 0x7a8f4a : 0xe8ecf2);
  const vest = mat(isT ? 0x6b5a30 : 0x3a6ea8, { roughness: 0.7, metalness: 0.15 });
  const boot = mat(0x2a2418);
  const headCover = mat(isT ? 0x222222 : 0x445566);
  const accent = mat(isT ? 0xc45c2a : 0xd0d6e0);

  // 腿
  const legGeo = new THREE.CapsuleGeometry(0.11, 0.45, 3, 6);
  const legL = new THREE.Mesh(legGeo, pants);
  const legR = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.12, 0.45, 0);
  legR.position.set(0.12, 0.45, 0);
  legL.castShadow = legR.castShadow = true;
  g.add(legL, legR);

  // 靴
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), boot);
  const bootR = bootL.clone();
  bootL.position.set(-0.12, 0.06, 0.04);
  bootR.position.set(0.12, 0.06, 0.04);
  g.add(bootL, bootR);

  // 躯干
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.28), shirt);
  torso.position.y = 1.05;
  torso.castShadow = true;
  g.add(torso);

  // 战术背心
  const vestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.32), vest);
  vestMesh.position.y = 1.12;
  vestMesh.castShadow = true;
  g.add(vestMesh);

  // 口袋/装备带
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), accent);
  pouch.position.set(0.14, 1.0, 0.18);
  g.add(pouch);
  const pouch2 = pouch.clone();
  pouch2.position.x = -0.14;
  g.add(pouch2);

  // 手臂
  const armGeo = new THREE.CapsuleGeometry(0.08, 0.38, 3, 6);
  const armL = new THREE.Mesh(armGeo, shirt);
  const armR = new THREE.Mesh(armGeo, shirt);
  armL.position.set(-0.3, 1.05, 0);
  armR.position.set(0.3, 1.05, 0);
  armL.rotation.z = 0.15;
  armR.rotation.z = -0.15;
  armL.castShadow = armR.castShadow = true;
  g.add(armL, armR);

  // 头 / 头套 / 头盔
  let headMesh;
  if (isT) {
    // 头套（CS 恐）
    const balaclava = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), headCover);
    balaclava.position.y = 1.55;
    balaclava.castShadow = true;
    g.add(balaclava);
    headMesh = balaclava;
    // 眼缝
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), mat(0x111111));
    eyes.position.set(0, 1.58, 0.16);
    g.add(eyes);
    // 肩带背包
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.16), mat(0x3a4028));
    pack.position.set(0, 1.15, -0.22);
    g.add(pack);
  } else {
    // CT 头盔
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), headCover);
    helmet.scale.set(1, 0.85, 1.05);
    helmet.position.y = 1.58;
    helmet.castShadow = true;
    g.add(helmet);
    headMesh = helmet;
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skin);
    face.position.set(0, 1.5, 0.06);
    g.add(face);
    // 护目/面罩条
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.08), mat(0x223344, { metalness: 0.4 }));
    visor.position.set(0, 1.56, 0.18);
    g.add(visor);
  }

  // 手持短步枪提示（挂在身前）
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

  g.userData.body = vestMesh;
  g.userData.head = headMesh;
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
    this.speed = opts.speed ?? 3.2;
    this.damage = opts.damage ?? 8;
    this.alive = true;
    this.radius = 0.4;
    this.fireCd = 0;
    this.state = "patrol";
    this.patrolTarget = position.clone();
    this.reactRange = opts.reactRange ?? 28;
    this.fireRange = opts.fireRange ?? 22;
    this.fade = 1;
    this.scoreValue = opts.scoreValue ?? 1;
    this.walkPhase = Math.random() * Math.PI * 2;
  }

  get position() {
    return this.mesh.position;
  }

  damageBy(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    const body = this.mesh.userData.body;
    if (body?.material) {
      body.material.emissive = new THREE.Color(0xddc27a);
      body.material.emissiveIntensity = 0.55;
      setTimeout(() => {
        if (body.material) body.material.emissiveIntensity = 0;
      }, 80);
    }
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
      this.state = "down";
      return true;
    }
    this.state = "chase";
    return false;
  }

  pickPatrol() {
    const sp = this.world.spawnPoints;
    this.patrolTarget = sp[Math.floor(Math.random() * sp.length)].clone();
  }

  update(dt, player, shootAtPlayer) {
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

    if (dist < this.reactRange) this.state = dist < this.fireRange * 0.55 ? "attack" : "chase";
    else if (this.state !== "patrol") this.state = "patrol";

    this.fireCd = Math.max(0, this.fireCd - dt);
    let moving = false;

    if (this.state === "patrol") {
      const to = _tmp2.copy(this.patrolTarget).sub(this.position);
      to.y = 0;
      if (to.length() < 1.2) this.pickPatrol();
      else {
        to.normalize();
        this.position.addScaledVector(to, this.speed * 0.65 * dt);
        this.mesh.lookAt(this.position.x + to.x, this.position.y, this.position.z + to.z);
        moving = true;
      }
    } else {
      toPlayer.normalize();
      this.mesh.lookAt(
        this.position.x + toPlayer.x,
        this.position.y,
        this.position.z + toPlayer.z
      );
      if (this.state === "chase" || dist > 8) {
        this.position.addScaledVector(toPlayer, this.speed * dt);
        moving = true;
      }
      if (dist < this.fireRange && this.fireCd <= 0) {
        this.fireCd = 0.55 + Math.random() * 0.45;
        const hitChance = THREE.MathUtils.clamp(1.15 - dist / this.fireRange, 0.2, 0.85);
        if (Math.random() < hitChance) {
          shootAtPlayer(this.damage);
        }
      }
    }

    if (moving) {
      this.walkPhase += dt * 8;
      this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.03;
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

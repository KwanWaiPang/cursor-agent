import * as THREE from "three";

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _move = new THREE.Vector3();
const _shotDir = new THREE.Vector3();
const _aim = new THREE.Vector3();

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.08,
  });
}

/**
 * 阵营角色：我方红 / 敌方蓝
 * team: "red" | "blue"
 */
function makeTeamCharacter(team = "blue") {
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

  // 头盔统一造型，颜色跟阵营
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

  // 肩章色块，远处也好辨认
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
  g.userData.head = helmet;
  g.userData.headHit = headHit;
  g.userData.team = team;
  return g;
}

export class Enemy {
  constructor(scene, world, position, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.team = opts.team === "red" ? "red" : "blue";
    this.mesh = makeTeamCharacter(this.team);
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

    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.tacticCd = Math.random() * 0.6;
    this.idealRange = 8 + Math.random() * 8;
    this.moveDir = new THREE.Vector3();
    this.lastPos = position.clone();
    this.stuckTimer = 0;
    this.sprintBoost = 1;
    this.currentTarget = null;
  }

  get position() {
    return this.mesh.position;
  }

  get isAlly() {
    return this.team === "red";
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

  replanCombat(toTarget, dist) {
    const fwd = _tmp2.copy(toTarget).normalize();
    _side.set(-fwd.z, 0, fwd.x).multiplyScalar(this.strafeSign);

    if (dist < this.idealRange - 2.5) {
      this.moveDir.copy(_side).multiplyScalar(0.9).addScaledVector(fwd, -0.85);
      this.sprintBoost = 1.2;
    } else if (dist > this.idealRange + 4) {
      this.moveDir.copy(fwd).multiplyScalar(1.05).addScaledVector(_side, 0.75);
      this.sprintBoost = 1.25;
    } else {
      const press = (Math.random() - 0.35) * 0.45;
      this.moveDir.copy(_side).multiplyScalar(1.15).addScaledVector(fwd, press);
      this.sprintBoost = 1.05;
    }

    if (this.moveDir.lengthSq() > 0.0001) this.moveDir.normalize();
    if (Math.random() < 0.28) this.strafeSign *= -1;
    this.tacticCd = 0.55 + Math.random() * 1.1;
  }

  /** 选最近敌对目标：蓝打玩家/红方，红打蓝方 */
  pickTarget(player, units) {
    let best = null;
    let bestDist = Infinity;

    if (this.team === "blue" && player?.alive !== false) {
      const d = this.position.distanceTo(player.position);
      if (d < this.reactRange && d < bestDist) {
        bestDist = d;
        best = { kind: "player", ref: player, dist: d };
      }
    }

    for (const u of units) {
      if (!u || u === this || !u.alive || u.gone) continue;
      if (u.team === this.team) continue;
      const d = this.position.distanceTo(u.position);
      if (d < this.reactRange && d < bestDist) {
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

    const target = this.pickTarget(player, units || []);
    this.currentTarget = target;

    let toTarget = null;
    let dist = Infinity;
    if (target) {
      const tp = target.kind === "player" ? target.ref.position : target.ref.position;
      toTarget = _tmp.copy(tp).sub(this.position);
      toTarget.y = 0;
      dist = toTarget.length();
      this.state = dist < this.fireRange * 0.4 ? "attack" : "chase";
    } else if (this.state !== "patrol") {
      this.state = "patrol";
    }

    this.fireCd = Math.max(0, this.fireCd - dt);
    this.tacticCd = Math.max(0, this.tacticCd - dt);
    this.sprintBoost = THREE.MathUtils.lerp(this.sprintBoost, 1, dt * 1.8);
    let moving = false;

    // 我方略向玩家靠拢巡逻
    if (this.state === "patrol") {
      if (this.isAlly && player?.position) {
        const toP = _tmp2.copy(player.position).sub(this.position);
        toP.y = 0;
        if (toP.length() > 22) {
          this.patrolTarget.copy(player.position);
          this.patrolTarget.x += (Math.random() - 0.5) * 8;
          this.patrolTarget.z += (Math.random() - 0.5) * 8;
        }
      }
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
          this.position.x += this.strafeSign * 0.6;
          this.stuckTimer = 0;
        }
      } else {
        this.stuckTimer = 0;
      }
      this.lastPos.copy(this.position);

      if (dist < this.fireRange && this.fireCd <= 0) {
        const burst = Math.random() < 0.42;
        this.fireCd = burst ? 0.1 + Math.random() * 0.07 : 0.4 + Math.random() * 0.35;

        const origin = new THREE.Vector3(this.position.x, 1.48, this.position.z);
        const aimPos =
          target.kind === "player"
            ? _aim.set(player.position.x, player.eyeHeight ?? 1.7, player.position.z)
            : _aim.set(target.ref.position.x, 1.45, target.ref.position.z);
        aimPos.y += (Math.random() - 0.5) * 0.25;
        _shotDir.subVectors(aimPos, origin);
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
          team: this.team,
          targetKind: target.kind,
          targetUnit: target.kind === "unit" ? target.ref : null,
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

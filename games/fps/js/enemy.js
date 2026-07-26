import * as THREE from "three";

const _tmp = new THREE.Vector3();
const _tmp2 = new THREE.Vector3();

function makeSoldierMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4a5538,
    roughness: 0.85,
    metalness: 0.08,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x2c3224,
    roughness: 0.9,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 4, 8), bodyMat);
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), darkMat);
  head.position.y = 1.78;
  head.castShadow = true;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.2), darkMat);
  pack.position.set(0, 1.15, 0.28);
  g.add(body, head, pack);
  g.userData.body = body;
  g.userData.head = head;
  return g;
}

export class Enemy {
  constructor(scene, world, position, opts = {}) {
    this.scene = scene;
    this.world = world;
    this.mesh = makeSoldierMesh();
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
    this.aimSpread = 0.04;
    this.state = "patrol";
    this.patrolTarget = position.clone();
    this.reactRange = opts.reactRange ?? 28;
    this.fireRange = opts.fireRange ?? 22;
    this.fade = 1;
    this.scoreValue = opts.scoreValue ?? 1;
  }

  get position() {
    return this.mesh.position;
  }

  damageBy(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    // 受击闪白（无血红）
    const body = this.mesh.userData.body;
    if (body) {
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

    if (this.state === "patrol") {
      const to = _tmp2.copy(this.patrolTarget).sub(this.position);
      to.y = 0;
      if (to.length() < 1.2) this.pickPatrol();
      else {
        to.normalize();
        this.position.addScaledVector(to, this.speed * 0.65 * dt);
        this.mesh.lookAt(this.position.x + to.x, this.position.y, this.position.z + to.z);
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
      }
      if (dist < this.fireRange && this.fireCd <= 0) {
        this.fireCd = 0.55 + Math.random() * 0.45;
        // 命中率随距离下降
        const hitChance = THREE.MathUtils.clamp(1.15 - dist / this.fireRange, 0.2, 0.85);
        if (Math.random() < hitChance) {
          shootAtPlayer(this.damage);
        }
      }
    }

    this.world.resolvePosition(this.position, this.radius);
    this.position.y = 0;
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
    this.kind = kind; // ammo | health | rifle
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

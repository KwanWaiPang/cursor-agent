import * as THREE from "three";
import { PointerLockControls } from "../vendor/PointerLockControls.js";

export class Player {
  constructor(camera, domElement, world) {
    this.camera = camera;
    this.world = world;
    this.controls = new PointerLockControls(camera, domElement);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.keys = {
      forward: false,
      back: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      crouch: false,
      reload: false,
    };
    this.standHeight = 1.7;
    this.crouchHeight = 1.05;
    this.eyeHeight = this.standHeight;
    this._eyeCurrent = this.standHeight;
    this.onGround = true;
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.radius = 0.45;
    /** 受伤后若干秒再开始回血（仅玩家；敌人无此逻辑） */
    this.regenDelay = 4;
    this.regenRate = 14;
    this._timeSinceDamage = 999;
    /** 开局无敌截止时间（performance.now） */
    this.spawnProtectUntil = 0;
    this.yawObject = this.controls.getObject();
    this.yawObject.position.set(0, this.eyeHeight, 16);

    this._onKeyDown = (e) => this.onKey(e, true);
    this._onKeyUp = (e) => this.onKey(e, false);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
  }

  onKey(e, down) {
    switch (e.code) {
      case "KeyW":
        this.keys.forward = down;
        break;
      case "KeyS":
        this.keys.back = down;
        break;
      case "KeyA":
        this.keys.left = down;
        break;
      case "KeyD":
        this.keys.right = down;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.sprint = down;
        break;
      case "Space":
        if (down) this.keys.jump = true;
        break;
      case "KeyQ":
        this.keys.crouch = down;
        break;
      case "KeyR":
        // 边沿触发换弹
        if (down && !this.keys.reload) this.keys.reload = true;
        break;
      default:
        break;
    }
  }

  consumeReloadRequest() {
    if (!this.keys.reload) return false;
    this.keys.reload = false;
    return true;
  }

  get crouching() {
    return !!this.keys.crouch;
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }

  get position() {
    return this.yawObject.position;
  }

  getObject() {
    return this.yawObject;
  }

  grantSpawnProtect(seconds = 4) {
    this.spawnProtectUntil = performance.now() + seconds * 1000;
  }

  get isSpawnProtected() {
    return performance.now() < this.spawnProtectUntil;
  }

  damage(amount) {
    if (!this.alive) return;
    if (this.isSpawnProtected) return;
    this.hp = Math.max(0, this.hp - amount);
    this._timeSinceDamage = 0;
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** 脱战后自动回血 */
  applyRegen(dt) {
    if (!this.alive || this.hp >= this.maxHp) return;
    this._timeSinceDamage += dt;
    if (this._timeSinceDamage < this.regenDelay) return;
    this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
  }

  update(dt) {
    if (!this.alive) return;

    this.applyRegen(dt);

    const wantEye = this.keys.crouch ? this.crouchHeight : this.standHeight;
    this._eyeCurrent = THREE.MathUtils.lerp(this._eyeCurrent, wantEye, 1 - Math.pow(0.001, dt));
    this.eyeHeight = this._eyeCurrent;

    // 蹲下可走，略慢；蹲下时不能冲刺
    const sprinting = this.keys.sprint && !this.keys.crouch;
    let base = sprinting ? 11 : 6.5;
    if (this.keys.crouch) base *= 0.55;
    const speed = base * dt;

    this.direction.set(0, 0, 0);
    if (this.keys.forward) this.direction.z -= 1;
    if (this.keys.back) this.direction.z += 1;
    if (this.keys.left) this.direction.x -= 1;
    if (this.keys.right) this.direction.x += 1;
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    const forward = new THREE.Vector3();
    this.controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -this.direction.z * speed);
    move.addScaledVector(right, this.direction.x * speed);

    // 蹲下时可走不可跳
    if (this.onGround && this.keys.jump) {
      if (!this.keys.crouch) {
        this.velocity.y = 7.5;
        this.onGround = false;
      }
      this.keys.jump = false;
    }
    this.velocity.y -= 22 * dt;

    const pos = this.position;
    pos.x += move.x;
    pos.z += move.z;
    pos.y += this.velocity.y * dt;

    if (pos.y <= this.eyeHeight) {
      pos.y = this.eyeHeight;
      this.velocity.y = 0;
      this.onGround = true;
    } else if (this.onGround) {
      // 视线高度变化时贴地
      pos.y = this.eyeHeight;
    }

    this.world.resolvePosition(pos, this.radius);
  }

  dispose() {
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
  }
}

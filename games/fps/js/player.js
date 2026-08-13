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
      leanL: false,
      leanR: false,
      reload: false,
      help: false,
      medkit: false,
    };
    /** -1..1 smoothed lean (Q left / E right, hold) */
    this.leanAmount = 0;
    this._leanApplied = 0;
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
    /** 收纳的急救包数量（满血拾取不浪费） */
    this.medkits = 0;
    this._lastHitFrom = null;
    this._weaponKey = null;
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
      case "KeyZ":
        this.keys.crouch = down;
        break;
      case "KeyQ":
        this.keys.leanL = down;
        break;
      case "KeyE":
        this.keys.leanR = down;
        break;
      case "KeyH":
        // 边沿：呼叫队友支援
        if (down && !this.keys.help) this.keys.help = true;
        break;
      case "KeyF":
        if (down && !this.keys.medkit) this.keys.medkit = true;
        break;
      case "KeyR":
        // 边沿触发换弹
        if (down && !this.keys.reload) this.keys.reload = true;
        break;
      case "Digit1":
      case "Digit2":
      case "Digit3":
      case "Digit4":
      case "Digit5":
      case "Numpad1":
      case "Numpad2":
      case "Numpad3":
      case "Numpad4":
      case "Numpad5":
        if (down) this._weaponKey = e.code;
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

  consumeHelpRequest() {
    if (!this.keys.help) return false;
    this.keys.help = false;
    return true;
  }

  consumeMedkitRequest() {
    if (!this.keys.medkit) return false;
    this.keys.medkit = false;
    return true;
  }

  tryUseMedkit(healAmount = 40) {
    if (!this.alive || this.medkits <= 0) return "none";
    if (this.hp >= this.maxHp - 0.5) return "full";
    this.medkits -= 1;
    this.heal(healAmount);
    return "used";
  }

  consumeWeaponKey() {
    const code = this._weaponKey;
    this._weaponKey = null;
    return code;
  }

  get crouching() {
    return !!this.keys.crouch;
  }

  get leaning() {
    return Math.abs(this.leanAmount) > 0.05;
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

  damage(amount, fromPos = null) {
    if (!this.alive) return;
    if (this.isSpawnProtected) return;
    this.hp = Math.max(0, this.hp - amount);
    this._timeSinceDamage = 0;
    if (fromPos) this._lastHitFrom = { x: fromPos.x, z: fromPos.z, at: performance.now() };
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
    }
  }

  /** 据点等多残机模式：复活到指定位置 */
  respawnAt(x, z, protectSec = 4) {
    this.alive = true;
    this.hp = this.maxHp;
    this._timeSinceDamage = 99;
    this._lastHitFrom = null;
    this.yawObject.position.set(x, this.eyeHeight, z);
    this.grantSpawnProtect(protectSec);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** 满血则收纳；否则立即使用 */
  takeMedkit(healAmount = 40) {
    if (this.hp >= this.maxHp - 0.5) {
      this.medkits += 1;
      return "stored";
    }
    this.heal(healAmount);
    return "used";
  }

  /** 掉血后自动消耗收纳的急救包 */
  tryAutoMedkit(dt) {
    if (!this.alive || this.medkits <= 0) return false;
    if (this.hp >= this.maxHp * 0.72) return false;
    if (this._timeSinceDamage < 0.6) return false;
    this.medkits -= 1;
    this.heal(40);
    return true;
  }

  /** 脱战后自动回血 */
  applyRegen(dt) {
    if (!this.alive || this.hp >= this.maxHp) return;
    this._timeSinceDamage += dt;
    if (this.tryAutoMedkit(dt)) return;
    if (this._timeSinceDamage < this.regenDelay) return;
    this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
  }

  update(dt) {
    if (!this.alive) return;

    this.applyRegen(dt);

    const wantEye = this.keys.crouch ? this.crouchHeight : this.standHeight;
    this._eyeCurrent = THREE.MathUtils.lerp(this._eyeCurrent, wantEye, 1 - Math.pow(0.001, dt));
    this.eyeHeight = this._eyeCurrent;

    // Q/E 按住探头；冲刺时收回
    const leanWant =
      this.keys.sprint || this.keys.crouch
        ? 0
        : (this.keys.leanR ? 1 : 0) - (this.keys.leanL ? 1 : 0);
    this.leanAmount = THREE.MathUtils.lerp(this.leanAmount, leanWant, 1 - Math.pow(0.0002, dt));
    if (Math.abs(this.leanAmount) < 0.02) this.leanAmount = 0;

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

    // 探头：相对上一帧的侧向位移，方便掩体后探身瞄准
    const leanOff = this.leanAmount * 0.42;
    const leanDelta = leanOff - this._leanApplied;
    this._leanApplied = leanOff;
    move.addScaledVector(right, leanDelta);

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

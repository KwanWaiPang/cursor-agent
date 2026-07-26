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
    };
    this.eyeHeight = 1.7;
    this.onGround = true;
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.radius = 0.45;
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
      default:
        break;
    }
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

  damage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.alive = false;
      this.hp = 0;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt) {
    if (!this.alive) return;

    const speed = (this.keys.sprint ? 11 : 6.5) * dt;
    this.direction.set(0, 0, 0);
    if (this.keys.forward) this.direction.z -= 1;
    if (this.keys.back) this.direction.z += 1;
    if (this.keys.left) this.direction.x -= 1;
    if (this.keys.right) this.direction.x += 1;
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    // 相对视角移动
    const forward = new THREE.Vector3();
    this.controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -this.direction.z * speed);
    move.addScaledVector(right, this.direction.x * speed);

    // 跳跃与重力
    if (this.onGround && this.keys.jump) {
      this.velocity.y = 7.5;
      this.onGround = false;
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
    }

    this.world.resolvePosition(pos, this.radius);
  }

  dispose() {
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
  }
}

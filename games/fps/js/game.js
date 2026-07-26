import * as THREE from "three";
import { createWorld } from "./world.js";
import { Player } from "./player.js";
import { Sfx } from "./audio.js";
import { createHud } from "./hud.js";
import {
  createLoadout,
  tryReload,
  updateReload,
  canShoot,
  consumeShot,
} from "./weapons.js";
import { createAssaultMode, createRoyaleMode } from "./modes.js";
import { createAK47ViewModel, createPistolViewModel } from "./viewmodel.js";

export class Game {
  constructor({ mode, onEnd, onQuit }) {
    this.modeName = mode;
    this.onEnd = onEnd;
    this.onQuit = onQuit;
    this.running = false;
    this.paused = false;
    this.clock = new THREE.Clock();
    this.sfx = new Sfx();
    this.hud = createHud();
    this.enemies = [];
    this.loot = [];
    this.shooting = false;
    this._disposed = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.08,
      420
    );
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch (e) {
      throw new Error("WEBGL");
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    this.world = createWorld(this.scene, mode === "royale" ? 210 : 170);
    this.player = new Player(this.camera, this.renderer.domElement, this.world);
    this.loadout = createLoadout("rifle");

    // 第一人称武器（默认 AK-47）
    this.viewAk = createAK47ViewModel();
    this.viewPistol = createPistolViewModel();
    this.camera.add(this.viewAk.root);
    this.camera.add(this.viewPistol.root);
    this.scene.add(this.camera);
    this.activeView = this.viewAk;
    this.syncViewModel();

    this.raycaster = new THREE.Raycaster();
    this.tracers = [];

    const ctx = {
      scene: this.scene,
      world: this.world,
      player: this.player,
      hud: this.hud,
      sfx: this.sfx,
      enemies: this.enemies,
      loot: this.loot,
      get loadout() {
        return this._game.loadout;
      },
      set loadout(v) {
        this._game.loadout = v;
      },
      _game: this,
    };
    // fix loadout proxy
    Object.defineProperty(ctx, "loadout", {
      get: () => this.loadout,
      set: (v) => {
        this.loadout = v;
      },
    });

    this.mode =
      mode === "royale" ? createRoyaleMode(ctx) : createAssaultMode(ctx);

    this._onResize = () => this.onResize();
    this._onMouseDown = (e) => {
      if (e.button === 0) this.shooting = true;
      // 右键换弹
      if (e.button === 2) {
        e.preventDefault();
        tryReload(this.loadout, performance.now(), this.sfx);
      }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.shooting = false;
    };
    this._onContextMenu = (e) => {
      // 锁定指针时屏蔽浏览器右键菜单
      if (this.player?.controls?.isLocked) e.preventDefault();
    };
    this._onLock = () => this.onLock();
    this._onUnlock = () => this.onUnlock();

    window.addEventListener("resize", this._onResize);
    document.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("mouseup", this._onMouseUp);
    document.addEventListener("contextmenu", this._onContextMenu);
    this.player.controls.addEventListener("lock", this._onLock);
    this.player.controls.addEventListener("unlock", this._onUnlock);

    this.hud.show();
    this.running = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // 必须在点击手势同步调用，否则浏览器会拒绝 Pointer Lock
    this.player.lock();
  }

  onLock() {
    this.paused = false;
    document.getElementById("pause")?.classList.add("hidden");
  }

  onUnlock() {
    if (!this.running || this._ended) return;
    this.paused = true;
    document.getElementById("pause")?.classList.remove("hidden");
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  resume() {
    this.player.lock();
  }

  syncViewModel() {
    const useAk = this.loadout?.def?.view !== "pistol";
    this.viewAk.setVisible(useAk);
    this.viewPistol.setVisible(!useAk);
    this.activeView = useAk ? this.viewAk : this.viewPistol;
  }

  shoot(now) {
    if (!this.player.alive) return;
    if (!this.player.controls.isLocked) return;
    updateReload(this.loadout, now);
    if (!canShoot(this.loadout, now)) {
      if (this.loadout.mag <= 0) tryReload(this.loadout, now, this.sfx);
      return;
    }
    consumeShot(this.loadout, now);
    this.sfx.shoot(this.loadout.def.heavy);
    this.activeView?.kick();
    this.hud.flashFire();

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    // 散布
    const spread = this.loadout.def.spread;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const range = this.loadout.def.range;
    this.raycaster.set(origin, dir);
    this.raycaster.far = range;

    // 只锁定蓝方敌对单位（无友军伤害）
    const targets = [];
    for (const e of this.enemies) {
      if (!e.alive || e.gone || e.team !== "blue") continue;
      e.mesh.updateMatrixWorld(true);
      e.mesh.traverse((o) => {
        if (o.isMesh) targets.push(o);
      });
    }

    const hitsEnemy = this.raycaster.intersectObjects(targets, false);
    const enemyHit = hitsEnemy[0];
    // 实体墙挡弹（碰撞盒射线，无法穿墙）
    const wallDist = this.world.raycastSolid(origin, dir, range);
    const blocked =
      Number.isFinite(wallDist) &&
      (!enemyHit || wallDist + 0.05 < enemyHit.distance);

    if (enemyHit && !blocked) {
      let enemy = null;
      let obj = enemyHit.object;
      let hitZone = obj.userData?.hitZone || null;
      while (obj) {
        if (!enemy) enemy = this.enemies.find((en) => en.mesh === obj);
        if (!hitZone && obj.userData?.hitZone) hitZone = obj.userData.hitZone;
        if (enemy && hitZone) break;
        obj = obj.parent;
      }
      if (enemy && enemy.alive && enemy.team === "blue") {
        const headshot = hitZone === "head";
        const killed = enemy.damageBy(this.loadout.def.damage, { headshot });
        this.sfx.hit();
        this.hud.flashHit();
        if (killed) this.mode.onKill?.();
      }
    }

    const traceDist = blocked
      ? wallDist
      : enemyHit?.distance ?? Math.min(55, range);
    this.spawnTracer(origin, dir, traceDist, { team: "player" });
  }

  /** 多条弹道可并存：玩家黄、我方红、敌方蓝；长度止于墙/目标 */
  spawnTracer(origin, dir, dist, opts = {}) {
    const team = opts.team || (opts.enemy ? "blue" : "player");
    const cap = team === "player" ? 55 : 70;
    const len = Math.min(Math.max(dist, 0.05), cap);
    const end = origin.clone().addScaledVector(dir, len);
    const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const color = team === "blue" ? 0x4fc3f7 : team === "red" ? 0xff6655 : 0xe8d48a;
    const opacity = team === "player" ? 0.85 : 0.95;
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: true,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({
      line,
      life: team === "player" ? 0.05 : 0.16,
      fade: opacity,
    });
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.line.material) {
        t.line.material.opacity = Math.max(0, t.fade * (t.life > 0 ? 1 : 0));
      }
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  animate() {
    if (this._disposed) return;
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = performance.now();

    if (this.running && !this.paused && !this._ended) {
      updateReload(this.loadout, now);
      this.player.update(dt);
      if (this.shooting) this.shoot(now);

      const moving =
        this.player.keys.forward ||
        this.player.keys.back ||
        this.player.keys.left ||
        this.player.keys.right;
      this.syncViewModel();
      this.activeView?.update(dt, moving, this.loadout.reloading);

      for (const e of this.enemies) {
        e.update(dt, this.player, this.enemies, (shot) => {
          if (!shot) return;
          this.sfx.enemyShoot(shot.dist);
          const wantDist = shot.traceDist ?? shot.dist ?? 40;
          const wallDist = this.world.raycastSolid(shot.origin, shot.dir, wantDist + 1);
          const blocked = Number.isFinite(wallDist) && wallDist + 0.08 < shot.dist;
          const traceDist = blocked ? wallDist : wantDist;
          this.spawnTracer(shot.origin, shot.dir, traceDist, {
            team: shot.team || e.team,
          });
          // 穿墙无效：墙在目标前则不结算伤害
          if (blocked || !shot.hit) return;
          if (shot.targetKind === "player") {
            if (shot.team === "blue" && this.player.alive) {
              this.player.damage(shot.damage);
              this.sfx.hurt();
              this.hud.flashDamage();
            }
            return;
          }
          const victim = shot.targetUnit;
          if (!victim?.alive || victim.gone) return;
          if (victim.team === shot.team) return;
          const killed = victim.damageBy(shot.damage);
          if (killed && victim.team === "blue") this.mode.onKill?.();
        });
      }
      // 原地移除，保持与 mode 共用的同一数组引用
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (this.enemies[i].gone) this.enemies.splice(i, 1);
      }

      this.updateTracers(dt);
      const result = this.mode.update(dt);
      this.hud.updatePlayer(this.player, this.loadout);
      this.hud.tick(dt);

      if (result?.done) {
        this._ended = true;
        this.running = false;
        this.player.unlock();
        if (result.win) this.sfx.win();
        else this.sfx.lose();
        this.onEnd?.(result);
      }
    } else {
      this.hud.tick(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._disposed = true;
    this.running = false;
    this.player.unlock();
    this.player.dispose();
    this.player.controls.removeEventListener("lock", this._onLock);
    this.player.controls.removeEventListener("unlock", this._onUnlock);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("mouseup", this._onMouseUp);
    document.removeEventListener("contextmenu", this._onContextMenu);
    this.hud.hide();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

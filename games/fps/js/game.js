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
import { createAK47ViewModel, createPistolViewModel, createM4ViewModel, createShotgunViewModel, createSniperViewModel } from "./viewmodel.js";

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
    this.aiming = false;
    this.baseFov = 75;
    this.adsFov = 38;
    this._disposed = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.baseFov,
      window.innerWidth / window.innerHeight,
      0.08,
      420
    );
    // PointerLock 与后坐共用 YXZ；禁止出现 roll（侧身）
    this.camera.rotation.order = "YXZ";
    this._lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
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

    // 第一人称武器（五枪）
    this.viewAk = createAK47ViewModel();
    this.viewM4 = createM4ViewModel();
    this.viewShotgun = createShotgunViewModel();
    this.viewSniper = createSniperViewModel();
    this.viewPistol = createPistolViewModel();
    this.camera.add(this.viewAk.root);
    this.camera.add(this.viewM4.root);
    this.camera.add(this.viewShotgun.root);
    this.camera.add(this.viewSniper.root);
    this.camera.add(this.viewPistol.root);
    this.scene.add(this.camera);
    this.activeView = this.viewAk;
    this.syncViewModel();

    this.raycaster = new THREE.Raycaster();
    this.tracers = [];
    this.tracerPool = [];
    this.kickRecover = 0;
    this._enemyMeshCache = [];
    this._enemyMeshCacheAt = 0;

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
        this.syncViewModel();
      },
    });

    this.mode =
      mode === "royale" ? createRoyaleMode(ctx) : createAssaultMode(ctx);
    this.syncViewModel();

    this._onResize = () => this.onResize();
    this._onMouseDown = (e) => {
      if (e.button === 0) this.shooting = true;
      // 右键开镜瞄准
      if (e.button === 2) {
        e.preventDefault();
        this.aiming = true;
      }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.shooting = false;
      if (e.button === 2) this.aiming = false;
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
    this.aiming = false;
    this.shooting = false;
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
    const view = this.loadout?.def?.view || "ak";
    const map = {
      ak: this.viewAk,
      m4: this.viewM4,
      shotgun: this.viewShotgun,
      sniper: this.viewSniper,
      pistol: this.viewPistol,
    };
    for (const [key, vm] of Object.entries(map)) {
      vm.setVisible(key === view);
    }
    this.activeView = map[view] || this.viewAk;
  }

  refreshEnemyMeshCache(force = false) {
    const now = performance.now();
    if (!force && now - this._enemyMeshCacheAt < 80) return this._enemyMeshCache;
    this._enemyMeshCache = [];
    for (const e of this.enemies) {
      if (!e.alive || e.gone || e.team !== "blue") continue;
      e.mesh.updateMatrixWorld(true);
      e.mesh.traverse((o) => {
        if (o.isMesh) this._enemyMeshCache.push(o);
      });
    }
    this._enemyMeshCacheAt = now;
    return this._enemyMeshCache;
  }

  resolvePlayerHit(enemyHit) {
    let enemy = null;
    let obj = enemyHit.object;
    let hitZone = obj.userData?.hitZone || null;
    while (obj) {
      if (!enemy) enemy = this.enemies.find((en) => en.mesh === obj);
      if (!hitZone && obj.userData?.hitZone) hitZone = obj.userData.hitZone;
      if (enemy && hitZone) break;
      obj = obj.parent;
    }
    return { enemy, hitZone };
  }

  /**
   * 用 YXZ 欧拉读写视角，并强制 z=0，避免与 PointerLock 四元数互转时出现 roll（侧身）。
   */
  stabilizeLook() {
    const cam = this.camera;
    const e = this._lookEuler;
    e.setFromQuaternion(cam.quaternion, "YXZ");
    e.z = 0;
    const lim = Math.PI / 2 - 0.05;
    e.x = THREE.MathUtils.clamp(e.x, -lim, lim);
    cam.quaternion.setFromEuler(e);
    cam.rotation.set(e.x, e.y, 0, "YXZ");
  }

  /** 后坐/回落：只改俯仰，不引入侧倾 */
  applyLookPitch(delta) {
    const cam = this.camera;
    const e = this._lookEuler;
    e.setFromQuaternion(cam.quaternion, "YXZ");
    e.z = 0;
    e.x += delta;
    const lim = Math.PI / 2 - 0.05;
    e.x = THREE.MathUtils.clamp(e.x, -lim, lim);
    cam.quaternion.setFromEuler(e);
    cam.rotation.set(e.x, e.y, 0, "YXZ");
  }

  fireRay(origin, baseDir, spread, range, damage) {
    const dir = baseDir.clone();
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    this.raycaster.set(origin, dir);
    this.raycaster.far = range;
    const targets = this.refreshEnemyMeshCache();
    const hitsEnemy = this.raycaster.intersectObjects(targets, false);
    const enemyHit = hitsEnemy[0];
    const wallDist = this.world.raycastSolid(origin, dir, range);
    const blocked =
      Number.isFinite(wallDist) &&
      (!enemyHit || wallDist + 0.05 < enemyHit.distance);

    let hitSomething = false;
    if (enemyHit && !blocked) {
      const { enemy, hitZone } = this.resolvePlayerHit(enemyHit);
      if (enemy && enemy.alive && enemy.team === "blue") {
        const headshot = hitZone === "head";
        const killed = enemy.damageBy(damage, {
          headshot,
          from: this.player.position,
        });
        hitSomething = true;
        if (headshot) this.sfx.headshot();
        else this.sfx.hit();
        this.hud.flashHit(headshot);
        if (killed) this.mode.onKill?.();
      }
    }

    const traceDist = blocked
      ? wallDist
      : enemyHit?.distance ?? Math.min(55, range);
    this.spawnTracer(origin, dir, traceDist, { team: "player" });
    return hitSomething;
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
    if (this.loadout.mag <= 0) tryReload(this.loadout, now, this.sfx);

    const def = this.loadout.def;
    this.sfx.shoot(def.heavy, def.id);
    this.activeView?.kick();
    this.hud.flashFire();

    const ads = this.aiming && !this.loadout.reloading;
    const kick = (def.kick ?? 0.024) * (ads ? 0.55 : 1);
    this.applyLookPitch(-kick);
    this.kickRecover += kick;

    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const baseDir = new THREE.Vector3();
    this.camera.getWorldDirection(baseDir);

    let spread = def.spread;
    if (ads) spread *= def.adsSpreadMul ?? 0.28;
    else spread *= def.hipSpreadMul ?? 1;

    const pellets = def.pellets || 1;
    const range = def.range;
    for (let i = 0; i < pellets; i++) {
      this.fireRay(origin, baseDir, spread, range, def.damage);
    }
  }

  /** 多条弹道可并存：玩家黄、我方红、敌方蓝；对象池复用 */
  spawnTracer(origin, dir, dist, opts = {}) {
    const team = opts.team || (opts.enemy ? "blue" : "player");
    const cap = team === "player" ? 55 : 70;
    const len = Math.min(Math.max(dist, 0.05), cap);
    const end = origin.clone().addScaledVector(dir, len);
    const color = team === "blue" ? 0x4fc3f7 : team === "red" ? 0xff6655 : 0xe8d48a;
    const opacity = team === "player" ? 0.85 : 0.95;

    let entry = this.tracerPool.pop();
    if (!entry) {
      const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthTest: true,
      });
      const line = new THREE.Line(geo, mat);
      entry = { line, geo, mat };
    } else {
      const pos = entry.geo.attributes.position;
      pos.setXYZ(0, origin.x, origin.y, origin.z);
      pos.setXYZ(1, end.x, end.y, end.z);
      pos.needsUpdate = true;
      entry.mat.color.setHex(color);
      entry.mat.opacity = opacity;
      entry.line.visible = true;
    }
    this.scene.add(entry.line);
    this.tracers.push({
      ...entry,
      life: team === "player" ? 0.05 : 0.16,
      fade: opacity,
    });
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.mat) t.mat.opacity = Math.max(0, t.fade * (t.life > 0 ? 1 : 0));
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.visible = false;
        this.tracerPool.push({ line: t.line, geo: t.geo || t.line.geometry, mat: t.mat || t.line.material });
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
      if (this.player.consumeReloadRequest()) {
        tryReload(this.loadout, now, this.sfx);
      }
      this.player.update(dt);

      const adsFov = this.loadout?.def?.adsFov ?? this.adsFov;
      const wantFov = this.aiming && !this.loadout.reloading ? adsFov : this.baseFov;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, wantFov, 1 - Math.pow(0.0008, dt));
      this.camera.updateProjectionMatrix();

      if (this.kickRecover > 0.0001) {
        const step = Math.min(this.kickRecover, this.kickRecover * 10 * dt + 0.002);
        this.applyLookPitch(step);
        this.kickRecover -= step;
      } else {
        this.kickRecover = 0;
      }

      // 每帧清 roll，避免鼠标+后坐欧拉漂移成侧身
      this.stabilizeLook();

      if (this.shooting) this.shoot(now);

      const moving =
        this.player.keys.forward ||
        this.player.keys.back ||
        this.player.keys.left ||
        this.player.keys.right;
      this.syncViewModel();
      this.activeView?.update(dt, moving, this.loadout.reloading, {
        aiming: this.aiming && !this.loadout.reloading,
        crouching: this.player.crouching,
      });

      this.refreshEnemyMeshCache(true);

      for (const e of this.enemies) {
        e.update(dt, this.player, this.enemies, (shot) => {
          if (!shot) return;
          this.sfx.enemyShoot(shot.dist);
          const wantDist = shot.traceDist ?? shot.dist ?? 40;
          const wallDist = this.world.raycastSolid(shot.origin, shot.dir, wantDist + 1);
          const blocked = Number.isFinite(wallDist) && wallDist + 0.08 < (shot.hit ? shot.traceDist : shot.dist);
          const traceDist = blocked ? wallDist : wantDist;
          this.spawnTracer(shot.origin, shot.dir, traceDist, {
            team: shot.team || e.team,
          });
          if (blocked || !shot.hit) return;
          if (shot.targetKind === "player") {
            if (shot.team === "blue" && this.player.alive) {
              const from = shot.origin || e.position;
              this.player.damage(shot.damage, from);
              this.sfx.hurt();
              this.hud.flashDamage(
                from,
                this.player.controls.getObject().rotation.y,
                this.player.position
              );
            }
            return;
          }
          const victim = shot.targetUnit;
          if (!victim?.alive || victim.gone) return;
          if (victim.team === shot.team) return;
          const killed = victim.damageBy(shot.damage, {
            headshot: !!shot.headshot,
            from: e.position,
          });
          if (killed && victim.team === "blue") this.mode.onKill?.();
        });
      }
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
    this.mode?.dispose?.();
    for (const e of this.enemies) {
      try {
        e.remove?.();
      } catch (_) {
        /* ignore */
      }
    }
    this.enemies.length = 0;
    for (const l of this.loot) {
      try {
        l.dispose?.();
      } catch (_) {
        /* ignore */
      }
    }
    this.loot.length = 0;
    for (const t of this.tracers) {
      this.scene.remove(t.line);
      t.line.geometry?.dispose?.();
      t.line.material?.dispose?.();
    }
    this.tracers.length = 0;
    for (const t of this.tracerPool) {
      t.geo?.dispose?.();
      t.mat?.dispose?.();
    }
    this.tracerPool.length = 0;
    this.world?.dispose?.();
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

import * as THREE from "three";

/** 第一人称 AK-47 持枪模型（低模，挂在相机下） */
export function createAK47ViewModel() {
  const root = new THREE.Group();
  root.name = "ak47View";

  const wood = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.85,
    metalness: 0.05,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x2a2e28,
    roughness: 0.45,
    metalness: 0.75,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1a1c18,
    roughness: 0.4,
    metalness: 0.85,
  });
  const gripWood = new THREE.MeshStandardMaterial({
    color: 0x8a5a2b,
    roughness: 0.8,
    metalness: 0.05,
  });

  const gun = new THREE.Group();

  // 机匣
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), metal);
  receiver.position.set(0, 0, 0);
  gun.add(receiver);

  // 上盖
  const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.28), darkMetal);
  dustCover.position.set(0, 0.06, -0.02);
  gun.add(dustCover);

  // 枪管
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.018, 0.38, 10),
    darkMetal
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.38);
  gun.add(barrel);

  // 消焰器
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.018, 0.06, 8),
    darkMetal
  );
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.02, -0.58);
  gun.add(muzzle);

  // 护木
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.08, 0.2), wood);
  handguard.position.set(0, -0.02, -0.22);
  gun.add(handguard);

  // 气导箍
  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.06), metal);
  gasBlock.position.set(0, 0.06, -0.32);
  gun.add(gasBlock);

  // 准星
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.02), darkMetal);
  frontSight.position.set(0, 0.07, -0.5);
  gun.add(frontSight);

  // 表尺
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), darkMetal);
  rearSight.position.set(0, 0.085, 0.08);
  gun.add(rearSight);

  // 弧形弹匣（多段盒近似）
  const magGroup = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.08), darkMetal);
    const t = i / 4;
    seg.position.set(0, -0.12 - t * 0.16, 0.02 + t * 0.06);
    seg.rotation.x = -0.35 * t;
    magGroup.add(seg);
  }
  gun.add(magGroup);

  // 握把
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.07), gripWood);
  grip.position.set(0, -0.12, 0.12);
  grip.rotation.x = 0.35;
  gun.add(grip);

  // 枪托
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.28), wood);
  stock.position.set(0, 0.0, 0.32);
  gun.add(stock);
  const stockEnd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), wood);
  stockEnd.position.set(0, -0.01, 0.46);
  gun.add(stockEnd);

  // 扳机护圈
  const triggerGuard = new THREE.Mesh(
    new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI),
    metal
  );
  triggerGuard.rotation.y = Math.PI / 2;
  triggerGuard.position.set(0, -0.06, 0.08);
  gun.add(triggerGuard);

  // FPS 惯用位：右下角伸出
  gun.position.set(0.22, -0.28, -0.55);
  gun.rotation.set(0.04, 0.12, 0.04);
  root.add(gun);

  // 枪口火花
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffcc66,
      transparent: true,
      opacity: 0,
    })
  );
  flash.position.set(0.22, -0.26, -1.15);
  root.add(flash);

  const state = {
    recoil: 0,
    bob: 0,
    flashTimer: 0,
  };

  return {
    root,
    gun,
    flash,
    state,
    setVisible(v) {
      root.visible = v;
    },
    kick() {
      state.recoil = 1;
      state.flashTimer = 0.05;
      flash.material.opacity = 0.9;
      flash.scale.setScalar(1.2 + Math.random() * 0.6);
    },
    update(dt, moving, reloading, opts = {}) {
      state.recoil = Math.max(0, state.recoil - dt * 8);
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) flash.material.opacity = 0;
      }
      if (moving) state.bob += dt * (opts.crouching ? 7 : 10);
      else state.bob += dt * 2;

      const aiming = !!opts.aiming;
      const bobMul = aiming ? 0.25 : 1;
      const bobY = Math.sin(state.bob) * (moving ? 0.012 : 0.004) * bobMul;
      const bobX = Math.cos(state.bob * 0.5) * (moving ? 0.008 : 0.002) * bobMul;
      const kickZ = state.recoil * (aiming ? 0.05 : 0.085);
      const kickX = state.recoil * (aiming ? 0.07 : 0.13);
      const reloadDrop = reloading ? 0.15 : 0;
      // 开镜：枪械靠中、略前伸
      const baseX = aiming ? 0.02 : 0.22;
      const baseY = aiming ? -0.18 : -0.28;
      const baseZ = aiming ? -0.42 : -0.55;

      gun.position.set(baseX + bobX, baseY + bobY - reloadDrop, baseZ + kickZ);
      gun.rotation.set(0.04 + kickX, aiming ? 0.02 : 0.12, 0.04 + state.recoil * 0.03);
    },
  };
}

/** 手枪备用（迷你大逃杀开局若需要） */
export function createPistolViewModel() {
  const root = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: 0x222522,
    roughness: 0.4,
    metalness: 0.8,
  });
  const grip = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
  });
  const gun = new THREE.Group();
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.22), metal);
  gun.add(slide);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.16);
  gun.add(barrel);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.06), grip);
  handle.position.set(0, -0.08, 0.04);
  handle.rotation.x = 0.25;
  gun.add(handle);
  gun.position.set(0.2, -0.22, -0.4);
  root.add(gun);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe088, transparent: true, opacity: 0 })
  );
  flash.position.set(0.2, -0.2, -0.62);
  root.add(flash);
  const state = { recoil: 0, bob: 0, flashTimer: 0 };
  return {
    root,
    gun,
    flash,
    state,
    setVisible(v) {
      root.visible = v;
    },
    kick() {
      state.recoil = 1;
      state.flashTimer = 0.04;
      flash.material.opacity = 0.85;
    },
    update(dt, moving, reloading, opts = {}) {
      state.recoil = Math.max(0, state.recoil - dt * 10);
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) flash.material.opacity = 0;
      }
      if (moving) state.bob += dt * 10;
      const aiming = !!opts.aiming;
      const bobY = Math.sin(state.bob) * (moving ? 0.01 : 0.003) * (aiming ? 0.3 : 1);
      const x = aiming ? 0.02 : 0.2;
      const y = aiming ? -0.14 : -0.22;
      const z = aiming ? -0.32 : -0.4;
      gun.position.set(x, y + bobY - (reloading ? 0.12 : 0), z + state.recoil * 0.07);
      gun.rotation.set(state.recoil * 0.16, aiming ? 0.01 : 0.05, 0);
    },
  };
}

/** M4：黑色聚合物机匣，比 AK 更短更利落 */
export function createM4ViewModel() {
  const root = new THREE.Group();
  root.name = "m4View";
  const polymer = new THREE.MeshStandardMaterial({
    color: 0x2a2e2c,
    roughness: 0.55,
    metalness: 0.35,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x121412,
    roughness: 0.4,
    metalness: 0.85,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x3d4540,
    roughness: 0.5,
    metalness: 0.45,
  });

  const gun = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.34), polymer);
  gun.add(receiver);
  const carry = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.22), accent);
  carry.position.set(0, 0.055, -0.02);
  gun.add(carry);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.3, 10), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.3);
  gun.add(barrel);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.18), polymer);
  handguard.position.set(0, -0.01, -0.18);
  gun.add(handguard);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.055), dark);
  mag.position.set(0, -0.11, 0.02);
  gun.add(mag);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.16), polymer);
  stock.position.set(0, 0.0, 0.22);
  gun.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), dark);
  grip.position.set(0, -0.08, 0.08);
  grip.rotation.x = 0.22;
  gun.add(grip);
  gun.position.set(0.2, -0.26, -0.5);
  root.add(gun);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe088, transparent: true, opacity: 0 })
  );
  flash.position.set(0.2, -0.24, -0.78);
  root.add(flash);

  const state = { recoil: 0, bob: 0, flashTimer: 0 };
  return {
    root,
    gun,
    flash,
    state,
    setVisible(v) {
      root.visible = v;
    },
    kick() {
      state.recoil = 0.85;
      state.flashTimer = 0.03;
      flash.material.opacity = 0.8;
    },
    update(dt, moving, reloading, opts = {}) {
      state.recoil = Math.max(0, state.recoil - dt * 10);
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) flash.material.opacity = 0;
      }
      if (moving) state.bob += dt * 10;
      const aiming = !!opts.aiming;
      const bobY = Math.sin(state.bob) * (moving ? 0.01 : 0.003) * (aiming ? 0.25 : 1);
      const x = aiming ? 0.02 : 0.2;
      const y = aiming ? -0.17 : -0.26;
      const z = aiming ? -0.38 : -0.5;
      gun.position.set(x, y + bobY - (reloading ? 0.12 : 0), z + state.recoil * 0.055);
      gun.rotation.set(0.03 + state.recoil * 0.1, aiming ? 0.01 : 0.08, 0.02);
    },
  };
}

/** 霰弹枪：粗管 + 泵动护木 */
export function createShotgunViewModel() {
  const root = new THREE.Group();
  root.name = "shotgunView";
  const wood = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.85,
    metalness: 0.05,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x2a2e28,
    roughness: 0.45,
    metalness: 0.75,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1c18,
    roughness: 0.4,
    metalness: 0.85,
  });

  const gun = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.28), metal);
  gun.add(receiver);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 10), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.32);
  gun.add(barrel);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 8), metal);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, -0.025, -0.22);
  gun.add(tube);
  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.14), wood);
  pump.position.set(0, -0.02, -0.14);
  gun.add(pump);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), wood);
  stock.position.set(0, -0.01, 0.2);
  gun.add(stock);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.055), wood);
  grip.position.set(0, -0.08, 0.06);
  grip.rotation.x = 0.2;
  gun.add(grip);
  gun.position.set(0.18, -0.28, -0.48);
  root.add(gun);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0 })
  );
  flash.position.set(0.18, -0.26, -0.78);
  root.add(flash);

  const state = { recoil: 0, bob: 0, flashTimer: 0 };
  return {
    root,
    gun,
    flash,
    state,
    setVisible(v) {
      root.visible = v;
    },
    kick() {
      state.recoil = 1.35;
      state.flashTimer = 0.05;
      flash.material.opacity = 0.95;
    },
    update(dt, moving, reloading, opts = {}) {
      state.recoil = Math.max(0, state.recoil - dt * 7);
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) flash.material.opacity = 0;
      }
      if (moving) state.bob += dt * 8;
      const aiming = !!opts.aiming;
      const bobY = Math.sin(state.bob) * (moving ? 0.012 : 0.004) * (aiming ? 0.3 : 1);
      const x = aiming ? 0.02 : 0.18;
      const y = aiming ? -0.18 : -0.28;
      const z = aiming ? -0.36 : -0.48;
      gun.position.set(x, y + bobY - (reloading ? 0.14 : 0), z + state.recoil * 0.1);
      gun.rotation.set(0.05 + state.recoil * 0.18, aiming ? 0.02 : 0.1, 0.03);
    },
  };
}

/** 栓狙：长枪管 + 瞄准镜筒 */
export function createSniperViewModel() {
  const root = new THREE.Group();
  root.name = "sniperView";
  const polymer = new THREE.MeshStandardMaterial({
    color: 0x3a4038,
    roughness: 0.7,
    metalness: 0.2,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x151815,
    roughness: 0.4,
    metalness: 0.85,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x88aacc,
    roughness: 0.2,
    metalness: 0.6,
    transparent: true,
    opacity: 0.65,
  });

  const gun = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.32), polymer);
  gun.add(receiver);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.55, 10), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.015, -0.4);
  gun.add(barrel);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 10), dark);
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.08, 0.0);
  gun.add(scope);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10), glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.08, -0.09);
  gun.add(lens);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.05), dark);
  mag.position.set(0, -0.09, 0.02);
  gun.add(mag);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.22), polymer);
  stock.position.set(0, -0.01, 0.24);
  gun.add(stock);
  const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), dark);
  bipod.position.set(0, -0.05, -0.28);
  gun.add(bipod);
  gun.position.set(0.2, -0.27, -0.52);
  root.add(gun);

  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe8a0, transparent: true, opacity: 0 })
  );
  flash.position.set(0.2, -0.25, -0.88);
  root.add(flash);

  const state = { recoil: 0, bob: 0, flashTimer: 0 };
  return {
    root,
    gun,
    flash,
    state,
    setVisible(v) {
      root.visible = v;
    },
    kick() {
      state.recoil = 1.5;
      state.flashTimer = 0.045;
      flash.material.opacity = 0.9;
    },
    update(dt, moving, reloading, opts = {}) {
      state.recoil = Math.max(0, state.recoil - dt * 6);
      if (state.flashTimer > 0) {
        state.flashTimer -= dt;
        if (state.flashTimer <= 0) flash.material.opacity = 0;
      }
      if (moving) state.bob += dt * 7;
      const aiming = !!opts.aiming;
      const bobY = Math.sin(state.bob) * (moving ? 0.01 : 0.003) * (aiming ? 0.15 : 1);
      // 开镜时枪身几乎居中并前伸，露出镜筒感
      const x = aiming ? 0.01 : 0.2;
      const y = aiming ? -0.14 : -0.27;
      const z = aiming ? -0.34 : -0.52;
      gun.position.set(x, y + bobY - (reloading ? 0.16 : 0), z + state.recoil * 0.11);
      gun.rotation.set(0.02 + state.recoil * 0.2, aiming ? 0.005 : 0.09, 0.015);
    },
  };
}

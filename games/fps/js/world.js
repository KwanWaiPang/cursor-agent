import * as THREE from "three";

/** 轴对齐碰撞盒 */
export class BoxCollider {
  constructor(min, max) {
    this.min = min.clone();
    this.max = max.clone();
  }

  containsPoint(p, radius = 0) {
    return (
      p.x >= this.min.x - radius &&
      p.x <= this.max.x + radius &&
      p.z >= this.min.z - radius &&
      p.z <= this.max.z + radius &&
      p.y >= this.min.y - radius &&
      p.y <= this.max.y + radius
    );
  }

  /** 将点推出 XZ 平面碰撞（忽略顶面） */
  resolveXZ(pos, radius) {
    const expandedMinX = this.min.x - radius;
    const expandedMaxX = this.max.x + radius;
    const expandedMinZ = this.min.z - radius;
    const expandedMaxZ = this.max.z + radius;

    if (
      pos.x <= expandedMinX ||
      pos.x >= expandedMaxX ||
      pos.z <= expandedMinZ ||
      pos.z >= expandedMaxZ
    ) {
      return false;
    }

    // 头顶之下才挡
    if (pos.y > this.max.y + 0.2) return false;

    const dxMin = Math.abs(pos.x - expandedMinX);
    const dxMax = Math.abs(expandedMaxX - pos.x);
    const dzMin = Math.abs(pos.z - expandedMinZ);
    const dzMax = Math.abs(expandedMaxZ - pos.z);
    const m = Math.min(dxMin, dxMax, dzMin, dzMax);
    if (m === dxMin) pos.x = expandedMinX;
    else if (m === dxMax) pos.x = expandedMaxX;
    else if (m === dzMin) pos.z = expandedMinZ;
    else pos.z = expandedMaxZ;
    return true;
  }
}

function makeMat(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.05,
  });
}

function addBox(scene, colliders, meshes, opts) {
  const {
    w,
    h,
    d,
    x,
    y,
    z,
    color = 0x6e6a5e,
    collidable = true,
  } = opts;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, makeMat(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  meshes.push(mesh);
  if (collidable) {
    colliders.push(
      new BoxCollider(
        new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
      )
    );
  }
  return mesh;
}

export function createWorld(scene, size = 90) {
  const colliders = [];
  const meshes = [];
  const half = size / 2;

  // 地面（更亮的沙土色，便于辨认敌人）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size, 1, 1),
    makeMat(0xc2b089, 1)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  meshes.push(ground);

  // 更亮的天空与更淡的雾
  scene.fog = new THREE.Fog(0xd7e6f0, 45, 140);
  scene.background = new THREE.Color(0xc8d9e8);

  const hemi = new THREE.HemisphereLight(0xf2f6ff, 0xb8a888, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.45);
  sun.position.set(40, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  // 边界墙
  const wallH = 4;
  const wallT = 1.2;
  const wallColor = 0x8a8678;
  addBox(scene, colliders, meshes, {
    w: size + 2,
    h: wallH,
    d: wallT,
    x: 0,
    y: wallH / 2,
    z: -half,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: size + 2,
    h: wallH,
    d: wallT,
    x: 0,
    y: wallH / 2,
    z: half,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: size + 2,
    x: -half,
    y: wallH / 2,
    z: 0,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: size + 2,
    x: half,
    y: wallH / 2,
    z: 0,
    color: wallColor,
  });

  // 建筑与掩体（军事基地感）
  const buildings = [
    { w: 14, h: 6, d: 10, x: -22, y: 3, z: -18, color: 0xb0aea2 },
    { w: 12, h: 5, d: 12, x: 24, y: 2.5, z: -16, color: 0xa8a496 },
    { w: 16, h: 7, d: 9, x: 18, y: 3.5, z: 20, color: 0xb5b29f },
    { w: 10, h: 4.5, d: 14, x: -26, y: 2.25, z: 16, color: 0x9e9b8e },
    { w: 8, h: 3.5, d: 8, x: 0, y: 1.75, z: -28, color: 0xa3aa90 },
    { w: 9, h: 4, d: 7, x: -8, y: 2, z: 28, color: 0xada99a },
  ];
  for (const b of buildings) addBox(scene, colliders, meshes, b);

  // 沙袋 / 集装箱掩体（稍提亮）
  const covers = [
    { w: 3.5, h: 1.2, d: 1.2, x: -6, y: 0.6, z: -4, color: 0xc4a86a },
    { w: 3.5, h: 1.2, d: 1.2, x: 6, y: 0.6, z: 5, color: 0xc4a86a },
    { w: 1.4, h: 2.2, d: 4.5, x: 10, y: 1.1, z: -2, color: 0x6a8a55 },
    { w: 4.5, h: 2.2, d: 1.4, x: -12, y: 1.1, z: 8, color: 0x6a8a55 },
    { w: 2.2, h: 1.6, d: 2.2, x: 4, y: 0.8, z: 14, color: 0x7a8f5a },
    { w: 2.2, h: 1.6, d: 2.2, x: -16, y: 0.8, z: -8, color: 0x7a8f5a },
    { w: 5, h: 1.1, d: 1.1, x: 0, y: 0.55, z: 10, color: 0xc4a86a },
    { w: 1.1, h: 1.1, d: 5, x: -3, y: 0.55, z: -12, color: 0xc4a86a },
  ];
  for (const c of covers) addBox(scene, colliders, meshes, c);

  // 中央据点标记（无碰撞视觉环）
  const zoneRing = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 6.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0xb7d59a,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
  );
  zoneRing.rotation.x = -Math.PI / 2;
  zoneRing.position.y = 0.05;
  scene.add(zoneRing);
  meshes.push(zoneRing);

  const zoneFill = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0x5a6b3a,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    })
  );
  zoneFill.rotation.x = -Math.PI / 2;
  zoneFill.position.y = 0.04;
  scene.add(zoneFill);
  meshes.push(zoneFill);

  return {
    size,
    half,
    colliders,
    meshes,
    zoneCenter: new THREE.Vector3(0, 0, 0),
    zoneRadius: 5.5,
    spawnPoints: [
      new THREE.Vector3(0, 0, 18),
      new THREE.Vector3(-20, 0, 0),
      new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(0, 0, -20),
      new THREE.Vector3(-15, 0, -15),
      new THREE.Vector3(15, 0, 15),
      new THREE.Vector3(-15, 0, 15),
      new THREE.Vector3(15, 0, -15),
      new THREE.Vector3(30, 0, 5),
      new THREE.Vector3(-30, 0, -5),
    ],
    resolvePosition(pos, radius = 0.45) {
      // 边界
      const lim = half - 1.2;
      pos.x = THREE.MathUtils.clamp(pos.x, -lim, lim);
      pos.z = THREE.MathUtils.clamp(pos.z, -lim, lim);
      for (const c of colliders) c.resolveXZ(pos, radius);
    },
  };
}

export function createSafeZoneVisual(scene) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(19.5, 20.5, 64),
    new THREE.MeshBasicMaterial({
      color: 0x7ec8e3,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  scene.add(ring);

  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(20, 64),
    new THREE.MeshBasicMaterial({
      color: 0x3a6a7a,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
    })
  );
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = 0.06;
  scene.add(fill);

  return {
    ring,
    fill,
    setRadius(r) {
      ring.geometry.dispose();
      fill.geometry.dispose();
      ring.geometry = new THREE.RingGeometry(Math.max(0.2, r - 0.6), r + 0.2, 64);
      fill.geometry = new THREE.CircleGeometry(Math.max(0.2, r), 64);
    },
    setCenter(x, z) {
      ring.position.x = x;
      ring.position.z = z;
      fill.position.x = x;
      fill.position.z = z;
    },
  };
}

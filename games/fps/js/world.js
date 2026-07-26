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

function makeMat(color, roughness = 0.9, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
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
    roughness = 0.9,
    metalness = 0.05,
    mat = null,
  } = opts;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat || makeMat(color, roughness, metalness));
  mesh.position.set(x, y, z);
  mesh.castShadow = collidable;
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

/** 沿 X 的墙：可居中开门 */
function wallX(ctx, cx, cz, length, height, thick, doorW, doorH, color) {
  const { scene, colliders, meshes } = ctx;
  const y = height / 2;
  if (!doorW) {
    addBox(scene, colliders, meshes, { w: length, h: height, d: thick, x: cx, y, z: cz, color });
    return;
  }
  const side = (length - doorW) / 2;
  if (side > 0.15) {
    addBox(scene, colliders, meshes, {
      w: side,
      h: height,
      d: thick,
      x: cx - doorW / 2 - side / 2,
      y,
      z: cz,
      color,
    });
    addBox(scene, colliders, meshes, {
      w: side,
      h: height,
      d: thick,
      x: cx + doorW / 2 + side / 2,
      y,
      z: cz,
      color,
    });
  }
  if (doorH < height - 0.1) {
    const lh = height - doorH;
    // 门楣仅视觉：碰撞盒为整段 AABB，会挡住门洞通行
    addBox(scene, colliders, meshes, {
      w: doorW + 0.15,
      h: lh,
      d: thick,
      x: cx,
      y: doorH + lh / 2,
      z: cz,
      color,
      collidable: false,
    });
  }
  // 门框装饰
  addBox(scene, colliders, meshes, {
    w: 0.22,
    h: Math.min(doorH, height),
    d: thick + 0.12,
    x: cx - doorW / 2,
    y: Math.min(doorH, height) / 2,
    z: cz,
    color: 0x3d4650,
    collidable: false,
  });
  addBox(scene, colliders, meshes, {
    w: 0.22,
    h: Math.min(doorH, height),
    d: thick + 0.12,
    x: cx + doorW / 2,
    y: Math.min(doorH, height) / 2,
    z: cz,
    color: 0x3d4650,
    collidable: false,
  });
}

/** 沿 Z 的墙：可居中开门 */
function wallZ(ctx, cx, cz, length, height, thick, doorW, doorH, color) {
  const { scene, colliders, meshes } = ctx;
  const y = height / 2;
  if (!doorW) {
    addBox(scene, colliders, meshes, { w: thick, h: height, d: length, x: cx, y, z: cz, color });
    return;
  }
  const side = (length - doorW) / 2;
  if (side > 0.15) {
    addBox(scene, colliders, meshes, {
      w: thick,
      h: height,
      d: side,
      x: cx,
      y,
      z: cz - doorW / 2 - side / 2,
      color,
    });
    addBox(scene, colliders, meshes, {
      w: thick,
      h: height,
      d: side,
      x: cx,
      y,
      z: cz + doorW / 2 + side / 2,
      color,
    });
  }
  if (doorH < height - 0.1) {
    const lh = height - doorH;
    addBox(scene, colliders, meshes, {
      w: thick,
      h: lh,
      d: doorW + 0.15,
      x: cx,
      y: doorH + lh / 2,
      z: cz,
      color,
      collidable: false,
    });
  }
  addBox(scene, colliders, meshes, {
    w: thick + 0.12,
    h: Math.min(doorH, height),
    d: 0.22,
    x: cx,
    y: Math.min(doorH, height) / 2,
    z: cz - doorW / 2,
    color: 0x3d4650,
    collidable: false,
  });
  addBox(scene, colliders, meshes, {
    w: thick + 0.12,
    h: Math.min(doorH, height),
    d: 0.22,
    x: cx,
    y: Math.min(doorH, height) / 2,
    z: cz + doorW / 2,
    color: 0x3d4650,
    collidable: false,
  });
}

function addRoof(ctx, x, z, w, d, y, color = 0x4a5560) {
  addBox(ctx.scene, ctx.colliders, ctx.meshes, {
    w: w + 0.5,
    h: 0.4,
    d: d + 0.5,
    x,
    y,
    z,
    color,
    collidable: false,
    roughness: 0.75,
    metalness: 0.25,
  });
}

function addWindowsOnX(ctx, cx, cz, wallLen, wallH, count, outward = 1) {
  const glass = makeMat(0x6a8aaa, 0.15, 0.45);
  glass.transparent = true;
  glass.opacity = 0.55;
  const spacing = wallLen / (count + 1);
  for (let i = 1; i <= count; i++) {
    const x = cx - wallLen / 2 + spacing * i;
    const z = cz + outward * 0.08;
    addBox(ctx.scene, ctx.colliders, ctx.meshes, {
      w: 1.35,
      h: 1.45,
      d: 0.1,
      x,
      y: wallH * 0.55,
      z,
      mat: glass,
      collidable: false,
    });
    addBox(ctx.scene, ctx.colliders, ctx.meshes, {
      w: 1.5,
      h: 0.1,
      d: 0.16,
      x,
      y: wallH * 0.55 + 0.78,
      z,
      color: 0x3d4650,
      collidable: false,
    });
  }
}

function addWindowsOnZ(ctx, cx, cz, wallLen, wallH, count, outward = 1) {
  const glass = makeMat(0x6a8aaa, 0.15, 0.45);
  glass.transparent = true;
  glass.opacity = 0.55;
  const spacing = wallLen / (count + 1);
  for (let i = 1; i <= count; i++) {
    const z = cz - wallLen / 2 + spacing * i;
    const x = cx + outward * 0.08;
    addBox(ctx.scene, ctx.colliders, ctx.meshes, {
      w: 0.1,
      h: 1.45,
      d: 1.35,
      x,
      y: wallH * 0.55,
      z,
      mat: glass,
      collidable: false,
    });
  }
}

/** 矩形建筑：四面墙，指定哪面开门 */
function rectBuilding(ctx, opts) {
  const {
    x,
    z,
    w,
    d,
    h,
    t = 0.7,
    color = 0xb0aea2,
    roofColor = 0x4a5560,
    door = "s", // n s e w
    doorW = 2.8,
    doorH = 3.1,
    windows = true,
    floorColor = 0x8a8678,
  } = opts;
  const halfW = w / 2;
  const halfD = d / 2;

  wallX(ctx, x, z - halfD, w, h, t, door === "n" ? doorW : 0, doorH, color);
  wallX(ctx, x, z + halfD, w, h, t, door === "s" ? doorW : 0, doorH, color);
  wallZ(ctx, x - halfW, z, d, h, t, door === "w" ? doorW : 0, doorH, color);
  wallZ(ctx, x + halfW, z, d, h, t, door === "e" ? doorW : 0, doorH, color);

  addRoof(ctx, x, z, w, d, h + 0.15, roofColor);
  addBox(ctx.scene, ctx.colliders, ctx.meshes, {
    w: w - t * 2,
    h: 0.08,
    d: d - t * 2,
    x,
    y: 0.04,
    z,
    color: floorColor,
    collidable: false,
  });

  if (windows) {
    if (door !== "s") addWindowsOnX(ctx, x, z + halfD, w * 0.85, h, Math.max(2, Math.floor(w / 4)), 1);
    if (door !== "n") addWindowsOnX(ctx, x, z - halfD, w * 0.85, h, Math.max(2, Math.floor(w / 4)), -1);
    if (door !== "e") addWindowsOnZ(ctx, x + halfW, z, d * 0.85, h, Math.max(1, Math.floor(d / 4)), 1);
    if (door !== "w") addWindowsOnZ(ctx, x - halfW, z, d * 0.85, h, Math.max(1, Math.floor(d / 4)), -1);
  }
}

export function createWorld(scene, size = 90) {
  const colliders = [];
  const meshes = [];
  const half = size / 2;
  const ctx = { scene, colliders, meshes };

  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 8, size + 8, 1, 1),
    makeMat(0x6e7568, 1)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  meshes.push(ground);

  // 主干道（十字沥青）
  const roadMat = makeMat(0x3a3e44, 0.95, 0.05);
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(12, size - 6), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.y = 0.03;
  scene.add(roadNS);
  meshes.push(roadNS);
  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(size - 6, 12), roadMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.y = 0.035;
  scene.add(roadEW);
  meshes.push(roadEW);

  // 道牙线
  for (let i = -half + 8; i <= half - 8; i += 4) {
    if (Math.abs(i) < 14) continue;
    addBox(scene, colliders, meshes, {
      w: 0.35,
      h: 0.04,
      d: 1.5,
      x: 0,
      y: 0.06,
      z: i,
      color: 0xd8d0b8,
      collidable: false,
    });
    addBox(scene, colliders, meshes, {
      w: 1.5,
      h: 0.04,
      d: 0.35,
      x: i,
      y: 0.06,
      z: 0,
      color: 0xd8d0b8,
      collidable: false,
    });
  }

  scene.fog = new THREE.Fog(0xd0e0ec, 50, 145);
  scene.background = new THREE.Color(0xb8cde0);

  const hemi = new THREE.HemisphereLight(0xf2f6ff, 0xb8a888, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.35);
  sun.position.set(40, 70, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 180;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  scene.add(sun);

  // 边界墙（四面开口）
  const wallH = 5.5;
  const wallT = 1.2;
  const wallColor = 0x8a8678;
  const gate = 9;
  const seg = half - gate / 2;
  // 北
  addBox(scene, colliders, meshes, {
    w: seg,
    h: wallH,
    d: wallT,
    x: -half / 2 - gate / 4,
    y: wallH / 2,
    z: -half,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: seg,
    h: wallH,
    d: wallT,
    x: half / 2 + gate / 4,
    y: wallH / 2,
    z: -half,
    color: wallColor,
  });
  // 南
  addBox(scene, colliders, meshes, {
    w: seg,
    h: wallH,
    d: wallT,
    x: -half / 2 - gate / 4,
    y: wallH / 2,
    z: half,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: seg,
    h: wallH,
    d: wallT,
    x: half / 2 + gate / 4,
    y: wallH / 2,
    z: half,
    color: wallColor,
  });
  // 西
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: seg,
    x: -half,
    y: wallH / 2,
    z: -half / 2 - gate / 4,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: seg,
    x: -half,
    y: wallH / 2,
    z: half / 2 + gate / 4,
    color: wallColor,
  });
  // 东
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: seg,
    x: half,
    y: wallH / 2,
    z: -half / 2 - gate / 4,
    color: wallColor,
  });
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: seg,
    x: half,
    y: wallH / 2,
    z: half / 2 + gate / 4,
    color: wallColor,
  });
  // 门柱
  for (const [x, z] of [
    [-gate / 2, -half],
    [gate / 2, -half],
    [-gate / 2, half],
    [gate / 2, half],
    [-half, -gate / 2],
    [-half, gate / 2],
    [half, -gate / 2],
    [half, gate / 2],
  ]) {
    addBox(scene, colliders, meshes, {
      w: 1.5,
      h: wallH + 1.4,
      d: 1.5,
      x,
      y: (wallH + 1.4) / 2,
      z,
      color: 0x3d4650,
    });
  }

  // —— 西北：办公楼 + 侧翼（可进入） ——
  rectBuilding(ctx, {
    x: -26,
    z: -24,
    w: 16,
    d: 12,
    h: 8.5,
    color: 0xc9c2b4,
    roofColor: 0x4a5560,
    door: "s",
    doorW: 3.0,
    doorH: 3.2,
    floorColor: 0xa8a090,
  });
  // 侧翼
  rectBuilding(ctx, {
    x: -14,
    z: -28,
    w: 10,
    d: 8,
    h: 7,
    color: 0x8a5a42,
    roofColor: 0x6b3a32,
    door: "e",
    doorW: 2.6,
    doorH: 3.0,
    floorColor: 0x7a6a58,
  });
  // 屋顶设备
  addBox(scene, colliders, meshes, {
    w: 2.2,
    h: 1.1,
    d: 1.4,
    x: -28,
    y: 9.2,
    z: -26,
    color: 0x5a6570,
    collidable: false,
    metalness: 0.5,
  });
  addBox(scene, colliders, meshes, {
    w: 4,
    h: 0.35,
    d: 1.6,
    x: -26,
    y: 0.18,
    z: -17.2,
    color: 0x9a9688,
    collidable: false,
  });

  // —— 东北：大型仓库（货仓大门） ——
  rectBuilding(ctx, {
    x: 26,
    z: -22,
    w: 18,
    d: 14,
    h: 10,
    t: 0.85,
    color: 0x5a6570,
    roofColor: 0x3a424a,
    door: "s",
    doorW: 6.2,
    doorH: 5.2,
    windows: false,
    floorColor: 0x6a6860,
  });
  // 高窗条
  for (let i = -2; i <= 2; i++) {
    addBox(scene, colliders, meshes, {
      w: 2.0,
      h: 1.1,
      d: 0.12,
      x: 26 + i * 3.2,
      y: 7.2,
      z: -22 + 7.1,
      color: 0x6a8aaa,
      collidable: false,
      roughness: 0.2,
      metalness: 0.4,
    });
  }
  // 装卸月台
  addBox(scene, colliders, meshes, {
    w: 10,
    h: 1.0,
    d: 3.2,
    x: 26,
    y: 0.5,
    z: -22 + 7 + 2.2,
    color: 0x9a9688,
  });
  // 附棚
  rectBuilding(ctx, {
    x: 12,
    z: -26,
    w: 8,
    d: 7,
    h: 5,
    color: 0x6e4634,
    roofColor: 0x6b3a32,
    door: "s",
    doorW: 2.4,
    doorH: 2.8,
  });

  // —— 西南：营房排屋 ——
  rectBuilding(ctx, {
    x: -24,
    z: 24,
    w: 20,
    d: 9,
    h: 6.2,
    color: 0x4a6a58,
    roofColor: 0x6b3a32,
    door: "n",
    doorW: 2.6,
    doorH: 2.9,
    floorColor: 0x6b5344,
  });
  // 第二道门视觉：西侧再开一扇（在北墙补一段开口旁的柱廊）
  for (let i = -3; i <= 3; i++) {
    addBox(scene, colliders, meshes, {
      w: 0.32,
      h: 3.0,
      d: 0.32,
      x: -24 + i * 2.6,
      y: 1.5,
      z: 24 - 4.5 - 1.1,
      color: 0x6b5344,
      collidable: false,
    });
  }
  addBox(scene, colliders, meshes, {
    w: 18,
    h: 0.18,
    d: 2.0,
    x: -24,
    y: 3.15,
    z: 24 - 4.5 - 1.1,
    color: 0x6b5344,
    collidable: false,
  });

  // —— 东南：车库工坊（北侧大开口） ——
  {
    const x = 26;
    const z = 24;
    const w = 15;
    const d = 12;
    const h = 7;
    const t = 0.7;
    const color = 0xb0aea2;
    // 南、西、东满墙；北墙两侧留开口
    wallX(ctx, x, z + d / 2, w, h, t, 0, 0, color);
    wallZ(ctx, x - w / 2, z, d, h, t, 0, 0, color);
    wallZ(ctx, x + w / 2, z, d, h, t, 0, 0, color);
    addBox(scene, colliders, meshes, {
      w: 3.2,
      h,
      d: t,
      x: x - 5.2,
      y: h / 2,
      z: z - d / 2,
      color,
    });
    addBox(scene, colliders, meshes, {
      w: 3.2,
      h,
      d: t,
      x: x + 5.2,
      y: h / 2,
      z: z - d / 2,
      color,
    });
    addBox(scene, colliders, meshes, {
      w: 8.5,
      h: 1.3,
      d: t,
      x,
      y: h - 0.65,
      z: z - d / 2,
      color,
      collidable: false,
    });
    addRoof(ctx, x, z, w, d, h + 0.15, 0x4a5560);
    addBox(scene, colliders, meshes, {
      w: w - 1,
      h: 0.06,
      d: d - 1,
      x,
      y: 0.04,
      z,
      color: 0x3a3e44,
      collidable: false,
    });
  }
  // 旁附办公室
  rectBuilding(ctx, {
    x: 14,
    z: 26,
    w: 7,
    d: 8,
    h: 5.5,
    color: 0xc9c2b4,
    door: "w",
    doorW: 2.2,
    doorH: 2.8,
  });

  // —— 北侧碉堡 ——
  rectBuilding(ctx, {
    x: 0,
    z: -34,
    w: 10,
    d: 8,
    h: 5,
    t: 0.9,
    color: 0x9a9688,
    roofColor: 0x8a8678,
    door: "s",
    doorW: 2.4,
    doorH: 2.6,
    windows: false,
  });
  addBox(scene, colliders, meshes, {
    w: 10.5,
    h: 1.0,
    d: 0.45,
    x: 0,
    y: 5.6,
    z: -34 - 4,
    color: 0x9a9688,
    collidable: false,
  });
  addBox(scene, colliders, meshes, {
    w: 10.5,
    h: 1.0,
    d: 0.45,
    x: 0,
    y: 5.6,
    z: -34 + 4,
    color: 0x9a9688,
    collidable: false,
  });

  // —— 西侧岗楼（实心底座 + 门廊） ——
  addBox(scene, colliders, meshes, {
    w: 5,
    h: 11,
    d: 5,
    x: -36,
    y: 5.5,
    z: 2,
    color: 0x8a5a42,
  });
  addBox(scene, colliders, meshes, {
    w: 6.4,
    h: 0.45,
    d: 6.4,
    x: -36,
    y: 11.3,
    z: 2,
    color: 0x4a5560,
    collidable: false,
  });
  for (const [dx, dz] of [
    [0, 2.6],
    [0, -2.6],
    [2.6, 0],
    [-2.6, 0],
  ]) {
    addBox(scene, colliders, meshes, {
      w: dx === 0 ? 1.6 : 0.15,
      h: 1.1,
      d: dz === 0 ? 1.6 : 0.15,
      x: -36 + dx,
      y: 8.5,
      z: 2 + dz,
      color: 0x6a8aaa,
      collidable: false,
      roughness: 0.2,
      metalness: 0.4,
    });
  }

  // —— 东侧残垣小铺 ——
  wallX(ctx, 36, 6 - 3.5, 9, 6, 0.65, 0, 0, 0x8a5a42);
  addBox(scene, colliders, meshes, {
    w: 3.0,
    h: 6,
    d: 0.65,
    x: 36 - 2.5,
    y: 3,
    z: 6 + 3.5,
    color: 0x8a5a42,
  });
  addBox(scene, colliders, meshes, {
    w: 2.2,
    h: 3.2,
    d: 0.65,
    x: 36 + 2.8,
    y: 1.6,
    z: 6 + 3.5,
    color: 0x6e4634,
  });
  wallZ(ctx, 36 - 4.5, 6, 7, 6, 0.65, 0, 0, 0x8a5a42);
  addBox(scene, colliders, meshes, {
    w: 0.65,
    h: 3.8,
    d: 4.2,
    x: 36 + 4.5,
    y: 1.9,
    z: 6,
    color: 0x6e4634,
  });
  addBox(scene, colliders, meshes, {
    w: 10,
    h: 0.35,
    d: 8,
    x: 36,
    y: 6.2,
    z: 6,
    color: 0x6b3a32,
    collidable: false,
  });
  addBox(scene, colliders, meshes, {
    w: 1.4,
    h: 1.4,
    d: 1.4,
    x: 37,
    y: 0.7,
    z: 7,
    color: 0x9a9688,
    collidable: false,
  });

  // —— 中央据点环（低掩体，可绕行） ——
  const zoneRadius = 5.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.25;
    const r = 7.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // 轴对齐混凝土墩
    const alongX = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
    addBox(scene, colliders, meshes, {
      w: alongX ? 0.7 : 2.8,
      h: 1.25,
      d: alongX ? 2.8 : 0.7,
      x,
      y: 0.62,
      z,
      color: 0x9a9688,
    });
  }

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

  // —— 街道掩体 ——
  const covers = [
    { w: 3.5, h: 1.15, d: 1.15, x: -8, y: 0.58, z: -10, color: 0xc4a86a },
    { w: 3.5, h: 1.15, d: 1.15, x: -5, y: 0.58, z: -10, color: 0xc4a86a },
    { w: 3.5, h: 1.15, d: 1.15, x: 8, y: 0.58, z: 9, color: 0xc4a86a },
    { w: 3.5, h: 1.15, d: 1.15, x: 11, y: 0.58, z: 9, color: 0xc4a86a },
    { w: 1.2, h: 1.15, d: 4.2, x: -10, y: 0.58, z: 12, color: 0xc4a86a },
    { w: 6.0, h: 2.5, d: 2.4, x: -18, y: 1.25, z: -6, color: 0x3d6a8a },
    { w: 6.0, h: 2.5, d: 2.4, x: -18, y: 1.25, z: -3.3, color: 0x8a5a2a },
    { w: 2.4, h: 2.5, d: 6.0, x: 16, y: 1.25, z: 6, color: 0x2f6b4a },
    { w: 6.0, h: 2.5, d: 2.4, x: 18, y: 1.25, z: -8, color: 0x7a3a3a },
    { w: 2.4, h: 1.1, d: 0.55, x: -7, y: 0.55, z: 8, color: 0x9a9688 },
    { w: 2.4, h: 1.1, d: 0.55, x: 9, y: 0.55, z: -11, color: 0x9a9688 },
    { w: 0.55, h: 1.1, d: 2.4, x: 11, y: 0.55, z: -12.5, color: 0x9a9688 },
    { w: 1.1, h: 1.1, d: 1.1, x: -8, y: 0.55, z: 20, color: 0x6b5344 },
    { w: 1.1, h: 1.1, d: 1.1, x: -6.8, y: 0.55, z: 20, color: 0x6b5344 },
    { w: 1.1, h: 1.1, d: 1.1, x: -7.4, y: 1.65, z: 20, color: 0x6b5344 },
    { w: 1.1, h: 1.1, d: 1.1, x: 22, y: 0.55, z: -16, color: 0x6b5344 },
    { w: 1.1, h: 1.1, d: 1.1, x: 23.2, y: 0.55, z: -16, color: 0x6b5344 },
    { w: 1.1, h: 1.1, d: 1.1, x: 22.6, y: 1.65, z: -16, color: 0x6b5344 },
  ];
  for (const c of covers) addBox(scene, colliders, meshes, c);

  // 灯柱（点光）
  for (const [lx, lz] of [
    [-14, -14],
    [14, -14],
    [-14, 14],
    [14, 14],
    [0, -28],
    [0, 28],
  ]) {
    addBox(scene, colliders, meshes, {
      w: 0.22,
      h: 5.2,
      d: 0.22,
      x: lx,
      y: 2.6,
      z: lz,
      color: 0x3d4650,
      collidable: false,
    });
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xffe8b0,
        emissive: 0xaa7744,
        emissiveIntensity: 0.55,
      })
    );
    bulb.position.set(lx, 5.4, lz);
    scene.add(bulb);
    meshes.push(bulb);
    const pl = new THREE.PointLight(0xffcc88, 0.45, 26);
    pl.position.set(lx, 5.2, lz);
    scene.add(pl);
  }

  return {
    size,
    half,
    colliders,
    meshes,
    zoneCenter: new THREE.Vector3(0, 0, 0),
    zoneRadius,
    spawnPoints: [
      new THREE.Vector3(0, 0, 18),
      new THREE.Vector3(-20, 0, 0),
      new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(0, 0, -20),
      new THREE.Vector3(-15, 0, -15),
      new THREE.Vector3(15, 0, 15),
      new THREE.Vector3(-15, 0, 15),
      new THREE.Vector3(15, 0, -15),
      new THREE.Vector3(30, 0, 12),
      new THREE.Vector3(-30, 0, -8),
    ],
    resolvePosition(pos, radius = 0.45) {
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

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
  // 仅实体碰撞物遮挡子弹；玻璃/屋顶/装饰不挡枪
  mesh.userData.blocksShot = !!collidable;
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

/** 外围街区：沿次干道排布可穿行楼块，形成街道枪战空间 */
function populateOuterBlocks(ctx, half) {
  const colors = [0xc9c2b4, 0x8a5a42, 0x5a6570, 0x4a6a58, 0xb0aea2, 0x6e4634];
  const roofs = [0x4a5560, 0x6b3a32, 0x3a424a, 0x5a5048];
  const doors = ["n", "s", "e", "w"];
  let n = 0;
  // 街区中心点（避开中央开阔区与主干道）
  const cells = [];
  for (let gx = -2; gx <= 2; gx++) {
    for (let gz = -2; gz <= 2; gz++) {
      if (gx === 0 && gz === 0) continue;
      const cx = gx * 38;
      const cz = gz * 38;
      if (Math.abs(cx) < 28 && Math.abs(cz) < 28) continue;
      if (Math.abs(cx) > half - 18 || Math.abs(cz) > half - 18) continue;
      cells.push({ cx, cz });
    }
  }
  for (const { cx, cz } of cells) {
    // 每个街区 2 栋楼 + 巷道
    for (let k = 0; k < 2; k++) {
      const ox = cx + (k === 0 ? -8 : 8);
      const oz = cz + (k === 0 ? 6 : -6);
      const w = 10 + (n % 3) * 2;
      const d = 8 + (n % 2) * 2;
      const h = 6 + (n % 4);
      if (Math.abs(ox) + w / 2 > half - 4 || Math.abs(oz) + d / 2 > half - 4) continue;
      // 不要紧贴十字主路中央
      if (Math.abs(ox) < 10 && Math.abs(oz) < 10) continue;
      rectBuilding(ctx, {
        x: ox,
        z: oz,
        w,
        d,
        h,
        color: colors[n % colors.length],
        roofColor: roofs[n % roofs.length],
        door: doors[n % 4],
        doorW: 2.6,
        doorH: 2.9,
        windows: n % 3 !== 0,
      });
      n += 1;
    }
    // 街口沙袋 / 路障
    addBox(ctx.scene, ctx.colliders, ctx.meshes, {
      w: 3.2,
      h: 1.1,
      d: 1.1,
      x: cx + 14,
      y: 0.55,
      z: cz,
      color: 0xc4a86a,
    });
    addBox(ctx.scene, ctx.colliders, ctx.meshes, {
      w: 1.1,
      h: 1.1,
      d: 3.2,
      x: cx,
      y: 0.55,
      z: cz + 14,
      color: 0xc4a86a,
    });
  }
}

export function createWorld(scene, size = 170) {
  const colliders = [];
  const meshes = [];
  const coverPoints = [];
  const half = size / 2;
  const ctx = { scene, colliders, meshes };

  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 12, size + 12, 1, 1),
    makeMat(0x6e7568, 1)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  meshes.push(ground);

  // 街道网：主干十字 + 次干道
  const roadMat = makeMat(0x3a3e44, 0.95, 0.05);
  function addRoad(w, d, x, z, y = 0.03) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    meshes.push(mesh);
  }
  addRoad(14, size - 8, 0, 0, 0.03);
  addRoad(size - 8, 14, 0, 0, 0.035);
  // 次干道（形成街区感）
  for (const o of [-38, 38, -76, 76]) {
    if (Math.abs(o) > half - 10) continue;
    addRoad(10, size - 10, o, 0, 0.028);
    addRoad(size - 10, 10, 0, o, 0.029);
  }

  // 道牙线（主干）
  for (let i = -half + 10; i <= half - 10; i += 4) {
    if (Math.abs(i) < 16) continue;
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

  const fogFar = Math.min(260, size * 1.15);
  scene.fog = new THREE.Fog(0xd0e0ec, size * 0.35, fogFar);
  scene.background = new THREE.Color(0xb8cde0);

  const hemi = new THREE.HemisphereLight(0xf2f6ff, 0xb8a888, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.35);
  sun.position.set(55, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = size + 40;
  const shadowSpan = half + 10;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
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

  // 外围街区（大地图街道战）
  if (half >= 70) populateOuterBlocks(ctx, half);

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
    // 外环掩体
    { w: 6.0, h: 2.5, d: 2.4, x: -48, y: 1.25, z: 20, color: 0x3d6a8a },
    { w: 2.4, h: 2.5, d: 6.0, x: 48, y: 1.25, z: -18, color: 0x7a3a3a },
    { w: 3.5, h: 1.15, d: 1.15, x: -40, y: 0.58, z: -40, color: 0xc4a86a },
    { w: 3.5, h: 1.15, d: 1.15, x: -37, y: 0.58, z: -40, color: 0xc4a86a },
    { w: 3.5, h: 1.15, d: 1.15, x: 40, y: 0.58, z: 42, color: 0xc4a86a },
    { w: 6.0, h: 2.5, d: 2.4, x: 0, y: 1.25, z: 55, color: 0x2f6b4a },
    { w: 6.0, h: 2.5, d: 2.4, x: -55, y: 1.25, z: 0, color: 0x8a5a2a },
  ];
  for (const c of covers) {
    if (Math.abs(c.x) > half - 3 || Math.abs(c.z) > half - 3) continue;
    addBox(scene, colliders, meshes, c);
    coverPoints.push(new THREE.Vector3(c.x, 0, c.z));
  }

  // 灯柱（点光）
  const lamps = [
    [-14, -14],
    [14, -14],
    [-14, 14],
    [14, 14],
    [0, -28],
    [0, 28],
    [-38, -38],
    [38, -38],
    [-38, 38],
    [38, 38],
    [-38, 0],
    [38, 0],
    [0, -38],
    [0, 38],
  ];
  for (const [lx, lz] of lamps) {
    if (Math.abs(lx) > half - 6 || Math.abs(lz) > half - 6) continue;
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
    const pl = new THREE.PointLight(0xffcc88, 0.4, 24);
    pl.position.set(lx, 5.2, lz);
    scene.add(pl);
  }

  const spawnPoints = [
    new THREE.Vector3(0, 0, 22),
    new THREE.Vector3(-24, 0, 0),
    new THREE.Vector3(24, 0, 0),
    new THREE.Vector3(0, 0, -24),
    new THREE.Vector3(-18, 0, -18),
    new THREE.Vector3(18, 0, 18),
    new THREE.Vector3(-18, 0, 18),
    new THREE.Vector3(18, 0, -18),
    new THREE.Vector3(36, 0, 14),
    new THREE.Vector3(-36, 0, -10),
    new THREE.Vector3(52, 0, -30),
    new THREE.Vector3(-52, 0, 30),
    new THREE.Vector3(30, 0, 52),
    new THREE.Vector3(-30, 0, -52),
    new THREE.Vector3(60, 0, 8),
    new THREE.Vector3(-60, 0, -8),
  ].filter((p) => Math.abs(p.x) < half - 6 && Math.abs(p.z) < half - 6);

  coverPoints.push(
    new THREE.Vector3(-12, 0, 10),
    new THREE.Vector3(12, 0, -10),
    new THREE.Vector3(-40, 0, 20),
    new THREE.Vector3(40, 0, -20)
  );

  return {
    size,
    half,
    colliders,
    meshes,
    coverPoints,
    zoneCenter: new THREE.Vector3(0, 0, 0),
    zoneRadius,
    spawnPoints,
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

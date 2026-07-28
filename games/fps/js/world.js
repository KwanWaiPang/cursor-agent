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

  /**
   * 射线与 AABB 求交（含 Y），返回距离；不相交则 Infinity
   * 用于子弹挡墙，避免只依赖网格射线
   */
  raycast(origin, dir, maxDist = 200) {
    const invX = dir.x !== 0 ? 1 / dir.x : 1e12;
    const invY = dir.y !== 0 ? 1 / dir.y : 1e12;
    const invZ = dir.z !== 0 ? 1 / dir.z : 1e12;

    const tx1 = (this.min.x - origin.x) * invX;
    const tx2 = (this.max.x - origin.x) * invX;
    const ty1 = (this.min.y - origin.y) * invY;
    const ty2 = (this.max.y - origin.y) * invY;
    const tz1 = (this.min.z - origin.z) * invZ;
    const tz2 = (this.max.z - origin.z) * invZ;

    const tmin = Math.max(
      Math.min(tx1, tx2),
      Math.min(ty1, ty2),
      Math.min(tz1, tz2)
    );
    const tmax = Math.min(
      Math.max(tx1, tx2),
      Math.max(ty1, ty2),
      Math.max(tz1, tz2)
    );

    if (tmax < 0 || tmin > tmax) return Infinity;
    const t = tmin >= 0 ? tmin : tmax;
    if (t < 0 || t > maxDist) return Infinity;
    return t;
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

function makeMat(color, roughness = 0.9, metalness = 0.05, map = null) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map: map || null,
  });
  if (map) m.map.colorSpace = THREE.SRGBColorSpace;
  return m;
}

const _texCache = Object.create(null);
function makeNoiseTexture(key, size, paint) {
  if (_texCache[key]) return _texCache[key];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  _texCache[key] = tex;
  return tex;
}

function texAsphalt(bright = false) {
  return makeNoiseTexture(bright ? "asphaltBright" : "asphalt", 256, (ctx, n) => {
    ctx.fillStyle = bright ? "#5a5e62" : "#2a2e32";
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 5000; i++) {
      const g = (bright ? 70 : 28) + ((Math.random() * 50) | 0);
      ctx.fillStyle = `rgba(${g},${g},${g + 4},${0.12 + Math.random() * 0.28})`;
      ctx.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 2.5, 1 + Math.random() * 2);
    }
    ctx.strokeStyle = bright ? "rgba(30,30,34,0.35)" : "rgba(12,12,14,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * n, Math.random() * n);
      ctx.quadraticCurveTo(Math.random() * n, Math.random() * n, Math.random() * n, Math.random() * n);
      ctx.stroke();
    }
  });
}

function texConcrete(bright = false) {
  return makeNoiseTexture(bright ? "concreteBright" : "concrete", 256, (ctx, n) => {
    ctx.fillStyle = bright ? "#8a8780" : "#6d6a62";
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 4200; i++) {
      const g = (bright ? 95 : 70) + ((Math.random() * 55) | 0);
      ctx.fillStyle = `rgba(${g},${g - 2},${g - 6},${0.1 + Math.random() * 0.22})`;
      ctx.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    ctx.strokeStyle = "rgba(40,38,34,0.28)";
    for (let i = 0; i < 10; i++) {
      ctx.strokeRect(Math.random() * n, Math.random() * n, 20 + Math.random() * 60, 20 + Math.random() * 40);
    }
  });
}

function texDirt(bright = false) {
  return makeNoiseTexture(bright ? "dirtBright" : "dirt", 256, (ctx, n) => {
    ctx.fillStyle = bright ? "#6a6e62" : "#4f5348";
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 6000; i++) {
      const r = (bright ? 75 : 55) + ((Math.random() * 45) | 0);
      const g = (bright ? 78 : 58) + ((Math.random() * 40) | 0);
      const b = (bright ? 58 : 42) + ((Math.random() * 30) | 0);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.12 + Math.random() * 0.3})`;
      ctx.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
  });
}

function texMetal() {
  return makeNoiseTexture("metal", 128, (ctx, n) => {
    ctx.fillStyle = "#3a3f44";
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 800; i++) {
      const g = 50 + ((Math.random() * 70) | 0);
      ctx.fillStyle = `rgba(${g},${g + 2},${g + 4},${0.15 + Math.random() * 0.35})`;
      ctx.fillRect(Math.random() * n, Math.random() * n, 1, 2 + Math.random() * 6);
    }
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
    roughness = 0.9,
    metalness = 0.05,
    mat = null,
    map = null,
  } = opts;
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat || makeMat(color, roughness, metalness, map));
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
function populateOuterBlocks(ctx, half, assaultTheme = false) {
  const colors = assaultTheme
    ? [0xb0aca4, 0x8a7464, 0x6a7278, 0x657268, 0x9a9890, 0x7a6858]
    : [0xc9c2b4, 0x8a5a42, 0x5a6570, 0x4a6a58, 0xb0aea2, 0x6e4634];
  const roofs = assaultTheme
    ? [0x5a6268, 0x6a5a50, 0x505860, 0x6a6660]
    : [0x4a5560, 0x6b3a32, 0x3a424a, 0x5a5048];
  const sandbag = assaultTheme ? 0x8a8468 : 0xc4a86a;
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
      color: sandbag,
    });
    addBox(ctx.scene, ctx.colliders, ctx.meshes, {
      w: 1.1,
      h: 1.1,
      d: 3.2,
      x: cx,
      y: 0.55,
      z: cz + 14,
      color: sandbag,
    });
  }
}

/** 据点清剿：军事杂物、残骸与细节，压低卡通感 */
function addAssaultMilitaryDressing(ctx, coverPoints) {
  const { scene, colliders, meshes } = ctx;
  const hesco = makeMat(0x9a9684, 0.95, 0.02, texConcrete(true));
  const metal = makeMat(0x5a5e62, 0.55, 0.55, texMetal());
  const rust = makeMat(0x7a6054, 0.85, 0.25);
  const od = makeMat(0x5d6558, 0.9, 0.08);
  const canvas = makeMat(0x8b8568, 0.98, 0.02);
  const tire = makeMat(0x3a3c3e, 0.95, 0.05);
  const dirtPatch = makeMat(0x6a6e64, 1, 0.02, texDirt(true));

  function box(opts) {
    return addBox(scene, colliders, meshes, opts);
  }

  // HESCO / 土袋墙（中央据点外圈）
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.12;
    if (i % 5 === 2) continue; // 留出通道
    const r = 9.4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const alongX = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
    box({
      w: alongX ? 1.1 : 2.4,
      h: 1.55,
      d: alongX ? 2.4 : 1.1,
      x,
      y: 0.78,
      z,
      mat: hesco,
    });
    coverPoints.push(new THREE.Vector3(x, 0, z));
  }

  // Jersey 路障
  const jerseySpots = [
    [-12, -4, true],
    [-12, -1.2, true],
    [12, 3, true],
    [12, 5.8, true],
    [-4, 14, false],
    [-1.2, 14, false],
    [5, -15, false],
    [7.8, -15, false],
  ];
  for (const [x, z, alongZ] of jerseySpots) {
    box({
      w: alongZ ? 0.55 : 2.6,
      h: 1.05,
      d: alongZ ? 2.6 : 0.55,
      x,
      y: 0.52,
      z,
      mat: hesco,
    });
  }

  // 油桶堆
  const drums = [
    [-9.5, 6.5],
    [-8.4, 6.8],
    [-8.9, 7.7],
    [10.2, -7],
    [11.3, -6.6],
    [21, 10],
    [-22, -12],
  ];
  for (const [x, z] of drums) {
    box({
      w: 0.72,
      h: 1.05,
      d: 0.72,
      x,
      y: 0.52,
      z,
      mat: Math.abs(x) > 15 ? rust : od,
    });
  }

  // 轮胎堆
  for (const [bx, bz] of [
    [7.5, 11],
    [-15, 8],
    [20, -4],
  ]) {
    for (let i = 0; i < 3; i++) {
      box({
        w: 0.95,
        h: 0.28,
        d: 0.95,
        x: bx + (i % 2) * 0.15,
        y: 0.14 + i * 0.28,
        z: bz + (i % 2) * 0.1,
        mat: tire,
        collidable: i === 0,
      });
    }
  }

  // 废弃装甲残骸 / 集装箱碎片
  box({ w: 4.2, h: 1.6, d: 2.1, x: -28, y: 0.8, z: 8, mat: rust });
  box({ w: 1.8, h: 0.9, d: 2.4, x: -26.2, y: 0.45, z: 9.5, mat: metal, collidable: false });
  box({ w: 3.6, h: 1.2, d: 1.8, x: 30, y: 0.6, z: -10, mat: metal });
  box({ w: 2.2, h: 0.7, d: 1.4, x: 31.2, y: 1.35, z: -10.4, mat: rust, collidable: false });
  coverPoints.push(new THREE.Vector3(-28, 0, 8), new THREE.Vector3(30, 0, -10));

  // 沙袋掩体墙（军绿帆布色，避免亮黄）
  const sandRows = [
    { x: -6, z: -14, alongX: true, n: 4 },
    { x: 14, z: 12, alongX: false, n: 3 },
    { x: -20, z: 14, alongX: true, n: 3 },
    { x: 8, z: -22, alongX: true, n: 3 },
  ];
  for (const row of sandRows) {
    for (let i = 0; i < row.n; i++) {
      for (let tier = 0; tier < 2; tier++) {
        box({
          w: row.alongX ? 1.15 : 0.85,
          h: 0.55,
          d: row.alongX ? 0.85 : 1.15,
          x: row.x + (row.alongX ? i * 1.2 : 0),
          y: 0.28 + tier * 0.55,
          z: row.z + (row.alongX ? 0 : i * 1.2),
          mat: canvas,
        });
      }
    }
    coverPoints.push(new THREE.Vector3(row.x, 0, row.z));
  }

  // 铁丝网矮柱 + 横杆（视觉）
  for (const [x0, z0, dx, dz, len] of [
    [-16, -16, 1, 0, 5],
    [16, 16, 0, 1, 4],
    [-32, 18, 1, 0, 4],
  ]) {
    for (let i = 0; i <= len; i++) {
      box({
        w: 0.12,
        h: 1.35,
        d: 0.12,
        x: x0 + dx * i * 1.1,
        y: 0.68,
        z: z0 + dz * i * 1.1,
        mat: metal,
        collidable: false,
      });
    }
    box({
      w: dx ? len * 1.1 + 0.2 : 0.06,
      h: 0.06,
      d: dz ? len * 1.1 + 0.2 : 0.06,
      x: x0 + (dx * len * 1.1) / 2,
      y: 1.2,
      z: z0 + (dz * len * 1.1) / 2,
      mat: metal,
      collidable: false,
    });
  }

  // 路面油污 / 泥斑
  for (const [x, z, w, d] of [
    [3, 8, 4.5, 2.2],
    [-5, -6, 3.2, 2.8],
    [18, 2, 5, 2],
    [-20, -2, 3.5, 3],
    [0, 18, 6, 2.5],
  ]) {
    box({
      w,
      h: 0.02,
      d,
      x,
      y: 0.045,
      z,
      mat: dirtPatch,
      collidable: false,
    });
  }

  // 建筑女儿墙 / 破墙碎块
  for (const [x, z, w, d, y] of [
    [-26, -24 + 6.1, 16.4, 0.35, 8.9],
    [-26, -24 - 6.1, 16.4, 0.35, 8.9],
    [26, -22 + 7.1, 18.4, 0.4, 10.35],
    [-24, 24 - 4.6, 20.4, 0.35, 6.55],
  ]) {
    box({ w, h: 0.55, d, x, y, z, mat: hesco, collidable: false });
  }
  // 残垣碎块
  for (const [x, z] of [
    [34, 4],
    [35.5, 8],
    [33, 9],
    [-34, 0],
    [-37, 4],
  ]) {
    box({
      w: 0.7 + Math.abs(x % 3) * 0.2,
      h: 0.45 + Math.abs(z % 2) * 0.2,
      d: 0.6,
      x,
      y: 0.3,
      z,
      mat: hesco,
      collidable: false,
    });
  }

  // 迷彩网支架（低调）
  for (const [x, z] of [
    [-10, 18],
    [22, -14],
  ]) {
    box({ w: 0.15, h: 3.2, d: 0.15, x: x - 1.5, y: 1.6, z, mat: metal, collidable: false });
    box({ w: 0.15, h: 3.2, d: 0.15, x: x + 1.5, y: 1.6, z, mat: metal, collidable: false });
    box({
      w: 3.4,
      h: 0.08,
      d: 2.2,
      x,
      y: 3.25,
      z,
      color: 0x3a4538,
      roughness: 0.95,
      metalness: 0.05,
      collidable: false,
    });
  }

  // 补给点附近弹药箱堆（无标签，纯几何）
  for (const [x, z] of [
    [-3.5, 4.5],
    [-2.2, 4.8],
    [4.2, -3.5],
  ]) {
    box({
      w: 0.9,
      h: 0.55,
      d: 0.7,
      x,
      y: 0.28,
      z,
      mat: od,
      collidable: false,
    });
  }
}

export function createWorld(scene, size = 170) {
  const colliders = [];
  const meshes = [];
  const coverPoints = [];
  const half = size / 2;
  const ctx = { scene, colliders, meshes };
  const assaultTheme = size <= 180; // 据点清剿：更压抑写实

  // 地面（泥土地纹理）
  const dirtMap = texDirt(assaultTheme).clone();
  dirtMap.repeat.set(size / 12, size / 12);
  dirtMap.needsUpdate = true;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 12, size + 12, 1, 1),
    makeMat(assaultTheme ? 0x8a8e82 : 0x6e7568, 1, 0.02, dirtMap)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  meshes.push(ground);

  // 街道网：主干十字 + 次干道（沥青纹理）
  const asphaltMap = texAsphalt(assaultTheme).clone();
  asphaltMap.repeat.set(8, size / 8);
  asphaltMap.needsUpdate = true;
  const roadMat = makeMat(assaultTheme ? 0x7a7e82 : 0x3a3e44, 0.97, 0.04, asphaltMap);
  function addRoad(w, d, x, z, y = 0.03) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
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

  // 路缘石
  const curbMat = makeMat(assaultTheme ? 0x7c7a74 : 0x5c5a54, 0.92, 0.05, texConcrete(assaultTheme));
  for (const side of [-7.2, 7.2]) {
    addBox(scene, colliders, meshes, {
      w: 0.35,
      h: 0.22,
      d: size - 16,
      x: side,
      y: 0.12,
      z: 0,
      mat: curbMat,
      collidable: false,
    });
    addBox(scene, colliders, meshes, {
      w: size - 16,
      h: 0.22,
      d: 0.35,
      x: 0,
      y: 0.12,
      z: side,
      mat: curbMat,
      collidable: false,
    });
  }

  // 道牙线（主干，褪色）
  for (let i = -half + 10; i <= half - 10; i += 4) {
    if (Math.abs(i) < 16) continue;
    addBox(scene, colliders, meshes, {
      w: 0.28,
      h: 0.03,
      d: 1.35,
      x: 0,
      y: 0.055,
      z: i,
      color: assaultTheme ? 0x8a8570 : 0xd8d0b8,
      collidable: false,
    });
    addBox(scene, colliders, meshes, {
      w: 1.35,
      h: 0.03,
      d: 0.28,
      x: i,
      y: 0.055,
      z: 0,
      color: assaultTheme ? 0x8a8570 : 0xd8d0b8,
      collidable: false,
    });
  }

  // 据点：写实灰绿但保持日间可读亮度（避免过暗）
  const fogFar = Math.min(assaultTheme ? 300 : 300, size * (assaultTheme ? 1.3 : 1.28));
  scene.fog = new THREE.Fog(assaultTheme ? 0xb4bca8 : 0xb9d0e4, size * (assaultTheme ? 0.55 : 0.48), fogFar);
  scene.background = new THREE.Color(assaultTheme ? 0xa8b09c : 0x9ebbd4);

  const hemi = new THREE.HemisphereLight(
    assaultTheme ? 0xf2f6e8 : 0xf8fbff,
    assaultTheme ? 0x7a7568 : 0xc8b8a0,
    assaultTheme ? 1.4 : 1.32
  );
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(assaultTheme ? 0xfff4dc : 0xfff4dc, assaultTheme ? 1.75 : 1.65);
  sun.position.set(assaultTheme ? 50 : 55, assaultTheme ? 88 : 90, assaultTheme ? 36 : 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(assaultTheme ? 2048 : 1024, assaultTheme ? 2048 : 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = size + 40;
  const shadowSpan = half + 10;
  sun.shadow.camera.left = -shadowSpan;
  sun.shadow.camera.right = shadowSpan;
  sun.shadow.camera.top = shadowSpan;
  sun.shadow.camera.bottom = -shadowSpan;
  sun.shadow.bias = -0.00025;
  if (assaultTheme) sun.shadow.normalBias = 0.04;
  scene.add(sun);
  const fillSun = new THREE.DirectionalLight(assaultTheme ? 0xc0d0d8 : 0xb8d4ff, assaultTheme ? 0.55 : 0.42);
  fillSun.position.set(-40, 30, -20);
  scene.add(fillSun);

  // 据点色板：去饱和军用灰绿 / 水泥 / OD（提亮一档）
  const pal = assaultTheme
    ? {
        plaster: 0xb0aca4,
        brick: 0x8a7464,
        warehouse: 0x6a7278,
        barrack: 0x657268,
        garage: 0x9a9890,
        wood: 0x7a6858,
        roof: 0x5a6268,
        roofWood: 0x6a5a50,
        sandbag: 0x8a8468,
        concrete: 0x9a9890,
        wall: 0x8e8c84,
        gate: 0x5a6068,
        vehicle: [0x5d6558, 0x6a6e68, 0x7a7268, 0x5a5e62],
        crate: 0x7a6e5e,
        glass: 0x6a7a82,
      }
    : {
        plaster: 0xc9c2b4,
        brick: 0x8a5a42,
        warehouse: 0x5a6570,
        barrack: 0x4a6a58,
        garage: 0xb0aea2,
        wood: 0x6e4634,
        roof: 0x4a5560,
        roofWood: 0x6b3a32,
        sandbag: 0xc4a86a,
        concrete: 0x9a9688,
        wall: 0x8a8678,
        gate: 0x3d4650,
        vehicle: [0x3d6a8a, 0x8a5a2a, 0x2f6b4a, 0x7a3a3a],
        crate: 0x6b5344,
        glass: 0x6a8aaa,
      };

  // 地面接缝阴影环：减轻“浮空方块”感
  const groundShade = new THREE.Mesh(
    new THREE.RingGeometry(half * 0.15, half * 0.98, 64),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: assaultTheme ? 0.07 : 0.07,
      depthWrite: false,
    })
  );
  groundShade.rotation.x = -Math.PI / 2;
  groundShade.position.y = 0.02;
  scene.add(groundShade);
  meshes.push(groundShade);

  // 边界墙（四面开口）
  const wallH = 5.5;
  const wallT = 1.2;
  const wallColor = pal.wall;
  const wallMap = assaultTheme ? texConcrete(true) : null;
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
    map: wallMap,
  });
  addBox(scene, colliders, meshes, {
    w: seg,
    h: wallH,
    d: wallT,
    x: half / 2 + gate / 4,
    y: wallH / 2,
    z: -half,
    color: wallColor,
    map: wallMap,
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
    map: wallMap,
  });
  addBox(scene, colliders, meshes, {
    w: seg,
    h: wallH,
    d: wallT,
    x: half / 2 + gate / 4,
    y: wallH / 2,
    z: half,
    color: wallColor,
    map: wallMap,
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
    map: wallMap,
  });
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: seg,
    x: -half,
    y: wallH / 2,
    z: half / 2 + gate / 4,
    color: wallColor,
    map: wallMap,
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
    map: wallMap,
  });
  addBox(scene, colliders, meshes, {
    w: wallT,
    h: wallH,
    d: seg,
    x: half,
    y: wallH / 2,
    z: half / 2 + gate / 4,
    color: wallColor,
    map: wallMap,
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
      color: pal.gate,
      map: assaultTheme ? texMetal() : null,
      metalness: assaultTheme ? 0.35 : 0.05,
      roughness: assaultTheme ? 0.65 : 0.9,
    });
  }

  // —— 西北：办公楼 + 侧翼（可进入） ——
  rectBuilding(ctx, {
    x: -26,
    z: -24,
    w: 16,
    d: 12,
    h: 8.5,
    color: pal.plaster,
    roofColor: pal.roof,
    door: "s",
    doorW: 3.0,
    doorH: 3.2,
    floorColor: assaultTheme ? 0x6a6658 : 0xa8a090,
  });
  // 侧翼
  rectBuilding(ctx, {
    x: -14,
    z: -28,
    w: 10,
    d: 8,
    h: 7,
    color: pal.brick,
    roofColor: pal.roofWood,
    door: "e",
    doorW: 2.6,
    doorH: 3.0,
    floorColor: assaultTheme ? 0x5a5048 : 0x7a6a58,
  });
  // 屋顶设备
  addBox(scene, colliders, meshes, {
    w: 2.2,
    h: 1.1,
    d: 1.4,
    x: -28,
    y: 9.2,
    z: -26,
    color: pal.warehouse,
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
    color: pal.concrete,
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
    color: pal.warehouse,
    roofColor: pal.roof,
    door: "s",
    doorW: 6.2,
    doorH: 5.2,
    windows: false,
    floorColor: assaultTheme ? 0x525048 : 0x6a6860,
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
      color: pal.glass,
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
    color: pal.concrete,
    map: assaultTheme ? texConcrete() : null,
  });
  // 附棚
  rectBuilding(ctx, {
    x: 12,
    z: -26,
    w: 8,
    d: 7,
    h: 5,
    color: pal.wood,
    roofColor: pal.roofWood,
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
    color: pal.barrack,
    roofColor: pal.roofWood,
    door: "n",
    doorW: 2.6,
    doorH: 2.9,
    floorColor: assaultTheme ? 0x524838 : 0x6b5344,
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
      color: assaultTheme ? 0x524838 : 0x6b5344,
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
    color: assaultTheme ? 0x524838 : 0x6b5344,
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
    const color = pal.garage;
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
    addRoof(ctx, x, z, w, d, h + 0.15, pal.roof);
    addBox(scene, colliders, meshes, {
      w: w - 1,
      h: 0.06,
      d: d - 1,
      x,
      y: 0.04,
      z,
      color: assaultTheme ? 0x2c3034 : 0x3a3e44,
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
    color: pal.plaster,
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
    color: pal.concrete,
    roofColor: pal.wall,
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
    color: pal.concrete,
    collidable: false,
  });
  addBox(scene, colliders, meshes, {
    w: 10.5,
    h: 1.0,
    d: 0.45,
    x: 0,
    y: 5.6,
    z: -34 + 4,
    color: pal.concrete,
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
    color: pal.brick,
    map: assaultTheme ? texConcrete() : null,
  });
  addBox(scene, colliders, meshes, {
    w: 6.4,
    h: 0.45,
    d: 6.4,
    x: -36,
    y: 11.3,
    z: 2,
    color: pal.roof,
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
      color: pal.glass,
      collidable: false,
      roughness: 0.2,
      metalness: 0.4,
    });
  }

  // —— 东侧残垣小铺 ——
  wallX(ctx, 36, 6 - 3.5, 9, 6, 0.65, 0, 0, pal.brick);
  addBox(scene, colliders, meshes, {
    w: 3.0,
    h: 6,
    d: 0.65,
    x: 36 - 2.5,
    y: 3,
    z: 6 + 3.5,
    color: pal.brick,
  });
  addBox(scene, colliders, meshes, {
    w: 2.2,
    h: 3.2,
    d: 0.65,
    x: 36 + 2.8,
    y: 1.6,
    z: 6 + 3.5,
    color: pal.wood,
  });
  wallZ(ctx, 36 - 4.5, 6, 7, 6, 0.65, 0, 0, pal.brick);
  addBox(scene, colliders, meshes, {
    w: 0.65,
    h: 3.8,
    d: 4.2,
    x: 36 + 4.5,
    y: 1.9,
    z: 6,
    color: pal.wood,
  });
  addBox(scene, colliders, meshes, {
    w: 10,
    h: 0.35,
    d: 8,
    x: 36,
    y: 6.2,
    z: 6,
    color: pal.roofWood,
    collidable: false,
  });
  addBox(scene, colliders, meshes, {
    w: 1.4,
    h: 1.4,
    d: 1.4,
    x: 37,
    y: 0.7,
    z: 7,
    color: pal.concrete,
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
      color: pal.concrete,
      map: assaultTheme ? texConcrete() : null,
    });
  }

  const zoneRing = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 6.2, 48),
    new THREE.MeshBasicMaterial({
      color: assaultTheme ? 0x5a6848 : 0xb7d59a,
      transparent: true,
      opacity: assaultTheme ? 0.22 : 0.35,
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
      color: assaultTheme ? 0x3a4230 : 0x5a6b3a,
      transparent: true,
      opacity: assaultTheme ? 0.08 : 0.12,
      side: THREE.DoubleSide,
    })
  );
  zoneFill.rotation.x = -Math.PI / 2;
  zoneFill.position.y = 0.04;
  scene.add(zoneFill);
  meshes.push(zoneFill);

  // 外围街区（大地图街道战）
  if (half >= 70) populateOuterBlocks(ctx, half, assaultTheme);

  // —— 街道掩体 ——
  const covers = [
    { w: 3.5, h: 1.15, d: 1.15, x: -8, y: 0.58, z: -10, color: pal.sandbag },
    { w: 3.5, h: 1.15, d: 1.15, x: -5, y: 0.58, z: -10, color: pal.sandbag },
    { w: 3.5, h: 1.15, d: 1.15, x: 8, y: 0.58, z: 9, color: pal.sandbag },
    { w: 3.5, h: 1.15, d: 1.15, x: 11, y: 0.58, z: 9, color: pal.sandbag },
    { w: 1.2, h: 1.15, d: 4.2, x: -10, y: 0.58, z: 12, color: pal.sandbag },
    { w: 6.0, h: 2.5, d: 2.4, x: -18, y: 1.25, z: -6, color: pal.vehicle[0] },
    { w: 6.0, h: 2.5, d: 2.4, x: -18, y: 1.25, z: -3.3, color: pal.vehicle[1] },
    { w: 2.4, h: 2.5, d: 6.0, x: 16, y: 1.25, z: 6, color: pal.vehicle[2] },
    { w: 6.0, h: 2.5, d: 2.4, x: 18, y: 1.25, z: -8, color: pal.vehicle[3] },
    { w: 2.4, h: 1.1, d: 0.55, x: -7, y: 0.55, z: 8, color: pal.concrete },
    { w: 2.4, h: 1.1, d: 0.55, x: 9, y: 0.55, z: -11, color: pal.concrete },
    { w: 0.55, h: 1.1, d: 2.4, x: 11, y: 0.55, z: -12.5, color: pal.concrete },
    { w: 1.1, h: 1.1, d: 1.1, x: -8, y: 0.55, z: 20, color: pal.crate },
    { w: 1.1, h: 1.1, d: 1.1, x: -6.8, y: 0.55, z: 20, color: pal.crate },
    { w: 1.1, h: 1.1, d: 1.1, x: -7.4, y: 1.65, z: 20, color: pal.crate },
    { w: 1.1, h: 1.1, d: 1.1, x: 22, y: 0.55, z: -16, color: pal.crate },
    { w: 1.1, h: 1.1, d: 1.1, x: 23.2, y: 0.55, z: -16, color: pal.crate },
    { w: 1.1, h: 1.1, d: 1.1, x: 22.6, y: 1.65, z: -16, color: pal.crate },
    // 外环掩体
    { w: 6.0, h: 2.5, d: 2.4, x: -48, y: 1.25, z: 20, color: pal.vehicle[0] },
    { w: 2.4, h: 2.5, d: 6.0, x: 48, y: 1.25, z: -18, color: pal.vehicle[3] },
    { w: 3.5, h: 1.15, d: 1.15, x: -40, y: 0.58, z: -40, color: pal.sandbag },
    { w: 3.5, h: 1.15, d: 1.15, x: -37, y: 0.58, z: -40, color: pal.sandbag },
    { w: 3.5, h: 1.15, d: 1.15, x: 40, y: 0.58, z: 42, color: pal.sandbag },
    { w: 6.0, h: 2.5, d: 2.4, x: 0, y: 1.25, z: 55, color: pal.vehicle[2] },
    { w: 6.0, h: 2.5, d: 2.4, x: -55, y: 1.25, z: 0, color: pal.vehicle[1] },
  ];
  for (const c of covers) {
    if (Math.abs(c.x) > half - 3 || Math.abs(c.z) > half - 3) continue;
    addBox(scene, colliders, meshes, c);
    coverPoints.push(new THREE.Vector3(c.x, 0, c.z));
  }

  if (assaultTheme) addAssaultMilitaryDressing(ctx, coverPoints);

  // 灯柱（据点模式更暗、更少）
  const lamps = assaultTheme
    ? [
        [-14, -14],
        [14, -14],
        [-14, 14],
        [14, 14],
        [0, -28],
        [0, 28],
      ]
    : [
        [-14, -14],
        [14, -14],
        [-14, 14],
        [14, 14],
        [0, -28],
        [0, 28],
        [-38, 0],
        [38, 0],
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
      color: pal.gate,
      collidable: false,
    });
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 10, 10),
      new THREE.MeshStandardMaterial({
        color: assaultTheme ? 0xffe8b8 : 0xffe8b0,
        emissive: assaultTheme ? 0xaa7744 : 0xaa7744,
        emissiveIntensity: assaultTheme ? 0.65 : 0.7,
      })
    );
    bulb.position.set(lx, 5.4, lz);
    scene.add(bulb);
    meshes.push(bulb);
    const pl = new THREE.PointLight(0xffcc88, assaultTheme ? 0.28 : 0.28, assaultTheme ? 20 : 20);
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
    /** 子弹挡墙：返回最近实体碰撞距离，无遮挡则为 Infinity */
    raycastSolid(origin, dir, maxDist = 200) {
      let best = Infinity;
      const ox = origin.x;
      const oy = origin.y;
      const oz = origin.z;
      const dx = dir.x;
      const dy = dir.y;
      const dz = dir.z;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        // 粗筛：以包围球略估，远射线跳过精确检测
        const cx = c.min.x * 0.5 + c.max.x * 0.5;
        const cy = c.min.y * 0.5 + c.max.y * 0.5;
        const cz = c.min.z * 0.5 + c.max.z * 0.5;
        const vx = cx - ox;
        const vy = cy - oy;
        const vz = cz - oz;
        const tApprox = vx * dx + vy * dy + vz * dz;
        if (tApprox < -8 || tApprox > maxDist + 8) continue;
        const t = c.raycast(origin, dir, maxDist);
        if (t < best) best = t;
      }
      return best;
    },
    resolvePosition(pos, radius = 0.45) {
      const lim = half - 1.2;
      pos.x = THREE.MathUtils.clamp(pos.x, -lim, lim);
      pos.z = THREE.MathUtils.clamp(pos.z, -lim, lim);
      for (const c of colliders) c.resolveXZ(pos, radius);
    },
    dispose() {
      for (const m of meshes) {
        scene.remove(m);
        m.geometry?.dispose?.();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose?.());
          else m.material.dispose?.();
        }
      }
      meshes.length = 0;
      colliders.length = 0;
    },
  };
}

export function createSafeZoneVisual(scene) {
  const BASE = 20;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(BASE - 0.5, BASE + 0.2, 64),
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
    new THREE.CircleGeometry(BASE, 64),
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

  let currentR = BASE;

  return {
    ring,
    fill,
    setRadius(r) {
      currentR = Math.max(0.2, r);
      const s = currentR / BASE;
      ring.scale.set(s, s, s);
      fill.scale.set(s, s, s);
    },
    setCenter(x, z) {
      ring.position.x = x;
      ring.position.z = z;
      fill.position.x = x;
      fill.position.z = z;
    },
    dispose() {
      scene.remove(ring);
      scene.remove(fill);
      ring.geometry.dispose();
      fill.geometry.dispose();
      ring.material.dispose();
      fill.material.dispose();
    },
  };
}

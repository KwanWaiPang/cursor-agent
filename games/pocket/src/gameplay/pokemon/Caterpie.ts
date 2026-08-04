import * as THREE from 'three';
import { metaSurface, type Ball } from '../../fx/Sculpt';
import { creatureSkin } from '../../fx/CreatureMaterials';
import { clamp, smoothstep } from '../../core/Noise';
import { createRig, IdleAnimator, finishBody, taperTube, disposeCreature, type Creature } from './shared';

/**
 * Caterpie — a fat green inchworm with yellow belly rings, sucker feet, and
 * the signature red Y-antenna. Built as a short chain of metaball segments so
 * the silhouette reads clearly at battle scale.
 */

function paintFlat(geo: THREE.BufferGeometry, shade = 1): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  c.fill(shade);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function paintMask(
  geo: THREE.BufferGeometry,
  tint: [number, number, number],
  mask: (p: THREE.Vector3, n: THREE.Vector3) => number,
): void {
  if (!geo.attributes.color) paintFlat(geo, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const m = clamp(mask(p, n), 0, 1);
    if (m <= 0) continue;
    col.setXYZ(
      i,
      col.getX(i) * (1 + (tint[0] - 1) * m),
      col.getY(i) * (1 + (tint[1] - 1) * m),
      col.getZ(i) * (1 + (tint[2] - 1) * m),
    );
  }
  col.needsUpdate = true;
}

const _ray = new THREE.Raycaster();
function onSkull(mesh: THREE.Mesh, dir: THREE.Vector3, fallback = 0.08): THREE.Vector3 {
  const d = dir.clone().normalize();
  _ray.set(d.clone().multiplyScalar(0.55), d.clone().negate());
  const hits = _ray.intersectObject(mesh, false);
  if (hits.length) return hits[0].point.clone();
  return d.multiplyScalar(fallback);
}

export function buildCaterpie(): Creature {
  const rig = createRig();
  rig.root.name = 'Caterpie';

  const GREEN = 0x3f9a2a;
  const skin = creatureSkin({
    color: GREEN,
    subsurface: 0x245816,
    wrap: 0.14,
    rim: 0.05,
    roughness: 0.86,
    detail: 'pores',
    detailScale: 6,
  });
  skin.vertexColors = true;
  skin.envMapIntensity = 0.18;
  skin.clearcoat = 0.04;
  skin.clearcoatRoughness = 0.75;

  // Cream-yellow belly as a multiplicative tint over green.
  const BELLY: [number, number, number] = [2.4, 2.1, 0.55];

  const bodyBalls: Ball[] = [
    // Head / thorax blob.
    { x: 0, y: 0.095, z: 0.095, r: 0.072, sx: 1.05, sy: 0.95, sz: 1.0 },
    // Mid segments.
    { x: 0, y: 0.088, z: 0.01, r: 0.068, sx: 1.08, sy: 0.92, sz: 0.95 },
    { x: 0, y: 0.082, z: -0.07, r: 0.062, sx: 1.05, sy: 0.9, sz: 0.95 },
    // Tail taper.
    { x: 0, y: 0.07, z: -0.135, r: 0.048, sx: 0.95, sy: 0.85, sz: 1.05 },
    { x: 0, y: 0.055, z: -0.175, r: 0.032, sx: 0.85, sy: 0.75 },
  ];
  // Sucker feet along the belly.
  for (const z of [0.08, 0.02, -0.05, -0.11]) {
    for (const s of [1, -1]) {
      bodyBalls.push({ x: s * 0.038, y: 0.02, z, r: 0.018, sx: 0.85, sy: 0.55, sz: 0.9 });
    }
  }
  // Soft carve under the chin so the head reads separate.
  bodyBalls.push({ x: 0, y: 0.055, z: 0.12, r: 0.03, sx: 1.1, sy: 0.7, strength: -0.35 });

  const bodyGeo = metaSurface(bodyBalls, { resolution: 40, smooth: 0.95, padding: 0.035 });
  paintMask(bodyGeo, BELLY, (p, n) => {
    const under = smoothstep(-0.15, -0.7, n.y) * smoothstep(0.1, 0.04, p.y);
    // Yellow segment rings on the flanks.
    const ring =
      smoothstep(0.55, 0.15, Math.abs(Math.abs(p.z - 0.01) - 0.0)) *
      smoothstep(0.02, 0.08, Math.abs(p.x)) *
      smoothstep(0.12, 0.06, p.y) *
      0.55;
    const ring2 =
      Math.exp(-Math.pow((p.z + 0.07) / 0.028, 2)) *
      smoothstep(0.025, 0.07, Math.abs(p.x)) *
      smoothstep(0.11, 0.05, p.y) *
      0.7;
    return Math.max(under, ring, ring2);
  });
  const body = finishBody(new THREE.Mesh(bodyGeo, skin), new THREE.Vector3(0, 0.08, 0), 0.26);
  rig.body.add(body);

  rig.head.position.set(0, 0.12, 0.12);
  const headBalls: Ball[] = [
    { x: 0, y: 0.01, z: 0.01, r: 0.058, sx: 1.1, sy: 0.95, sz: 1.05 },
    { x: 0.035, y: -0.005, z: 0.015, r: 0.032, sy: 0.9 },
    { x: -0.035, y: -0.005, z: 0.015, r: 0.032, sy: 0.9 },
    { x: 0, y: -0.01, z: 0.04, r: 0.038, sx: 0.95, sy: 0.8 },
  ];
  for (const s of [1, -1]) {
    headBalls.push({
      x: s * 0.032, y: 0.012, z: 0.045, r: 0.028, sx: 1.0, sy: 0.9, sz: 1.15, strength: -0.32,
    });
  }
  const headGeo = metaSurface(headBalls, { resolution: 42, smooth: 0.94, padding: 0.03 });
  paintMask(headGeo, BELLY, (p, n) => smoothstep(-0.2, -0.75, n.y) * smoothstep(0.02, -0.02, p.y));
  const headMesh = new THREE.Mesh(headGeo, skin);
  finishBody(headMesh, new THREE.Vector3(0, 0.01, 0.01), 0.14);
  rig.head.add(headMesh);

  const plug = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.04, 12, 10), 0.92), skin);
  plug.position.set(0, 0.005, 0);
  plug.castShadow = false;
  rig.head.add(plug);

  /* Yellow eye rings + black pupils */
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xe8c84a, roughness: 0.55 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1408 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const EYE_R = 0.018;

  for (const s of [1, -1]) {
    const d = new THREE.Vector3(s * 0.55, 0.12, 0.82).normalize();
    const seat = onSkull(headMesh, d);
    const holder = new THREE.Group();
    holder.position.copy(seat.clone().addScaledVector(d, -EYE_R * 0.2));
    holder.rotation.y = s * 0.5;
    rig.head.add(holder);

    const eye = new THREE.Group();
    eye.name = 'Eye';
    holder.add(eye);
    const ring = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 1.35, 14, 10), ringMat);
    ring.scale.set(1.15, 1.05, 0.55);
    eye.add(ring);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 0.72, 12, 10), pupilMat);
    pupil.position.z = EYE_R * 0.55;
    eye.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 0.18, 8, 6), glintMat);
    glint.position.set(-EYE_R * 0.2, EYE_R * 0.25, EYE_R * 1.05);
    eye.add(glint);
    eye.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });

    const blinkGeo = new THREE.SphereGeometry(EYE_R * 1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    blinkGeo.deleteAttribute('uv');
    const blink = new THREE.Mesh(paintFlat(blinkGeo, 1), skin);
    blink.scale.y = 0;
    blink.castShadow = false;
    holder.add(blink);
    rig.eyes.push(eye);
    rig.eyelids.push(blink);
  }

  /* Red Y-antenna */
  const antennaMat = new THREE.MeshStandardMaterial({
    color: 0xc62828,
    roughness: 0.55,
    metalness: 0.05,
  });
  const antenna = new THREE.Group();
  const rootSeat = onSkull(headMesh, new THREE.Vector3(0, 1, 0.15));
  antenna.position.copy(rootSeat).add(new THREE.Vector3(0, 0.01, 0));
  rig.head.add(antenna);

  const stemPts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.04, 0.005),
    new THREE.Vector3(0, 0.075, 0.0),
  ];
  const stemCurve = new THREE.CatmullRomCurve3(stemPts);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 8, 0.007, 6, false);
  taperTube(stemGeo, stemCurve, 9, 7, 1.0, 0.7, (t) => t);
  stemGeo.deleteAttribute('uv');
  antenna.add(new THREE.Mesh(stemGeo, antennaMat));

  for (const s of [1, -1]) {
    const branchPts = [
      new THREE.Vector3(0, 0.072, 0),
      new THREE.Vector3(s * 0.028, 0.095, 0.01),
      new THREE.Vector3(s * 0.048, 0.115, 0.005),
    ];
    const curve = new THREE.CatmullRomCurve3(branchPts);
    const geo = new THREE.TubeGeometry(curve, 8, 0.0055, 6, false);
    taperTube(geo, curve, 9, 7, 1.0, 0.35, (t) => t);
    geo.deleteAttribute('uv');
    const branch = new THREE.Mesh(geo, antennaMat);
    branch.castShadow = true;
    antenna.add(branch);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), antennaMat);
    tip.position.copy(branchPts[2]);
    antenna.add(tip);
  }
  const baseCap = new THREE.Mesh(new THREE.SphereGeometry(0.01, 10, 8), antennaMat);
  antenna.add(baseCap);

  /* Teardrop tail tip */
  const tip = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.022, 12, 10), 1), skin);
  tip.scale.set(0.85, 0.7, 1.15);
  tip.position.set(0, 0.055, -0.195);
  tip.castShadow = true;
  rig.body.add(tip);

  const anim = new IdleAnimator(rig, 47);
  let attention = 0;

  return {
    id: 'caterpie',
    name: 'Caterpie',
    group: rig.root,
    get attention() {
      return attention;
    },
    set attention(v: number) {
      attention = clamp(v, 0, 1);
    },
    update(dt, elapsed) {
      anim.update(dt, elapsed, attention);
      for (const lid of rig.eyelids) lid.visible = lid.scale.y > 0.02;
      // Soft inchworm undulation.
      rig.body.rotation.x = Math.sin(elapsed * 2.1) * 0.04;
      antenna.rotation.z = Math.sin(elapsed * 1.6) * 0.08;
      antenna.rotation.x = Math.sin(elapsed * 1.2 + 0.4) * 0.05;
    },
    celebrate: () => anim.celebrate(),
    dispose: () => disposeCreature(rig.root),
  };
}

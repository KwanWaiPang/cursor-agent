import * as THREE from 'three';
import { metaSurface, type Ball } from '../../fx/Sculpt';
import { creatureSkin } from '../../fx/CreatureMaterials';
import { clamp, smoothstep } from '../../core/Noise';
import { createRig, IdleAnimator, finishBody, disposeCreature, type Creature } from './shared';

/**
 * Oddish — a round indigo body on stubby feet, topped by a fan of green leaves.
 * Reads from three signals: the blue orb, the huge red eyes, and the leafy crown.
 */

function paintFlat(geo: THREE.BufferGeometry, shade = 1): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  c.fill(shade);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

const _ray = new THREE.Raycaster();
function onSkull(mesh: THREE.Mesh, dir: THREE.Vector3, fallback = 0.08): THREE.Vector3 {
  const d = dir.clone().normalize();
  _ray.set(d.clone().multiplyScalar(0.6), d.clone().negate());
  const hits = _ray.intersectObject(mesh, false);
  if (hits.length) return hits[0].point.clone();
  return d.multiplyScalar(fallback);
}

function leafGeometry(len: number, halfW: number, thick: number): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 20, 14);
  geo.deleteAttribute('uv');
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = clamp((v.y + 1) / 2, 0, 1);
    const pinch = 1 - 0.55 * Math.pow(smoothstep(0.35, 1, t), 1.35);
    const waist = 0.7 + 0.35 * Math.sin(t * Math.PI);
    pos.setXYZ(i, v.x * halfW * pinch * waist, v.y * len * 0.5 + len * 0.5, v.z * thick * pinch);
  }
  geo.computeVertexNormals();
  return paintFlat(geo, 1);
}

export function buildOddish(): Creature {
  const rig = createRig();
  rig.root.name = 'Oddish';

  const BLUE = 0x2a3d8f;
  const skin = creatureSkin({
    color: BLUE,
    subsurface: 0x1a2558,
    wrap: 0.12,
    rim: 0.05,
    roughness: 0.88,
    detail: 'pores',
    detailScale: 7,
  });
  skin.vertexColors = true;
  skin.envMapIntensity = 0.2;
  skin.clearcoat = 0.06;
  skin.clearcoatRoughness = 0.65;

  const leafMat = creatureSkin({
    color: 0x3f8a2e,
    subsurface: 0x245018,
    wrap: 0.2,
    rim: 0.08,
    roughness: 0.78,
    detail: 'pores',
    detailScale: 5,
  });
  leafMat.vertexColors = true;
  leafMat.sheen = 0.12;
  leafMat.sheenColor = new THREE.Color(0x7cbc48);

  const bodyBalls: Ball[] = [
    { x: 0, y: 0.095, z: 0, r: 0.092, sx: 1.05, sy: 0.95, sz: 1.0 },
    { x: 0, y: 0.145, z: 0.01, r: 0.072, sx: 1.02, sy: 0.9 },
    { x: 0, y: 0.055, z: 0.01, r: 0.07, sx: 1.08, sy: 0.7, sz: 1.05 },
    // Stubby feet.
    { x: 0.04, y: 0.018, z: 0.035, r: 0.028, sx: 0.9, sy: 0.55, sz: 1.15 },
    { x: -0.04, y: 0.018, z: 0.035, r: 0.028, sx: 0.9, sy: 0.55, sz: 1.15 },
    { x: 0.038, y: 0.016, z: -0.02, r: 0.024, sx: 0.85, sy: 0.5, sz: 1.05 },
    { x: -0.038, y: 0.016, z: -0.02, r: 0.024, sx: 0.85, sy: 0.5, sz: 1.05 },
  ];
  const bodyGeo = metaSurface(bodyBalls, { resolution: 36, smooth: 0.96, padding: 0.035 });
  const body = finishBody(new THREE.Mesh(bodyGeo, skin), new THREE.Vector3(0, 0.1, 0), 0.28);
  rig.body.add(body);

  // Head is the upper body — Oddish has no separate neck.
  rig.head.position.set(0, 0.15, 0.02);
  const headBalls: Ball[] = [
    { x: 0, y: 0.02, z: 0.01, r: 0.07, sx: 1.08, sy: 0.92, sz: 1.0 },
    { x: 0.04, y: 0.0, z: 0.02, r: 0.04, sy: 0.9 },
    { x: -0.04, y: 0.0, z: 0.02, r: 0.04, sy: 0.9 },
    { x: 0, y: -0.01, z: 0.045, r: 0.045, sx: 0.95, sy: 0.8 },
  ];
  for (const s of [1, -1]) {
    headBalls.push({
      x: s * 0.038, y: 0.018, z: 0.055, r: 0.032, sx: 1.05, sy: 0.95, sz: 1.2, strength: -0.28,
    });
  }
  const headGeo = metaSurface(headBalls, { resolution: 44, smooth: 0.94, padding: 0.03 });
  const headMesh = new THREE.Mesh(headGeo, skin);
  finishBody(headMesh, new THREE.Vector3(0, 0.01, 0.01), 0.16);
  rig.head.add(headMesh);

  const plug = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.048, 14, 10), 0.92), skin);
  plug.position.set(0, 0.01, 0);
  plug.castShadow = false;
  rig.head.add(plug);

  /* Eyes — big red ovals */
  const EYE_R = 0.026;
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.45 });
  const irisMat = new THREE.MeshBasicMaterial({ color: 0xc41e2a });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a0c10 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (const s of [1, -1]) {
    const d = new THREE.Vector3(s * 0.42, 0.08, 0.9).normalize();
    const seat = onSkull(headMesh, d);
    const holder = new THREE.Group();
    holder.position.copy(seat.clone().addScaledVector(d, -EYE_R * 0.55));
    holder.rotation.y = s * 0.42;
    holder.scale.set(1.05, 1.2, 1);
    rig.head.add(holder);

    const eye = new THREE.Group();
    eye.name = 'Eye';
    holder.add(eye);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(EYE_R, 18, 14), scleraMat));
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(EYE_R * 1.005, 18, 12, 0, Math.PI * 2, 0, Math.asin(0.98)),
      irisMat,
    );
    iris.rotation.x = Math.PI / 2;
    eye.add(iris);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(EYE_R * 1.01, 14, 10, 0, Math.PI * 2, 0, Math.asin(0.42)),
      pupilMat,
    );
    pupil.rotation.x = Math.PI / 2;
    eye.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(EYE_R * 0.14, 8, 6), glintMat);
    glint.position.set(-EYE_R * 0.28, EYE_R * 0.3, EYE_R * 0.88);
    eye.add(glint);
    eye.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });

    const blinkGeo = new THREE.SphereGeometry(EYE_R * 0.995, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    blinkGeo.deleteAttribute('uv');
    const blink = new THREE.Mesh(paintFlat(blinkGeo, 1), skin);
    blink.scale.y = 0;
    blink.castShadow = false;
    holder.add(blink);
    rig.eyes.push(eye);
    rig.eyelids.push(blink);
  }

  /* Leaf crown */
  const leaves: THREE.Group[] = [];
  const leafSpecs = [
    { yaw: 0.0, pitch: -0.15, roll: 0, len: 0.17, w: 0.045 },
    { yaw: 1.15, pitch: -0.05, roll: 0.2, len: 0.155, w: 0.04 },
    { yaw: -1.15, pitch: -0.05, roll: -0.2, len: 0.155, w: 0.04 },
    { yaw: 2.2, pitch: 0.08, roll: 0.15, len: 0.14, w: 0.036 },
    { yaw: -2.2, pitch: 0.08, roll: -0.15, len: 0.14, w: 0.036 },
  ];
  const crown = new THREE.Group();
  crown.position.set(0, 0.055, -0.01);
  rig.head.add(crown);
  for (const spec of leafSpecs) {
    const g = new THREE.Group();
    g.rotation.set(spec.pitch, spec.yaw, spec.roll);
    const leaf = new THREE.Mesh(leafGeometry(spec.len, spec.w, 0.012), leafMat);
    leaf.castShadow = true;
    g.add(leaf);
    crown.add(g);
    leaves.push(g);
  }
  // Small stem nub under the leaves.
  const stem = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.028, 12, 10), 0.95), leafMat);
  stem.scale.set(1.1, 0.7, 1.1);
  stem.position.set(0, 0.01, 0);
  crown.add(stem);

  const anim = new IdleAnimator(rig, 31);
  let attention = 0;

  return {
    id: 'oddish',
    name: 'Oddish',
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
      for (let i = 0; i < leaves.length; i++) {
        const s = leafSpecs[i];
        leaves[i].rotation.set(
          s.pitch + Math.sin(elapsed * 1.1 + i) * 0.03,
          s.yaw,
          s.roll + Math.sin(elapsed * 1.4 + i * 1.1) * 0.025,
        );
      }
    },
    celebrate: () => anim.celebrate(),
    dispose: () => disposeCreature(rig.root),
  };
}

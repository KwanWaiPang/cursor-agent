import * as THREE from 'three';
import { metaSurface, type Ball } from '../../fx/Sculpt';
import { creatureSkin } from '../../fx/CreatureMaterials';
import { clamp } from '../../core/Noise';
import { TYPE_COLOR, dexEntry, type DexTypeId } from '../dex';
import { createRig, IdleAnimator, finishBody, disposeCreature, type Creature } from './shared';

/**
 * GenericCreature — a readable stand-in for any Kanto species that does not
 * yet have a hand-authored sculpt. Body scale follows dex height; colours
 * follow primary/secondary types. Enough to battle and browse the dex.
 */

function paintFlat(geo: THREE.BufferGeometry, shade = 1): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  c.fill(shade);
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function paintBelly(geo: THREE.BufferGeometry, factor: number): void {
  if (!geo.attributes.color) paintFlat(geo, 1);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const ny = nor.getY(i);
    const m = clamp((-ny - 0.1) * 1.4, 0, 1);
    if (m <= 0) continue;
    col.setXYZ(
      i,
      col.getX(i) * (1 + (factor - 1) * m),
      col.getY(i) * (1 + (factor - 1) * m),
      col.getZ(i) * (1 + (factor - 1) * m * 0.85),
    );
  }
  col.needsUpdate = true;
}

export function buildGenericCreature(slug: string): Creature {
  const entry = dexEntry(slug);
  const types = (entry?.types ?? ['normal']) as DexTypeId[];
  const primary = types[0] ?? 'normal';
  const secondary = types[1];
  const color = TYPE_COLOR[primary] ?? 0xa8a878;
  const accent = secondary ? TYPE_COLOR[secondary] : color;

  // Height in metres → body scale. Typical early-game mons are 0.3–1.2 m.
  const metres = (entry?.height ?? 7) / 10;
  const scale = clamp(0.55 + metres * 0.55, 0.55, 1.45);

  const rig = createRig();
  rig.root.name = entry?.name ?? slug;
  rig.root.scale.setScalar(scale);

  const skin = creatureSkin({
    color,
    subsurface: new THREE.Color(color).multiplyScalar(0.45).getHex(),
    wrap: 0.14,
    rim: 0.06,
    roughness: 0.86,
    detail: 'pores',
    detailScale: 6,
  });
  skin.vertexColors = true;
  skin.envMapIntensity = 0.2;

  const accentMat = creatureSkin({
    color: accent,
    subsurface: new THREE.Color(accent).multiplyScalar(0.4).getHex(),
    wrap: 0.12,
    rim: 0.05,
    roughness: 0.82,
    detail: 'pores',
    detailScale: 5,
  });
  accentMat.vertexColors = true;

  // Archetype cues from typing.
  const flying = types.includes('flying');
  const bug = types.includes('bug');
  const snake = /ekans|arbok|dratini|dragonair/.test(slug) || (types.includes('dragon') && metres < 2);
  const biped = !snake && !bug && metres >= 0.6;

  const bodyBalls: Ball[] = [];
  if (snake) {
    bodyBalls.push(
      { x: 0, y: 0.06, z: 0.1, r: 0.055, sx: 1.1, sy: 0.9 },
      { x: 0, y: 0.055, z: 0.02, r: 0.05, sx: 1.05 },
      { x: 0, y: 0.05, z: -0.06, r: 0.045 },
      { x: 0, y: 0.045, z: -0.13, r: 0.038 },
      { x: 0, y: 0.04, z: -0.18, r: 0.028 },
    );
  } else if (bug) {
    bodyBalls.push(
      { x: 0, y: 0.07, z: 0.06, r: 0.055, sx: 1.05, sy: 0.9 },
      { x: 0, y: 0.065, z: -0.02, r: 0.05, sx: 1.1 },
      { x: 0, y: 0.06, z: -0.09, r: 0.042 },
    );
    for (const z of [0.05, -0.02, -0.08]) {
      for (const s of [1, -1]) {
        bodyBalls.push({ x: s * 0.04, y: 0.02, z, r: 0.014, sy: 0.55 });
      }
    }
  } else {
    bodyBalls.push(
      { x: 0, y: biped ? 0.12 : 0.08, z: 0, r: biped ? 0.07 : 0.08, sx: 1.05, sy: biped ? 1.15 : 0.9, sz: 1.0 },
      { x: 0, y: biped ? 0.08 : 0.05, z: 0.02, r: 0.055, sx: 1.0, sy: 0.8 },
    );
    if (biped) {
      for (const s of [1, -1]) {
        bodyBalls.push({ x: s * 0.035, y: 0.04, z: 0.01, r: 0.022, sy: 1.3 });
        bodyBalls.push({ x: s * 0.035, y: 0.015, z: 0.02, r: 0.02, sx: 0.9, sy: 0.55, sz: 1.2 });
      }
    } else {
      for (const s of [1, -1]) {
        bodyBalls.push({ x: s * 0.045, y: 0.02, z: 0.04, r: 0.022, sy: 0.55, sz: 1.1 });
        bodyBalls.push({ x: s * 0.045, y: 0.02, z: -0.04, r: 0.02, sy: 0.55 });
      }
    }
  }

  const bodyGeo = metaSurface(bodyBalls, { resolution: 32, smooth: 0.95, padding: 0.03 });
  paintBelly(bodyGeo, 1.35);
  const body = finishBody(new THREE.Mesh(bodyGeo, skin), new THREE.Vector3(0, 0.08, 0), 0.24);
  rig.body.add(body);

  const headY = snake ? 0.08 : bug ? 0.1 : biped ? 0.2 : 0.14;
  const headZ = snake ? 0.14 : bug ? 0.08 : 0.06;
  rig.head.position.set(0, headY, headZ);

  const headBalls: Ball[] = [
    { x: 0, y: 0.01, z: 0.01, r: 0.055, sx: 1.08, sy: 0.95, sz: 1.0 },
    { x: 0.03, y: 0, z: 0.015, r: 0.03, sy: 0.9 },
    { x: -0.03, y: 0, z: 0.015, r: 0.03, sy: 0.9 },
  ];
  const headGeo = metaSurface(headBalls, { resolution: 36, smooth: 0.94, padding: 0.025 });
  const headMesh = new THREE.Mesh(headGeo, skin);
  finishBody(headMesh, new THREE.Vector3(0, 0.01, 0.01), 0.14);
  rig.head.add(headMesh);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1420 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const s of [1, -1]) {
    const holder = new THREE.Group();
    holder.position.set(s * 0.028, 0.015, 0.048);
    const eye = new THREE.Group();
    eye.name = 'Eye';
    holder.add(eye);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), eyeMat);
    eye.add(ball);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), glintMat);
    glint.position.set(-0.004, 0.005, 0.012);
    eye.add(glint);
    const blinkGeo = new THREE.SphereGeometry(0.015, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    blinkGeo.deleteAttribute('uv');
    const blink = new THREE.Mesh(paintFlat(blinkGeo, 1), skin);
    blink.scale.y = 0;
    holder.add(blink);
    rig.head.add(holder);
    rig.eyes.push(eye);
    rig.eyelids.push(blink);
  }

  // Type accent: ears / crest / wings
  if (flying) {
    for (const s of [1, -1]) {
      const wing = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.04, 12, 10), 1), accentMat);
      wing.scale.set(0.35, 0.9, 1.4);
      wing.position.set(s * 0.07, biped ? 0.14 : 0.1, -0.02);
      wing.rotation.z = s * 0.5;
      wing.castShadow = true;
      rig.body.add(wing);
      rig.extras.push(wing);
    }
  } else if (types.includes('electric')) {
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(paintFlat(new THREE.ConeGeometry(0.018, 0.06, 8), 1), accentMat);
      ear.position.set(s * 0.04, 0.05, 0);
      ear.rotation.z = s * -0.25;
      ear.castShadow = true;
      rig.head.add(ear);
    }
  } else if (types.includes('grass')) {
    const leaf = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.035, 12, 10), 1), accentMat);
    leaf.scale.set(0.5, 1.2, 0.35);
    leaf.position.set(0, 0.06, -0.01);
    leaf.castShadow = true;
    rig.head.add(leaf);
  } else if (secondary) {
    const patch = new THREE.Mesh(paintFlat(new THREE.SphereGeometry(0.03, 12, 10), 1), accentMat);
    patch.scale.set(1.2, 0.5, 0.8);
    patch.position.set(0, biped ? 0.1 : 0.07, 0.02);
    rig.body.add(patch);
  }

  const anim = new IdleAnimator(rig, (entry?.id ?? 1) * 17);
  let attention = 0;

  return {
    id: slug,
    name: entry?.name ?? slug,
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
      for (const extra of rig.extras) {
        extra.rotation.y = Math.sin(elapsed * 1.5) * 0.08;
      }
    },
    celebrate: () => anim.celebrate(),
    dispose: () => disposeCreature(rig.root),
  };
}

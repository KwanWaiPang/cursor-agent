import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { clamp } from '../../core/Noise';
import { dexEntry } from '../dex';
import type { Creature, SpeciesId } from './shared';

/**
 * Remote GLB creatures from Pokemon-3D-api/assets (Draco + WebP optimized).
 *
 * Models are loaded at runtime from jsDelivr/GitHub — not committed to the
 * repo. Nintendo owns the IP; this is a fan-integration path requested for
 * the hub build. Failures fall back to the procedural sculpt pipeline.
 */

const ASSET_BASE =
  'https://cdn.jsdelivr.net/gh/Pokemon-3D-api/assets@main/models/opt/regular';
const ASSET_FALLBACK =
  'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular';
const DRACO_DECODER =
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

/** Target on-stage height in metres (battle / lab table scale). */
const TARGET_HEIGHT = 0.52;

let loader: GLTFLoader | null = null;
const templateCache = new Map<number, Promise<THREE.Group>>();

function getLoader(): GLTFLoader {
  if (loader) return loader;
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_DECODER);
  loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

export function glbUrlForDexId(id: number, mirror: 'cdn' | 'raw' = 'cdn'): string {
  const base = mirror === 'cdn' ? ASSET_BASE : ASSET_FALLBACK;
  return `${base}/${id}.glb`;
}

function nationalId(species: SpeciesId): number | null {
  const e = dexEntry(species);
  return e ? e.id : null;
}

function loadGltf(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (gltf) => {
        const root = gltf.scene || gltf.scenes[0];
        if (!root) {
          reject(new Error(`empty gltf: ${url}`));
          return;
        }
        // Stash animation clips on the template for instances to pick up.
        root.userData.clips = gltf.animations ?? [];
        resolve(root);
      },
      undefined,
      (err) => reject(err),
    );
  });
}

async function loadTemplate(id: number): Promise<THREE.Group> {
  let pending = templateCache.get(id);
  if (!pending) {
    pending = (async () => {
      try {
        return await loadGltf(glbUrlForDexId(id, 'cdn'));
      } catch {
        return await loadGltf(glbUrlForDexId(id, 'raw'));
      }
    })();
    templateCache.set(id, pending);
  }
  return pending;
}

function normalizeStance(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const size = new THREE.Vector3();
  box.getSize(size);
  const height = Math.max(size.y, 1e-3);
  const scale = TARGET_HEIGHT / height;
  root.scale.multiplyScalar(scale);

  root.updateMatrixWorld(true);
  box.setFromObject(root);
  // Sit on the ground plane (y = 0).
  root.position.y -= box.min.y;
  // Centre on XZ.
  const center = new THREE.Vector3();
  box.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
}

function prepareMaterials(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (std && 'envMapIntensity' in std) {
        std.envMapIntensity = Math.min(std.envMapIntensity ?? 1, 0.85);
        std.needsUpdate = true;
      }
    }
  });
}

function pickIdleClip(clips: THREE.AnimationClip[]): THREE.AnimationClip | null {
  if (!clips.length) return null;
  const named = clips.find((c) => /idle|wait|breath|stand|loop/i.test(c.name));
  return named ?? clips[0];
}

export async function loadGlbCreature(species: SpeciesId): Promise<Creature> {
  const id = nationalId(species);
  if (id == null) throw new Error(`no dex id for ${species}`);

  const template = await loadTemplate(id);
  const model = cloneSkinned(template) as THREE.Group;
  model.name = `glb.${species}`;
  // Drop world transforms from the asset authoring scene.
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  normalizeStance(model);
  prepareMaterials(model);

  const clips = (template.userData.clips as THREE.AnimationClip[]) ?? [];
  const mixer = clips.length ? new THREE.AnimationMixer(model) : null;
  const idle = pickIdleClip(clips);
  if (mixer && idle) {
    const action = mixer.clipAction(idle);
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.play();
  }

  const group = new THREE.Group();
  group.name = species;
  group.add(model);

  const entry = dexEntry(species);
  let attention = 0;
  let celebrateT = -1;
  const baseYaw = 0;

  return {
    id: species,
    name: entry?.name ?? species,
    group,
    get attention() {
      return attention;
    },
    set attention(v: number) {
      attention = clamp(v, 0, 1);
    },
    update(dt, elapsed) {
      mixer?.update(dt);
      // Soft attention lean + idle sway when the asset has no clips.
      if (!mixer) {
        model.rotation.y = baseYaw + Math.sin(elapsed * 0.7) * (0.06 + attention * 0.08);
        model.position.y = Math.sin(elapsed * 1.6) * 0.004;
      } else {
        model.rotation.y = baseYaw + Math.sin(elapsed * 0.5) * attention * 0.05;
      }
      if (celebrateT >= 0) {
        celebrateT += dt;
        if (celebrateT > 1.2) {
          celebrateT = -1;
          group.position.y = 0;
          group.rotation.y = 0;
        } else {
          const hop = Math.abs(Math.sin(celebrateT * Math.PI * 2.2)) * Math.max(0, 1 - celebrateT / 1.2);
          group.position.y = hop * 0.1;
          group.rotation.y = Math.sin(celebrateT * Math.PI * 3) * 0.25 * Math.max(0, 1 - celebrateT / 1.2);
        }
      }
    },
    celebrate() {
      celebrateT = 0;
    },
    dispose() {
      mixer?.stopAllAction();
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.normalMap?.dispose();
          std.roughnessMap?.dispose();
          std.metalnessMap?.dispose();
          std.emissiveMap?.dispose();
          std.dispose?.();
        }
      });
    },
  };
}

/** Prefetch a set of national ids (starters, common wilds). */
export function prefetchGlbIds(ids: number[]): void {
  for (const id of ids) void loadTemplate(id).catch(() => undefined);
}

export function clearGlbCache(): void {
  templateCache.clear();
}

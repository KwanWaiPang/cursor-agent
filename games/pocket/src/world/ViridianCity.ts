import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EVENTS, type GameContext } from '../core/Context';
import { PlayerData } from '../gameplay/battle/PlayerData';
import { VIRIDIAN } from './viridianLayout';

/**
 * Viridian City — a playable south expansion past the Route 1 gate.
 *
 * Intentionally lighter than Pallet Town's house pipeline: merged chamfered
 * boxes, a handful of NPCs, and door-front interactables (heal / mart / gym).
 * Walking +Z through the forest lands on the plaza; the gym faces the square.
 */

const GYM_TRAINER = '常青馆主';
const GYM_MON = 'sandshrew' as const;
const GYM_LEVEL = 8;

type Bucket = Map<string, THREE.BufferGeometry[]>;

function box(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

function cyl(
  rTop: number,
  rBot: number,
  h: number,
  x: number,
  y: number,
  z: number,
  segs = 10,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  g.translate(x, y + h / 2, z);
  return g;
}

function push(bucket: Bucket, key: string, geo: THREE.BufferGeometry): void {
  const list = bucket.get(key);
  if (list) list.push(geo);
  else bucket.set(key, [geo]);
}

function paintSign(title: string, sub: string, w = 512, h = 220): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#c4a574';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#3a2a18';
    c.strokeStyle = '#6b4a2e';
    c.lineWidth = 10;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = '#2f5a3a';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 56px "Noto Serif SC", serif';
    c.fillText(title, w / 2, h * 0.38);
    c.font = '600 32px "Noto Serif SC", serif';
    c.fillText(sub, w / 2, h * 0.72);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function say(ctx: GameContext, speaker: string, lines: string[]): void {
  ctx.events.emit(EVENTS.SAY, { speaker, lines });
}

export function buildViridianCity(ctx: GameContext): void {
  const group = new THREE.Group();
  group.name = 'viridian-city';
  ctx.scene.add(group);

  const gh = (x: number, z: number) => ctx.collision.groundHeight(x, z);
  const bucket: Bucket = new Map();
  const mats: Record<string, THREE.MeshStandardMaterial> = {
    plaster: new THREE.MeshStandardMaterial({ color: 0xe8d9c4, roughness: 0.86, metalness: 0.02 }),
    salmon: new THREE.MeshStandardMaterial({ color: 0xe8a090, roughness: 0.84, metalness: 0.02 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x6a8eb8, roughness: 0.82, metalness: 0.04 }),
    brick: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9, metalness: 0.02 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xf2e6c9, roughness: 0.78, metalness: 0.02 }),
    roofRed: new THREE.MeshStandardMaterial({ color: 0xb84332, roughness: 0.72, metalness: 0.04 }),
    roofBlue: new THREE.MeshStandardMaterial({ color: 0x3d5a8a, roughness: 0.74, metalness: 0.04 }),
    roofBrown: new THREE.MeshStandardMaterial({ color: 0x6b3d24, roughness: 0.8, metalness: 0.03 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8f7c, roughness: 0.92, metalness: 0.04 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.88, metalness: 0.02 }),
    trim: new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.55, metalness: 0.06 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a322c, roughness: 0.7, metalness: 0.08 }),
    water: new THREE.MeshStandardMaterial({ color: 0x6cb4d4, roughness: 0.18, metalness: 0.12 }),
  };

  function placeBuilding(
    cx: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    wall: string,
    roof: string,
    tag: string,
  ): number {
    const gy = gh(cx, cz);
    push(bucket, wall, box(w, h, d, cx, gy, cz));
    push(bucket, roof, box(w + 0.55, 0.38, d + 0.55, cx, gy + h, cz));
    push(bucket, 'trim', box(w * 0.22, h * 0.42, 0.12, cx, gy + h * 0.22, cz - d * 0.51));
    ctx.collision.addBox(cx, cz, w * 0.48, d * 0.48, gy - 0.3, gy + h + 0.4, 0, tag);
    return gy;
  }

  /* ---- Pokémon Center (west) -------------------------------------- */
  const cx = -8.3;
  const cz = 53.1;
  const gyC = placeBuilding(cx, cz, 7.4, 6.4, 4.15, 'salmon', 'roofRed', 'viridian-center');
  push(bucket, 'trim', box(2.2, 0.55, 0.16, cx, gyC + 3.55, cz - 3.28));
  push(bucket, 'dark', box(1.35, 2.15, 0.18, cx + 1.7, gyC, cz - 3.22));
  ctx.interaction.register({
    id: 'viridian.center',
    position: new THREE.Vector3(cx + 1.7, gyC + 1.2, cz - 3.5),
    radius: 2.8,
    label: '精灵中心',
    onInteract: () => {
      if (!PlayerData.hasStarter) {
        say(ctx, '乔伊', ['欢迎光临精灵中心。', '你还没有伙伴呢——先去真新镇大木研究所看看吧。']);
        return;
      }
      PlayerData.healAll();
      say(ctx, '乔伊', ['您的宝可梦已经恢复精神了！', '常青道馆就在广场南边，加油。']);
    },
  });

  /* ---- Mart (east) ------------------------------------------------ */
  const mx = 10.7;
  const mz = 53.1;
  const gyM = placeBuilding(mx, mz, 6.4, 5.8, 3.7, 'blue', 'roofBlue', 'viridian-mart');
  push(bucket, 'dark', box(1.25, 2.05, 0.18, mx - 1.55, gyM, mz - 2.95));
  let boughtPotion = false;
  ctx.interaction.register({
    id: 'viridian.mart',
    position: new THREE.Vector3(mx - 1.55, gyM + 1.15, mz - 3.2),
    radius: 2.6,
    label: '便利店',
    onInteract: () => {
      if (!PlayerData.hasStarter) {
        say(ctx, '店员', ['欢迎光临常青市便利店。', '等你有了伙伴，随时可以来买伤药。']);
        return;
      }
      if (!boughtPotion) {
        boughtPotion = true;
        PlayerData.healAll();
        say(ctx, '店员', ['给，这瓶伤药请收下。', '伙伴看起来精神多了。欢迎再来。']);
        return;
      }
      say(ctx, '店员', ['货架上还有伤药和精灵球——这次旅行先带这些就够了。']);
    },
  });

  /* ---- Gym (south of plaza) --------------------------------------- */
  const gx = 1.35;
  const gz = 62.6;
  const gyG = placeBuilding(gx, gz, 9.2, 7.6, 4.6, 'brick', 'roofBrown', 'viridian-gym');
  for (const sx of [-2.4, 2.4]) {
    push(bucket, 'stone', cyl(0.28, 0.32, 3.4, gx + sx, gyG, gz - 3.95, 8));
  }
  push(bucket, 'timber', box(3.6, 0.28, 0.7, gx, gyG + 3.45, gz - 3.95));
  push(bucket, 'dark', box(1.7, 2.4, 0.2, gx, gyG, gz - 3.85));
  let gymWon = false;
  ctx.interaction.register({
    id: 'viridian.gym',
    position: new THREE.Vector3(gx, gyG + 1.3, gz - 4.2),
    radius: 3.2,
    label: '常青道馆',
    onInteract: () => {
      if (gymWon) {
        say(ctx, GYM_TRAINER, ['徽章已经给你了。', '常青之旅完成——森林里还能继续练级。']);
        return;
      }
      if (!PlayerData.hasStarter) {
        say(ctx, GYM_TRAINER, ['没有伙伴就想挑战道馆？', '先去真新镇大木研究所选择御三家。']);
        return;
      }
      say(ctx, GYM_TRAINER, ['我是常青馆主。地面系是我的骄傲——', '让我看看你从真新镇带来的伙伴！']);
      ctx.events.emit('battle:encounter', {
        species: GYM_MON,
        level: GYM_LEVEL,
        seed: (ctx.seed ^ 0x61d) >>> 0,
        trainer: GYM_TRAINER,
      });
    },
  });

  ctx.events.on('battle:end', (payload) => {
    const p = payload as { result?: string; trainer?: string } | undefined;
    if (p?.result === 'victory' && p.trainer === GYM_TRAINER) {
      gymWon = true;
      ctx.events.emit(EVENTS.ENTER_ZONE, 'gym-won');
    }
  });

  /* ---- Cottages --------------------------------------------------- */
  placeBuilding(-11.2, 59.2, 5.6, 5.2, 3.35, 'cream', 'roofRed', 'viridian-house-w');
  placeBuilding(12.6, 59.2, 5.6, 5.2, 3.35, 'plaster', 'roofBlue', 'viridian-house-e');

  /* ---- Plaza fountain + cobbles ---------------------------------- */
  const px = 1.4;
  const pz = 56.2;
  const gyP = gh(px, pz);
  push(bucket, 'stone', cyl(1.55, 1.7, 0.42, px, gyP, pz, 16));
  push(bucket, 'water', cyl(1.15, 1.15, 0.12, px, gyP + 0.36, pz, 16));
  push(bucket, 'stone', cyl(0.22, 0.28, 0.85, px, gyP + 0.4, pz, 8));

  /* ---- Path lamps ------------------------------------------------- */
  for (const [lx, lz] of [
    [-3.4, 49.2],
    [6.2, 49.2],
    [-3.6, 40.6],
    [6.4, 40.6],
    [-3.2, 35.4],
    [6.1, 35.4],
  ] as [number, number][]) {
    const y = gh(lx, lz);
    push(bucket, 'timber', cyl(0.07, 0.08, 2.35, lx, y, lz, 8));
    push(bucket, 'trim', new THREE.SphereGeometry(0.16, 10, 8).translate(lx, y + 2.45, lz));
  }

  /* ---- Merge buckets --------------------------------------------- */
  bucket.forEach((geos, key) => {
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mats[key] ?? mats.plaster);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `viridian.${key}`;
    group.add(mesh);
    for (const g of geos) g.dispose();
  });

  /* ---- Signs ------------------------------------------------------ */
  addSign(ctx, group, 4.6, 40.2, '常青森林', '南边：常青市', 'viridian.sign.forest', [
    '常青森林。高草里会出现绿毛虫、独角虫和走路草一类。',
    '沿土路一直走，就能看见常青市的广场。',
  ]);
  addSign(ctx, group, 4.8, 49.4, '常青市', '精灵中心 · 道馆', 'viridian.sign.city', [
    '欢迎来到常青市。',
    '西边精灵中心可以回复，东边便利店有伤药，南边是道馆。',
  ]);

  /* ---- NPCs ------------------------------------------------------- */
  addNpc(ctx, group, -2.2, 55.4, 0x3d6b4a, '居民', [
    '真新镇来的？穿过森林可不容易。',
    '馆主专攻地面系——用水或草会轻松一些。',
  ]);
  addNpc(ctx, group, 5.4, 57.8, 0xc45c4a, '小孩', [
    '广场喷泉旁边风好舒服。',
    '我在森林里见过皮卡丘！一闪就没了。',
  ]);

  /* ---- Zone tracker ---------------------------------------------- */
  let zone = '';
  ctx.tick(() => {
    const z = ctx.camera.position.z;
    let next = '';
    if (z > VIRIDIAN.cityZ0) next = 'viridian-city';
    else if (z > VIRIDIAN.forestZ0) next = 'viridian-forest';
    if (next && next !== zone) {
      zone = next;
      ctx.events.emit(EVENTS.ENTER_ZONE, next);
    }
  });
}

function addSign(
  ctx: GameContext,
  group: THREE.Group,
  x: number,
  z: number,
  title: string,
  sub: string,
  id: string,
  lines: string[],
): void {
  const gy = ctx.collision.groundHeight(x, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.08, 1.7, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.88 }),
  );
  pole.position.set(x, gy + 0.85, z);
  pole.castShadow = true;
  group.add(pole);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.78, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.8 }),
  );
  board.position.set(x, gy + 1.72, z);
  group.add(board);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.58, 0.68),
    new THREE.MeshBasicMaterial({ map: paintSign(title, sub) }),
  );
  face.position.set(x, gy + 1.72, z + 0.05);
  group.add(face);
  ctx.collision.addBox(x, z, 0.22, 0.18, gy - 0.2, gy + 2.1, 0, id);
  ctx.interaction.register({
    id,
    position: new THREE.Vector3(x, gy + 1.4, z),
    radius: 2.8,
    label: '阅读路牌',
    onInteract: () => say(ctx, title, lines),
  });
}

function addNpc(
  ctx: GameContext,
  group: THREE.Group,
  x: number,
  z: number,
  shirt: number,
  name: string,
  lines: string[],
): void {
  const gy = ctx.collision.groundHeight(x, z);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.72, 4, 8),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.78 }),
  );
  body.position.set(x, gy + 0.92, z);
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2d2b6, roughness: 0.7 }),
  );
  head.position.set(x, gy + 1.55, z);
  head.castShadow = true;
  group.add(head);
  ctx.collision.addBox(x, z, 0.28, 0.28, gy, gy + 1.7, 0, `npc.${name}`);
  ctx.interaction.register({
    id: `npc.${name}`,
    position: new THREE.Vector3(x, gy + 1.1, z),
    radius: 2.4,
    label: `和${name}说话`,
    facingDot: 0.15,
    onInteract: () => say(ctx, name, lines),
  });
}

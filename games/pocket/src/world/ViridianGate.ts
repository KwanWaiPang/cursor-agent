import * as THREE from 'three';
import { EVENTS, type GameContext } from '../core/Context';

/**
 * Modest Viridian City gate at the south end of Route 1 — an entrance, not a town.
 */
export function buildViridianGate(ctx: GameContext): void {
  const gx = 1.55;
  const gz = 32.15;
  const gy = ctx.collision.groundHeight(gx, gz);
  const group = new THREE.Group();
  group.name = 'viridian-gate';
  group.position.set(gx, gy, gz);

  const stone = new THREE.MeshStandardMaterial({
    color: 0x8a8f7c,
    roughness: 0.92,
    metalness: 0.04,
  });
  const moss = new THREE.MeshStandardMaterial({ color: 0x4f7a45, roughness: 0.95 });
  const timber = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.88 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe8d9b0, roughness: 0.55 });

  const pillarGeo = new THREE.BoxGeometry(0.72, 3.4, 0.72);
  for (const sx of [-2.35, 2.35]) {
    const p = new THREE.Mesh(pillarGeo, stone);
    p.position.set(sx, 1.7, 0);
    p.castShadow = true;
    p.receiveShadow = true;
    group.add(p);
    ctx.collision.addBox(gx + sx, gz, 0.4, 0.4, gy - 0.4, gy + 3.5, 0, 'viridian-pillar');
  }

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.55, 0.85), stone);
  lintel.position.set(0, 3.45, 0);
  lintel.castShadow = true;
  group.add(lintel);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.22, 1.05), moss);
  cap.position.set(0, 3.8, 0);
  group.add(cap);

  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.08), timber);
  board.position.set(0, 3.42, 0.48);
  group.add(board);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#c4a574';
    c.fillRect(0, 0, 512, 160);
    c.fillStyle = '#2f5a3a';
    c.font = 'bold 72px "Noto Serif SC", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('VIRIDIAN', 256, 58);
    c.font = '600 36px "Noto Serif SC", serif';
    c.fillText('常青市入口', 256, 118);
  }
  const tex = new THREE.CanvasTexture(canvas);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.62),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  sign.position.set(0, 3.42, 0.53);
  group.add(sign);

  for (const sx of [-5.4, 5.4]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 0.4), stone);
    w.position.set(sx, 0.8, 0.4);
    w.castShadow = true;
    group.add(w);
    ctx.collision.addBox(gx + sx, gz + 0.4, 1.6, 0.22, gy - 0.3, gy + 1.8, 0, 'viridian-wall');
  }

  for (const sx of [-3.1, 3.1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 8), timber);
    pole.position.set(sx, 1.2, 1.1);
    pole.castShadow = true;
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), cream);
    lamp.position.set(sx, 2.4, 1.1);
    group.add(lamp);
  }

  ctx.scene.add(group);

  const anchor = new THREE.Vector3(gx, gy + 1.4, gz);
  ctx.interaction.register({
    id: 'viridian.gate',
    position: anchor,
    radius: 4.2,
    label: '查看常青市入口',
    onInteract: () => {
      ctx.events.emit(EVENTS.SAY, {
        speaker: '常青市',
        lines: [
          '常青市入口。',
          '石门后面是更广阔的关都地区——',
          '这次旅行，先熟悉真新镇与１号道路就够了。',
        ],
      });
    },
  });

  let announced = false;
  ctx.tick(() => {
    if (announced) return;
    const p = ctx.camera.position;
    if (p.z > 29.8 && Math.abs(p.x - gx) < 8) {
      announced = true;
      ctx.events.emit(EVENTS.ENTER_ZONE, 'viridian-gate');
    }
  });
}

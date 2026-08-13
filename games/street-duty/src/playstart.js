/**
 * Hub play-start: give normal visits the same immediate combat density the
 * official demo-driver stages — enemies in front of the camera, not only a
 * distant garrison the player has to hunt for.
 *
 * This is NOT the capture harness. It uses the public `ai.spawn` / squad API
 * after the player clicks into the game.
 */
import * as THREE from 'three';
import { isTouchPlay } from './ui/touch.js';

const VARIANTS = ['vanguard', 'breacher', 'irregular'];

function placeOn(ai, x, z, fromY) {
  const g = ai.grid;
  if (g) {
    const ci = g.nearest(x, z, fromY, 8, 2.0);
    if (ci >= 0) {
      return new THREE.Vector3(g.worldX(ci % g.nx), g.floor[ci], g.worldZ((ci / g.nx) | 0));
    }
  }
  const y = ai.groundAt?.(x, z, fromY + 5);
  return Number.isFinite(y) ? new THREE.Vector3(x, y, z) : null;
}

/**
 * Spawn a 2-man fireteam beside/behind the player. Allies use team 0, escort
 * the player, and engage hostiles — they never damage the player.
 */
export function spawnAllyFireteam(engine, n = 2) {
  const ai = engine.ctx.peek('ai');
  if (!ai?.spawn || !ai.createSquad) return 0;
  const cam = engine.camera;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
  else forward.normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const squad = ai.createSquad();
  let made = 0;
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const p = placeOn(
      ai,
      cam.position.x - forward.x * 2.4 + right.x * side * 2.0,
      cam.position.z - forward.z * 2.4 + right.z * side * 2.0,
      cam.position.y
    );
    if (!p) continue;
    const yaw = Math.atan2(-forward.x, -forward.z);
    const a = ai.spawn('ally', p, yaw, { team: 0, allySlot: side });
    squad.add?.(a);
    a.aimTarget?.copy?.(cam.position);
    made++;
  }
  console.info(`[playstart] ally fireteam ${made}`);
  return made;
}

/** Spawn `n` hostiles ahead of the camera between minD..maxD metres. */
export function spawnAssaultWave(engine, n = 5, minD = 38, maxD = 56) {
  const ai = engine.ctx.peek('ai');
  if (!ai?.spawn || !ai.createSquad) return 0;
  const cam = engine.camera;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) return 0;
  forward.normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  const squad = ai.createSquad();
  let made = 0;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const d = minD + (maxD - minD) * t;
    const lat = (i % 2 === 0 ? 1 : -1) * (2.2 + 2.0 * ((i * 7) % 3));
    const p = placeOn(
      ai,
      cam.position.x + forward.x * d + right.x * lat,
      cam.position.z + forward.z * d + right.z * lat,
      cam.position.y
    );
    if (!p) continue;
    const yaw = Math.atan2(cam.position.x - p.x, cam.position.z - p.z);
    const a = ai.spawn(VARIANTS[i % VARIANTS.length], p, yaw, { team: 1 });
    squad.add?.(a);
    a.aimTarget?.copy?.(cam.position);
    made++;
  }
  console.info(`[playstart] assault wave ${made} enemies`);
  return made;
}

/** Push the nearest hostile onto the HUD compass / minimap as the current target. */
export function installStreetObjectives(engine) {
  const ui = engine.ctx.peek('ui');
  const ai = engine.ctx.peek('ai');
  if (!ui || !ai) return;
  ui.banner?.show?.(
    '沿街推进',
    isTouchPlay()
      ? '左摇杆移动 · 右半屏瞄准 · 射/镜/跳/蹲 · 击退8人即胜'
      : 'WASD移动 · 鼠标射击 · R换弹 · Z下蹲 · Q/E探头 · G手雷 · C卧倒 · V近战 · T手电 · Tab切枪 · 击退8人即胜',
    8.5
  );
  const refresh = () => {
    if (engine.__streetCleared) {
      ui.setObjectives([]);
      return;
    }
    const list = typeof ai.getHudActors === 'function' ? ai.getHudActors() : [];
    const player = engine.ctx.peek('player');
    const origin = player?.position ?? engine.camera?.position;
    let best = null;
    let bestD = Infinity;
    for (const a of list) {
      if (!a || a.alive === false || a.friendly) continue;
      const p = a.position ?? a.pos;
      if (!p) continue;
      const d = origin
        ? Math.hypot(p.x - origin.x, p.z - origin.z)
        : 0;
      if (d < bestD) {
        bestD = d;
        best = a;
      }
    }
    if (best?.position || best?.pos) {
      const p = best.position ?? best.pos;
      ui.setObjectives([
        {
          id: 'assault',
          label: '敌',
          name: '前方敌军',
          position: p,
          color: '#ff4a3a',
        },
      ]);
    } else {
      ui.setObjectives([]);
    }
  };
  refresh();
  const id = setInterval(() => {
    if (!engine._running) return;
    refresh();
  }, 400);
  const prev = engine.__streetObjTimer;
  if (prev) clearInterval(prev);
  engine.__streetObjTimer = id;
}

/**
 * Keep pressure on: if the street goes quiet, drop another wave.
 * Call once after enter; it self-schedules via the engine event/update loop.
 */
export function installAssaultDirector(engine, { minAlive = 2, waveSize = 3, cooldown = 12 } = {}) {
  const ai = engine.ctx.peek('ai');
  if (!ai) return () => {};
  // Scale pressure down on low/medium so AI + particles don't tank the GPU.
  const q = engine.config?.quality || 'medium';
  if (q === 'low') {
    minAlive = 1;
    waveSize = 1;
    cooldown = 16;
  } else if (q === 'medium') {
    minAlive = Math.max(2, minAlive);
    waveSize = Math.max(2, waveSize);
    cooldown = Math.min(cooldown, 12);
  }
  // Cap *alive* hostiles — fewer on weak GPUs so each can afford smarter tactics.
  const hardCap = q === 'low' ? 3 : q === 'medium' ? 6 : 12;
  const KILL_GOAL = 8;
  let cool = 2.0;
  let pending = 0;
  let cleared = false;
  const onUpdate = (dt) => {
    const ui = engine.ctx.peek('ui');
    if (!cleared && (ui?.state?.scoreUs || 0) >= KILL_GOAL) {
      cleared = true;
      pending = 0;
      engine.__streetCleared = true;
      ui.banner?.show?.('区域已肃清', `击退 ${KILL_GOAL} 名敌军`, 8);
      ui.setObjectives?.([]);
      return;
    }
    if (cleared) return;
    // Spread respawns across ticks — spawning a full wave on the frame after a
    // wipe stacks with the kill hitch (new skeletons + hitboxes).
    if (pending > 0) {
      spawnAssaultWave(engine, 1, 32, 48);
      pending -= 1;
      cool = pending > 0 ? 0.35 : cooldown;
      return;
    }
    cool -= dt;
    if (cool > 0) return;
    const hostiles = (ai.agents || []).filter((a) => a.alive && a.team !== 0);
    const alive = hostiles.length;
    if (alive >= minAlive) {
      cool = 1.0;
      return;
    }
    // Hard cap living hostiles for hub playability (allies excluded).
    if (alive >= hardCap) {
      cool = cooldown;
      return;
    }
    pending = Math.min(waveSize, hardCap - alive);
    if (pending <= 0) {
      cool = cooldown;
      return;
    }
    spawnAssaultWave(engine, 1, 32, 48);
    pending -= 1;
    cool = pending > 0 ? 0.35 : cooldown;
  };
  const id = setInterval(() => {
    if (!engine._running) return;
    onUpdate(0.25);
  }, 250);
  return () => clearInterval(id);
}

/**
 * Hub play-start: give normal visits the same immediate combat density the
 * official demo-driver stages — enemies in front of the camera, not only a
 * distant garrison the player has to hunt for.
 *
 * This is NOT the capture harness. It uses the public `ai.spawn` / squad API
 * after the player clicks into the game.
 */
import * as THREE from 'three';

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
export function spawnAssaultWave(engine, n = 5, minD = 12, maxD = 26) {
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
    waveSize = 2;
    cooldown = 18;
  } else if (q === 'medium') {
    minAlive = 2;
    waveSize = 2;
    cooldown = 14;
  }
  // Cap *alive* agents — dead bodies still sit in the array until cleaned up.
  const hardCap = q === 'low' ? 4 : q === 'medium' ? 6 : 12;
  let cool = 2.0;
  const onUpdate = (dt) => {
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
    spawnAssaultWave(engine, waveSize, 14, 28);
    cool = cooldown;
  };
  const id = setInterval(() => {
    if (!engine._running) return;
    onUpdate(0.25);
  }, 250);
  return () => clearInterval(id);
}

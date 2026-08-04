import * as THREE from 'three';
import { Engine, QUALITY, type QualityTier } from './core/Engine';
import { EVENTS } from './core/Context';
import { World } from './world/World';
import { PlayerController } from './player/PlayerController';
import { buildStarterSequence } from './gameplay/StarterSequence';
import { BattleSystem } from './gameplay/battle/BattleSystem';
import { prefetchGlbIds } from './gameplay/Pokemon';
import { installAutosave, loadSave } from './gameplay/SaveGame';
import { HUD } from './ui/HUD';
import { AudioDirector } from './audio/Audio';

/** Player spawn: the doorstep of the player's house, facing Oak's lab. */
const SPAWN = new THREE.Vector3(-7.6, 0, 6.2);
const SPAWN_YAW = -0.62;

function resolveQuality(): QualityTier['name'] {
  const q = new URLSearchParams(location.search).get('q')?.toLowerCase();
  if (q && q in QUALITY) return q as QualityTier['name'];
  // Leaner default on small / low-core devices; ?q=high restores full foliage.
  const cores = navigator.hardwareConcurrency || 4;
  const small = matchMedia('(max-width: 900px)').matches;
  if (small || cores <= 4) return 'medium';
  return 'high';
}

async function boot(): Promise<void> {
  const container = document.getElementById('app')!;
  const engine = new Engine(container);
  engine.initPost();
  const tier = resolveQuality();
  engine.setQuality(tier);
  console.info(`[boot] quality=${tier}`);

  const world = new World(engine);
  const hud = new HUD(world.ctx);
  const audio = new AudioDirector(world.ctx);

  await world.build((label, pct) => hud.setLoading(label, pct));

  const player = new PlayerController(world.ctx, SPAWN, SPAWN_YAW);
  player.teleport(SPAWN, SPAWN_YAW);

  buildStarterSequence(world.ctx);
  // Warm Three.js GLB cache for starters + Route 1 fauna (skipped on low).
  if (tier !== 'low') {
    prefetchGlbIds([1, 4, 7, 10, 13, 16, 19, 23, 25, 29, 32, 43]);
  } else {
    prefetchGlbIds([1, 4, 7, 16, 19]);
  }

  const battle = new BattleSystem(world.ctx);

  // Update order: input -> player -> battle (wins the camera) -> world -> hud.
  engine.add({ name: 'player-sys', update: (dt) => player.update(dt) });
  engine.add(battle);
  engine.add({ name: 'world-sys', update: (dt, t) => world.update(dt, t) });
  engine.add({ name: 'hud-sys', update: (dt) => hud.update(dt) });
  engine.add({ name: 'audio-sys', update: (dt) => audio.update(dt) });

  // Interact key.
  engine.add({
    name: 'interact-sys',
    update: () => {
      const dialogueConsumed = hud.dialogue.consumeConfirm();
      if (
        engine.input.wasPressed('KeyE') ||
        engine.input.wasPressed('Enter') ||
        engine.input.wasPressed('NumpadEnter')
      ) {
        if (!dialogueConsumed && !engine.input.suspended) {
          world.interaction.activate();
        }
        world.ctx.events.emit('input:confirm');
      }
    },
  });

  // Expose before save hydrate so loadSave can teleport the player.
  Object.assign(window, { __GAME__: { engine, world, player, hud, battle, THREE } });

  hud.bindSaveActions({
    onContinue: () => {
      loadSave(world.ctx);
    },
    onNewGame: () => {
      /* HUD clears the slot and reloads */
    },
  });

  installAutosave(world.ctx);

  hud.hideLoading();
  engine.start();

  window.dispatchEvent(new CustomEvent('game:ready'));
  world.ctx.events.emit(EVENTS.WORLD_READY);

  container.addEventListener('click', () => {
    engine.input.requestLock();
    audio.unlock();
  });
}

boot().catch((err) => {
  console.error('[boot] failed', err);
  const el = document.getElementById('app');
  if (el) {
    el.innerHTML = `<pre style="color:#f88;padding:24px;font:13px ui-monospace,monospace;white-space:pre-wrap">${
      (err && err.stack) || err
    }</pre>`;
  }
  window.dispatchEvent(new CustomEvent('game:error', { detail: String(err) }));
});

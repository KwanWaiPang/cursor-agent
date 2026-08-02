import { Engine } from './core/engine.js';
import { createConfig } from './core/config.js';
import { resolveQuality, shouldPrewarm } from './core/quality.js';

import { RenderSystem } from './render/index.js';
import { MaterialSystem } from './materials/index.js';
import { SkySystem } from './sky/index.js';
import { WorldSystem } from './world/index.js';
import { PhysicsSystem } from './physics/index.js';
import { PlayerSystem } from './player/index.js';
import { WeaponSystem } from './weapons/index.js';
import { FxSystem } from './fx/index.js';
import { AiSystem } from './ai/index.js';
import { UiSystem } from './ui/index.js';
import { AudioSystem } from './audio/index.js';

import { installShotApi } from './dev/shots.js';
import { prewarm } from './core/prewarm.js';
import { createBootUi } from './bootui.js';
import { spawnAssaultWave, installAssaultDirector } from './playstart.js';

const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
// Deterministic shutter for the pixel gate: the engine does not schedule its own
// frames, the driver advances exactly N of them through window.__PUMP__. Opt-in,
// because tools that measure real frame pacing (tools/perf.mjs) need the loop to
// free-run. See the long comment in src/dev/shots.js.
const lockstep = capture && params.get('lockstep') === '1';

const boot = createBootUi();
const picked = resolveQuality(location.search);
boot.setPhase('init', 'render', 0.02, `画质 ${picked.quality}（${picked.source === 'query' ? 'URL' : '自动'}）`);

const config = createConfig({
  quality: picked.quality,
  deterministic: capture,
});

const canvas = document.getElementById('game');

const engine = new Engine({ canvas, config });

// Registration order is irrelevant — Registry topo-sorts on static deps.
engine
  .add(RenderSystem)
  .add(MaterialSystem)
  .add(SkySystem)
  .add(WorldSystem)
  .add(PhysicsSystem)
  .add(PlayerSystem)
  .add(WeaponSystem)
  .add(FxSystem)
  .add(AiSystem)
  .add(UiSystem)
  .add(AudioSystem);

try {
  await engine.init({
    onProgress: ({ id, ratio }) => {
      // Init is ~70% of the visible bar; prewarm takes the rest when enabled.
      boot.setPhase('init', id, 0.05 + ratio * 0.65, `画质 ${config.quality}`);
    },
  });
} catch (err) {
  console.error('[boot] init failed', err);
  boot.fail(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="position:fixed;inset:0;padding:2rem;color:#f66;background:#000;
       font:12px/1.5 ui-monospace,monospace;overflow:auto;z-index:9999;white-space:pre-wrap">
BOOT FAILURE\n\n${err.stack ?? err.message}</pre>`
  );
  throw err;
}

const shotApi = installShotApi(engine, { capture, lockstep });

// Compile every shader permutation before the frame loop starts. Measured: without
// this, 86 programs compile lazily during play, up to 30 on one frame, producing
// 3.1-3.9 SECOND stalls. See src/core/prewarm.js.
//
// Hub: skip on low (fast first paint); keep for medium+ unless ?prewarm=0.
const doPrewarm = shouldPrewarm(config.quality, location.search);
let warmup;
if (!doPrewarm) {
  warmup = { ok: false, reason: 'disabled for hub quality / ?prewarm=0' };
} else {
  boot.setPhase('prewarm', 'prewarm', 0.72, `画质 ${config.quality}`);
  warmup = await prewarm(engine, {
    onProgress: (r) => boot.setPhase('prewarm', 'prewarm', 0.72 + r * 0.25, `画质 ${config.quality}`),
  });
}
console.info('[boot] quality', picked, 'prewarm', warmup);
window.__PREWARM__ = warmup;
window.__QUALITY__ = picked;

engine.start();

// Capture harness handshake: only flag ready once a frame has actually landed.
//
// BOOT_FRAMES is deliberately a frame COUNT, not a rAF race. In lockstep mode the
// engine has no loop of its own, so we hand-pump exactly this many frames and only
// then raise __READY__; the shot is therefore always applied at engine frame 3, no
// matter how long boot (or pre-warm) took in wall-clock terms.
const BOOT_FRAMES = 3;
if (lockstep) {
  await shotApi.pump(BOOT_FRAMES);
  window.__READY__ = true;
} else {
  await new Promise((resolve) => {
    let warm = 0;
    const readyProbe = () => {
      if (++warm >= BOOT_FRAMES) {
        window.__READY__ = true;
        resolve();
        return;
      }
      requestAnimationFrame(readyProbe);
    };
    requestAnimationFrame(readyProbe);
  });
}

window.__ENGINE__ = engine;

// Hub UX: require an explicit click so users know load finished, and so the
// browser gesture can acquire pointer lock (needed for look / feel playable).
let stopDirector = null;
const enter = () => {
  boot.hide();
  document.getElementById('boot-hint')?.remove();
  engine.input.requestPointerLock();
  document.body.classList.add('is-playing');
  // Official demo-driver stages enemies in front of the camera. Mirror that for
  // normal hub play so the street is not an empty walk to the distant garrison.
  if (!capture) {
    spawnAssaultWave(engine, 6, 11, 24);
    stopDirector = installAssaultDirector(engine, { minAlive: 3, waveSize: 4, cooldown: 10 });
  }
};

if (capture) {
  enter();
} else {
  boot.setPhase('ready', 'ready', 1, `画质 ${config.quality} · 点击开始`);
  boot.showStart(enter);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopDirector?.();
    engine.dispose();
  });
}

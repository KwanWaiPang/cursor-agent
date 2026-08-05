/**
 * Record ~20 minutes of gameplay via Playwright recordVideo → MP4.
 *
 *   POCKET_REC_MINUTES=20 \
 *   POCKET_URL='http://127.0.0.1:4183/index.html?q=low&auto=1' \
 *     node tools/_record-gameplay.mjs
 *
 * Canvas toDataURL / CDP screenshots are too slow or blank under SwiftShader;
 * Chromium's compositor screencast (recordVideo) captures the WebGL surface.
 */
import playwright from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = playwright;
const URL =
  process.env.POCKET_URL ||
  'https://kwanwaipang.github.io/cursor-agent/games/pocket/?q=low&auto=1';
const OUT = process.env.POCKET_REC_OUT || '/opt/cursor/artifacts/pocket-gameplay-video';
const MINUTES = Math.max(0.2, Number(process.env.POCKET_REC_MINUTES || 20));
const W = Number(process.env.POCKET_REC_W || 960);
const H = Number(process.env.POCKET_REC_H || 540);
const PLAY_MS = MINUTES * 60 * 1000;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'pwvideo'), { recursive: true });

const log = (...a) => {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  fs.appendFileSync(path.join(OUT, 'record.log'), `${line}\n`);
};

const WAYPOINTS = [
  { x: 0, y: 0, z: 8, yaw: 0 },
  { x: 0, y: 0, z: -3.2, yaw: 0 },
  { x: -4, y: 0, z: 11, yaw: 0.4 },
  { x: 8, y: 0, z: 4, yaw: -0.8 },
  { x: -9, y: 0, z: -2, yaw: 1.2 },
  { x: 0, y: -60, z: -9, yaw: 0 },
  { x: 0, y: -60, z: -11.2, yaw: 0 },
  { x: 3, y: 0, z: -8, yaw: 2.5 },
];

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--mute-audio',
    '--disable-dev-shm-usage',
    '--force-device-scale-factor=1',
  ],
});

const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: path.join(OUT, 'pwvideo'), size: { width: W, height: H } },
});
const page = await context.newPage();
page.on('pageerror', (e) => log('[PE]', String(e).slice(0, 200)));

log('goto', URL);
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
while (Date.now() - t0 < 180000) {
  if (await page.evaluate(() => !!window.__GAME__)) break;
  await page.waitForTimeout(1000);
}
if (!(await page.evaluate(() => !!window.__GAME__))) {
  log('BOOT_FAIL');
  await context.close();
  await browser.close();
  process.exit(2);
}
const bootMs = Date.now() - t0;
log('boot', bootMs, 'ms');

await page.evaluate(() => {
  const g = window.__GAME__;
  g.engine.input.suspended = false;
  g.engine.input.dragLook = true;
  document.querySelectorAll('.pt-start').forEach((el) => el.classList.add('is-hidden', 'is-gone'));
});

// Starter once
await page.evaluate(async () => {
  const g = window.__GAME__;
  g.player.teleport(new g.THREE.Vector3(0, -60, -11.2), 0);
  let t = [...(g.world.interaction.items?.values?.() || [])].find((b) => /squirtle/i.test(b.id || ''));
  if (!t) return;
  t.onInteract();
  for (let i = 0; i < 10; i++) {
    document.querySelector('.pt-dialogue__next')?.click();
    await new Promise((r) => setTimeout(r, 40));
  }
  t = [...(g.world.interaction.items?.values?.() || [])].find((b) => b.id === t.id);
  t?.onInteract();
  for (let i = 0; i < 14; i++) {
    document.querySelector('.pt-dialogue__next')?.click();
    await new Promise((r) => setTimeout(r, 45));
  }
});
log('starter done');

let tick = 0;
const playStarted = Date.now();

async function act() {
  tick++;
  const mode = tick % 6;
  if (mode === 0 || mode === 3) {
    const wp = WAYPOINTS[tick % WAYPOINTS.length];
    await page.evaluate((w) => {
      const g = window.__GAME__;
      if (g.battle?.phase !== 'idle') return;
      g.player.teleport(new g.THREE.Vector3(w.x, w.y, w.z), w.yaw);
      g.player.frozen = false;
      g.player.movementLocked = false;
      g.engine.input.suspended = false;
    }, wp);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1100);
    await page.keyboard.up('KeyW');
  } else if (mode === 1 || mode === 4) {
    // Keep battles short so the recording stays visually varied.
    await page.evaluate(async () => {
      const g = window.__GAME__;
      const b = g.battle;
      if (b.phase !== 'idle') return;
      if (Math.abs(g.player.state.position.y) > 10) g.player.teleport(new g.THREE.Vector3(-4, 0, 11), 0.3);
      await b.startBattle({ wild: 'rattata', playerMon: 'squirtle', seed: (Date.now() % 500) + 2, wildLevel: 3 });
      b.timeScale = 26;
      const dbg = g.world?.ctx?.scene?.userData?.battleDebug;
      let t = performance.now();
      const pump = async (n) => {
        for (let i = 0; i < n && b.phase !== 'idle'; i++) {
          b.update?.(1 / 60, t + i * 16);
          if (i % 18 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        t = performance.now();
      };
      await pump(90);
      if (b.phase === 'menu') {
        if (Math.random() < 0.4) {
          dbg?.choose?.('fight');
          await pump(25);
          [...document.querySelectorAll('.pt-bbtn')][0]?.click();
          dbg?.move?.(0);
          await pump(180);
        }
        for (let a = 0; a < 6 && b.phase !== 'idle'; a++) {
          if (b.phase === 'moves') {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }));
            await pump(15);
          }
          if (b.phase === 'menu') dbg?.choose?.('run');
          await pump(140);
        }
      }
    });
    // let the on-screen battle animate a bit at wall-clock for the video
    await page.waitForTimeout(900);
  } else if (mode === 2) {
    await page.evaluate(async () => {
      const hud = window.__GAME__.hud;
      hud.dex.show();
      await new Promise((r) => setTimeout(r, 500));
      hud.dex.jumpToQuery?.(String(1 + Math.floor(Math.random() * 40)));
      await new Promise((r) => setTimeout(r, 900));
      hud.dex.close();
    });
  } else {
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(800);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyD');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (g.battle?.phase === 'idle') g.player.state.yaw += 0.4;
    });
  }
}

log(`recording play ${MINUTES} min (after boot)`);
let nextLog = Date.now() + 30000;
while (Date.now() - playStarted < PLAY_MS) {
  try {
    await act();
  } catch (e) {
    log('act err', String(e).slice(0, 140));
  }
  if (Date.now() >= nextLog) {
    log(`elapsed=${((Date.now() - playStarted) / 60000).toFixed(2)}m ticks=${tick}`);
    nextLog = Date.now() + 30000;
  }
  await page.waitForTimeout(120);
}

const videoPath = await page.video().path();
log('closing context to finalize video…');
await context.close();
await browser.close();

const rawWebm = path.join(OUT, 'raw.webm');
fs.copyFileSync(videoPath, rawWebm);
const rawSize = fs.statSync(rawWebm).size;
log('raw webm', rawWebm, `${(rawSize / 1048576).toFixed(1)}MB`);

// Skip boot/loading; keep exactly MINUTES of play when possible.
const bootSkipSec = Math.max(0, Math.floor(bootMs / 1000) - 2);
const mp4 = path.join(OUT, `pocket-play-${MINUTES}min.mp4`);
const ff = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-ss',
    String(bootSkipSec),
    '-i',
    rawWebm,
    '-t',
    String(Math.ceil(MINUTES * 60)),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '22',
    '-movflags',
    '+faststart',
    mp4,
  ],
  { encoding: 'utf8' },
);
if (ff.status !== 0) {
  log('ffmpeg fail', (ff.stderr || '').slice(-500));
  process.exit(3);
}

const probe = spawnSync(
  'ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp4],
  { encoding: 'utf8' },
);
const duration = Number(probe.stdout.trim());
const bytes = fs.statSync(mp4).size;
log('wrote', mp4, `${(bytes / 1048576).toFixed(1)}MB`, `duration=${duration.toFixed(1)}s`);

// Preview stills
spawnSync('ffmpeg', ['-y', '-i', mp4, '-vf', 'fps=1/60', path.join(OUT, 'preview-%02d.jpg')], {
  encoding: 'utf8',
});

fs.writeFileSync(
  path.join(OUT, 'summary.json'),
  JSON.stringify(
    {
      url: URL,
      minutesRequested: MINUTES,
      bootMs,
      bootSkipSec,
      playElapsedMs: Date.now() - playStarted,
      ticks: tick,
      mp4,
      bytes,
      durationSec: duration,
      rawWebm,
    },
    null,
    2,
  ),
);

if (!(duration >= MINUTES * 60 * 0.9)) {
  log('DURATION_SHORT', duration);
  process.exit(4);
}
process.exit(0);

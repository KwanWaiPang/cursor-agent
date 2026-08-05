/**
 * Record ~20 minutes of online gameplay to MP4 via canvas JPEG frames.
 * CDP Page.captureScreenshot often hangs under SwiftShader; canvas.toDataURL is reliable.
 *
 *   POCKET_REC_MINUTES=20 \
 *   POCKET_URL='https://kwanwaipang.github.io/cursor-agent/games/pocket/?q=low&auto=1' \
 *     node tools/_record-gameplay.mjs
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
const FPS = Math.max(1, Number(process.env.POCKET_REC_FPS || 2));
const W = Number(process.env.POCKET_REC_W || 960);
const H = Number(process.env.POCKET_REC_H || 540);
const DURATION_MS = MINUTES * 60 * 1000;
const FRAME_MS = Math.round(1000 / FPS);

const framesDir = path.join(OUT, 'frames');
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  fs.appendFileSync(path.join(OUT, 'record.log'), `${line}\n`);
};

const WAYPOINTS = [
  { x: 0, y: 0, z: 2, yaw: 0 },
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
const page = await browser.newPage({ viewport: { width: W, height: H } });
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
  await browser.close();
  process.exit(2);
}
log('boot', Date.now() - t0, 'ms');

await page.evaluate(() => {
  const g = window.__GAME__;
  g.engine.input.suspended = false;
  g.engine.input.dragLook = true;
  document.querySelectorAll('.pt-start').forEach((el) => el.classList.add('is-hidden', 'is-gone'));
});

// Starter
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

let frame = 0;
let tick = 0;
const started = Date.now();

async function grabFrame() {
  const dataUrl = await page.evaluate(() => {
    const g = window.__GAME__;
    const canvas = g?.engine?.renderer?.domElement;
    if (!canvas) return null;
    try {
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch {
      return null;
    }
  });
  if (!dataUrl?.startsWith('data:image/jpeg')) return false;
  const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const name = path.join(framesDir, `f${String(frame).padStart(6, '0')}.jpg`);
  fs.writeFileSync(name, Buffer.from(b64, 'base64'));
  frame++;
  return true;
}

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
    }, wp);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(900);
    await page.keyboard.up('KeyW');
  } else if (mode === 1 || mode === 4) {
    await page.evaluate(async () => {
      const g = window.__GAME__;
      const b = g.battle;
      if (b.phase !== 'idle') return;
      if (Math.abs(g.player.state.position.y) > 10) g.player.teleport(new g.THREE.Vector3(-4, 0, 11), 0.3);
      await b.startBattle({ wild: 'rattata', playerMon: 'squirtle', seed: (Date.now() % 500) + 2, wildLevel: 3 });
      b.timeScale = 22;
      const dbg = g.world?.ctx?.scene?.userData?.battleDebug;
      const t0 = performance.now();
      for (let i = 0; i < 80 && b.phase !== 'menu'; i++) b.update?.(1 / 60, t0 + i * 16);
      if (b.phase === 'menu') {
        if (Math.random() < 0.45) {
          dbg?.choose?.('fight');
          for (let i = 0; i < 50 && b.phase !== 'moves' && b.phase !== 'idle'; i++) b.update?.(1 / 60, t0 + i * 16);
          dbg?.move?.(0);
        } else {
          dbg?.choose?.('run');
        }
      }
      for (let i = 0; i < 220 && b.phase !== 'idle'; i++) {
        b.update?.(1 / 60, t0 + i * 16);
        if (b.phase === 'menu') dbg?.choose?.('run');
      }
    });
  } else if (mode === 2) {
    await page.evaluate(async () => {
      const hud = window.__GAME__.hud;
      hud.dex.show();
      await new Promise((r) => setTimeout(r, 400));
      hud.dex.jumpToQuery?.(String(1 + Math.floor(Math.random() * 40)));
      await new Promise((r) => setTimeout(r, 700));
      hud.dex.close();
    });
  } else {
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyD');
    await page.evaluate(() => {
      const g = window.__GAME__;
      if (g.battle?.phase === 'idle') g.player.state.yaw += 0.35;
    });
  }
}

log(`recording ${MINUTES} min @ ${FPS} fps`);
let nextFrameAt = Date.now();
let nextActAt = Date.now();

while (Date.now() - started < DURATION_MS) {
  const now = Date.now();
  if (now >= nextActAt) {
    try {
      await act();
    } catch (e) {
      log('act err', String(e).slice(0, 120));
    }
    nextActAt = Date.now() + 2200;
  }
  if (now >= nextFrameAt) {
    const ok = await grabFrame();
    if (!ok && frame < 3) log('frame grab failed early');
    nextFrameAt = Date.now() + FRAME_MS;
    if (frame % (FPS * 30) === 0) {
      log(`frames=${frame} elapsed=${((Date.now() - started) / 60000).toFixed(2)}m`);
    }
  } else {
    await page.waitForTimeout(Math.min(40, nextFrameAt - Date.now()));
  }
}

// final frames
for (let i = 0; i < FPS; i++) await grabFrame();
log('captured frames', frame);
await browser.close();

const listFile = path.join(OUT, 'frames.txt');
const names = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
fs.writeFileSync(listFile, names.map((n) => `file '${path.join(framesDir, n)}'`).join('\n'));

const mp4 = path.join(OUT, `pocket-play-${MINUTES}min.mp4`);
const ff = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(framesDir, 'f%06d.jpg'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '23',
    '-movflags',
    '+faststart',
    mp4,
  ],
  { encoding: 'utf8' },
);
if (ff.status !== 0) {
  log('ffmpeg fail', (ff.stderr || '').slice(-400));
  process.exit(3);
}
const st = fs.statSync(mp4);
log('wrote', mp4, `${(st.size / 1048576).toFixed(1)}MB`);
fs.writeFileSync(
  path.join(OUT, 'summary.json'),
  JSON.stringify(
    {
      url: URL,
      minutes: MINUTES,
      fps: FPS,
      frames: frame,
      mp4,
      bytes: st.size,
      elapsedMs: Date.now() - started,
    },
    null,
    2,
  ),
);
process.exit(0);

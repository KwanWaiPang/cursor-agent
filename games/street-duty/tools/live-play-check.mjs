/**
 * Open a static URL (Pages or local http.server) — NOT demo-driver / capture —
 * click through boot, and sample whether the engine actually runs.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:8765/games/street-duty/';
const ART = '/opt/cursor/artifacts/street-duty-live';
mkdirSync(ART, { recursive: true });
const log = (m) => {
  console.log(m);
  writeFileSync(`${ART}/check.log`, m + '\n', { flag: 'a' });
};

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const cdp = await page.context().newCDPSession(page);
page.on('console', (m) => {
  const t = m.text();
  if (/boot|quality|engine|render|player|error|WebGL|playstart|fail|404/i.test(t)) log(`[console] ${t}`);
});
page.on('pageerror', (e) => log(`[pageerror] ${e}`));

log(`goto ${URL}`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

let state = null;
for (let i = 0; i < 120; i++) {
  state = await page.evaluate(() => ({
    ready: !!window.__READY__,
    quality: window.__QUALITY__ || window.__ENGINE__?.config?.quality,
    startHidden: document.getElementById('boot-start')?.hidden ?? null,
    status: document.getElementById('boot-status')?.textContent || null,
    frame: window.__ENGINE__?.time?.frame ?? 0,
    scriptSrc: document.querySelector('script[type="module"]')?.src || null,
  }));
  if (i % 4 === 0) log(`boot ${JSON.stringify(state)}`);
  if (state.ready && state.startHidden === false) break;
  if (state.ready && state.frame > 0 && state.startHidden == null) break;
  await page.waitForTimeout(1000);
}

const shot = async (name) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, fromSurface: true });
  writeFileSync(`${ART}/${name}.jpg`, Buffer.from(data, 'base64'));
  log(`shot ${name}`);
};

await shot('check-boot');
if (!(state?.ready)) {
  writeFileSync(`${ART}/check-summary.json`, JSON.stringify({ ok: false, state }, null, 2));
  await browser.close();
  process.exit(2);
}

await page.evaluate(() => document.getElementById('boot-start')?.click());
await page.waitForTimeout(1500);
await shot('check-entered');

// Drive input through the engine layer (pointer lock often unavailable headless).
const moved = await page.evaluate(() => {
  const eng = window.__ENGINE__;
  const p = eng.registry.peek('player');
  const ai = eng.registry.peek('ai');
  const before = { x: p.movement.position.x, z: p.movement.position.z };
  eng.input.pointerLocked = true;
  eng.input._pendingDown.add('KeyW');
  for (let i = 0; i < 90; i++) eng.step(performance.now() + i * 16);
  eng.input._pendingUp.add('KeyW');
  eng.step(performance.now() + 2000);
  return {
    quality: eng.config.quality,
    dist: Math.hypot(p.movement.position.x - before.x, p.movement.position.z - before.z),
    alive: (ai?.agents || []).filter((a) => a.alive).length,
    agents: ai?.agents?.length ?? 0,
    frame: eng.time.frame,
    playing: document.body.classList.contains('is-playing'),
  };
});
log(`moved ${JSON.stringify(moved)}`);
await shot('check-play');

const summary = { ok: moved.dist > 0.5 && moved.playing && moved.agents > 0, state, moved };
writeFileSync(`${ART}/check-summary.json`, JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.ok ? 0 : 3);

/**
 * Live Pages playtest (no screenshots — SwiftShader times out on WebGL capture).
 *
 *   POCKET_URL='https://kwanwaipang.github.io/cursor-agent/games/pocket/?q=low&auto=1' \
 *     node tools/_live-play.mjs
 */
import playwright from 'playwright';
import fs from 'node:fs';

const { chromium } = playwright;
const URL =
  process.env.POCKET_URL ||
  'https://kwanwaipang.github.io/cursor-agent/games/pocket/?q=low&auto=1';
const OUT = process.env.POCKET_OUT || '/opt/cursor/artifacts/pocket-live-play';
fs.mkdirSync(OUT, { recursive: true });

const notes = [];
const issues = [];
const log = (...a) => {
  const s = a.join(' ');
  console.log(s);
  fs.appendFileSync(`${OUT}/play.log`, `${s}\n`);
};
const note = (s) => {
  notes.push(s);
  log('[note]', s);
};
const issue = (s) => {
  issues.push(s);
  log('[issue]', s);
};

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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
page.on('pageerror', (e) => {
  consoleErrors.push(String(e));
  log('[PE]', String(e).slice(0, 240));
});
page.on('console', (m) => {
  if (m.type() === 'error') {
    consoleErrors.push(m.text());
    log('[CE]', m.text().slice(0, 240));
  }
});

log('goto', URL);
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

while (Date.now() - t0 < 180000) {
  if (await page.evaluate(() => !!window.__GAME__)) break;
  const pre = await page.evaluate(() => document.querySelector('#app pre')?.textContent?.slice(0, 200));
  if (pre) {
    issue('BOOT_FAIL ' + pre);
    break;
  }
  await page.waitForTimeout(1000);
}
if (!(await page.evaluate(() => !!window.__GAME__))) {
  issue('BOOT_TIMEOUT');
  fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ notes, issues, consoleErrors }, null, 2));
  await browser.close();
  process.exit(2);
}
note(`boot ${Date.now() - t0}ms`);

await page.evaluate(() => {
  const g = window.__GAME__;
  g.engine.input.suspended = false;
  g.engine.input.dragLook = true;
  document.querySelectorAll('.pt-start').forEach((el) => {
    el.classList.add('is-hidden', 'is-gone');
  });
});

const bootMeta = await page.evaluate(() => {
  const g = window.__GAME__;
  const info = g.engine.renderer.info;
  return {
    quality: g.engine.quality?.name,
    drawCalls: info.render.calls,
    tris: info.render.triangles,
    geos: info.memory.geometries,
    hubBack: !!document.querySelector('#hub-back'),
    loadingTitle: document.querySelector('.pt-title')?.textContent || null,
    continueHidden: !!document.querySelector('.pt-card__actions .pt-cta:nth-child(2)')?.hidden,
    newHidden: !!document.querySelector('.pt-cta--ghost')?.hidden,
    mv: [...document.scripts].find((s) => s.src.includes('model-viewer'))?.src || null,
  };
});
log('bootMeta', JSON.stringify(bootMeta));
note(`quality=${bootMeta.quality} tris=${bootMeta.tris} drawCalls=${bootMeta.drawCalls}`);
if (bootMeta.loadingTitle && /PALLET/i.test(bootMeta.loadingTitle)) {
  issue('LOADING_STILL_ENGLISH ' + bootMeta.loadingTitle);
} else if (bootMeta.loadingTitle) {
  note('loading title: ' + bootMeta.loadingTitle);
}
if (bootMeta.mv && /unpkg/.test(bootMeta.mv)) issue('MODEL_VIEWER_UNPKG');
else if (bootMeta.mv) note('model-viewer hosted');

// Starter choose squirtle fully
await page.evaluate(() => {
  const g = window.__GAME__;
  g.player.teleport(new g.THREE.Vector3(0, -60, -11.2), 0);
});
const starter = await page.evaluate(async () => {
  const g = window.__GAME__;
  const list = [...(g.world.interaction.items?.values?.() || [])];
  const balls = list.filter((it) => /starter/i.test(it.id || ''));
  let t = balls.find((b) => /squirtle/i.test(b.id || '')) || balls[2];
  if (!t) return { err: 'no ball' };
  t.onInteract();
  for (let i = 0; i < 10; i++) {
    document.querySelector('.pt-dialogue__next')?.click();
    await new Promise((r) => setTimeout(r, 40));
  }
  const list2 = [...(g.world.interaction.items?.values?.() || [])];
  t = list2.find((b) => b.id === t.id);
  t?.onInteract();
  for (let i = 0; i < 16; i++) {
    document.querySelector('.pt-dialogue__next')?.click();
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 200));
  const raw = localStorage.getItem('pocket.adventure.save.v1');
  const save = raw ? JSON.parse(raw) : null;
  const dbg = g.world.ctx.scene.userData.starterDebug;
  return {
    chosen: dbg?.chosen || null,
    savePartner: save?.partner?.species || null,
    seenN: save?.seen?.length || 0,
  };
});
log('starter', JSON.stringify(starter));
if (starter.err) issue('STARTER ' + starter.err);
if (starter.chosen !== 'squirtle' && starter.savePartner !== 'squirtle') {
  issue('STARTER_NOT_COMMITTED ' + JSON.stringify(starter));
} else note('starter committed ' + (starter.chosen || starter.savePartner));

// Battle
const battle = await page.evaluate(async () => {
  const b = window.__GAME__.battle;
  await b.startBattle({ wild: 'rattata', playerMon: 'squirtle', seed: 3, wildLevel: 3 });
  b.timeScale = 16;
  const t = performance.now();
  for (let i = 0; i < 120; i++) {
    b.update?.(1 / 60, t + i * 16);
    window.__GAME__.engine.step?.(t + i * 16);
    await new Promise((r) => requestAnimationFrame(r));
    if (b.phase === 'menu') break;
  }
  const startVisible = !!document.querySelector('.pt-start.is-on, .pt-start:not(.is-gone):not(.is-hidden)');
  const startGone = document.querySelector('.pt-start')?.classList.contains('is-gone');
  const fight = [...document.querySelectorAll('.pt-bbtn')].map((el) => ({
    aria: el.getAttribute('aria-label'),
    label: el.querySelector('.pt-bbtn__label')?.textContent,
    sub: el.querySelector('.pt-bbtn__sub')?.textContent,
  }));
  // pause should not arm during battle
  window.__GAME__.hud['pauseIfUnlocked']?.();
  const pauseShown = window.__GAME__.hud.start?.visible;
  return { phase: b.phase, startGone, startVisible, fight, pauseShown };
});
log('battle', JSON.stringify(battle));
if (battle.phase !== 'menu') issue('BATTLE_NOT_MENU ' + battle.phase);
else note('battle menu ok');
if (battle.pauseShown) issue('PAUSE_OVER_BATTLE');
else note('pause suppressed during battle');
if (!battle.fight?.[0]?.aria?.includes('战斗')) issue('BATTLE_ARIA_MISSING');
else note('battle aria-label ok');

// Finish battle via flee (pump battle clock only — full engine.step is too slow on SwiftShader)
const fleePhase = await page.evaluate(async () => {
  const g = window.__GAME__;
  const b = g.battle;
  // BattleSystem publishes on the world GameContext scene, not Engine.scene.
  const dbg = g.world?.ctx?.scene?.userData?.battleDebug;
  b.timeScale = 40;
  const pump = async (n) => {
    const t0 = performance.now();
    for (let i = 0; i < n && b.phase !== 'idle'; i++) {
      b.update?.(1 / 60, t0 + i * 16);
      if (i % 24 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  };
  // Prefer accessible button click once, then debug choose + retries if flee fails RNG.
  [...document.querySelectorAll('.pt-bbtn')]
    .find((el) => /逃跑/.test(el.getAttribute('aria-label') || el.textContent || ''))
    ?.click();
  await pump(120);
  for (let attempt = 0; attempt < 6 && b.phase !== 'idle'; attempt++) {
    if (b.phase === 'menu') dbg?.choose?.('run');
    await pump(160);
  }
  return { phase: b.phase, marker: b.marker || null };
});
log('flee', JSON.stringify(fleePhase));
if (fleePhase.phase !== 'idle') issue('FLEE_STUCK ' + JSON.stringify(fleePhase));
else note('battle fled → idle');

// Dex virtualization + 2D missing
const dex = await page.evaluate(async () => {
  const hud = window.__GAME__.hud;
  hud.dex.show();
  await new Promise((r) => setTimeout(r, 80));
  const rows = document.querySelectorAll('.pt-dex__row').length;
  hud.dex.jumpToQuery('850');
  await new Promise((r) => setTimeout(r, 800));
  const detail = document.querySelector('.pt-dex__detail');
  const sprite = detail?.querySelector('.pt-dex__sprite');
  if (sprite) {
    await new Promise((r) => {
      if (sprite.complete && sprite.naturalWidth) return r();
      sprite.onload = () => r();
      sprite.onerror = () => r();
      setTimeout(r, 2500);
    });
  }
  const unknown = detail?.querySelector('.pt-dex__big-name')?.textContent === '？？？';
  hud.dex.close();
  return {
    rows,
    unknown,
    hasSprite: !!sprite,
    spriteOk: !!(sprite && sprite.naturalWidth > 0),
    badge: document.querySelector('.pt-dex__badge')?.textContent || null,
    count: document.querySelector('.pt-dex__count')?.textContent,
  };
});
log('dex', JSON.stringify(dex));
if (dex.rows > 80) issue('DEX_NOT_VIRTUAL ' + dex.rows);
else note(`dex virtual rows=${dex.rows}`);
if (!dex.unknown) issue('DEX_850_SHOULD_BE_UNKNOWN');
else note('dex #850 locked silhouette ok');
if (dex.hasSprite && dex.spriteOk) note('2D fallback loaded');
else if (dex.hasSprite) note('2D sprite element present (load pending/fail under headless)');

const save = await page.evaluate(() => {
  const raw = localStorage.getItem('pocket.adventure.save.v1');
  if (!raw) return null;
  const d = JSON.parse(raw);
  return { partner: d.partner?.species, seen: d.seen?.length, owned: d.owned?.length };
});
log('save', JSON.stringify(save));
if (!save?.partner) issue('SAVE_MISSING_PARTNER');
else note('save partner=' + save.partner);

fs.writeFileSync(
  `${OUT}/summary.json`,
  JSON.stringify({ url: URL, notes, issues, consoleErrors: consoleErrors.slice(0, 30), bootMeta, starter, battle, dex, save }, null, 2),
);
log('\nNOTES');
notes.forEach((n) => log('-', n));
log('ISSUES');
if (!issues.length) log('(none)');
else issues.forEach((i) => log('-', i));
await browser.close();
process.exit(issues.length ? 1 : 0);

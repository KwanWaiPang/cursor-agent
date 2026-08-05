/**
 * Online endurance playtest (≥60 minutes wall-clock).
 *
 *   POCKET_MINUTES=60 \
 *   POCKET_URL='https://kwanwaipang.github.io/cursor-agent/games/pocket/?q=low&auto=1' \
 *     node tools/_endurance-play.mjs
 */
import playwright from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const { chromium } = playwright;
const URL =
  process.env.POCKET_URL ||
  'https://kwanwaipang.github.io/cursor-agent/games/pocket/?q=low&auto=1';
const OUT = process.env.POCKET_OUT || '/opt/cursor/artifacts/pocket-endurance';
const MINUTES = Math.max(1, Number(process.env.POCKET_MINUTES || 60));
const DURATION_MS = MINUTES * 60 * 1000;
const HEARTBEAT_MS = Number(process.env.POCKET_HEARTBEAT_MS || 60_000);

fs.mkdirSync(OUT, { recursive: true });
const logPath = path.join(OUT, 'endurance.log');
const hbPath = path.join(OUT, 'heartbeats.jsonl');
fs.writeFileSync(logPath, '');
fs.writeFileSync(hbPath, '');

const notes = [];
const issues = [];
const heartbeats = [];
const log = (...a) => {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  fs.appendFileSync(logPath, `${line}\n`);
};
const note = (s) => {
  notes.push(s);
  log('[note]', s);
};
const issue = (s) => {
  issues.push(s);
  log('[issue]', s);
};

const WAYPOINTS = [
  { name: 'square', x: 0, y: 0, z: 2, yaw: 0 },
  { name: 'lab-door', x: 0, y: 0, z: -3.2, yaw: 0 },
  { name: 'route-grass', x: -4, y: 0, z: 11, yaw: 0.4 },
  { name: 'east-path', x: 8, y: 0, z: 4, yaw: -0.8 },
  { name: 'west-fence', x: -9, y: 0, z: -2, yaw: 1.2 },
  { name: 'north-trees', x: 3, y: 0, z: -10, yaw: 3.0 },
  { name: 'lab-interior', x: 0, y: -60, z: -9, yaw: 0 },
  { name: 'starter-table', x: 0, y: -60, z: -11.2, yaw: 0 },
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

const tBoot = Date.now();
log('goto', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
while (Date.now() - tBoot < 180000) {
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
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ notes, issues, consoleErrors }, null, 2));
  await browser.close();
  process.exit(2);
}
note(`boot ${Date.now() - tBoot}ms`);

await page.evaluate(() => {
  const g = window.__GAME__;
  g.engine.input.suspended = false;
  g.engine.input.dragLook = true;
  document.querySelectorAll('.pt-start').forEach((el) => el.classList.add('is-hidden', 'is-gone'));
});

// Choose starter once
const starter = await page.evaluate(async () => {
  const g = window.__GAME__;
  g.player.teleport(new g.THREE.Vector3(0, -60, -11.2), 0);
  const list = [...(g.world.interaction.items?.values?.() || [])];
  let t = list.find((b) => /squirtle/i.test(b.id || '')) || list.filter((b) => /starter/i.test(b.id || ''))[2];
  if (!t) return { err: 'no ball' };
  t.onInteract();
  for (let i = 0; i < 10; i++) {
    document.querySelector('.pt-dialogue__next')?.click();
    await new Promise((r) => setTimeout(r, 40));
  }
  t = [...(g.world.interaction.items?.values?.() || [])].find((b) => b.id === t.id);
  t?.onInteract();
  for (let i = 0; i < 16; i++) {
    document.querySelector('.pt-dialogue__next')?.click();
    await new Promise((r) => setTimeout(r, 50));
  }
  const raw = localStorage.getItem('pocket.adventure.save.v1');
  const save = raw ? JSON.parse(raw) : null;
  return { partner: save?.partner?.species || null, seen: save?.seen?.length || 0 };
});
log('starter', JSON.stringify(starter));
if (!starter.partner) issue('STARTER_FAIL');
else note('starter ' + starter.partner);

const playStarted = Date.now();
let tick = 0;
let battles = 0;
let flees = 0;
let fights = 0;
let dexOpens = 0;
let walks = 0;
let recoveries = 0;

async function snapshot() {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) return { alive: false };
    const p = g.player?.state?.position;
    const info = g.engine?.renderer?.info;
    const mem = performance.memory
      ? {
          usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
          totalMB: Math.round(performance.memory.totalJSHeapSize / 1048576),
        }
      : null;
    return {
      alive: true,
      fps: Math.round(g.engine.fps || 0),
      quality: g.engine.quality?.name,
      phase: g.battle?.phase || 'idle',
      battleActive: !!g.world?.ctx?.scene?.userData?.battleActive,
      pos: p ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) } : null,
      drawCalls: info?.render?.calls ?? null,
      tris: info?.render?.triangles ?? null,
      geos: info?.memory?.geometries ?? null,
      textures: info?.memory?.textures ?? null,
      dialogue: !!g.hud?.dialogue?.isOpen,
      dexOpen: !!g.hud?.dex?.isOpen,
      mem,
      titleVisible: !!document.querySelector('.pt-start:not(.is-gone):not(.is-hidden)'),
    };
  });
}

async function ensurePlayable() {
  const st = await snapshot();
  if (!st.alive) {
    issue('GAME_LOST');
    return false;
  }
  if (st.titleVisible && !st.battleActive) {
    await page.evaluate(() => {
      document.querySelectorAll('.pt-start').forEach((el) => el.classList.add('is-hidden', 'is-gone'));
      const g = window.__GAME__;
      g.engine.input.suspended = false;
      g.player.frozen = false;
      g.player.movementLocked = false;
    });
    recoveries++;
  }
  return true;
}

async function walkBurst(seconds = 2.5) {
  await page.evaluate(() => {
    const g = window.__GAME__;
    g.engine.input.suspended = false;
    g.player.frozen = false;
    g.player.movementLocked = false;
  });
  await page.keyboard.down('KeyW');
  if (tick % 3 === 0) await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(seconds * 1000);
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  // small look turn + nudge in case keyboard didn't apply under headless
  await page.evaluate(() => {
    const g = window.__GAME__;
    if (!g?.player || g.battle?.phase !== 'idle') return;
    g.player.state.yaw += (Math.random() - 0.5) * 0.8;
    const yaw = g.player.state.yaw;
    const dist = 0.6 + Math.random() * 1.2;
    const x = g.player.state.position.x - Math.sin(yaw) * dist;
    const z = g.player.state.position.z - Math.cos(yaw) * dist;
    const y = g.player.state.position.y;
    g.player.teleport(new g.THREE.Vector3(x, y, z), yaw);
  });
  walks++;
}

async function goWaypoint(wp) {
  await page.evaluate((w) => {
    const g = window.__GAME__;
    if (g.battle?.phase && g.battle.phase !== 'idle') return false;
    g.player.teleport(new g.THREE.Vector3(w.x, w.y, w.z), w.yaw);
    g.player.frozen = false;
    g.player.movementLocked = false;
    g.engine.input.suspended = false;
    return true;
  }, wp);
  await page.waitForTimeout(150);
  await walkBurst(1.2 + Math.random() * 0.8);
}

async function pumpBattle(preferFight) {
  const r = await page.evaluate(async (fight) => {
    const g = window.__GAME__;
    const b = g.battle;
    if (!b || b.phase === 'idle') return { phase: 'idle' };
    b.timeScale = 28;
    const dbg = g.world?.ctx?.scene?.userData?.battleDebug;
    const t0 = performance.now();
    const pump = async (n) => {
      for (let i = 0; i < n && b.phase !== 'idle'; i++) {
        b.update?.(1 / 60, t0 + i * 16);
        if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    };
    for (let i = 0; i < 90 && b.phase !== 'menu' && b.phase !== 'idle'; i++) {
      b.update?.(1 / 60, t0 + i * 16);
      if (i % 15 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    if (b.phase === 'menu') {
      if (fight) {
        dbg?.choose?.('fight');
        await pump(40);
        dbg?.move?.(0);
        await pump(220);
      } else {
        dbg?.choose?.('run');
        await pump(200);
        for (let a = 0; a < 5 && b.phase !== 'idle'; a++) {
          if (b.phase === 'menu') dbg?.choose?.('run');
          await pump(160);
        }
      }
    }
    // click UI as fallback
    if (b.phase === 'menu') {
      const btn = [...document.querySelectorAll('.pt-bbtn')].find((el) =>
        fight ? /战斗/.test(el.getAttribute('aria-label') || '') : /逃跑/.test(el.getAttribute('aria-label') || ''),
      );
      btn?.click();
      await pump(220);
    }
    return { phase: b.phase, marker: b.marker };
  }, preferFight);
  return r;
}

async function doBattle(preferFight) {
  const started = await page.evaluate(async () => {
    const g = window.__GAME__;
    const b = g.battle;
    if (b.phase !== 'idle') return { ok: false, phase: b.phase };
    // outdoors
    if (Math.abs(g.player.state.position.y) > 10) {
      g.player.teleport(new g.THREE.Vector3(-4, 0, 11), 0.3);
    }
    await b.startBattle({ wild: 'rattata', playerMon: 'squirtle', seed: (Date.now() % 997) + 1, wildLevel: 3 });
    return { ok: true, phase: b.phase };
  });
  if (!started.ok) return;
  battles++;
  const end = await pumpBattle(preferFight);
  if (preferFight) fights++;
  else flees++;
  if (end.phase !== 'idle') {
    // force leave
    await page.evaluate(async () => {
      const g = window.__GAME__;
      const b = g.battle;
      const dbg = g.world?.ctx?.scene?.userData?.battleDebug;
      b.timeScale = 40;
      for (let a = 0; a < 8 && b.phase !== 'idle'; a++) {
        if (b.phase === 'menu') dbg?.choose?.('run');
        const t0 = performance.now();
        for (let i = 0; i < 180 && b.phase !== 'idle'; i++) {
          b.update?.(1 / 60, t0 + i * 16);
          if (i % 24 === 0) await new Promise((r) => setTimeout(r, 0));
        }
      }
    });
  }
  const st = await snapshot();
  if (st.phase !== 'idle' && st.battleActive) issue(`BATTLE_STUCK phase=${st.phase}`);
}

async function doDex() {
  await page.evaluate(async () => {
    const hud = window.__GAME__.hud;
    hud.dex.show();
    await new Promise((r) => setTimeout(r, 120));
    const q = String(1 + Math.floor(Math.random() * 151));
    hud.dex.jumpToQuery?.(q);
    await new Promise((r) => setTimeout(r, 500));
    hud.dex.jumpToQuery?.('850');
    await new Promise((r) => setTimeout(r, 400));
    hud.dex.close();
  });
  dexOpens++;
}

async function heartbeat() {
  const st = await snapshot();
  const elapsedMin = ((Date.now() - playStarted) / 60000).toFixed(2);
  const row = {
    t: new Date().toISOString(),
    elapsedMin: Number(elapsedMin),
    tick,
    battles,
    flees,
    fights,
    dexOpens,
    walks,
    recoveries,
    consoleErrors: consoleErrors.length,
    ...st,
  };
  heartbeats.push(row);
  fs.appendFileSync(hbPath, JSON.stringify(row) + '\n');
  log(
    'HB',
    `t=${elapsedMin}m fps=${st.fps} phase=${st.phase} battles=${battles} walks=${walks} errs=${consoleErrors.length} heap=${st.mem?.usedMB ?? '?'}MB`,
  );
  // SwiftShader headless often reports single-digit FPS — warn only.
  if (st.fps > 0 && st.fps < 8) note(`low fps ${st.fps} at ${elapsedMin}m (swiftshader)`);
  if (st.mem?.usedMB > 900) issue(`HIGH_HEAP ${st.mem.usedMB}MB at ${elapsedMin}m`);
  if (st.titleVisible && st.battleActive) issue('PAUSE_OVER_BATTLE_LIVE');
  fs.writeFileSync(
    path.join(OUT, 'progress.json'),
    JSON.stringify(
      {
        running: true,
        elapsedMs: Date.now() - playStarted,
        targetMs: DURATION_MS,
        battles,
        flees,
        fights,
        dexOpens,
        walks,
        recoveries,
        issues: issues.slice(-20),
        last: row,
      },
      null,
      2,
    ),
  );
}

log(`endurance target ${MINUTES} minutes`);
let nextHb = Date.now();

while (Date.now() - playStarted < DURATION_MS) {
  tick++;
  if (!(await ensurePlayable())) break;

  const mode = tick % 7;
  try {
    if (mode === 0 || mode === 3) {
      const wp = WAYPOINTS[tick % WAYPOINTS.length];
      await goWaypoint(wp);
    } else if (mode === 1) {
      await doBattle(false);
    } else if (mode === 2) {
      await doBattle(true);
    } else if (mode === 4) {
      await doDex();
    } else if (mode === 5) {
      await goWaypoint(WAYPOINTS[2]); // grass
      await walkBurst(3);
    } else {
      await page.evaluate(() => {
        const g = window.__GAME__;
        if (g.battle?.phase !== 'idle') return;
        const ang = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * 6;
        const x = Math.cos(ang) * r;
        const z = 2 + Math.sin(ang) * r;
        g.player.teleport(new g.THREE.Vector3(x, 0, z), ang + Math.PI);
      });
      await walkBurst(2.2);
    }
  } catch (e) {
    issue('TICK_ERR ' + String(e).slice(0, 180));
    recoveries++;
    await page.waitForTimeout(500);
  }

  if (Date.now() >= nextHb) {
    await heartbeat();
    nextHb = Date.now() + HEARTBEAT_MS;
  }

  // keep event loop breathing
  await page.waitForTimeout(80);
}

await heartbeat();
const elapsedMs = Date.now() - playStarted;
const ok = elapsedMs >= DURATION_MS * 0.98 && issues.length < 8 && battles >= Math.max(3, Math.floor(MINUTES / 4));

const summary = {
  url: URL,
  minutesTarget: MINUTES,
  elapsedMs,
  elapsedMin: +(elapsedMs / 60000).toFixed(2),
  ok,
  battles,
  flees,
  fights,
  dexOpens,
  walks,
  recoveries,
  consoleErrors: consoleErrors.slice(0, 40),
  consoleErrorCount: consoleErrors.length,
  issues,
  notes,
  heartbeats: heartbeats.length,
  last: heartbeats[heartbeats.length - 1] || null,
};
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
fs.writeFileSync(
  path.join(OUT, 'progress.json'),
  JSON.stringify({ running: false, ...summary }, null, 2),
);
log('DONE', JSON.stringify({ ok, elapsedMin: summary.elapsedMin, battles, issues: issues.length }));
await browser.close();
process.exit(ok ? 0 : 1);

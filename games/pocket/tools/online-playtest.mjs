/**
 * Online / local playtest for 口袋冒险 FP3D.
 * Drives window.__GAME__ (pointer-lock optional in headless).
 *
 *   POCKET_URL=https://kwanwaipang.github.io/cursor-agent/games/pocket/ \
 *     node games/pocket/tools/online-playtest.mjs
 */
import playwright from "playwright";
import fs from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = playwright;
const URL =
  process.env.POCKET_URL || "https://kwanwaipang.github.io/cursor-agent/games/pocket/";
const OUT = process.env.POCKET_OUT || "/opt/cursor/artifacts/pocket-online-play";
fs.mkdirSync(OUT, { recursive: true });

const issues = [];
const log = (...a) => {
  console.log(...a);
  fs.appendFileSync(resolve(OUT, "play.log"), a.join(" ") + "\n");
};

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--mute-audio",
    "--disable-dev-shm-usage",
    "--force-device-scale-factor=1",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
page.on("pageerror", (e) => {
  consoleErrors.push("pageerror:" + String(e));
  log("[pageerror]", String(e).slice(0, 240));
});
page.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text();
    consoleErrors.push(t);
    log("[console.error]", t.slice(0, 240));
  }
});

log("goto", URL);
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });

// Boot
const t0 = Date.now();
let ready = false;
while (Date.now() - t0 < 180000) {
  const st = await page.evaluate(() => ({
    game: !!window.__GAME__,
    pre: document.querySelector("#app pre")?.textContent?.slice(0, 400) || null,
    loading: document.querySelector(".pt-loading, .pt-load")?.textContent?.slice(0, 80) || null,
  }));
  if (st.pre) {
    issues.push("BOOT_FAIL: " + st.pre);
    log("BOOT_FAIL", st.pre);
    break;
  }
  if (st.game) {
    ready = true;
    log("ready in", Date.now() - t0, "ms");
    break;
  }
  if ((Date.now() - t0) % 15000 < 1200) log("waiting…", Date.now() - t0, st.loading || "");
  await page.waitForTimeout(1000);
}
if (!ready && !issues.length) issues.push("BOOT_TIMEOUT");

async function snap(name) {
  // Prefer CDP with short timeout; ignore hangs
  try {
    const cdp = await page.context().newCDPSession(page);
    const { data } = await Promise.race([
      cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 80, fromSurface: true }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("shot timeout")), 8000)),
    ]);
    fs.writeFileSync(resolve(OUT, name + ".jpg"), Buffer.from(data, "base64"));
    log("snap", name);
  } catch (e) {
    log("snap skip", name, String(e).slice(0, 80));
  }
}

async function info() {
  return page.evaluate(() => {
    const g = window.__GAME__;
    if (!g) return null;
    const p = g.player?.state?.position;
    return {
      pos: p ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) } : null,
      yaw: g.player?.state?.yaw,
      dialogue: !!g.hud?.dialogue?.isOpen,
      dialogueText: g.hud?.dialogue?.el?.innerText?.slice(0, 120) || null,
      battle: g.battle?.phase || g.battle?.state?.() || null,
      starterChosen: !!g.world?.ctx && false,
      fps: Math.round(g.engine?.measuredFps || g.engine?.fps || 0),
      systems: (g.engine?.systems || []).map((s) => s.name).filter(Boolean),
    };
  });
}

if (ready) {
  // Dismiss start overlay if present
  await page.evaluate(() => {
    const g = window.__GAME__;
    const btn = document.querySelector(".pt-cta, .pt-start button, button.pt-cta");
    if (btn) btn.click();
    // Hide start card programmatically
    document.querySelectorAll(".pt-start, .pt-overlay").forEach((el) => {
      el.classList.add("is-hidden", "is-gone");
    });
    g.engine?.input?.requestLock?.();
  });
  await page.waitForTimeout(500);
  await snap("01-spawn");

  const i0 = await info();
  log("spawn", JSON.stringify(i0));
  if (!i0?.pos) issues.push("NO_PLAYER_POS");

  // Walk / teleport toward lab door (north, -Z)
  await page.evaluate(() => {
    const g = window.__GAME__;
    const THREE = g.THREE;
    // Lab entrance ~ (0,0,-4.5) facing north into door
    g.player.teleport(new THREE.Vector3(0, 0, -3.5), 0);
    g.player.state.pitch = 0.05;
    g.player.frozen = false;
    g.player.movementLocked = false;
  });
  await page.waitForTimeout(400);
  await snap("02-lab-approach");

  // Enter lab via interaction or teleport interior
  const enter = await page.evaluate(() => {
    const g = window.__GAME__;
    const items = [...(g.world?.interaction?.items?.values?.() || [])];
    const door = items.find((it) => /研究所|Laboratory|lab/i.test(it.label || it.id || ""));
    if (door?.onInteract) {
      door.onInteract();
      return { via: "interact", label: door.label, id: door.id };
    }
    // Fallback: teleport to interior floor (y=-60)
    const THREE = g.THREE;
    g.player.teleport(new THREE.Vector3(0, -60, -8), 0);
    return { via: "teleport-interior", labels: items.map((i) => i.label).slice(0, 12) };
  });
  log("enter lab", JSON.stringify(enter));
  await page.waitForTimeout(800);
  await snap("03-lab-inside");

  const iLab = await info();
  log("in lab", JSON.stringify(iLab));
  if (iLab?.pos && Math.abs(iLab.pos.y) < 10 && enter.via === "teleport-interior") {
    // still outdoors?
    issues.push("LAB_ENTER_MAY_HAVE_FAILED y=" + iLab.pos.y);
  }

  // Approach starter table and preview/choose squirtle
  const starter = await page.evaluate(async () => {
    const g = window.__GAME__;
    const THREE = g.THREE;
    const items = [...(g.world?.interaction?.items?.values?.() || [])];
    const balls = items.filter((it) => /starter|看看|选择|Look|Choose|妙蛙|小火|杰尼|Bulba|Charm|Squirt/i.test(it.label || it.id || ""));
    // Move to table
    g.player.teleport(new THREE.Vector3(0, -60, -11.2), 0);
    g.player.state.pitch = -0.12;
    await new Promise((r) => setTimeout(r, 200));

    // Trigger intro by proximity (tick should fire)
    for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));

    const result = { balls: balls.map((b) => ({ id: b.id, label: b.label })), steps: [] };

    // Find squirtle slot
    let target =
      balls.find((b) => /squirtle|杰尼/i.test(b.id + b.label)) ||
      balls[2] ||
      balls[0];
    if (!target) {
      result.error = "no starter interactables";
      result.all = items.map((i) => i.id + ":" + i.label).slice(0, 30);
      return result;
    }

    // Preview
    target.onInteract();
    result.steps.push("preview:" + target.label);
    // Advance dialogue
    for (let i = 0; i < 8; i++) {
      if (g.hud?.dialogue?.isOpen) {
        g.hud.dialogue.advance?.() || g.hud.dialogue.onConfirm?.() || document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", key: "e" }));
        // try click next
        document.querySelector(".pt-dialogue__next")?.click();
      }
      await new Promise((r) => setTimeout(r, 80));
    }

    // Re-find item (label may change to 选择)
    const items2 = [...(g.world?.interaction?.items?.values?.() || [])];
    target =
      items2.find((b) => b.id === target.id) ||
      items2.find((b) => /选择|Choose|杰尼|squirtle/i.test(b.label || ""));
    if (target) {
      target.onInteract();
      result.steps.push("commit:" + target.label);
      for (let i = 0; i < 10; i++) {
        document.querySelector(".pt-dialogue__next")?.click();
        if (g.hud?.dialogue?.advance) g.hud.dialogue.advance();
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    // Check player data / starter chosen event flag
    const pd = g.battle?.playerData || null;
    result.party = pd?.party || pd?.starter || null;
    result.hasStarter = !!(pd && (pd.species || pd.party?.length || pd.starterId));
    // Also check from PlayerData module state via battle system
    try {
      result.battlePlayer = g.battle?.playerMon || g.battle?.data || null;
    } catch {}
    return result;
  });
  log("starter", JSON.stringify(starter));
  await snap("04-starter");

  // Probe PlayerData more carefully
  const pdata = await page.evaluate(() => {
    const g = window.__GAME__;
    const b = g.battle;
    const out = {
      battleKeys: b ? Object.keys(b).slice(0, 40) : [],
      phase: b?.phase,
      hasPlayerData: !!b?.playerData,
      species: b?.playerData?.species || b?.playerData?.lead?.species || null,
      name: b?.playerData?.lead?.name || null,
    };
    // scan interaction for chosen state
    const items = [...(g.world?.interaction?.items?.values?.() || [])];
    out.starterLabels = items.filter((i) => /starter/i.test(i.id || "")).map((i) => i.label);
    return out;
  });
  log("pdata", JSON.stringify(pdata));
  if (!pdata.species && !starter.hasStarter) {
    // Not necessarily a bug if PlayerData only sets on STARTER_CHOSEN — check events
    const chosen = await page.evaluate(() => {
      return new Promise((resolve) => {
        const g = window.__GAME__;
        let hit = null;
        const off = g.world.ctx.events.on?.("starter:chosen", (p) => {
          hit = p;
        });
        // re-trigger commit if needed
        const items = [...(g.world?.interaction?.items?.values?.() || [])];
        const sq = items.find((i) => /squirtle/i.test(i.id || ""));
        if (sq) {
          sq.onInteract();
          sq.onInteract();
        }
        setTimeout(() => resolve({ hit, labels: items.map((i) => i.id + ":" + i.label) }), 500);
        void off;
      });
    });
    log("chosen retry", JSON.stringify(chosen));
    if (!chosen.hit && !pdata.species) {
      issues.push("STARTER_NOT_CHOSEN");
    }
  }

  // Exit lab and try wild grass encounter
  await page.evaluate(() => {
    const g = window.__GAME__;
    const THREE = g.THREE;
    // Outside near grass patch used in capture: (-4, 0, 11)
    g.player.teleport(new THREE.Vector3(-4, 0, 11), 0.3);
    g.player.frozen = false;
    g.player.movementLocked = false;
  });
  await page.waitForTimeout(300);

  // Force wild battle if API exists
  const battleStart = await page.evaluate(() => {
    const g = window.__GAME__;
    const b = g.battle;
    if (!b) return { err: "no battle system" };
    if (typeof b.start === "function") {
      b.start({ wild: "rattata", seed: 42 });
      return { via: "start", phase: b.phase };
    }
    if (typeof b.begin === "function") {
      b.begin({ wild: "rattata" });
      return { via: "begin", phase: b.phase };
    }
    // try event
    g.world?.ctx?.events?.emit?.("battle:start", { wild: "rattata" });
    return { via: "event", phase: b.phase, methods: Object.getOwnPropertyNames(Object.getPrototypeOf(b)).slice(0, 30) };
  });
  log("battleStart", JSON.stringify(battleStart));
  await page.waitForTimeout(1000);

  // Advance battle a few turns
  const battlePlay = await page.evaluate(async () => {
    const g = window.__GAME__;
    const b = g.battle;
    const steps = [];
    for (let i = 0; i < 40; i++) {
      steps.push(b.phase || "?");
      // click fight / confirm
      const fight = [...document.querySelectorAll("button, .pt-bbtn")].find((el) =>
        /战斗|Fight/i.test(el.textContent || ""),
      );
      if (fight) fight.click();
      const move = [...document.querySelectorAll("button, .pt-bbtn")].find((el) =>
        /水枪|撞击|Water|Tackle|火花|藤鞭/i.test(el.textContent || ""),
      );
      if (move) move.click();
      // E confirm
      g.engine?.input && (g.engine.input["_pressed"] = g.engine.input["_pressed"] || {});
      document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }));
      await new Promise((r) => setTimeout(r, 100));
      if (b.phase === "idle" && i > 5) break;
    }
    return { phases: steps.slice(-15), phase: b.phase, err: null };
  });
  log("battlePlay", JSON.stringify(battlePlay));
  await snap("05-battle");

  if (battleStart.err) issues.push("NO_BATTLE_API: " + battleStart.err);
  if (battleStart.via === "event" && battlePlay.phase === "idle" && !battleStart.methods?.includes("start")) {
    // inspect better
    issues.push("BATTLE_START_UNCLEAR methods=" + (battleStart.methods || []).join(","));
  }

  // Movement smoke: walk forward several frames
  const moved = await page.evaluate(async () => {
    const g = window.__GAME__;
    const THREE = g.THREE;
    g.player.teleport(new THREE.Vector3(0, 0, 10), 0);
    const before = g.player.state.position.clone();
    // simulate holding W by setting wish via input if possible
    const input = g.engine.input;
    const down = new Set();
    const orig = input.anyDown?.bind(input);
    if (input.keysDown) {
      input.keysDown.add?.("KeyW");
    }
    // fallback: manually integrate a few teleports along -Z (forward yaw 0)
    for (let i = 0; i < 10; i++) {
      const p = g.player.state.position;
      g.player.teleport(new THREE.Vector3(p.x, p.y, p.z - 0.4), 0);
      await new Promise((r) => requestAnimationFrame(r));
    }
    const after = g.player.state.position;
    return {
      before: { x: before.x, z: before.z },
      after: { x: after.x, z: after.z },
      dz: +(after.z - before.z).toFixed(2),
    };
  });
  log("moved", JSON.stringify(moved));
  if (!(moved.dz < -1)) issues.push("MOVE_TELEPORT_UNEXPECTED dz=" + moved.dz);

  // Interaction registry non-empty
  const ix = await page.evaluate(() => {
    const g = window.__GAME__;
    const items = [...(g.world?.interaction?.items?.values?.() || [])];
    return { count: items.length, sample: items.slice(0, 15).map((i) => i.label) };
  });
  log("interactions", JSON.stringify(ix));
  if (ix.count < 3) issues.push("TOO_FEW_INTERACTABLES: " + ix.count);

  // Check Chinese UI strings present
  const ui = await page.evaluate(() => {
    const body = document.body.innerText;
    return {
      hasPocket: /口袋冒险/.test(body) || !!document.title.includes("口袋冒险"),
      hasBack: /返回游戏馆/.test(body),
      title: document.title,
    };
  });
  log("ui", JSON.stringify(ui));
  if (!ui.hasBack) issues.push("MISSING_HUB_BACK");
}

await browser.close();

const summary = { url: URL, issues, consoleErrors: consoleErrors.slice(0, 30) };
fs.writeFileSync(resolve(OUT, "summary.json"), JSON.stringify(summary, null, 2));
log("\n=== ISSUES ===");
if (!issues.length) log("(none)");
else issues.forEach((i) => log("-", i));
log("errors", consoleErrors.length);
process.exit(issues.length ? 1 : 0);

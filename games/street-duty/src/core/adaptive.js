/**
 * Runtime performance governor for the hub build.
 *
 * Full quality switches recreate post stacks; that is too invasive mid-fight.
 * Instead we:
 *  1) lower/raise `config.q.renderScale` and trigger resize
 *  2) disable the heaviest post passes if still too slow
 *  3) step the named quality preset down as a last resort (shadows / budgets)
 */

import { qualityOrder } from './quality.js';

function disposePass(render, key) {
  const pass = render?.[key];
  if (!pass) return false;
  try {
    pass.dispose?.();
  } catch {
    /* ignore */
  }
  render[key] = null;
  return true;
}

export function installAdaptiveQuality(engine, { floorScale = 0.48 } = {}) {
  let bad = 0;
  let good = 0;
  let cool = 2.0; // seconds before first adjustment
  let lastApply = 0;
  let emaDt = 1 / 60;

  const applyScale = (scale) => {
    const q = engine.config.q;
    const next = Math.max(floorScale, Math.min(1, scale));
    if (Math.abs((q.renderScale || 1) - next) < 0.02) return false;
    q.renderScale = next;
    engine.resize();
    console.info(`[adaptive] renderScale → ${next.toFixed(2)}`);
    return true;
  };

  const stripHeavyPasses = () => {
    const render = engine.registry.peek('render');
    const sky = engine.registry.peek('sky');
    let changed = false;
    // Costliest first. Nulling mid-session is safe — render() guards with `if`.
    if (render) {
      changed = disposePass(render, 'ssr') || changed;
      changed = disposePass(render, 'motionBlur') || changed;
      changed = disposePass(render, 'gtao') || changed;
      changed = disposePass(render, 'bloom') || changed;
      changed = disposePass(render, 'taa') || changed;
      changed = disposePass(render, 'dof') || changed;
      changed = disposePass(render, 'contact') || changed;
      if (render.needsPrepass && (engine.config.quality === 'low' || engine.config.quality === 'medium')) {
        render.needsPrepass = false;
        changed = true;
      }
    }
    if (sky?.volumetrics?.marchEnabled) {
      sky.volumetrics.marchEnabled = false;
      changed = true;
    }
    if (changed) {
      engine.config.q.ssr = false;
      engine.config.q.motionBlur = false;
      engine.config.q.gtao = false;
      engine.config.q.volumetrics = false;
      engine.config.q.bloom = false;
      engine.config.q.taa = false;
      console.info('[adaptive] disabled heavy post (ssr/mb/gtao/vol/bloom/taa)');
    }
    return changed;
  };

  const stepPreset = (dir) => {
    const order = qualityOrder();
    const i = order.indexOf(engine.config.quality);
    const j = Math.max(0, Math.min(order.length - 1, i + dir));
    if (j === i) return false;
    engine.config.setQuality(order[j]);
    // Cap recovery to the new preset's intended scale.
    engine.config.q.renderScaleCap = engine.config.q.renderScale;
    stripHeavyPasses();
    engine.resize();
    console.info(`[adaptive] quality → ${order[j]}`);
    return true;
  };

  const tick = () => {
    if (!engine._running) return;
    const dt = engine.time?.dt || 0;
    if (dt <= 0 || dt > 0.1) return;

    // EMA of frame time so a single hitch does not force a quality cliff.
    emaDt = emaDt * 0.85 + dt * 0.15;

    cool -= 0.1;
    if (cool > 0) return;

    if (emaDt > 1 / 32) {
      bad++;
      good = 0;
    } else if (emaDt < 1 / 50) {
      good++;
      bad = 0;
    } else {
      bad = Math.max(0, bad - 1);
      good = Math.max(0, good - 1);
    }

    const now = engine.time.elapsed;
    if (now - lastApply < 1.8) return;

    if (bad >= 18) {
      lastApply = now;
      bad = 0;
      const scale = engine.config.q.renderScale ?? 1;
      if (scale > floorScale + 0.04) {
        applyScale(scale * 0.8);
      } else if (stripHeavyPasses()) {
        /* stripped */
      } else {
        stepPreset(-1);
      }
      cool = 1.2;
    } else if (good >= 80) {
      // Cautiously recover scale only (never auto-upgrade preset / re-enable post).
      lastApply = now;
      good = 0;
      const scale = engine.config.q.renderScale ?? 1;
      const cap = engine.config.q.renderScaleCap ?? scale;
      if (scale < cap - 0.03) applyScale(Math.min(cap, scale * 1.08));
      cool = 1.8;
    }
  };

  // Store baseline cap so recovery does not exceed the preset's intent.
  engine.config.q.renderScaleCap = engine.config.q.renderScale;

  const id = setInterval(tick, 100);
  return () => clearInterval(id);
}

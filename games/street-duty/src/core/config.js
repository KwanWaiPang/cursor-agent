/**
 * Central tuning + quality configuration.
 * Subsystems read from this rather than hardcoding magic numbers, so the
 * quality scaler and the capture harness can drive everything from one place.
 */

export const PHYSICS_HZ = 120;
export const FIXED_DT = 1 / PHYSICS_HZ;
/** Never simulate more than this many physics steps in one frame (spiral-of-death guard). */
export const MAX_SUBSTEPS = 8;

/** Real-world units are metres, seconds, kilograms. */
export const UNITS = {
  gravity: -9.81 * 2.1, // Games use exaggerated gravity; CoD-like feel.
  playerHeight: 1.78,
  playerCrouchHeight: 1.12,
  playerRadius: 0.32,
  eyeOffset: 0.12, // below top of capsule
};

/**
 * Hub presets are tuned for browser GPUs. Official Claude-of-Duty defaults are
 * heavier (especially high/ultra); we keep the look but cut the costliest extras
 * that dominate frame time on typical laptops.
 */
export const QUALITY_PRESETS = {
  low: {
    renderScale: 0.65,
    maxPixelRatio: 1.0,
    shadowMapSize: 1024,
    cascades: 2,
    shadowDistance: 50,
    taa: false,
    gtao: false,
    ssr: false,
    volumetrics: false,
    motionBlur: false,
    bloom: true,
    anisotropy: 2,
    particleBudget: 1200,
    decalBudget: 48,
  },
  medium: {
    renderScale: 0.78,
    maxPixelRatio: 1.15,
    shadowMapSize: 1024,
    cascades: 3,
    shadowDistance: 70,
    taa: true,
    gtao: false,
    ssr: false,
    volumetrics: false,
    motionBlur: false,
    bloom: true,
    anisotropy: 4,
    particleBudget: 3500,
    decalBudget: 96,
  },
  high: {
    renderScale: 0.9,
    maxPixelRatio: 1.25,
    shadowMapSize: 2048,
    cascades: 3,
    shadowDistance: 100,
    taa: true,
    gtao: true,
    ssr: false,
    volumetrics: true,
    motionBlur: false,
    bloom: true,
    anisotropy: 8,
    particleBudget: 7000,
    decalBudget: 160,
  },
  ultra: {
    renderScale: 1.0,
    maxPixelRatio: 1.5,
    // Cap at 2048 for the web hub: 4096 CSM arrays routinely freeze weaker GPUs.
    shadowMapSize: 2048,
    cascades: 4,
    shadowDistance: 160,
    taa: true,
    gtao: true,
    ssr: true,
    volumetrics: true,
    motionBlur: true,
    bloom: true,
    anisotropy: 16,
    particleBudget: 14000,
    decalBudget: 256,
  },
};

export const DEFAULTS = {
  // Safer hub default; detectQuality() may raise/lower. Use ?q=ultra for max.
  quality: 'medium',
  fov: 80, // horizontal-ish vertical FOV, CoD default feel
  adsFovScale: 0.72,
  sensitivity: 0.0022,
  adsSensScale: 0.65,
  invertY: false,
  exposure: 1.0,
  /** Capture mode disables anything nondeterministic so screenshots are stable. */
  deterministic: false,
};

export function createConfig(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  cfg.q = { ...QUALITY_PRESETS[cfg.quality] };
  cfg.setQuality = (name) => {
    if (!QUALITY_PRESETS[name]) throw new Error(`unknown quality preset "${name}"`);
    cfg.quality = name;
    Object.assign(cfg.q, QUALITY_PRESETS[name]);
  };
  return cfg;
}

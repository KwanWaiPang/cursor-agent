/**
 * Central tuning + quality configuration.
 * Subsystems read from this rather than hardcoding magic numbers, so the
 * quality scaler and the capture harness can drive everything from one place.
 */

// Hub target: playable frame pacing on laptop GPUs. Official Claude-of-Duty
// uses 120 Hz; 60 Hz halves fixed-step work with only a mild feel change.
export const PHYSICS_HZ = 60;
export const FIXED_DT = 1 / PHYSICS_HZ;
/** Never simulate more than this many physics steps in one frame (spiral-of-death guard). */
export const MAX_SUBSTEPS = 4;

/** Real-world units are metres, seconds, kilograms. */
export const UNITS = {
  gravity: -9.81 * 2.1, // Games use exaggerated gravity; CoD-like feel.
  playerHeight: 1.78,
  playerCrouchHeight: 1.12,
  playerRadius: 0.32,
  eyeOffset: 0.12, // below top of capsule
};

/**
 * Hub presets favour frame-rate over fidelity. Official Claude-of-Duty high/ultra
 * stay available via ?q=high / ?q=ultra for machines that can take it.
 */
export const QUALITY_PRESETS = {
  low: {
    renderScale: 0.55,
    maxPixelRatio: 1.0,
    shadowMapSize: 512,
    cascades: 2,
    shadowDistance: 40,
    taa: false,
    gtao: false,
    ssr: false,
    volumetrics: false,
    motionBlur: false,
    bloom: false,
    anisotropy: 2,
    particleBudget: 800,
    decalBudget: 32,
  },
  medium: {
    renderScale: 0.68,
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
    anisotropy: 4,
    particleBudget: 1800,
    decalBudget: 64,
  },
  high: {
    renderScale: 0.85,
    maxPixelRatio: 1.25,
    shadowMapSize: 2048,
    cascades: 3,
    shadowDistance: 90,
    taa: true,
    gtao: true,
    ssr: false,
    volumetrics: true,
    motionBlur: false,
    bloom: true,
    anisotropy: 8,
    particleBudget: 5000,
    decalBudget: 128,
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

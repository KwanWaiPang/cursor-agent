/**
 * Hub-safe quality selection + adaptive scale helpers.
 */

const ORDER = ['low', 'medium', 'high', 'ultra'];

export function normalizeQuality(name) {
  const q = String(name || '').toLowerCase();
  return ORDER.includes(q) ? q : null;
}

export function qualityOrder() {
  return ORDER.slice();
}

/** Rough GPU / device heuristics for the first visit. */
export function detectQuality() {
  try {
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua);
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 0; // Chrome only; 0 = unknown
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    let renderer = '';
    let maxTex = 0;
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { powerPreference: 'high-performance' });
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext?.();
    }

    const soft =
      /swiftshader|llvmpipe|softpipe|microsoft basic render|gdi generic|intel\s*hd|uhd graphics 6/i.test(
        renderer
      ) ||
      (maxTex > 0 && maxTex < 4096);

    // Prefer playable frame-rate over max fidelity on the hub.
    // Most laptop integrated GPUs are happier on low; medium is for decent
    // discrete / Apple GPU class machines.
    if (soft || mobile) return 'low';
    if ((mem > 0 && mem <= 4) || cores <= 4 || dpr >= 2) return 'low';
    if ((mem > 0 && mem <= 8) || cores <= 8 || dpr >= 1.5) return 'medium';
    return 'high';
  } catch {
    return 'low';
  }
}

export function resolveQuality(search = location.search) {
  const params = new URLSearchParams(search);
  const forced = normalizeQuality(params.get('q'));
  if (forced) return { quality: forced, source: 'query' };
  const detected = detectQuality();
  return { quality: detected, source: 'detect' };
}

export function shouldPrewarm(quality, search = location.search) {
  const params = new URLSearchParams(search);
  if (params.get('prewarm') === '0') return false;
  if (params.get('prewarm') === '1') return true;
  // Default: only ultra prewarms. Hub first-entry is otherwise ~20s+ of shader compile.
  return quality === 'ultra';
}

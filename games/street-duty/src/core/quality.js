/**
 * Hub-safe quality selection.
 *
 * Upstream Claude-of-Duty defaults to `ultra` (4096 cascades). That is fine on
 * a strong laptop GPU, but on typical GitHub Pages visitors — and especially
 * under software WebGL — it leaves the tab black and unresponsive for a long
 * time while shaders/shadow maps compile. Pick a safer default, still overrideable
 * with `?q=low|medium|high|ultra`.
 */

const ORDER = ['low', 'medium', 'high', 'ultra'];

export function normalizeQuality(name) {
  const q = String(name || '').toLowerCase();
  return ORDER.includes(q) ? q : null;
}

/** Rough GPU / device heuristics for the first visit. */
export function detectQuality() {
  try {
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua);
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 0; // Chrome only; 0 = unknown
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    // Probe WebGL renderer string without keeping a context around.
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
      /swiftshader|llvmpipe|softpipe|microsoft basic render|gdi generic/i.test(renderer) ||
      maxTex > 0 && maxTex < 4096;

    if (soft || mobile || (mem > 0 && mem <= 4) || cores <= 4) return 'low';
    if ((mem > 0 && mem <= 8) || cores <= 6 || dpr >= 2.5) return 'medium';
    return 'high';
  } catch {
    return 'medium';
  }
}

/**
 * Resolve quality from URL, then detection, never defaulting to ultra on the hub.
 * `?q=` always wins.
 */
export function resolveQuality(search = location.search) {
  const params = new URLSearchParams(search);
  const forced = normalizeQuality(params.get('q'));
  if (forced) return { quality: forced, source: 'query' };
  const detected = detectQuality();
  return { quality: detected, source: 'detect' };
}

/** Whether to run the expensive shader pre-warm for this quality. */
export function shouldPrewarm(quality, search = location.search) {
  const params = new URLSearchParams(search);
  if (params.get('prewarm') === '0') return false;
  if (params.get('prewarm') === '1') return true;
  // low: prefer fast first paint; medium+: prewarm to avoid mid-fight stalls
  return quality !== 'low';
}

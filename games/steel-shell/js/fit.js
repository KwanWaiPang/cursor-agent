/** 两倍以上取整数，手机宽度用略大于 1 的比例铺满，避免画面缩成一条。 */
export function computeFitScale(availW, availH, viewW = 256, viewH = 180, maxScale = 4) {
  const s = Math.min(availW / viewW, availH / viewH, maxScale);
  if (!Number.isFinite(s) || s <= 0) return 1;
  if (s >= 2) return Math.min(maxScale, Math.floor(s));
  return Math.max(0.45, Math.round(s * 100) / 100);
}

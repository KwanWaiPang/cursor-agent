/** Integer pixel scale so the NES-sized view fits both width and height. */
export function computeFitScale(availW, availH, viewW = 256, viewH = 240, maxScale = 4) {
  const sw = Math.floor(Math.max(1, availW) / viewW) || 1;
  const sh = Math.floor(Math.max(1, availH) / viewH) || 1;
  return Math.max(1, Math.min(sw, sh, maxScale));
}

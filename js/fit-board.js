/**
 * Size a board so the whole diagram stays visible.
 * Narrow screens use the page width; the side notes sit underneath.
 * Wide screens grow the board until it would leave the viewport.
 */

export function fitBoardEdge({ innerW, availH, aspect = 1, min = 220 }) {
  const widthLimit = Math.max(0, innerW);
  const heightLimit = Math.max(0, availH) / (aspect || 1);
  const width = Math.max(min, Math.floor(Math.min(widthLimit, heightLimit)));
  return { width, height: Math.max(min, Math.floor(width * aspect)) };
}

export function measureBoardBox(wrap, { aspect = 1, min = 220 } = {}) {
  const style = getComputedStyle(wrap);
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const layout = wrap.closest(".layout");
  const narrow = window.matchMedia("(max-width: 900px)").matches;
  const gap = layout ? parseFloat(getComputedStyle(layout).columnGap) || 0 : 0;
  const panel = layout
    ? [...layout.children].find((el) => el.classList.contains("panel"))
    : null;
  const panelW = !narrow && panel ? panel.getBoundingClientRect().width : 0;
  const gutter = narrow ? 16 : 24;
  const viewportW = window.innerWidth - gutter - padX - (panelW ? panelW + gap : 0);
  let innerW = Math.max(0, viewportW);
  if (layout && !narrow) {
    const fromLayout = layout.clientWidth - panelW - (panelW ? gap : 0) - padX;
    innerW = Math.min(innerW, Math.max(0, fromLayout));
  }
  const topbar = document.querySelector(".topbar, .chess3d-bar");
  const topH = topbar ? topbar.getBoundingClientRect().height : 0;
  const chrome = narrow ? 28 : 72;
  const availH = Math.max(min, window.innerHeight - topH - chrome - padY);
  return fitBoardEdge({ innerW, availH, aspect, min });
}

/**
 * Menu — the two full-screen overlays: the loading curtain and the start card.
 *
 * Both are plain DOM. They own their own animation (the loading bar runs a
 * private rAF because the engine loop has not started yet while the world is
 * still baking) and expose a tiny imperative API to the HUD.
 */

/** Small DOM helper — keeps the builders below readable. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function keycap(label: string, wide = false): HTMLElement {
  return el('span', wide ? 'pt-key pt-key--wide' : 'pt-key', label);
}

/* ------------------------------------------------------------------------ */

export class LoadingScreen {
  readonly el: HTMLElement;

  private fill: HTMLElement;
  private stepEl: HTMLElement;
  private pctEl: HTMLElement;

  /** 0..1 target set by the world builder. */
  private target = 0;
  /** 0..1 eased value actually painted. */
  private shown = 0;
  private raf = 0;
  private lastT = 0;
  private done = false;
  private finishing = false;
  private onGone: (() => void) | null = null;

  constructor() {
    this.el = el('div', 'pt-overlay pt-loading');

    const inner = el('div', 'pt-loading__inner');
    inner.appendChild(el('div', 'pt-mark'));

    const h1 = el('h1', 'pt-title', 'PALLET TOWN');
    inner.appendChild(h1);
    inner.appendChild(el('p', 'pt-subtitle', 'Shades of your journey'));

    const bar = el('div', 'pt-bar');
    this.fill = el('div', 'pt-bar__fill');
    bar.appendChild(this.fill);
    inner.appendChild(bar);

    const row = el('div', 'pt-loading__row');
    this.stepEl = el('div', 'pt-loading__step', 'Waking the town…');
    this.pctEl = el('div', 'pt-loading__pct', '0%');
    row.appendChild(this.stepEl);
    row.appendChild(this.pctEl);
    inner.appendChild(row);

    this.el.appendChild(inner);
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
  }

  set(label: string, pct: number): void {
    this.target = Math.max(this.target, Math.min(1, Math.max(0, pct)));
    this.stepEl.textContent = prettyStep(label);
  }

  private tick(t: number): void {
    if (this.done) return;
    const dt = this.lastT ? Math.min(0.1, (t - this.lastT) / 1000) : 0.016;
    this.lastT = t;
    // Critically-damped chase: the bar never snaps, never stalls.
    const rate = this.finishing ? 8.5 : 5.2;
    this.shown += (this.target - this.shown) * Math.min(1, dt * rate);
    if (this.target - this.shown < 0.0015) this.shown = this.target;
    this.paint();

    if (this.finishing && this.shown >= 0.999) {
      this.shown = 1;
      this.paint();
      this.finishing = false;
      // A beat at a genuine 100% before the curtain lifts reads far better
      // than a bar that vanishes at 94%.
      window.setTimeout(() => this.dissolve(), 300);
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  private paint(): void {
    this.fill.style.width = `${(this.shown * 100).toFixed(2)}%`;
    this.pctEl.textContent = `${Math.round(this.shown * 100)}%`;
  }

  /** Runs the bar out to a true 100%, fades, then leaves the layout. */
  hide(onGone?: () => void, instant = false): void {
    if (this.done || this.finishing) return;
    this.target = 1;
    this.stepEl.textContent = '欢迎回家';
    this.onGone = onGone ?? null;

    if (instant) {
      this.shown = 1;
      this.paint();
      this.done = true;
      cancelAnimationFrame(this.raf);
      this.el.classList.add('is-hidden', 'is-gone');
      this.flush();
      return;
    }
    this.finishing = true;
  }

  private dissolve(): void {
    this.done = true;
    cancelAnimationFrame(this.raf);
    this.el.classList.add('is-hidden');
    window.setTimeout(() => {
      this.el.classList.add('is-gone');
      this.flush();
    }, 640);
  }

  private flush(): void {
    const fn = this.onGone;
    this.onGone = null;
    fn?.();
  }
}

/** Turns "vegetation" / "Baking terrain" into sentence-cased prose. */
function prettyStep(label: string): string {
  if (!label) return '加载中…';
  const s = label.trim();
  const cased = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.…!?]$/.test(cased) ? cased : `${cased}…`;
}

/* ------------------------------------------------------------------------ */

export interface LegendEntry {
  keys: string[];
  text: string;
  wide?: boolean;
}

const LEGEND: LegendEntry[] = [
  { keys: ['W', 'A', 'S', 'D'], text: '移动' },
  { keys: ['Shift'], text: '奔跑', wide: true },
  { keys: ['Space'], text: '跳跃', wide: true },
  { keys: ['Mouse'], text: '视角', wide: true },
  { keys: ['E'], text: '互动' },
  { keys: ['B'], text: '图鉴' },
  { keys: ['Esc'], text: '释放鼠标', wide: true },
];

/** Which face the start card is wearing. */
export type StartMode = 'title' | 'paused' | 'retry';

const COPY: Record<StartMode, { eyebrow: string; title: string; cta: string; foot: string }> = {
  title: {
    eyebrow: '关都 · 真新镇',
    title: '口袋冒险',
    cta: '点击开始',
    foot: '将锁定鼠标指针。按 Esc 可释放。进度自动保存在本机。',
  },
  paused: {
    eyebrow: '已暂停',
    title: '歇一口气',
    cta: '点击继续',
    foot: '进度已自动保存。小镇还在你离开的地方等着。',
  },
  retry: {
    eyebrow: '还差一点',
    title: '再点一下',
    cta: '点击环顾四周',
    foot: '浏览器扣住了指针，再点一次即可交还。',
  },
};

/**
 * The click-to-play card. Doubles as the pause screen: when pointer lock is
 * lost mid-game it comes back with a different title so the player is never
 * left staring at a frozen world with no explanation.
 */
export class StartCard {
  readonly el: HTMLElement;
  onStart: (() => void) | null = null;
  onContinue: (() => void) | null = null;
  onNewGame: (() => void) | null = null;

  private eyebrow: HTMLElement;
  private title: HTMLElement;
  private cta: HTMLButtonElement;
  private continueBtn: HTMLButtonElement;
  private newBtn: HTMLButtonElement;
  private actions: HTMLElement;
  private foot: HTMLElement;
  private shown = false;
  private armed = false;
  private saveMode = false;

  constructor() {
    this.el = el('div', 'pt-overlay pt-start is-hidden is-gone');

    const card = el('div', 'pt-card');
    this.eyebrow = el('div', 'pt-card__eyebrow', '关都 · 真新镇');
    this.title = el('h2', 'pt-card__title', '口袋冒险');
    card.appendChild(this.eyebrow);
    card.appendChild(this.title);
    card.appendChild(el('div', 'pt-card__rule'));

    const legend = el('div', 'pt-legend');
    for (const entry of LEGEND) {
      const row = el('div', 'pt-legend__row');
      const keys = el('div', 'pt-legend__keys');
      for (const k of entry.keys) keys.appendChild(keycap(k, entry.wide));
      row.appendChild(keys);
      row.appendChild(el('div', 'pt-legend__text', entry.text));
      legend.appendChild(row);
    }
    card.appendChild(legend);

    this.actions = el('div', 'pt-card__actions');
    this.cta = el('button', 'pt-cta') as HTMLButtonElement;
    this.cta.type = 'button';
    this.cta.textContent = '点击开始';
    this.continueBtn = el('button', 'pt-cta') as HTMLButtonElement;
    this.continueBtn.type = 'button';
    this.continueBtn.textContent = '继续旅程';
    this.newBtn = el('button', 'pt-cta pt-cta--ghost') as HTMLButtonElement;
    this.newBtn.type = 'button';
    this.newBtn.textContent = '重新开始';
    this.actions.appendChild(this.cta);
    this.actions.appendChild(this.continueBtn);
    this.actions.appendChild(this.newBtn);
    card.appendChild(this.actions);

    this.foot = el('p', 'pt-card__foot', '将锁定鼠标指针。按 Esc 可释放。');
    card.appendChild(this.foot);

    this.el.appendChild(card);

    const fireStart = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.shown || !this.armed || this.saveMode) return;
      this.armed = false;
      this.onStart?.();
    };
    const fireContinue = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.shown || !this.armed || !this.saveMode) return;
      this.armed = false;
      this.onContinue?.();
      this.onStart?.();
    };
    const fireNew = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.shown || !this.armed || !this.saveMode) return;
      this.armed = false;
      this.onNewGame?.();
      this.onStart?.();
    };
    this.cta.addEventListener('click', fireStart);
    this.continueBtn.addEventListener('click', fireContinue);
    this.newBtn.addEventListener('click', fireNew);
    // Backdrop click = primary action (start or continue).
    this.el.addEventListener('click', (e) => {
      if (e.target !== this.el) return;
      if (this.saveMode) fireContinue(e);
      else fireStart(e);
    });
  }

  get visible(): boolean {
    return this.shown;
  }

  /**
   * @param armDelayMs How long before the card accepts a click. The default
   *   only has to swallow the click that dismissed pointer lock; the caller
   *   raises it to sit out Chrome's post-Escape relock cooldown, because a card
   *   that can be dismissed during the cooldown sends the player back into the
   *   world with a request that is guaranteed to be refused.
   * @param saveFoot Optional footnote when a local save is available (title only).
   */
  show(mode: StartMode = 'title', armDelayMs = 120, saveFoot?: string | null): void {
    if (this.shown) return;
    this.shown = true;
    this.armed = false;
    const copy = COPY[mode];
    this.eyebrow.textContent = copy.eyebrow;
    this.title.textContent = copy.title;
    this.saveMode = mode === 'title' && !!saveFoot;
    this.cta.hidden = this.saveMode;
    this.continueBtn.hidden = !this.saveMode;
    this.newBtn.hidden = !this.saveMode;
    this.cta.textContent = copy.cta;
    this.foot.textContent = saveFoot || copy.foot;
    this.el.classList.remove('is-gone');
    requestAnimationFrame(() => {
      this.el.classList.remove('is-hidden');
      window.setTimeout(() => (this.armed = true), Math.max(0, armDelayMs));
    });
  }

  hide(): void {
    if (!this.shown) return;
    this.shown = false;
    this.armed = false;
    this.el.classList.add('is-hidden');
    window.setTimeout(() => {
      if (!this.shown) this.el.classList.add('is-gone');
    }, 480);
  }
}

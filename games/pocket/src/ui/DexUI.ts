import './dex.css';
import { el } from './Menu';
import {
  KANTO_BY_ID,
  TYPE_ZH,
  formatDexNo,
  heightLabel,
  weightLabel,
  type DexEntry,
  type DexTypeId,
} from '../gameplay/dex';
import { NATIONAL_DEX, type NationalEntry } from '../gameplay/dex/national';
import { findDexIndex } from '../gameplay/dex/search';
import { DexProgress } from '../gameplay/dex/DexProgress';
import { glbUrlForDexId } from '../gameplay/pokemon/GlbModels';
import { hasRegularGlb, spriteFallbackUrls } from '../gameplay/dex/sprites';

/**
 * DexUI — national Pokédex browser (#001–1025).
 * Virtualized list, GLB with 2D fallback, jump search.
 */

const DEX_LIST = NATIONAL_DEX;
const KANTO_TOTAL = 151;
const ROW_H = 42;
const OVERSCAN = 8;

let modelViewerReady: Promise<void> | null = null;
function ensureModelViewer(): Promise<void> {
  if (customElements.get('model-viewer')) return Promise.resolve();
  if (!modelViewerReady) {
    modelViewerReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.type = 'module';
      const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
      s.src = `${base.endsWith('/') ? base : `${base}/`}vendor/model-viewer.min.js`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('model-viewer failed to load'));
      document.head.appendChild(s);
    });
  }
  return modelViewerReady;
}

function kantoEntry(e: NationalEntry): DexEntry | undefined {
  return KANTO_BY_ID[e.id];
}

/** Every national entry stays locked until seen (silhouette + ???). */
function isRevealed(e: NationalEntry): boolean {
  return DexProgress.hasSeen(e.slug);
}

export class DexUI {
  readonly el: HTMLElement;

  private listEl: HTMLElement;
  private spacerEl: HTMLElement;
  private windowEl: HTMLElement;
  private detailEl: HTMLElement;
  private countEl: HTMLElement;
  private searchEl: HTMLInputElement;
  private pool: HTMLButtonElement[] = [];
  private open = false;
  private index = 0;
  private windowStart = 0;
  private detailTimer = 0;
  private detailToken = 0;
  private onClose: (() => void) | null = null;
  private onScroll = (): void => this.paintWindow();

  constructor() {
    this.el = el('div', 'pt-dex');
    this.el.setAttribute('aria-hidden', 'true');

    const panel = el('div', 'pt-dex__panel');
    const head = el('div', 'pt-dex__head');
    head.appendChild(el('h2', 'pt-dex__title', '全国图鉴'));
    this.countEl = el('span', 'pt-dex__count', '');
    head.appendChild(this.countEl);

    this.searchEl = document.createElement('input');
    this.searchEl.className = 'pt-dex__search';
    this.searchEl.type = 'search';
    this.searchEl.placeholder = '跳转：850 / 烧火蚣';
    this.searchEl.setAttribute('aria-label', '图鉴跳转搜索');
    this.searchEl.autocomplete = 'off';
    this.searchEl.spellcheck = false;
    this.searchEl.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.jumpToQuery(this.searchEl.value);
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (this.searchEl.value) this.searchEl.value = '';
        else this.close();
      }
    });
    head.appendChild(this.searchEl);
    head.appendChild(el('span', 'pt-dex__hint', 'B / Esc 关闭 · / 搜索 · ↑↓ 选择'));
    panel.appendChild(head);

    const body = el('div', 'pt-dex__body');
    this.listEl = el('div', 'pt-dex__list');
    this.spacerEl = el('div', 'pt-dex__spacer');
    this.windowEl = el('div', 'pt-dex__window');
    this.listEl.appendChild(this.spacerEl);
    this.listEl.appendChild(this.windowEl);
    this.listEl.addEventListener('scroll', this.onScroll, { passive: true });
    this.detailEl = el('div', 'pt-dex__detail');
    body.appendChild(this.listEl);
    body.appendChild(this.detailEl);
    panel.appendChild(body);
    this.el.appendChild(panel);

    this.spacerEl.style.height = `${DEX_LIST.length * ROW_H}px`;
    this.refreshCount();
    this.scheduleDetail();

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  get searchFocused(): boolean {
    return document.activeElement === this.searchEl;
  }

  get isOpen(): boolean {
    return this.open;
  }

  setCloseHandler(fn: () => void): void {
    this.onClose = fn;
  }

  show(): void {
    this.open = true;
    this.el.classList.add('is-on');
    this.el.setAttribute('aria-hidden', 'false');
    this.refreshCount();
    this.paintWindow(true);
    this.scheduleDetail();
    this.scrollToIndex();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.classList.remove('is-on');
    this.el.setAttribute('aria-hidden', 'true');
    this.searchEl.blur();
    this.detailEl.replaceChildren();
    this.onClose?.();
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  handleKey(code: string): boolean {
    if (!this.open) return false;
    if (this.searchFocused && code !== 'Escape' && code !== 'KeyB') {
      if (
        code !== 'ArrowUp' &&
        code !== 'ArrowDown' &&
        code !== 'PageUp' &&
        code !== 'PageDown' &&
        code !== 'Home' &&
        code !== 'End'
      ) {
        return false;
      }
    }
    if (code === 'Escape' || code === 'KeyB') {
      this.close();
      return true;
    }
    if (code === 'Slash' && !this.searchFocused) {
      this.searchEl.focus();
      this.searchEl.select();
      return true;
    }
    if (code === 'ArrowUp' || code === 'KeyW') {
      this.index = Math.max(0, this.index - 1);
      this.syncSelection();
      return true;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      this.index = Math.min(DEX_LIST.length - 1, this.index + 1);
      this.syncSelection();
      return true;
    }
    if (code === 'PageUp') {
      this.index = Math.max(0, this.index - 50);
      this.syncSelection();
      return true;
    }
    if (code === 'PageDown') {
      this.index = Math.min(DEX_LIST.length - 1, this.index + 50);
      this.syncSelection();
      return true;
    }
    if (code === 'Home') {
      this.index = 0;
      this.syncSelection();
      return true;
    }
    if (code === 'End') {
      this.index = DEX_LIST.length - 1;
      this.syncSelection();
      return true;
    }
    return true;
  }

  jumpToQuery(raw: string): boolean {
    const hit = findDexIndex(raw);
    if (hit < 0) return false;
    this.index = hit;
    this.syncSelection();
    return true;
  }

  private syncSelection(): void {
    this.paintWindow();
    this.scheduleDetail();
    this.scrollToIndex();
  }

  private scrollToIndex(): void {
    const top = this.index * ROW_H;
    const view = this.listEl.clientHeight;
    const scroll = this.listEl.scrollTop;
    if (top < scroll) this.listEl.scrollTop = top;
    else if (top + ROW_H > scroll + view) this.listEl.scrollTop = top + ROW_H - view;
  }

  private paintWindow(force = false): void {
    const viewH = Math.max(this.listEl.clientHeight, ROW_H * 8);
    const visible = Math.ceil(viewH / ROW_H) + OVERSCAN * 2;
    const start = Math.max(0, Math.floor(this.listEl.scrollTop / ROW_H) - OVERSCAN);
    const end = Math.min(DEX_LIST.length, start + visible);
    if (!force && start === this.windowStart && this.pool.length >= end - start) {
      this.restylePool();
      return;
    }
    this.windowStart = start;
    this.windowEl.style.transform = `translateY(${start * ROW_H}px)`;

    while (this.pool.length < end - start) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'pt-dex__row';
      row.style.height = `${ROW_H}px`;
      row.appendChild(el('span', 'pt-dex__no', ''));
      row.appendChild(el('span', 'pt-dex__name', ''));
      row.addEventListener('click', () => {
        const idx = Number(row.dataset.index);
        if (!Number.isFinite(idx)) return;
        this.index = idx;
        this.syncSelection();
      });
      this.pool.push(row);
      this.windowEl.appendChild(row);
    }
    for (let i = 0; i < this.pool.length; i++) {
      const row = this.pool[i];
      const idx = start + i;
      if (idx >= end) {
        row.hidden = true;
        continue;
      }
      row.hidden = false;
      row.dataset.index = String(idx);
      this.fillRow(row, idx);
    }
  }

  private restylePool(): void {
    for (const row of this.pool) {
      if (row.hidden) continue;
      const idx = Number(row.dataset.index);
      if (!Number.isFinite(idx)) continue;
      this.fillRow(row, idx);
    }
  }

  private fillRow(row: HTMLButtonElement, idx: number): void {
    const e = DEX_LIST[idx];
    const seen = isRevealed(e);
    row.className = `pt-dex__row${seen ? '' : ' is-unknown'}${idx === this.index ? ' is-active' : ''}`;
    const no = row.querySelector('.pt-dex__no');
    const name = row.querySelector('.pt-dex__name');
    if (no) no.textContent = formatDexNo(e.id);
    if (name) name.textContent = seen ? e.name : '？？？';
    row.querySelector('.pt-dex__badge')?.remove();
    row.querySelector('.pt-dex__owned')?.remove();
    if (!hasRegularGlb(e.id)) row.appendChild(el('span', 'pt-dex__badge', '2D'));
    if (DexProgress.hasOwned(e.slug)) row.appendChild(el('span', 'pt-dex__owned', '拥有'));
  }

  /** Debounce GLB / sprite mounts while scrubbing the list. */
  private scheduleDetail(): void {
    window.clearTimeout(this.detailTimer);
    const token = ++this.detailToken;
    // Immediate text chrome; heavy media after a short settle.
    this.renderDetailShell();
    this.detailTimer = window.setTimeout(() => {
      if (token !== this.detailToken) return;
      this.mountMedia();
    }, 140);
  }

  private renderDetailShell(): void {
    const e = DEX_LIST[this.index];
    const kanto = kantoEntry(e);
    const seen = isRevealed(e);
    this.detailEl.replaceChildren();

    const hero = el('div', 'pt-dex__hero');
    hero.appendChild(el('div', 'pt-dex__num', formatDexNo(e.id)));
    hero.appendChild(el('div', 'pt-dex__big-name', seen ? e.name : '？？？'));
    hero.appendChild(el('div', 'pt-dex__genus', seen ? e.genus || '—' : '尚未目击'));
    this.detailEl.appendChild(hero);

    const stage = el('div', `pt-dex__stage${seen ? '' : ' is-unknown'}`);
    stage.dataset.role = 'stage';
    stage.appendChild(el('p', 'pt-dex__credit', '加载预览…'));
    this.detailEl.appendChild(stage);

    if (!seen) {
      this.detailEl.appendChild(
        el('p', 'pt-dex__locked', '在野外遭遇或获得后，图鉴才会记录详细资料。'),
      );
      return;
    }

    const types = el('div', 'pt-dex__types');
    for (const t of e.types) {
      types.appendChild(
        el('span', `pt-dex__type pt-dex__type--${t}`, TYPE_ZH[t as DexTypeId] ?? t),
      );
    }
    this.detailEl.appendChild(types);

    if (kanto) {
      const meta = el('div', 'pt-dex__meta');
      meta.appendChild(el('span', '', `身高 ${heightLabel(kanto.height)}`));
      meta.appendChild(el('span', '', `体重 ${weightLabel(kanto.weight)}`));
      this.detailEl.appendChild(meta);
      this.detailEl.appendChild(this.statBlock(kanto));
      if (DexProgress.hasOwned(kanto.slug)) {
        this.detailEl.appendChild(el('p', 'pt-dex__note', '已加入队伍。'));
      }
    } else {
      this.detailEl.appendChild(
        el('p', 'pt-dex__note', '全国图鉴条目（本区域冒险暂无完整种族值）。'),
      );
    }
  }

  private mountMedia(): void {
    const e = DEX_LIST[this.index];
    const seen = isRevealed(e);
    const stage = this.detailEl.querySelector('[data-role="stage"]') as HTMLElement | null;
    if (!stage) return;
    stage.replaceChildren();
    if (!hasRegularGlb(e.id)) {
      this.mountSprite(stage, e, seen, '无上游 3D，已用 2D 立绘兜底');
    } else {
      this.mountGlbWithSpriteFallback(stage, e, seen);
    }
  }

  private mountGlbWithSpriteFallback(
    stage: HTMLElement,
    e: NationalEntry,
    seen: boolean,
  ): void {
    const viewer = document.createElement('model-viewer') as HTMLElement & {
      src: string;
      alt: string;
    };
    viewer.className = 'pt-dex__viewer';
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('auto-rotate', '');
    viewer.setAttribute('shadow-intensity', '0.6');
    viewer.setAttribute('exposure', seen ? '1' : '0.55');
    viewer.setAttribute('loading', 'lazy');
    viewer.setAttribute('reveal', 'auto');
    viewer.setAttribute('alt', seen ? e.name : '未鉴定的宝可梦');
    viewer.setAttribute('src', glbUrlForDexId(e.id));
    stage.appendChild(viewer);
    stage.appendChild(el('p', 'pt-dex__credit', '3D：Pokemon-3D-api（本地 / CDN）'));

    const toSprite = (): void => {
      if (!stage.isConnected) return;
      stage.replaceChildren();
      this.mountSprite(stage, e, seen, '3D 加载失败，已回退 2D 立绘');
    };
    viewer.addEventListener('error', toSprite);
    void ensureModelViewer().catch(() => toSprite());
  }

  private mountSprite(
    stage: HTMLElement,
    e: NationalEntry,
    seen: boolean,
    creditText: string,
  ): void {
    const urls = spriteFallbackUrls(e.id, e.slug);
    let i = 0;
    const img = document.createElement('img');
    img.className = 'pt-dex__sprite';
    img.alt = seen ? e.name : '未鉴定的宝可梦';
    img.decoding = 'async';
    img.loading = 'lazy';
    const tryNext = (): void => {
      if (i >= urls.length) {
        img.remove();
        stage.appendChild(el('p', 'pt-dex__locked', '精灵图加载失败。'));
        return;
      }
      img.src = urls[i++];
    };
    img.addEventListener('error', tryNext);
    tryNext();
    stage.appendChild(img);
    stage.appendChild(el('p', 'pt-dex__credit', `${creditText}（PokeAPI / Showdown）`));
  }

  private statBlock(e: DexEntry): HTMLElement {
    const wrap = el('div', 'pt-dex__stats');
    const rows: [string, number][] = [
      ['HP', e.base.hp],
      ['攻击', e.base.atk],
      ['防御', e.base.def],
      ['特攻', e.base.spa],
      ['特防', e.base.spd],
      ['速度', e.base.spe],
    ];
    for (const [label, value] of rows) {
      const row = el('div', 'pt-dex__stat');
      row.appendChild(el('span', 'pt-dex__stat-label', label));
      const bar = el('div', 'pt-dex__stat-bar');
      const fill = el('i');
      fill.style.width = `${Math.min(100, (value / 180) * 100)}%`;
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', 'pt-dex__stat-num', String(value)));
      wrap.appendChild(row);
    }
    return wrap;
  }

  private refreshCount(): void {
    this.countEl.textContent = `目击 ${DexProgress.seenCount()} · 关都 ${DexProgress.kantoSeenCount()} / ${KANTO_TOTAL}`;
  }
}

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
 * Open with B; Esc / B closes. Suspends gameplay input while open.
 * Prefers Pokemon-3D-api GLB; missing / failed loads fall back to
 * PokeAPI official artwork and Showdown sprites.
 */

const DEX_LIST = NATIONAL_DEX;
const KANTO_TOTAL = 151;

let modelViewerReady: Promise<void> | null = null;
function ensureModelViewer(): Promise<void> {
  if (customElements.get('model-viewer')) return Promise.resolve();
  if (!modelViewerReady) {
    modelViewerReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
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

/** Adventure-locked Kanto rows stay ??? until seen; later gens are catalog-open. */
function isRevealed(e: NationalEntry): boolean {
  const k = kantoEntry(e);
  if (!k) return true;
  return DexProgress.hasSeen(k.slug);
}

export class DexUI {
  readonly el: HTMLElement;

  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private countEl: HTMLElement;
  private searchEl: HTMLInputElement;
  private listBuilt = false;
  private open = false;
  private index = 0;
  private onClose: (() => void) | null = null;

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
        if (this.searchEl.value) {
          this.searchEl.value = '';
        } else {
          this.close();
        }
      }
    });
    head.appendChild(this.searchEl);
    head.appendChild(el('span', 'pt-dex__hint', 'B / Esc 关闭 · ↑↓ 选择 · Enter 跳转'));
    panel.appendChild(head);

    const body = el('div', 'pt-dex__body');
    this.listEl = el('div', 'pt-dex__list');
    this.detailEl = el('div', 'pt-dex__detail');
    body.appendChild(this.listEl);
    body.appendChild(this.detailEl);
    panel.appendChild(body);
    this.el.appendChild(panel);

    this.ensureList();
    this.renderDetail();
    this.refreshCount();

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  /** True while the jump field owns typing. */
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
    this.ensureList();
    this.refreshListState();
    this.renderDetail();
    this.scrollToIndex();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.classList.remove('is-on');
    this.el.setAttribute('aria-hidden', 'true');
    this.searchEl.blur();
    this.onClose?.();
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  /** Keyboard navigation while open. Returns true if consumed. */
  handleKey(code: string): boolean {
    if (!this.open) return false;
    // Let the jump field own typing; Esc still closes (handled on the input too).
    if (this.searchFocused && code !== 'Escape' && code !== 'KeyB') {
      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'PageUp' ||
        code === 'PageDown' ||
        code === 'Home' ||
        code === 'End'
      ) {
        // keep navigating the list even from the search box
      } else {
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
    return true; // absorb other keys while open
  }

  /** Jump by national id (`850`, `#850`) or Chinese / slug substring. */
  jumpToQuery(raw: string): boolean {
    const hit = findDexIndex(raw);
    if (hit < 0) return false;
    this.index = hit;
    this.syncSelection();
    return true;
  }

  private ensureList(): void {
    if (this.listBuilt) return;
    this.listEl.replaceChildren();
    for (let i = 0; i < DEX_LIST.length; i++) {
      const e = DEX_LIST[i];
      const row = el('button', 'pt-dex__row');
      row.type = 'button';
      row.dataset.index = String(i);
      row.appendChild(el('span', 'pt-dex__no', formatDexNo(e.id)));
      row.appendChild(el('span', 'pt-dex__name', ''));
      row.addEventListener('click', () => {
        this.index = i;
        this.syncSelection();
      });
      this.listEl.appendChild(row);
    }
    this.listBuilt = true;
    this.refreshListState();
  }

  private refreshListState(): void {
    const rows = this.listEl.children;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as HTMLElement;
      const e = DEX_LIST[i];
      const seen = isRevealed(e);
      row.className = `pt-dex__row${seen ? '' : ' is-unknown'}${i === this.index ? ' is-active' : ''}`;
      const nameEl = row.querySelector('.pt-dex__name');
      if (nameEl) nameEl.textContent = seen ? e.name : '？？？';

      row.querySelector('.pt-dex__badge')?.remove();
      row.querySelector('.pt-dex__owned')?.remove();
      if (!hasRegularGlb(e.id)) {
        row.appendChild(el('span', 'pt-dex__badge', '2D'));
      }
      if (DexProgress.hasOwned(e.slug)) {
        row.appendChild(el('span', 'pt-dex__owned', '拥有'));
      }
    }
  }

  private syncSelection(): void {
    const rows = this.listEl.querySelectorAll('.pt-dex__row');
    rows.forEach((row, i) => {
      row.classList.toggle('is-active', i === this.index);
    });
    this.renderDetail();
    this.scrollToIndex();
  }

  private scrollToIndex(): void {
    const row = this.listEl.children[this.index] as HTMLElement | undefined;
    row?.scrollIntoView({ block: 'nearest' });
  }

  private renderDetail(): void {
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
    this.detailEl.appendChild(stage);

    if (!hasRegularGlb(e.id)) {
      this.mountSprite(stage, e, seen, '无上游 3D，已用 2D 立绘兜底');
    } else {
      this.mountGlbWithSpriteFallback(stage, e, seen);
    }

    if (!seen) {
      this.detailEl.appendChild(
        el('p', 'pt-dex__locked', '在野外遭遇或获得后，图鉴才会记录详细资料。'),
      );
      return;
    }

    const types = el('div', 'pt-dex__types');
    for (const t of e.types) {
      const chip = el(
        'span',
        `pt-dex__type pt-dex__type--${t}`,
        TYPE_ZH[t as DexTypeId] ?? t,
      );
      types.appendChild(chip);
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
    viewer.setAttribute('loading', 'eager');
    viewer.setAttribute('reveal', 'auto');
    viewer.setAttribute('alt', seen ? e.name : '未鉴定的宝可梦');
    viewer.setAttribute('src', glbUrlForDexId(e.id));
    stage.appendChild(viewer);
    const credit = el('p', 'pt-dex__credit', '3D：Pokemon-3D-api（本地 / CDN）');
    stage.appendChild(credit);

    const toSprite = (): void => {
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
    img.loading = 'eager';
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
    this.countEl.textContent = `关都目击 ${DexProgress.seenCount()} / ${KANTO_TOTAL} · 浏览 ${DEX_LIST.length}`;
  }
}

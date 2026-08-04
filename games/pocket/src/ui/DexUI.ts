import './dex.css';
import { el } from './Menu';
import {
  KANTO_DEX,
  TYPE_ZH,
  formatDexNo,
  heightLabel,
  weightLabel,
  type DexEntry,
} from '../gameplay/dex';
import { DexProgress } from '../gameplay/dex/DexProgress';

/**
 * DexUI — full Kanto Pokédex browser (#001–151).
 * Open with B; Esc / B closes. Suspends gameplay input while open.
 */

export class DexUI {
  readonly el: HTMLElement;

  private listEl: HTMLElement;
  private detailEl: HTMLElement;
  private countEl: HTMLElement;
  private open = false;
  private index = 0;
  private onClose: (() => void) | null = null;

  constructor() {
    this.el = el('div', 'pt-dex');
    this.el.setAttribute('aria-hidden', 'true');

    const panel = el('div', 'pt-dex__panel');
    const head = el('div', 'pt-dex__head');
    head.appendChild(el('h2', 'pt-dex__title', '关都图鉴'));
    this.countEl = el('span', 'pt-dex__count', '');
    head.appendChild(this.countEl);
    head.appendChild(el('span', 'pt-dex__hint', 'B / Esc 关闭 · ↑↓ 选择'));
    panel.appendChild(head);

    const body = el('div', 'pt-dex__body');
    this.listEl = el('div', 'pt-dex__list');
    this.detailEl = el('div', 'pt-dex__detail');
    body.appendChild(this.listEl);
    body.appendChild(this.detailEl);
    panel.appendChild(body);
    this.el.appendChild(panel);

    this.buildList();
    this.renderDetail();
    this.refreshCount();

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
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
    this.buildList();
    this.renderDetail();
    this.scrollToIndex();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.el.classList.remove('is-on');
    this.el.setAttribute('aria-hidden', 'true');
    this.onClose?.();
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  /** Keyboard navigation while open. Returns true if consumed. */
  handleKey(code: string): boolean {
    if (!this.open) return false;
    if (code === 'Escape' || code === 'KeyB') {
      this.close();
      return true;
    }
    if (code === 'ArrowUp' || code === 'KeyW') {
      this.index = Math.max(0, this.index - 1);
      this.syncSelection();
      return true;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      this.index = Math.min(KANTO_DEX.length - 1, this.index + 1);
      this.syncSelection();
      return true;
    }
    if (code === 'PageUp') {
      this.index = Math.max(0, this.index - 10);
      this.syncSelection();
      return true;
    }
    if (code === 'PageDown') {
      this.index = Math.min(KANTO_DEX.length - 1, this.index + 10);
      this.syncSelection();
      return true;
    }
    if (code === 'Home') {
      this.index = 0;
      this.syncSelection();
      return true;
    }
    if (code === 'End') {
      this.index = KANTO_DEX.length - 1;
      this.syncSelection();
      return true;
    }
    return true; // absorb other keys while open
  }

  private buildList(): void {
    this.listEl.replaceChildren();
    for (let i = 0; i < KANTO_DEX.length; i++) {
      const e = KANTO_DEX[i];
      const seen = DexProgress.hasSeen(e.slug);
      const row = el('button', `pt-dex__row${seen ? '' : ' is-unknown'}${i === this.index ? ' is-active' : ''}`);
      row.type = 'button';
      row.dataset.index = String(i);
      row.appendChild(el('span', 'pt-dex__no', formatDexNo(e.id)));
      row.appendChild(el('span', 'pt-dex__name', seen ? e.name : '？？？'));
      if (DexProgress.hasOwned(e.slug)) {
        row.appendChild(el('span', 'pt-dex__owned', '拥有'));
      }
      row.addEventListener('click', () => {
        this.index = i;
        this.syncSelection();
      });
      this.listEl.appendChild(row);
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
    const e = KANTO_DEX[this.index];
    const seen = DexProgress.hasSeen(e.slug);
    this.detailEl.replaceChildren();

    const hero = el('div', 'pt-dex__hero');
    hero.appendChild(el('div', 'pt-dex__num', formatDexNo(e.id)));
    hero.appendChild(el('div', 'pt-dex__big-name', seen ? e.name : '？？？'));
    hero.appendChild(el('div', 'pt-dex__genus', seen ? e.genus : '尚未目击'));
    this.detailEl.appendChild(hero);

    if (!seen) {
      this.detailEl.appendChild(
        el('p', 'pt-dex__locked', '在野外遭遇或获得后，图鉴才会记录详细资料。'),
      );
      return;
    }

    const types = el('div', 'pt-dex__types');
    for (const t of e.types) {
      const chip = el('span', `pt-dex__type pt-dex__type--${t}`, TYPE_ZH[t] ?? t);
      types.appendChild(chip);
    }
    this.detailEl.appendChild(types);

    const meta = el('div', 'pt-dex__meta');
    meta.appendChild(el('span', '', `身高 ${heightLabel(e.height)}`));
    meta.appendChild(el('span', '', `体重 ${weightLabel(e.weight)}`));
    this.detailEl.appendChild(meta);

    this.detailEl.appendChild(this.statBlock(e));

    if (DexProgress.hasOwned(e.slug)) {
      this.detailEl.appendChild(el('p', 'pt-dex__note', '已加入队伍。'));
    }
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
    this.countEl.textContent = `目击 ${DexProgress.seenCount()} / 151`;
  }
}

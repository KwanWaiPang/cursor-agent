/**
 * Lightweight boot / click-to-play overlay for the game hub.
 * Kept out of the HUD subsystem so it works even if UI init fails.
 */

const LABELS = {
  render: '初始化渲染',
  materials: '生成材质',
  sky: '构建天空',
  world: '生成街区',
  physics: '初始化物理',
  player: '部署玩家',
  weapons: '装配武器',
  fx: '加载特效',
  ai: '部署单位',
  ui: '装配界面',
  audio: '初始化音频',
  prewarm: '预编译着色器',
  ready: '准备就绪',
};

export function createBootUi() {
  let root = document.getElementById('boot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'boot';
    document.body.appendChild(root);
  }
  root.innerHTML = `
    <div class="boot-card">
      <div class="boot-brand">街战突击</div>
      <div class="boot-status" id="boot-status">正在启动…</div>
      <div class="boot-bar"><i id="boot-bar"></i></div>
      <div class="boot-meta" id="boot-meta">画质自适应中</div>
      <button type="button" class="boot-start" id="boot-start" hidden>点击进入街区</button>
      <div class="boot-hint">WASD 移动 · Q/E 探头 · Z 下蹲 · 2 名队友协同 · 鼠标射击</div>
    </div>
  `;
  const status = root.querySelector('#boot-status');
  const bar = root.querySelector('#boot-bar');
  const meta = root.querySelector('#boot-meta');
  const start = root.querySelector('#boot-start');

  const set = (ratio, label, metaText) => {
    const r = Math.max(0, Math.min(1, ratio || 0));
    bar.style.width = `${(r * 100).toFixed(1)}%`;
    if (label) status.textContent = label;
    if (metaText != null) meta.textContent = metaText;
  };

  return {
    root,
    set,
    setPhase(phase, id, ratio, metaText) {
      const label = LABELS[id] || LABELS[phase] || '加载中…';
      set(ratio, label, metaText);
    },
    showStart(onClick) {
      status.textContent = '加载完成';
      bar.style.width = '100%';
      start.hidden = false;
      start.focus();
      const go = () => {
        start.disabled = true;
        onClick?.();
      };
      start.addEventListener('click', go, { once: true });
    },
    hide() {
      root.classList.add('is-done');
      setTimeout(() => root.remove(), 420);
    },
    fail(err) {
      status.textContent = '启动失败';
      meta.textContent = String(err?.message || err || '未知错误');
      bar.style.width = '100%';
      bar.style.background = '#c44';
    },
  };
}

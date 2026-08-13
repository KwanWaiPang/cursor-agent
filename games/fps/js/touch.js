/**
 * Phone virtual sticks for 战术突击. Hidden when ?capture=1.
 * Left stick moves, right half drags look, buttons fire / ADS / jump / crouch / reload.
 */

const CSS = `
.fps-touch {
  position: fixed; inset: 0; z-index: 50;
  pointer-events: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.fps-touch[hidden] { display: none !important; }
.fps-touch__look {
  position: absolute; right: 0; top: 0; width: 58%; height: 100%;
  pointer-events: auto;
}
.fps-touch__move {
  position: absolute; left: 0; bottom: 0; width: 46%; height: 58%;
  pointer-events: auto;
}
.fps-touch__stick {
  position: absolute; left: 28px; bottom: 36px;
  width: 128px; height: 128px;
  border-radius: 50%;
  border: 2px solid rgba(183,213,154,.35);
  background: rgba(18,22,14,.32);
  pointer-events: none;
}
.fps-touch__stick i {
  position: absolute; left: 50%; top: 50%;
  width: 54px; height: 54px; margin: -27px 0 0 -27px;
  border-radius: 50%;
  background: rgba(183,213,154,.88);
  box-shadow: 0 2px 10px rgba(0,0,0,.45);
}
.fps-touch__btns {
  position: absolute; right: 12px; bottom: 18px;
  display: grid;
  grid-template-columns: repeat(3, 58px);
  gap: 10px;
  pointer-events: none;
  justify-items: end;
}
.fps-touch__btn {
  pointer-events: auto;
  width: 58px; height: 58px;
  border-radius: 50%;
  border: 1px solid rgba(183,213,154,.35);
  background: rgba(18,22,14,.5);
  color: #e8e2d4;
  font: 700 12px/1 "Noto Sans SC", sans-serif;
}
.fps-touch__btn.is-fire {
  width: 78px; height: 78px;
  background: rgba(196,92,42,.62);
  font-size: 14px;
}
.fps-touch__pause {
  position: absolute; top: 12px; right: 12px;
  pointer-events: auto;
  width: 44px; height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(183,213,154,.35);
  background: rgba(18,22,14,.5);
  color: #e8e2d4;
  font: 700 16px/1 sans-serif;
}
@media (max-height: 500px) {
  .fps-touch__stick { width: 104px; height: 104px; }
  .fps-touch__btn { width: 48px; height: 48px; }
  .fps-touch__btn.is-fire { width: 64px; height: 64px; }
}
`;

export function isTouchPlay() {
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  if (q.get('capture') === '1') return false;
  if (q.get('touch') === '0') return false;
  if (q.get('touch') === '1') return true;
  if (typeof navigator === 'undefined') return false;
  return (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)')?.matches === true;
}

function installCss() {
  if (document.getElementById('fps-touch-style')) return;
  const s = document.createElement('style');
  s.id = 'fps-touch-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  parent.appendChild(n);
  return n;
}

export function mountTouchControls(game) {
  installCss();
  const wrap = el('div', 'fps-touch', document.body);
  wrap.setAttribute('aria-hidden', 'true');
  const lookPad = el('div', 'fps-touch__look', wrap);
  const movePad = el('div', 'fps-touch__move', wrap);
  const stick = el('div', 'fps-touch__stick', movePad);
  const knob = el('i', '', stick);
  const btns = el('div', 'fps-touch__btns', wrap);
  const pause = el('button', 'fps-touch__pause', wrap, '❚❚');
  pause.type = 'button';

  const player = game.player;
  player.moveAxis = player.moveAxis || { x: 0, z: 0 };

  const mkHold = (label, extra, on, off) => {
    const b = el('button', extra ? `fps-touch__btn ${extra}` : 'fps-touch__btn', btns, label);
    b.type = 'button';
    const down = (e) => {
      e.preventDefault();
      e.stopPropagation();
      on();
    };
    const up = (e) => {
      e.preventDefault();
      e.stopPropagation();
      off?.();
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    return b;
  };

  mkHold('蹲', '', () => { player.keys.crouch = true; }, () => { player.keys.crouch = false; });
  mkHold('跳', '', () => { player.keys.jump = true; }, () => {});
  mkHold('弹', '', () => { player.keys.reload = true; }, () => {});
  mkHold('镜', '', () => { game.aiming = true; }, () => { game.aiming = false; });
  mkHold('射', 'is-fire', () => { game.shooting = true; }, () => { game.shooting = false; });
  mkHold('枪', '', () => { player._weaponKey = 'Digit2'; }, () => {});

  pause.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!game.running || game._ended) return;
    game.paused = true;
    game.shooting = false;
    game.aiming = false;
    document.getElementById('pause')?.classList.remove('hidden');
  });

  const move = { id: null, cx: 0, cy: 0 };
  const look = { id: null, x: 0, y: 0 };
  const R = 52;

  const setStick = (dx, dy) => {
    const len = Math.hypot(dx, dy);
    const k = len > R ? R / len : 1;
    const nx = (dx * k) / R;
    const ny = (dy * k) / R;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    player.moveAxis.x = nx;
    player.moveAxis.z = -ny;
    player.touchSprint = Math.hypot(nx, ny) > 0.92;
  };
  const clearMove = () => {
    move.id = null;
    knob.style.transform = '';
    player.moveAxis.x = 0;
    player.moveAxis.z = 0;
    player.touchSprint = false;
  };

  movePad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    move.id = e.pointerId;
    const r = stick.getBoundingClientRect();
    move.cx = r.left + r.width / 2;
    move.cy = r.top + r.height / 2;
    movePad.setPointerCapture?.(e.pointerId);
    setStick(e.clientX - move.cx, e.clientY - move.cy);
  });
  movePad.addEventListener('pointermove', (e) => {
    if (move.id !== e.pointerId) return;
    e.preventDefault();
    setStick(e.clientX - move.cx, e.clientY - move.cy);
  });
  movePad.addEventListener('pointerup', (e) => {
    if (move.id !== e.pointerId) return;
    e.preventDefault();
    clearMove();
  });
  movePad.addEventListener('pointercancel', clearMove);

  lookPad.addEventListener('pointerdown', (e) => {
    if (e.target.closest?.('.fps-touch__btn, .fps-touch__pause')) return;
    e.preventDefault();
    look.id = e.pointerId;
    look.x = e.clientX;
    look.y = e.clientY;
    lookPad.setPointerCapture?.(e.pointerId);
  });
  lookPad.addEventListener('pointermove', (e) => {
    if (look.id !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - look.x;
    const dy = e.clientY - look.y;
    look.x = e.clientX;
    look.y = e.clientY;
    game.applyLookDelta?.(dx * 0.0055, dy * 0.0055);
  });
  lookPad.addEventListener('pointerup', () => { look.id = null; });
  lookPad.addEventListener('pointercancel', () => { look.id = null; });

  return {
    root: wrap,
    setVisible(v) {
      wrap.hidden = !v;
      if (!v) clearMove();
    },
    dispose() {
      clearMove();
      wrap.remove();
    },
  };
}

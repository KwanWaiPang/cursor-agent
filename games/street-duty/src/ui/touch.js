/**
 * Dual analog + action buttons for phones. Writes into Input.stick / held codes
 * so movement, look and fire reuse the desktop path. Hidden in capture mode.
 */

const CSS = `
.sd-touch {
  position: fixed; inset: 0; z-index: 40;
  pointer-events: none;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.sd-touch[hidden] { display: none !important; }
.sd-touch__look {
  position: absolute; right: 0; top: 0; width: 58%; height: 100%;
  pointer-events: auto;
}
.sd-touch__move {
  position: absolute; left: 0; bottom: 0; width: 46%; height: 58%;
  pointer-events: auto;
}
.sd-touch__stick {
  position: absolute;
  width: 128px; height: 128px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,.28);
  background: rgba(8,12,16,.28);
  pointer-events: none;
}
.sd-touch__stick i {
  position: absolute; left: 50%; top: 50%;
  width: 54px; height: 54px; margin: -27px 0 0 -27px;
  border-radius: 50%;
  background: rgba(238,244,247,.82);
  box-shadow: 0 2px 10px rgba(0,0,0,.45);
}
.sd-touch__move .sd-touch__stick { left: 28px; bottom: 36px; }
.sd-touch__btns {
  position: absolute; right: 12px; bottom: 18px;
  display: grid;
  grid-template-columns: repeat(3, 58px);
  gap: 10px;
  pointer-events: none;
  justify-items: end;
}
.sd-touch__btn {
  pointer-events: auto;
  width: 58px; height: 58px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,.28);
  background: rgba(8,12,16,.45);
  color: rgba(238,244,247,.95);
  font: 700 12px/1 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .04em;
}
.sd-touch__btn.is-fire {
  width: 78px; height: 78px;
  background: rgba(255,63,49,.55);
  font-size: 14px;
}
.sd-touch__pause {
  position: absolute; top: 12px; right: 12px;
  pointer-events: auto;
  width: 44px; height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.28);
  background: rgba(8,12,16,.45);
  color: #fff;
  font: 700 16px/1 ui-sans-serif, system-ui, sans-serif;
}
@media (max-height: 500px) {
  .sd-touch__stick { width: 104px; height: 104px; }
  .sd-touch__btn { width: 48px; height: 48px; }
  .sd-touch__btn.is-fire { width: 64px; height: 64px; }
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
  if (document.getElementById('sd-touch-style')) return;
  const s = document.createElement('style');
  s.id = 'sd-touch-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  parent?.appendChild(n);
  return n;
}

export function mountTouchControls(root, input, opts = {}) {
  installCss();
  input.skipPointerLock = true;
  input.touchDriving = false;

  const wrap = el('div', 'sd-touch', root);
  wrap.setAttribute('aria-hidden', 'true');
  const lookPad = el('div', 'sd-touch__look', wrap);
  const movePad = el('div', 'sd-touch__move', wrap);
  const moveStick = el('div', 'sd-touch__stick', movePad);
  const moveKnob = el('i', '', moveStick);
  const btns = el('div', 'sd-touch__btns', wrap);
  const pause = el('button', 'sd-touch__pause', wrap, '❚❚');
  pause.type = 'button';

  const hold = (code, down) => {
    if (down) input._pendingDown.add(code);
    else input._pendingUp.add(code);
  };

  const mkBtn = (label, code, extra) => {
    const b = el('button', extra ? `sd-touch__btn ${extra}` : 'sd-touch__btn', btns, label);
    b.type = 'button';
    const on = (e) => {
      e.preventDefault();
      e.stopPropagation();
      hold(code, true);
    };
    const off = (e) => {
      e.preventDefault();
      e.stopPropagation();
      hold(code, false);
    };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', (e) => {
      if (e.buttons) off(e);
    });
    return b;
  };

  mkBtn('蹲', 'KeyZ');
  mkBtn('跳', 'Space');
  mkBtn('弹', 'KeyR');
  mkBtn('镜', 'Mouse2');
  mkBtn('射', 'Mouse0', 'is-fire');
  mkBtn('枪', 'Tab');

  pause.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    opts.onPause?.();
  });

  const move = { id: null, cx: 0, cy: 0 };
  const look = { id: null, x: 0, y: 0 };
  const R = 52;

  const setStick = (dx, dy) => {
    const len = Math.hypot(dx, dy);
    const k = len > R ? R / len : 1;
    const nx = (dx * k) / R;
    const ny = (dy * k) / R;
    moveKnob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    input.touchDriving = true;
    input.stick.moveX = nx;
    input.stick.moveY = ny;
  };

  const clearMove = () => {
    move.id = null;
    moveKnob.style.transform = '';
    input.stick.moveX = 0;
    input.stick.moveY = 0;
    input.touchDriving = false;
  };

  movePad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    move.id = e.pointerId;
    const r = moveStick.getBoundingClientRect();
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
    if (e.target.closest?.('.sd-touch__btn, .sd-touch__pause')) return;
    e.preventDefault();
    look.id = e.pointerId;
    look.x = e.clientX;
    look.y = e.clientY;
    lookPad.setPointerCapture?.(e.pointerId);
  });
  lookPad.addEventListener('pointermove', (e) => {
    if (look.id !== e.pointerId) return;
    e.preventDefault();
    input._rawLook.x += e.clientX - look.x;
    input._rawLook.y += e.clientY - look.y;
    look.x = e.clientX;
    look.y = e.clientY;
  });
  lookPad.addEventListener('pointerup', (e) => {
    if (look.id !== e.pointerId) return;
    look.id = null;
  });
  lookPad.addEventListener('pointercancel', () => {
    look.id = null;
  });

  return {
    root: wrap,
    setVisible(v) {
      wrap.hidden = !v;
      if (!v) {
        clearMove();
        look.id = null;
      }
    },
    dispose() {
      clearMove();
      wrap.remove();
    },
  };
}

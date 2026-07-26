/**
 * 战场视觉特效（自研）：攻击冲刺、受击闪白、伤害飘字、计策粒子
 */

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function createFx() {
  const floats = [];
  const particles = [];
  const unitFx = new Map();
  const slides = new Map();
  let slash = null;
  let burst = null;
  let shake = 0;
  let busyUntil = 0;

  function now() {
    return performance.now();
  }

  function setUnit(id, patch, duration = 280) {
    const t = now();
    const prev = unitFx.get(id) || {};
    unitFx.set(id, {
      ox: 0,
      oy: 0,
      flash: 0,
      alpha: 1,
      ...prev,
      ...patch,
      duration,
      until: t + duration,
    });
  }

  function getUnitDraw(id) {
    const f = unitFx.get(id);
    if (!f) return { ox: 0, oy: 0, flash: 0, alpha: 1 };
    const t = now();
    if (t > f.until) {
      unitFx.delete(id);
      return { ox: 0, oy: 0, flash: 0, alpha: 1 };
    }
    const total = Math.max(1, f.duration || 280);
    const decay = Math.max(0, Math.min(1, (f.until - t) / total));
    return {
      ox: f.ox * decay,
      oy: f.oy * decay,
      flash: f.flash * decay,
      alpha: f.alpha,
    };
  }

  function isTracked(id) {
    const f = unitFx.get(id);
    if (f && now() <= f.until) return true;
    const s = slides.get(id);
    return !!(s && now() <= s.born + s.life);
  }

  /**
   * 走格：逻辑坐标已在终点时，绘制插值 from→to
   */
  function getUnitPos(id, logicalX, logicalY, tile) {
    const s = slides.get(id);
    if (!s) {
      return {
        cx: logicalX * tile + tile / 2,
        cy: logicalY * tile + tile / 2 - 4,
        moving: false,
      };
    }
    const t = now();
    const u = Math.max(0, Math.min(1, (t - s.born) / s.life));
    if (u >= 1) {
      slides.delete(id);
      return {
        cx: logicalX * tile + tile / 2,
        cy: logicalY * tile + tile / 2 - 4,
        moving: false,
      };
    }
    const e = easeInOut(u);
    const gx = s.x0 + (s.x1 - s.x0) * e;
    const gy = s.y0 + (s.y1 - s.y0) * e;
    const hop = Math.sin(e * Math.PI) * 5;
    return {
      cx: gx * tile + tile / 2,
      cy: gy * tile + tile / 2 - 4 - hop,
      moving: true,
    };
  }

  async function playMove(unitId, from, to, tile) {
    if (!from || !to) return;
    if (from.x === to.x && from.y === to.y) return;
    const dist = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    const life = Math.min(720, 220 + dist * 90);
    busyUntil = Math.max(busyUntil, now() + life);
    slides.set(unitId, {
      x0: from.x,
      y0: from.y,
      x1: to.x,
      y1: to.y,
      born: now(),
      life,
    });
    // 路径烟尘
    const steps = Math.max(2, dist);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const px = (from.x + (to.x - from.x) * u) * tile + tile / 2;
      const py = (from.y + (to.y - from.y) * u) * tile + tile / 2 + 10;
      addParticles(px, py, "rgba(180,160,120,0.9)", 3, 0.45);
    }
    await sleep(life);
  }

  function addFloat(x, y, text, color, opts = {}) {
    floats.push({
      x,
      y,
      text,
      color,
      born: now(),
      life: opts.life || 900,
      size: opts.size || 16,
      crit: !!opts.crit,
    });
  }

  function addParticles(x, y, color, count = 10, speed = 1.2) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.4 + Math.random() * 1.2) * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.6,
        color,
        born: now(),
        life: 450 + Math.random() * 350,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function isBusy() {
    return now() < busyUntil;
  }

  /**
   * 物理攻击演出
   */
  async function playAttack(evt, tile) {
    if (!evt?.attacker || !evt?.defender) return;
    const a = evt.attacker;
    const d = evt.defender;
    const ax = a.x * tile + tile / 2;
    const ay = a.y * tile + tile / 2;
    const dx = d.x * tile + tile / 2;
    const dy = d.y * tile + tile / 2;
    const ang = Math.atan2(dy - ay, dx - ax);
    const lx = Math.cos(ang) * 14;
    const ly = Math.sin(ang) * 14;

    const span = evt.dual ? 780 : 520;
    busyUntil = now() + span;
    // 击破后仍短暂绘制，便于演出
    setUnit(d.id, { ox: 0, oy: 0, flash: 0, alpha: 1 }, span + 80);

    // 冲刺
    setUnit(a.id, { ox: lx, oy: ly }, 220);
    await sleep(90);

    slash = {
      x0: ax + lx * 0.3,
      y0: ay + ly * 0.3,
      x1: dx,
      y1: dy,
      born: now(),
      life: 220,
      color: evt.crit ? "#ffe08a" : "#f0f0f0",
    };

    if (evt.miss) {
      setUnit(d.id, { ox: -lx * 0.5, oy: -ly * 0.5, flash: 0 }, 260);
      addFloat(dx, dy - 18, "未中", "#d0d8e8", { size: 15 });
      await sleep(280);
      return;
    }

    setUnit(d.id, { flash: 1, ox: lx * 0.35, oy: ly * 0.35, alpha: 1 }, 320);
    shake = evt.crit ? 5 : 3;
    const label = evt.crit ? `${evt.damage}!` : `${evt.damage}`;
    addFloat(dx, dy - 20, label, evt.crit ? "#ffd060" : "#ffe8e0", {
      size: evt.crit ? 20 : 16,
      crit: evt.crit,
    });
    addParticles(dx, dy, evt.crit ? "#ffc050" : "#ff8060", evt.crit ? 16 : 10);

    if (evt.dual) {
      await sleep(220);
      setUnit(a.id, { ox: lx * 1.1, oy: ly * 1.1 }, 200);
      await sleep(70);
      slash = {
        x0: ax,
        y0: ay,
        x1: dx,
        y1: dy,
        born: now(),
        life: 200,
        color: "#fff0c0",
      };
      setUnit(d.id, { flash: 1, ox: lx * 0.4, oy: ly * 0.4, alpha: 1 }, 300);
      addFloat(dx + 8, dy - 28, "连击", "#ffb040", { size: 13 });
      addParticles(dx, dy, "#ffb070", 8);
      shake = 4;
      await sleep(260);
    } else {
      await sleep(280);
    }

    if (!d.alive) {
      setUnit(d.id, { alpha: 0.25, flash: 0.55 }, 520);
      addFloat(dx, dy - 36, "击破", "#ff6060", { size: 14, life: 1100 });
    }
  }

  /**
   * 计策演出
   */
  async function playMagic(evt, tile) {
    if (!evt?.caster || !evt?.target) return;
    const c = evt.caster;
    const t = evt.target;
    const cx = c.x * tile + tile / 2;
    const cy = c.y * tile + tile / 2;
    const tx = t.x * tile + tile / 2;
    const ty = t.y * tile + tile / 2;
    const name = evt.magic?.name || "计策";
    const heal = !!evt.heal;
    const color = heal ? "#6dcf7a" : magicColor(evt.magic);

    const span = 620;
    busyUntil = now() + span;
    setUnit(t.id, { ox: 0, oy: 0, flash: 0, alpha: 1 }, span + 80);

    // 施法光环
    burst = {
      x: cx,
      y: cy,
      born: now(),
      life: 380,
      color,
      ring: true,
    };
    addParticles(cx, cy - 8, color, 8, 0.8);
    addFloat(cx, cy - 28, name, color, { size: 13, life: 700 });
    await sleep(160);

    // 飞向目标的粒子轨迹
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      particles.push({
        x: cx + (tx - cx) * u,
        y: cy + (ty - cy) * u - Math.sin(u * Math.PI) * 18,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2,
        color,
        born: now(),
        life: 280,
        size: 3,
      });
    }
    await sleep(140);

    burst = {
      x: tx,
      y: ty,
      born: now(),
      life: 420,
      color,
      ring: false,
    };

    if (evt.miss) {
      addFloat(tx, ty - 18, "失败", "#c0c8d0", { size: 14 });
      await sleep(280);
      return;
    }

    if (heal) {
      setUnit(t.id, { flash: 0.5 }, 320);
      addFloat(tx, ty - 20, `+${evt.heal}`, "#7ee090", { size: 17 });
      addParticles(tx, ty, "#80e898", 14, 0.7);
    } else {
      setUnit(t.id, { flash: 1 }, 300);
      shake = 3;
      addFloat(tx, ty - 20, `${evt.damage}`, color, { size: 17 });
      addParticles(tx, ty, color, 14, 1.1);
      if (!t.alive) {
        addFloat(tx, ty - 38, "击破", "#ff6060", { size: 14, life: 1100 });
      }
    }
    await sleep(320);
  }

  function magicColor(magic) {
    const id = magic?.id || "";
    if (id.includes("fire") || id.includes("yan") || id.includes("huo")) return "#ff7040";
    if (id.includes("thunder") || id.includes("lei")) return "#70b0ff";
    if (id.includes("wind") || id.includes("feng")) return "#a0d080";
    if (id.includes("water") || id.includes("shui")) return "#60b0d0";
    if (id.includes("heal") || id.includes("liao") || magic?.heal) return "#6dcf7a";
    return "#c080ff";
  }

  function update() {
    const t = now();
    for (let i = floats.length - 1; i >= 0; i--) {
      if (t - floats[i].born > floats[i].life) floats.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = t - p.born;
      if (age > p.life) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * 2.2;
      p.y += p.vy * 2.2;
      p.vy += 0.04;
    }
    if (slash && t - slash.born > slash.life) slash = null;
    if (burst && t - burst.born > burst.life) burst = null;
    if (shake > 0) shake *= 0.82;
    if (shake < 0.2) shake = 0;

    for (const [id, f] of unitFx) {
      if (t > f.until) unitFx.delete(id);
    }
    for (const [id, s] of slides) {
      if (t > s.born + s.life) slides.delete(id);
    }
  }

  function getShake() {
    if (!shake) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * shake,
      y: (Math.random() - 0.5) * shake,
    };
  }

  function draw(ctx) {
    const t = now();

    if (burst) {
      const age = (t - burst.born) / burst.life;
      const r = burst.ring ? 10 + age * 28 : 8 + age * 36;
      const a = (1 - age) * 0.55;
      ctx.strokeStyle = burst.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = burst.ring ? 2.5 : 3;
      ctx.beginPath();
      ctx.arc(burst.x, burst.y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (!burst.ring) {
        ctx.fillStyle = burst.color;
        ctx.globalAlpha = a * 0.25;
        ctx.beginPath();
        ctx.arc(burst.x, burst.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (slash) {
      const age = (t - slash.born) / slash.life;
      const a = 1 - age;
      ctx.strokeStyle = slash.color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3.5 * a + 1;
      ctx.lineCap = "round";
      ctx.beginPath();
      const mx = (slash.x0 + slash.x1) / 2 + Math.sin(age * 8) * 4;
      const my = (slash.y0 + slash.y1) / 2 - 10 * (1 - age);
      ctx.moveTo(slash.x0, slash.y0);
      ctx.quadraticCurveTo(mx, my, slash.x1, slash.y1);
      ctx.stroke();
      ctx.globalAlpha = a * 0.45;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineCap = "butt";
    }

    for (const p of particles) {
      const age = (t - p.born) / p.life;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of floats) {
      const age = (t - f.born) / f.life;
      const rise = age * 28;
      ctx.globalAlpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
      ctx.font = `bold ${f.size + (f.crit ? 2 : 0)}px "Noto Serif SC", serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(20,10,8,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y - rise);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - rise);
    }
    ctx.globalAlpha = 1;
  }

  function hasVisuals() {
    return (
      floats.length > 0 ||
      particles.length > 0 ||
      slash ||
      burst ||
      shake > 0 ||
      unitFx.size > 0 ||
      slides.size > 0
    );
  }

  return {
    update,
    draw,
    getUnitDraw,
    getUnitPos,
    isTracked,
    getShake,
    playAttack,
    playMagic,
    playMove,
    isBusy,
    hasVisuals,
    addFloat,
    sleep,
  };
}

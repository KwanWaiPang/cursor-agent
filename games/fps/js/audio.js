/** 枪声等音效：优先播放 WAV，失败时回退到简易合成 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.ready = this.loadAll();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  async loadAll() {
    const files = {
      ak: "./assets/ak47_shot.wav",
      pistol: "./assets/pistol_shot.wav",
      reload: "./assets/reload.wav",
    };
    const ctx = this.ensure();
    if (!ctx) return;
    await Promise.all(
      Object.entries(files).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(String(res.status));
          const arr = await res.arrayBuffer();
          this.buffers[key] = await ctx.decodeAudioData(arr.slice(0));
        } catch (e) {
          console.warn("SFX load failed", key, e);
        }
      })
    );
  }

  playBuffer(key, opts = {}) {
    const ctx = this.ensure();
    const buf = this.buffers[key];
    if (!ctx || !buf) return false;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    g.gain.value = opts.gain ?? 0.7;
    src.connect(g);
    g.connect(ctx.destination);
    src.start(0);
    return true;
  }

  tone(freq, dur, type = "square", gain = 0.04, slide = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  shoot(heavy = false) {
    this.ensure();
    const key = heavy ? "ak" : "pistol";
    const ok = this.playBuffer(key, {
      gain: heavy ? 0.85 : 0.7,
      rate: 0.96 + Math.random() * 0.08,
    });
    if (!ok) {
      // 回退
      this.tone(heavy ? 120 : 200, heavy ? 0.1 : 0.06, "sawtooth", 0.05, -90);
      this.tone(heavy ? 55 : 80, 0.08, "triangle", 0.035, -40);
    }
  }

  /** 敌方枪声：更响，并按距离略衰减 */
  enemyShoot(distance = 12) {
    this.ensure();
    const d = Math.max(4, distance);
    const gain = Math.min(1.35, 1.55 * (18 / (d + 6)));
    const ok = this.playBuffer("ak", {
      gain,
      rate: 0.92 + Math.random() * 0.12,
    });
    if (!ok) {
      this.tone(140, 0.11, "sawtooth", 0.09 * (gain / 1.2), -100);
      this.tone(60, 0.1, "triangle", 0.06 * (gain / 1.2), -50);
    }
    if (d < 16) {
      this.tone(90, 0.05, "square", 0.035, -60);
    }
  }

  hit() {
    this.tone(880, 0.04, "square", 0.03, -200);
  }

  reload() {
    if (!this.playBuffer("reload", { gain: 0.55 })) {
      this.tone(320, 0.06, "triangle", 0.025);
      setTimeout(() => this.tone(240, 0.08, "triangle", 0.02), 80);
    }
  }

  hurt() {
    this.tone(110, 0.12, "sawtooth", 0.04, -40);
  }

  pickup() {
    this.tone(520, 0.06, "sine", 0.03, 120);
  }

  win() {
    this.tone(440, 0.1, "sine", 0.04);
    setTimeout(() => this.tone(660, 0.12, "sine", 0.04), 100);
  }

  lose() {
    this.tone(180, 0.2, "sawtooth", 0.04, -100);
  }
}

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

  shoot(heavy = false, weaponId = "") {
    this.ensure();
    // 枪口层：短促噪声冲击，叠在采样/合成之上
    this.tone(40, 0.03, "square", 0.045, -20);
    if (weaponId === "shotgun") {
      this.tone(90, 0.16, "sawtooth", 0.11, -70);
      this.tone(50, 0.14, "triangle", 0.07, -30);
      this.tone(180, 0.07, "square", 0.045, -120);
      return;
    }
    if (weaponId === "sniper") {
      this.tone(160, 0.14, "sawtooth", 0.1, -100);
      this.tone(70, 0.18, "triangle", 0.07, -40);
      // 拉栓咔哒
      this.tone(420, 0.045, "square", 0.03, -80);
      return;
    }
    if (weaponId === "m4") {
      const ok = this.playBuffer("ak", {
        gain: 0.92,
        rate: 1.08 + Math.random() * 0.06,
      });
      if (!ok) {
        this.tone(150, 0.09, "sawtooth", 0.06, -85);
        this.tone(70, 0.08, "triangle", 0.04, -35);
      }
      return;
    }
    const key = heavy ? "ak" : "pistol";
    const ok = this.playBuffer(key, {
      gain: heavy ? 1.05 : 0.88,
      rate: 0.96 + Math.random() * 0.08,
    });
    if (!ok) {
      this.tone(heavy ? 120 : 200, heavy ? 0.11 : 0.07, "sawtooth", 0.07, -90);
      this.tone(heavy ? 55 : 80, 0.09, "triangle", 0.045, -40);
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
    this.tone(880, 0.045, "square", 0.045, -200);
    this.tone(220, 0.03, "triangle", 0.02, -80);
  }

  headshot() {
    this.tone(1200, 0.06, "square", 0.055, -280);
    this.tone(660, 0.08, "sine", 0.035, 80);
  }

  /** 击杀确认音：短促「叮」+ 低沉收尾 */
  kill(headshot = false) {
    this.ensure();
    if (headshot) {
      this.tone(1480, 0.07, "square", 0.06, -400);
      this.tone(880, 0.1, "sine", 0.04, 120);
      this.tone(180, 0.12, "triangle", 0.035, -60);
    } else {
      this.tone(980, 0.06, "square", 0.05, -320);
      this.tone(520, 0.09, "sine", 0.035, 90);
      this.tone(140, 0.1, "triangle", 0.03, -40);
    }
  }

  reload() {
    if (!this.playBuffer("reload", { gain: 0.55 })) {
      this.tone(320, 0.06, "triangle", 0.025);
      // 无 setTimeout：由第二次短音近似
      this.tone(240, 0.05, "triangle", 0.015);
    }
  }

  hurt() {
    this.tone(110, 0.12, "sawtooth", 0.04, -40);
  }

  pickup() {
    this.tone(520, 0.06, "sine", 0.03, 120);
  }

  /** H 求助：短促喇叭/号角 */
  horn() {
    this.ensure();
    this.tone(280, 0.18, "sawtooth", 0.07, -40);
    this.tone(420, 0.22, "square", 0.055, -90);
    this.tone(180, 0.28, "triangle", 0.045, -60);
  }

  win() {
    this.tone(440, 0.1, "sine", 0.04);
    setTimeout(() => this.tone(660, 0.12, "sine", 0.04), 100);
  }

  lose() {
    this.tone(180, 0.2, "sawtooth", 0.04, -100);
  }
}

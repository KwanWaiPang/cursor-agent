/** 简易程序化音效（无外部资源） */
export class Sfx {
  constructor() {
    this.ctx = null;
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
    this.tone(heavy ? 140 : 220, heavy ? 0.09 : 0.05, "sawtooth", heavy ? 0.05 : 0.035, -80);
    this.tone(heavy ? 60 : 90, 0.07, "triangle", 0.03, -30);
  }

  hit() {
    this.tone(880, 0.04, "square", 0.03, -200);
  }

  reload() {
    this.tone(320, 0.06, "triangle", 0.025);
    setTimeout(() => this.tone(240, 0.08, "triangle", 0.02), 80);
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

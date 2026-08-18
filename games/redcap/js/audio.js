/**
 * Tiny chiptune bus — jump / coin / stomp / jingles. Original, not Nintendo.
 */

function ctx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx._ac) ctx._ac = new AC();
  return ctx._ac;
}

function env(gain, t, a = 0.01, d = 0.12, v = 0.12) {
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(v, t + a);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function beep(freq, dur, type = "square", vol = 0.1, slide = 0) {
  const ac = ctx();
  if (!ac) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur);
  env(g, ac.currentTime, 0.01, dur, vol);
  o.connect(g).connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + dur + 0.02);
}

const SFX = {
  jump: () => beep(330, 0.12, "square", 0.07, 280),
  jumpRun: () => beep(280, 0.14, "square", 0.07, 360),
  bounce: () => beep(520, 0.1, "square", 0.06, 80),
  coin: () => {
    beep(987, 0.07, "square", 0.06);
    setTimeout(() => beep(1318, 0.14, "square", 0.055), 55);
  },
  bump: () => beep(90, 0.08, "square", 0.08, -20),
  break: () => {
    beep(180, 0.12, "sawtooth", 0.06, -80);
    beep(90, 0.16, "square", 0.05, -40);
  },
  stomp: () => beep(140, 0.1, "triangle", 0.08, -60),
  power: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.09, "square", 0.06), i * 70));
  },
  fire: () => beep(240, 0.08, "sawtooth", 0.05, 200),
  kick: () => beep(200, 0.1, "square", 0.07, -80),
  pipe: () => beep(180, 0.28, "triangle", 0.07, -90),
  hurry: () => {
    [784, 880, 988, 880].forEach((f, i) => setTimeout(() => beep(f, 0.07, "square", 0.05), i * 70));
  },
  die: () => {
    [400, 300, 200, 140].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.07, -40), i * 90));
  },
  flag: () => {
    [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.07), i * 90));
  },
  oneup: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.08, "square", 0.06), i * 60));
  },
  pause: () => beep(660, 0.08, "square", 0.05),
};

let musicOn = true;
let musicTimer = 0;
let theme = "overworld";

const THEMES = {
  overworld: [523, 659, 784, 659, 392, 523, 587, 523, 440, 494, 523, 392],
  underground: [196, 247, 220, 165, 196, 147, 165, 130],
  castle: [155, 185, 147, 123, 155, 98, 123, 82],
  sky: [523, 659, 784, 988, 784, 659, 587, 523],
  water: [330, 392, 494, 392, 330, 262, 330, 392],
  ice: [587, 698, 880, 698, 587, 523, 466, 392],
};

export const audio = {
  resume() {
    ctx()?.resume?.();
  },
  sfx(name) {
    SFX[name]?.();
  },
  setTheme(name) {
    theme = THEMES[name] ? name : "overworld";
  },
  toggleMusic() {
    musicOn = !musicOn;
    return musicOn;
  },
  tick(dt) {
    if (!musicOn) return;
    musicTimer += dt;
    const gap = theme === "overworld" && audio._hurry ? 0.16 : 0.26;
    if (musicTimer < gap) return;
    musicTimer = 0;
    const seq = THEMES[theme];
    const f = seq[(audio._i = ((audio._i || 0) + 1) % seq.length)];
    beep(f, gap * 0.7, "triangle", 0.025);
  },
};

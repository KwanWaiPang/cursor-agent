/** 原创短音效与低音型。不是任何街机原声。 */

let ac;
let enabled = true;
let musicTimer = 0;
let step = 0;

const BASS = [110, 110, 82.4, 98, 110, 73.4, 82.4, 98];

function context() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ac) ac = new AC();
  if (ac.state === "suspended") ac.resume();
  return ac;
}

function tone(freq, dur, type, vol, slide = 0) {
  const ctx = context();
  if (!ctx || !enabled) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const t = ctx.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol) {
  const ctx = context();
  if (!ctx || !enabled) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start();
}

export const audio = {
  unlock() {
    context();
  },
  get enabled() {
    return enabled;
  },
  setEnabled(v) {
    enabled = !!v;
  },
  play(events) {
    for (const e of events) {
      if (e === "shoot") tone(520, 0.04, "square", 0.03, 180);
      else if (e === "jump") tone(280, 0.09, "square", 0.04, 220);
      else if (e === "grenade") tone(160, 0.08, "sawtooth", 0.04, -40);
      else if (e === "explode") noise(0.18, 0.08);
      else if (e === "hurt" || e === "die") tone(140, 0.14, "square", 0.05, -80);
      else if (e === "hit" || e === "kill") tone(640, 0.05, "square", 0.03, 80);
      else if (e === "pickup") tone(720, 0.07, "square", 0.04, 200);
      else if (e === "break" || e === "block") tone(220, 0.05, "square", 0.03, -30);
      else if (e === "boss") tone(90, 0.2, "sawtooth", 0.05, -20);
      else if (e === "clear" || e === "win") {
        [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.1, "triangle", 0.04), i * 90));
      } else if (e === "pause") tone(440, 0.05, "square", 0.03);
    }
  },
  tickMusic(dt, playing) {
    if (!enabled || !playing) return;
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 0.36;
    const f = BASS[step % BASS.length];
    tone(f, 0.22, "triangle", 0.02);
    if (step % 4 === 0) tone(f * 3, 0.05, "square", 0.012);
    step += 1;
  },
};

// Sintetiza a trilha (120 BPM) e os efeitos sonoros do comercial, sem samples externos.
// Uso: node scripts/audio.mjs  → grava public/audio/*.wav
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM; // 0,5 s
const BAR = BEAT * 4; // 2 s
const TOTAL = 54; // segundos

mkdirSync("public/audio", { recursive: true });

let seed = 1234567;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function writeWav(path, L, R) {
  const n = L.length;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.tanh(L[i] * gain * 1.1) * 0.95;
    const r = Math.tanh(R[i] * gain * 1.1) * 0.95;
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(r * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
  console.log("gravado", path, (n / SR).toFixed(2) + "s");
}

function track(seconds) {
  const n = Math.ceil(seconds * SR);
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}
function add(t, start, samples, gain = 1, pan = 0) {
  const s0 = Math.round(start * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < samples.length; i++) {
    const j = s0 + i;
    if (j < 0 || j >= t.n) continue;
    t.L[j] += samples[i] * gl;
    t.R[j] += samples[i] * gr;
  }
}

// ---------- instrumentos ----------
function kick(len = 0.45) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 45 + 110 * Math.exp(-t * 28);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-t * 7);
    const click = Math.exp(-t * 300) * noise() * 0.3;
    out[i] = Math.tanh(Math.sin(ph) * env * 1.8) + click;
  }
  return out;
}
function snare(len = 0.3) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let lp = 0, hpPrev = 0, hpOut = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = noise();
    hpOut = 0.85 * (hpOut + x - hpPrev);
    hpPrev = x;
    lp += 0.5 * (hpOut - lp);
    const tone = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30);
    out[i] = lp * Math.exp(-t * 16) * 0.9 + tone * 0.6;
  }
  return out;
}
function hat(len = 0.06, open = false) {
  const L = open ? 0.25 : len;
  const n = Math.round(L * SR);
  const out = new Float32Array(n);
  let prev = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const x = noise();
    hp = 0.6 * (hp + x - prev);
    prev = x;
    out[i] = hp * Math.exp(-t * (open ? 14 : 70));
  }
  return out;
}
function bass(note, len) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  const f = midi(note);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const saw = 2 * ((t * f) % 1) - 1;
    const sub = Math.sin(2 * Math.PI * f * t);
    lp += 0.06 * (saw - lp);
    const env = Math.min(1, t * 200) * Math.min(1, (len - t) * 30) * (0.7 + 0.3 * Math.exp(-t * 6));
    out[i] = Math.tanh((sub * 0.9 + lp * 0.5) * 1.4) * env;
  }
  return out;
}
// piano elétrico: senoides com harmônicos que decaem e leve trêmolo
function keys(notes, len) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  for (const note of notes) {
    const f = midi(note);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t * 400) * Math.exp(-t * 2.2) * Math.min(1, (len - t) * 20);
      const v =
        Math.sin(2 * Math.PI * f * t + 0.6 * Math.exp(-t * 8) * Math.sin(2 * Math.PI * f * 2 * t)) +
        0.25 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 6);
      out[i] += v * env * (1 + 0.15 * Math.sin(2 * Math.PI * 5 * t)) * 0.25;
    }
  }
  return out;
}
function pad(notes, len) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let lp = 0;
  const atk = Math.min(0.6, len / 3);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (const note of notes) {
      const f = midi(note);
      for (const d of [-0.12, 0.12]) {
        const ff = f * Math.pow(2, d / 12);
        s += 2 * ((t * ff + d) % 1) - 1;
      }
    }
    lp += 0.025 * (s - lp);
    const env = Math.min(1, t / atk) * Math.min(1, (len - t) / 0.5);
    out[i] = lp * env * 0.08;
  }
  return out;
}
function riser(len) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / len;
    lp += (0.02 + 0.5 * p * p) * (noise() - lp);
    out[i] = lp * p * p * 0.9;
  }
  return out;
}
function impact(len = 2.5) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let ph = 0, lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (38 + 80 * Math.exp(-t * 10))) / SR;
    lp += 0.08 * (noise() - lp);
    out[i] = Math.sin(ph) * Math.exp(-t * 1.6) + lp * Math.exp(-t * 3) * 1.2;
  }
  return out;
}

// ---------- arranjo ----------
const t = track(TOTAL);
// Am7 – Fmaj7 – Cmaj7 – G6, um acorde por compasso
const prog = [
  { root: 33, chord: [57, 60, 64, 67] },
  { root: 29, chord: [53, 57, 60, 64] },
  { root: 36, chord: [55, 60, 64, 71] },
  { root: 31, chord: [55, 59, 62, 64] },
];
const bars = Math.floor(TOTAL / BAR); // 27
// estrutura: 0-1 intro | 2-13 groove | 14 pausa | 15-23 groove cheio | 24-26 final
for (let b = 0; b < bars; b++) {
  const start = b * BAR;
  const c = prog[b % 4];
  const intro = b < 2;
  const breakdown = b === 14;
  const outro = b >= 24;
  const full = b >= 15 && b < 24;

  // pad sempre (exceto depois do impacto final, que tem o próprio sustain)
  if (!outro) add(t, start, pad(c.chord, BAR + 0.3), intro || breakdown ? 1.4 : 0.9, 0);

  if (intro || breakdown) {
    if (intro) for (let k = 0; k < 8; k++) add(t, start + k * BEAT * 0.5 + BEAT * 0.25, hat(), 0.12, 0.4);
    continue;
  }
  if (outro) continue;

  for (let beat = 0; beat < 4; beat++) {
    const bt = start + beat * BEAT;
    // bumbo: 1 e 3, mais a "e" do 3 em compasso par
    if (beat === 0 || beat === 2) add(t, bt, kick(), 1.0);
    if (beat === 2 && b % 2 === 1) add(t, bt + BEAT * 0.75, kick(), 0.7);
    if (beat === 1 || beat === 3) add(t, bt, snare(), 0.55, 0.05);
    // chimbal em colcheias (semicolcheias no trecho cheio)
    const steps = full ? 4 : 2;
    for (let s = 0; s < steps; s++) {
      const open = !full && s === 1 && beat === 3;
      add(t, bt + (s * BEAT) / steps, hat(0.05, open), (s % 2 ? 0.16 : 0.22) * (full ? 0.8 : 1), s % 2 ? 0.35 : -0.25);
    }
  }
  // baixo
  const pattern = [
    [0, 0.75, 0],
    [1.5, 0.4, 0],
    [2, 0.75, 0],
    [3.5, 0.4, 12],
  ];
  for (const [pos, len, oct] of pattern) add(t, start + pos * BEAT, bass(c.root + oct, len * BEAT * 2), 0.55);
  // piano elétrico: acentos no contratempo
  for (const pos of [0.5, 1.5, 2.75]) {
    const k = keys(c.chord, BEAT * 1.4);
    add(t, start + pos * BEAT, k, 0.55, -0.3);
    add(t, start + pos * BEAT + 0.375, k, 0.18, 0.5); // eco
  }
}
// riser antes da entrada (4 s), antes da virada (30 s) e antes do final (48 s)
add(t, 4 - 2, riser(2), 0.7);
add(t, 30 - 2, riser(2), 0.8);
add(t, 48 - 1.5, riser(1.5), 0.6);
// virada de caixa no compasso da pausa
for (let k = 0; k < 8; k++) add(t, 28 + 1 + k * 0.125, snare(0.12), 0.15 + k * 0.05);
// impactos
add(t, 4, impact(), 0.9);
add(t, 30, impact(), 0.8);
add(t, 48, impact(3), 0.9);
// acorde final sustentado
add(t, 48, pad([57, 60, 64, 67, 71], 6), 2.2);
add(t, 48, keys([45, 57, 60, 64, 67], 4), 0.9);
add(t, 48, bass(33, 3.5), 0.6);

// fade de saída no último 1,5 s
for (let i = 0; i < t.n; i++) {
  const s = i / SR;
  const g = Math.min(1, s / 0.3) * Math.min(1, (TOTAL - s) / 1.5);
  t.L[i] *= g;
  t.R[i] *= g;
}
writeWav("public/audio/trilha.wav", t.L, t.R);

// ---------- efeitos ----------
function single(samples, pan = 0) {
  const tt = track(samples.length / SR + 0.05);
  add(tt, 0, samples, 1, pan);
  return tt;
}
function whoosh(len = 0.7) {
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  let lp = 0, bp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const p = t / len;
    const cutoff = 0.02 + 0.35 * Math.sin(Math.PI * p);
    lp += cutoff * (noise() - lp);
    bp += 0.5 * (lp - bp);
    out[i] = (lp - bp * 0.6) * Math.sin(Math.PI * p) ** 2;
  }
  return out;
}
function click() {
  const n = Math.round(0.05 * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = (Math.sin(2 * Math.PI * 2200 * t) * 0.6 + noise() * 0.4) * Math.exp(-t * 180);
  }
  return out;
}
function ding() {
  const n = Math.round(1.6 * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const e = Math.exp(-t * 3.2);
    out[i] =
      (Math.sin(2 * Math.PI * 1318.5 * t) + 0.5 * Math.sin(2 * Math.PI * 2637 * t) * Math.exp(-t * 4) +
        0.6 * Math.sin(2 * Math.PI * 1975.5 * t) * (t > 0.09 ? Math.exp(-(t - 0.09) * 3) : 0)) *
      e * 0.5;
  }
  return out;
}
function pop() {
  const n = Math.round(0.12 * SR);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (300 + 900 * Math.exp(-t * 40))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 35);
  }
  return out;
}
for (const [name, s] of [
  ["whoosh", whoosh()],
  ["click", click()],
  ["ding", ding()],
  ["pop", pop()],
]) {
  const tt = single(s);
  writeWav(`public/audio/${name}.wav`, tt.L, tt.R);
}

// ---------- trilha da demonstração (mais leve, ~71 s) ----------
{
  const LEN = 71.2;
  const FINAL = 66.07; // início do encerramento no vídeo
  const CHAPTERS = [3.67, 37.33]; // cartões de capítulo
  const d = track(LEN);
  const bars = Math.ceil(LEN / BAR);
  for (let b = 0; b < bars; b++) {
    const start = b * BAR;
    if (start >= FINAL) break;
    const ch = prog[b % 4];
    add(d, start, pad(ch.chord, BAR + 0.3), b < 2 ? 1.3 : 0.8, 0);
    for (let k = 0; k < 8; k++) add(d, start + k * BEAT * 0.5, hat(), k % 2 ? 0.08 : 0.12, k % 2 ? 0.35 : -0.25);
    if (b < 2) continue;
    for (let beat = 0; beat < 4; beat++) {
      const bt = start + beat * BEAT;
      if (bt >= FINAL) break;
      if (beat === 0 || beat === 2) add(d, bt, kick(), 0.7);
      if (beat === 1 || beat === 3) add(d, bt, snare(), 0.32, 0.05);
    }
    for (const [pos, len, oct] of [[0, 0.75, 0], [1.5, 0.4, 0], [2, 0.75, 0], [3.5, 0.4, 12]]) {
      if (start + pos * BEAT < FINAL) add(d, start + pos * BEAT, bass(ch.root + oct, len * BEAT * 2), 0.42);
    }
    for (const pos of [0.5, 1.5, 2.75]) {
      if (start + pos * BEAT >= FINAL) continue;
      const k = keys(ch.chord, BEAT * 1.4);
      add(d, start + pos * BEAT, k, 0.45, -0.3);
      add(d, start + pos * BEAT + 0.375, k, 0.14, 0.5);
    }
  }
  for (const at of CHAPTERS) {
    add(d, at - 1.2, riser(1.2), 0.35);
    add(d, at, impact(1.6), 0.4);
  }
  add(d, FINAL - 1.2, riser(1.2), 0.4);
  add(d, FINAL, impact(3), 0.6);
  add(d, FINAL, pad([57, 60, 64, 67, 71], LEN - FINAL), 2.0);
  add(d, FINAL, keys([45, 57, 60, 64, 67], 4), 0.8);
  add(d, FINAL, bass(33, 3.5), 0.5);
  for (let i = 0; i < d.n; i++) {
    const s = i / SR;
    const g = Math.min(1, s / 0.5) * Math.min(1, (LEN - s) / 2);
    d.L[i] *= g;
    d.R[i] *= g;
  }
  writeWav("public/audio/trilha-demo.wav", d.L, d.R);
}

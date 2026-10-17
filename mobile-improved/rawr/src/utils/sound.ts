type Wave = OscillatorType;

interface Note {
  freq: number;
  at?: number;
  duration: number;
  type?: Wave;
  gain?: number;
  slideTo?: number;
}

const MUTE_KEY = 'libtrack-sound-muted';

let context: AudioContext | null = null;
let muted = readMuted();

export function isSoundMuted() {
  return muted;
}

export function setSoundMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {

    // storage unavailable
  }}

export const sounds = {
  tap: (step = 0) => play([{ freq: 520 + step * 60, duration: 0.05, type: 'triangle', gain: 0.12 }]),
  start: () =>
  play([
  { freq: 523, duration: 0.09, type: 'square', gain: 0.07 },
  { freq: 784, at: 0.09, duration: 0.14, type: 'square', gain: 0.07 }]
  ),
  catch: () => play([{ freq: 660, duration: 0.08, type: 'triangle', gain: 0.14, slideTo: 990 }]),
  gold: () =>
  play([
  { freq: 784, duration: 0.07, type: 'square', gain: 0.07 },
  { freq: 988, at: 0.06, duration: 0.07, type: 'square', gain: 0.07 },
  { freq: 1319, at: 0.12, duration: 0.14, type: 'square', gain: 0.07 }]
  ),
  hit: () => play([{ freq: 180, duration: 0.2, type: 'sawtooth', gain: 0.1, slideTo: 70 }]),
  gameOver: () =>
  play([
  { freq: 523, duration: 0.14, type: 'triangle', gain: 0.14 },
  { freq: 392, at: 0.14, duration: 0.14, type: 'triangle', gain: 0.14 },
  { freq: 262, at: 0.28, duration: 0.32, type: 'triangle', gain: 0.14 }]
  ),
  hoot: () =>
  play([
  { freq: 415, duration: 0.2, type: 'sine', gain: 0.2, slideTo: 330 },
  { freq: 440, at: 0.28, duration: 0.34, type: 'sine', gain: 0.2, slideTo: 311 },
  { freq: 1568, at: 0.66, duration: 0.18, type: 'triangle', gain: 0.06 },
  { freq: 2093, at: 0.74, duration: 0.18, type: 'triangle', gain: 0.06 },
  { freq: 2637, at: 0.82, duration: 0.4, type: 'triangle', gain: 0.05 }]
  ),
  gasp: () =>
  play([
  { freq: 520, duration: 0.08, type: 'triangle', gain: 0.12, slideTo: 880 },
  { freq: 880, at: 0.1, duration: 0.06, type: 'triangle', gain: 0.08 }]
  ),
  smug: () =>
  play([
  { freq: 660, duration: 0.07, type: 'sine', gain: 0.14 },
  { freq: 990, at: 0.08, duration: 0.16, type: 'sine', gain: 0.14, slideTo: 1046 }]
  ),
  /** Megumin-style: a rising chant, then the boom */
  explosion: () =>
  play([
  { freq: 330, duration: 0.3, type: 'sine', gain: 0.1, slideTo: 1200 },
  { freq: 160, at: 0.3, duration: 0.9, type: 'sawtooth', gain: 0.22, slideTo: 28 },
  { freq: 95, at: 0.32, duration: 1.1, type: 'square', gain: 0.12, slideTo: 24 }]
  ),
  /** Eerie low drone for the Death Note */
  deathNote: () =>
  play([
  { freq: 196, duration: 0.7, type: 'sine', gain: 0.16, slideTo: 174 },
  { freq: 233, at: 0.05, duration: 0.7, type: 'triangle', gain: 0.06, slideTo: 207 }]
  ),
  /** Geass activation: a sharp ping into a menacing slide */
  geass: () =>
  play([
  { freq: 1760, duration: 0.07, type: 'square', gain: 0.05 },
  { freq: 440, at: 0.06, duration: 0.45, type: 'sawtooth', gain: 0.09, slideTo: 147 },
  { freq: 294, at: 0.08, duration: 0.45, type: 'sine', gain: 0.12, slideTo: 98 }]
  ),
  /** Bouncy idol-concert jingle */
  idol: () =>
  play(
    [523, 659, 784, 1047, 784, 1047, 1319].map((freq, i) => ({
      freq,
      at: i * 0.11,
      duration: i === 6 ? 0.35 : 0.1,
      type: 'square' as const,
      gain: 0.06
    }))
  ),
  /** Switching to dark: a soft descending sweep that settles on a low chime */
  themeDark: () =>
  play([
  { freq: 880, duration: 0.45, type: 'sine', gain: 0.1, slideTo: 220 },
  { freq: 659, at: 0.38, duration: 0.18, type: 'triangle', gain: 0.08 },
  { freq: 494, at: 0.52, duration: 0.18, type: 'triangle', gain: 0.08 },
  { freq: 330, at: 0.66, duration: 0.6, type: 'sine', gain: 0.12 }]
  ),
  /** Switching to light: a rising sweep that blooms into a bright chime */
  themeLight: () =>
  play([
  { freq: 220, duration: 0.45, type: 'sine', gain: 0.1, slideTo: 880 },
  { freq: 659, at: 0.38, duration: 0.14, type: 'triangle', gain: 0.08 },
  { freq: 880, at: 0.5, duration: 0.14, type: 'triangle', gain: 0.08 },
  { freq: 1319, at: 0.62, duration: 0.55, type: 'sine', gain: 0.1 }]
  ),
  /** A book landing on a wooden shelf */
  thunk: () =>
  play([
  { freq: 170, duration: 0.14, type: 'sine', gain: 0.28, slideTo: 60 },
  { freq: 95, at: 0.01, duration: 0.12, type: 'triangle', gain: 0.1, slideTo: 50 },
  { freq: 1175, at: 0.12, duration: 0.1, type: 'triangle', gain: 0.05 }]
  ),
  reveal: () =>
  play([
  { freq: 659, duration: 0.12, type: 'sine', gain: 0.16 },
  { freq: 831, at: 0.1, duration: 0.12, type: 'sine', gain: 0.16 },
  { freq: 988, at: 0.2, duration: 0.12, type: 'sine', gain: 0.16 },
  { freq: 1319, at: 0.3, duration: 0.5, type: 'sine', gain: 0.14 }]
  )
};

export type KeyStroke = 'char' | 'delete' | 'space';

let lastKeyAt = 0;
let noiseBuffer: AudioBuffer | null = null;

/** Soft mechanical-keyboard "thock" for typing feedback. */
export function playKeystroke(kind: KeyStroke = 'char') {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  const nowMs = performance.now();
  if (nowMs - lastKeyAt < 22) return;
  lastKeyAt = nowMs;

  const now = ctx.currentTime;
  const jitter = 0.92 + Math.random() * 0.16;
  const clickFreq = (kind === 'delete' ? 1500 : kind === 'space' ? 1800 : 2600) * jitter;
  const bodyFreq = (kind === 'delete' ? 120 : kind === 'space' ? 140 : 190) * jitter;

  // Click: short filtered noise burst
  const noise = ctx.createBufferSource();
  noise.buffer = getNoiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = clickFreq;
  band.Q.value = 1.4;
  const clickAmp = ctx.createGain();
  clickAmp.gain.setValueAtTime(0.0001, now);
  clickAmp.gain.exponentialRampToValueAtTime(kind === 'space' ? 0.16 : 0.2, now + 0.002);
  clickAmp.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
  noise.connect(band).connect(clickAmp).connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.04);

  // Body: low, quickly decaying tone for the "thock"
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(bodyFreq * 1.6, now);
  osc.frequency.exponentialRampToValueAtTime(bodyFreq, now + 0.03);
  const bodyAmp = ctx.createGain();
  bodyAmp.gain.setValueAtTime(0.0001, now);
  bodyAmp.gain.exponentialRampToValueAtTime(kind === 'space' ? 0.22 : 0.16, now + 0.003);
  bodyAmp.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'space' ? 0.08 : 0.055));
  osc.connect(bodyAmp).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

function getNoiseBuffer(ctx: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  noiseBuffer = buffer;
  return buffer;
}

function play(notes: Note[]) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const note of notes) {
    const start = now + (note.at ?? 0);
    const end = start + note.duration;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = note.type ?? 'sine';
    osc.frequency.setValueAtTime(note.freq, start);
    if (note.slideTo) osc.frequency.exponentialRampToValueAtTime(note.slideTo, end);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(note.gain ?? 0.12, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext;}).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!context) context = new AudioCtor();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
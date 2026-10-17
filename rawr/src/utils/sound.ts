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
  reveal: () =>
  play([
  { freq: 659, duration: 0.12, type: 'sine', gain: 0.16 },
  { freq: 831, at: 0.1, duration: 0.12, type: 'sine', gain: 0.16 },
  { freq: 988, at: 0.2, duration: 0.12, type: 'sine', gain: 0.16 },
  { freq: 1319, at: 0.3, duration: 0.5, type: 'sine', gain: 0.14 }]
  )
};

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
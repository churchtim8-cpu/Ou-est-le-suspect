import { mixer } from './mixer';
import { note, Synth } from './synth';

/**
 * The detective theme, played live in code: a sneaky walking bass in D minor,
 * swung hi-hats, muted chord stabs and a vibraphone tune. It costs nothing
 * and downloads nothing. The search speeds up and gets a shaker in the last
 * 15 seconds; the title plays a softer version.
 */

export type MusicMood = 'title' | 'search' | 'urgent' | 'off';

const D2 = 73.42;
const D4 = 293.66;

/** One bar per chord: Dm7, Gm7, B♭maj7, A7 (semitones above D). */
const CHORDS: { root: number; tones: number[]; walk: number[] }[] = [
  { root: 0, tones: [0, 3, 7, 10], walk: [0, 7, 10, 11] },
  { root: 5, tones: [5, 8, 12, 15], walk: [5, 12, 10, 9] },
  { root: 8, tones: [8, 12, 15, 19], walk: [8, 15, 12, 6] },
  { root: 7, tones: [7, 11, 14, 17], walk: [7, 14, 13, 1] },
];

/** Vibraphone tune, two bars a phrase: [eighth in the 4-bar loop, semitones above D4, length in eighths]. */
const TUNE: [number, number, number][] = [
  [0, 12, 1], [1, 15, 1], [2, 17, 2], [5, 15, 1], [6, 12, 2],
  [8, 10, 1], [9, 12, 1], [10, 15, 3], [14, 17, 1], [15, 19, 1],
  [16, 20, 2], [18, 19, 1], [19, 17, 1], [20, 15, 2], [23, 12, 1],
  [24, 13, 1], [25, 16, 1], [26, 19, 3], [30, 13, 1], [31, 14, 1],
];

const TEMPO = { title: 96, search: 108, urgent: 132 } as const;

export class Music {
  private mood: MusicMood = 'off';
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private synth: Synth | null = null;

  play(mood: MusicMood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (mood === 'off') return this.stop();
    const ctx = mixer.wake();
    if (!ctx) return;
    if (!this.synth || this.synth.ctx !== ctx) this.synth = new Synth(ctx, mixer.music);
    if (this.timer === null) {
      this.nextTime = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 40);
    }
  }

  stop(): void {
    this.mood = 'off';
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.step = 0;
  }

  private schedule(): void {
    const s = this.synth;
    if (!s || this.mood === 'off') return;
    const ctx = s.ctx;
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05; // the tab was asleep
    const eighth = 30 / TEMPO[this.mood];
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(s, this.step, this.nextTime, eighth);
      this.step = (this.step + 1) % 32;
      this.nextTime += eighth;
    }
  }

  private playStep(s: Synth, step: number, t: number, eighth: number): void {
    const bar = Math.floor(step / 8);
    const inBar = step % 8;
    const chord = CHORDS[bar] ?? CHORDS[0]!;
    const swing = inBar % 2 === 1 ? eighth * 0.18 : 0;
    const at = t + swing;
    const soft = this.mood === 'title' ? 0.6 : 1;
    const urgent = this.mood === 'urgent';

    // Walking bass on the beats (an octave up when urgent: small speakers lose the low one).
    if (inBar % 2 === 0) {
      const f = note(D2 * (urgent ? 4 : 2), chord.walk[inBar / 2] ?? chord.root);
      const tone = s.lowpass(900, s.env(at, 0.32 * soft, 0.01, eighth * 1.7));
      s.osc('triangle', f, at, eighth * 2, tone);
      s.osc('sine', f * 2, at, eighth * 1.5, s.env(at, 0.06 * soft, 0.01, eighth));
    }
    // Hi-hat every eighth, accented off-beats; a shaker on sixteenths when urgent.
    s.noiseHit(at, (inBar % 2 ? 0.07 : 0.045) * soft, 0.03, 'highpass', 7000);
    if (urgent) s.noiseHit(at + eighth / 2, 0.035, 0.025, 'highpass', 9000);
    // Snare on 2 and 4.
    if (inBar === 2 || inBar === 6) {
      s.noiseHit(at, 0.16 * soft, 0.11, 'bandpass', 1900);
      s.osc('triangle', 196, at, 0.08, s.env(at, 0.08 * soft, 0.002, 0.07));
    }
    // Muted chord stabs on the "and" of 2 and 4.
    if (inBar === 3 || inBar === 7) {
      const stab = s.lowpass(1600, s.env(at, 0.035 * soft, 0.004, 0.12));
      for (const p of chord.tones) s.osc('square', note(D4, p - 12), at, 0.14, stab);
    }
    // The tune (left out when urgent: bass, drums and stabs drive it on).
    if (!urgent) {
      for (const [when, pitch, len] of TUNE) {
        if (when !== step) continue;
        const f = note(D4, pitch);
        const vib = s.env(at, 0.09 * soft, 0.004, eighth * len * 1.6);
        const trem = s.ctx.createGain();
        trem.connect(vib);
        const lfo = s.ctx.createOscillator();
        lfo.frequency.value = 5.2;
        const depth = s.ctx.createGain();
        depth.gain.value = 0.35;
        lfo.connect(depth).connect(trem.gain);
        lfo.start(at);
        lfo.stop(at + eighth * len * 2);
        s.osc('sine', f, at, eighth * len * 2, trem);
        s.osc('sine', f * 4, at, 0.25, s.env(at, 0.02 * soft, 0.002, 0.2));
      }
    }
  }
}

export const music = new Music();

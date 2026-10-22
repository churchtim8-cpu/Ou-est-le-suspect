import { mixer } from './mixer';
import { note, Synth } from './synth';

/**
 * Interface and story sounds, all synthesised live (no files, no credits):
 * taps, the radio crackle, a decoy's cartoon "boing", the handcuffs, the
 * ARRÊTÉ stamp, the victory fanfare and the sad trombone of an escape.
 */

const D3 = 146.83;
const D4 = 293.66;

let fx: Synth | null = null;
let mus: Synth | null = null;

function effects(): Synth | null {
  const ctx = mixer.wake();
  if (!ctx) return null;
  if (!fx || fx.ctx !== ctx) fx = new Synth(ctx, mixer.effects);
  return fx;
}

function music(): Synth | null {
  const ctx = mixer.wake();
  if (!ctx || mixer.musicMuted) return null;
  if (!mus || mus.ctx !== ctx) mus = new Synth(ctx, mixer.music);
  return mus;
}

export const sounds = {
  /** Highlighting a button. */
  hover(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.005;
    s.osc('sine', 1320, t, 0.05, s.env(t, 0.06, 0.003, 0.04));
  },

  /** Pressing a button. */
  select(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.005;
    s.osc('square', 660, t, 0.08, s.lowpass(2400, s.env(t, 0.1, 0.003, 0.07)));
    s.osc('square', 990, t + 0.07, 0.12, s.lowpass(2800, s.env(t + 0.07, 0.12, 0.003, 0.11)));
  },

  /** A tap on the street that is not a hiding place. */
  tap(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.005;
    s.noiseHit(t, 0.12, 0.05, 'bandpass', 2500);
  },

  /** The radio switching on: a crackle and a squelch. */
  radio(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.01;
    for (let i = 0; i < 6; i++) s.noiseHit(t + i * 0.045 + Math.random() * 0.02, 0.1, 0.04, 'bandpass', 1800 + Math.random() * 900);
    s.osc('square', 1450, t + 0.3, 0.09, s.lowpass(3000, s.env(t + 0.3, 0.05, 0.004, 0.08)));
  },

  /** A wrong spot: a cartoon "boing" as a decoy pops out. */
  decoy(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.005;
    const o = s.osc('sine', 180, t, 0.35, s.env(t, 0.22, 0.005, 0.3));
    o.frequency.exponentialRampToValueAtTime(520, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.3);
    const vib = s.ctx.createOscillator();
    vib.frequency.value = 18;
    const depth = s.ctx.createGain();
    depth.gain.value = 40;
    vib.connect(depth).connect(o.frequency);
    vib.start(t);
    vib.stop(t + 0.35);
  },

  /** Time lost: two low notes. */
  wrong(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.02;
    s.osc('sawtooth', 220, t, 0.14, s.lowpass(900, s.env(t, 0.1, 0.005, 0.12)));
    s.osc('sawtooth', 185, t + 0.15, 0.22, s.lowpass(900, s.env(t + 0.15, 0.1, 0.005, 0.2)));
  },

  /** Handcuffs: two metal clicks and a ring. */
  cuffs(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.01;
    for (const at of [0, 0.11]) {
      s.noiseHit(t + at, 0.35, 0.03, 'highpass', 5000);
      s.osc('square', 2600, t + at, 0.03, s.lowpass(6000, s.env(t + at, 0.05, 0.001, 0.025)));
    }
    s.osc('sine', 3150, t + 0.12, 0.6, s.env(t + 0.12, 0.05, 0.002, 0.55));
    s.osc('sine', 4720, t + 0.12, 0.4, s.env(t + 0.12, 0.025, 0.002, 0.35));
  },

  /** The ARRÊTÉ stamp landing on the file. */
  stamp(): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.01;
    s.noiseHit(t, 0.5, 0.12, 'lowpass', 900);
    const o = s.osc('sine', 260, t, 0.2, s.env(t, 0.4, 0.002, 0.18));
    o.frequency.exponentialRampToValueAtTime(130, t + 0.15);
  },

  /** The last ten seconds. */
  tick(urgent: boolean): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.005;
    s.osc('square', urgent ? 1760 : 1320, t, 0.04, s.lowpass(4000, s.env(t, 0.05, 0.002, 0.035)));
  },

  /** A star appearing on the report. */
  star(i: number): void {
    const s = effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.005;
    const f = note(D4 * 2, [0, 4, 7][i] ?? 12);
    s.osc('triangle', f, t, 0.4, s.env(t, 0.14, 0.005, 0.35));
    s.osc('sine', f * 2, t, 0.3, s.env(t, 0.05, 0.005, 0.25));
  },

  /** Capture: a short brass fanfare with timpani (from the chase game). */
  victory(): void {
    const s = music() ?? effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.05;
    const tr = 0.12;
    const calls: [number, number, number][] = [
      [0, 0, tr], [tr, 0, tr], [tr * 2, 0, tr], [tr * 3, 7, 0.5],
      [0.85, 5, tr], [0.85 + tr, 5, tr], [0.85 + tr * 2, 5, tr], [0.85 + tr * 3, 9, 0.5],
      [1.7, 12, 1.8],
    ];
    for (const [at, pitch, length] of calls) s.brass(t + at, note(D4, pitch), length, 0.1);
    for (const p of [0, 4, 7]) s.brass(t + 1.7, note(D3, p + 12), 1.8, 0.06);
    s.timpani(t, note(D3, 0), 0.4);
    s.timpani(t + 0.85, note(D3, 7), 0.4);
    s.timpani(t + 1.7, note(D3, 0), 0.55);
    s.noiseHit(t + 1.7, 0.18, 2, 'highpass', 4500);
  },

  /** Escape: "wah wah wah waaah". */
  escape(): void {
    const s = music() ?? effects();
    if (!s) return;
    const t = s.ctx.currentTime + 0.05;
    const steps: [number, number, number][] = [[0, -2, 0.38], [0.42, -3, 0.38], [0.84, -4, 0.38], [1.26, -5, 1.3]];
    for (const [at, pitch, length] of steps) {
      const start = t + at;
      const wah = s.ctx.createBiquadFilter();
      wah.type = 'lowpass';
      wah.Q.value = 4;
      wah.frequency.setValueAtTime(350, start);
      wah.frequency.linearRampToValueAtTime(1500, start + 0.12);
      wah.frequency.linearRampToValueAtTime(500, start + length);
      wah.connect(s.hold(start, 0.15, 0.04, length, 0.25));
      s.osc('sawtooth', note(D3, pitch + 12), start, length + 0.3, wah);
    }
  },
};

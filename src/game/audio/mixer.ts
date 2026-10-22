/**
 * The one Web Audio mixer for the whole game, with the lessons from the chase
 * game built in from the start:
 * - everything below 110 Hz is cut from music and effects: laptop and
 *   Chromebook speakers cannot play deep bass and rattle or pump when asked;
 * - the mix sits at 0.72 before a gentle safety limiter, so the limiter
 *   almost never squashes it (that was heard as dips and distortion);
 * - the sound wakes up on the first tap or key (browsers start it asleep)
 *   and again whenever the tab comes back.
 * Spoken French (later) gets its own bus that is never cut or ducked.
 */

const MIX = { master: 0.72, music: 0.5, effects: 0.6, city: 0.55, voice: 1, speakerCut: 110, duckTo: 0.25, duckSeconds: 0.15 } as const;

const MUTE_KEY = 'suspect.music';

export class Mixer {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  music!: GainNode;
  effects!: GainNode;
  /** The street: traffic, crowds, horns, birds, footsteps. */
  city!: GainNode;
  voice!: GainNode;
  musicMuted = readMuted();

  /** Make (or wake) the sound; safe to call on every tap. */
  wake(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor({ latencyHint: 'playback' });
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      limiter.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = MIX.master;
      this.master.connect(limiter);
      // Cut twice for a steep slope.
      const cut1 = ctx.createBiquadFilter();
      cut1.type = 'highpass';
      cut1.frequency.value = MIX.speakerCut;
      const cut2 = ctx.createBiquadFilter();
      cut2.type = 'highpass';
      cut2.frequency.value = MIX.speakerCut;
      cut1.connect(cut2).connect(this.master);
      this.music = ctx.createGain();
      this.music.gain.value = this.musicMuted ? 0 : MIX.music;
      this.music.connect(cut1);
      this.effects = ctx.createGain();
      this.effects.gain.value = MIX.effects;
      this.effects.connect(cut1);
      this.city = ctx.createGain();
      this.city.gain.value = MIX.city;
      this.city.connect(cut1);
      this.voice = ctx.createGain();
      this.voice.gain.value = MIX.voice;
      this.voice.connect(this.master);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void this.ctx?.resume();
      });
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    return this.ctx;
  }

  setMusicMuted(muted: boolean): void {
    this.musicMuted = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on');
    } catch {
      /* private window: the choice lasts for this visit only */
    }
    if (this.ctx) this.music.gain.setTargetAtTime(muted ? 0 : MIX.music, this.ctx.currentTime, 0.1);
  }

  /** Music dips while the radio speaks or a jingle plays. */
  duck(on: boolean): void {
    if (!this.ctx || this.musicMuted) return;
    this.music.gain.setTargetAtTime(on ? MIX.music * MIX.duckTo : MIX.music, this.ctx.currentTime, MIX.duckSeconds);
  }
}

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === 'off';
  } catch {
    return false;
  }
}

export const mixer = new Mixer();

import { mixer } from './mixer';
import { glide, Synth } from './synth';

/**
 * The bustling street, heard where it is seen:
 * - a looping bed of traffic rumble and two crowds chatting (left and right),
 *   rendered by scripts/audio/city.py;
 * - every passing car and the bus has its own engine, panned across the
 *   screen as it drives by, louder near the middle, a touch higher as it comes;
 * - now and then a horn somewhere in the street, and birds in the trees;
 * - the recruit's footsteps when he runs.
 * Game code, so it may use Math.random.
 */

const CITY = {
  bed: 0.5,
  loopStart: 0.1, // the files carry half a second of their own start: loop any window of exactly LOOP s
  bedLoop: 20,
  engineLoop: 2,
  car: 0.55,
  bus: 0.75,
  hearWidth: 760,
  hornEvery: 7,
  birdEvery: 9,
  step: 0.16,
} as const;

export const CITY_FILES = { city_bed: 'audio/city_bed.mp3', engine_car: 'audio/engine_car.mp3', engine_bus: 'audio/engine_bus.mp3' } as const;
type FileKey = keyof typeof CITY_FILES;

export interface Vehicle {
  sprite: { x: number };
  speed: number;
  kind: 'car' | 'bus';
}

const decoded = new Map<string, AudioBuffer>();

/** Decodes the loaded files once (they arrive from Phaser's loader as raw bytes). */
async function buffers(ctx: AudioContext, bytes: (key: FileKey) => ArrayBuffer | undefined): Promise<boolean> {
  for (const key of Object.keys(CITY_FILES) as FileKey[]) {
    if (decoded.has(key)) continue;
    const raw = bytes(key);
    if (!raw) return false;
    decoded.set(key, await ctx.decodeAudioData(raw.slice(0)));
  }
  return true;
}

interface Engine {
  vehicle: Vehicle;
  gain: GainNode;
  pan: StereoPannerNode;
  source: AudioBufferSourceNode;
  rate: number;
}

export class CitySound {
  private sources: AudioBufferSourceNode[] = [];
  private engines: Engine[] = [];
  private bedGain: GainNode | null = null;
  private synth: Synth | null = null;
  private nextHorn = 0;
  private nextBird = 0;
  private stepGap = 0;
  private stopped = false;

  /** Starts the street sound (quietly does nothing until the browser lets sound play). */
  async start(bytes: (key: FileKey) => ArrayBuffer | undefined, vehicles: Vehicle[]): Promise<void> {
    const ctx = mixer.wake();
    if (!ctx || !(await buffers(ctx, bytes)) || this.stopped) return;
    const t = ctx.currentTime;
    this.synth = new Synth(ctx, mixer.city);
    this.bedGain = ctx.createGain();
    this.bedGain.gain.setValueAtTime(0.0001, t);
    this.bedGain.gain.exponentialRampToValueAtTime(CITY.bed, t + 1.5);
    this.bedGain.connect(mixer.city);
    this.sources.push(this.loop(decoded.get('city_bed')!, CITY.bedLoop, this.bedGain, Math.random() * CITY.bedLoop));
    for (const v of vehicles) {
      const pan = ctx.createStereoPanner();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(pan).connect(mixer.city);
      const rate = 0.92 + Math.random() * 0.16;
      const source = this.loop(decoded.get(v.kind === 'bus' ? 'engine_bus' : 'engine_car')!, CITY.engineLoop, gain, Math.random() * CITY.engineLoop);
      source.playbackRate.value = rate;
      this.sources.push(source);
      this.engines.push({ vehicle: v, gain, pan, source, rate });
    }
    this.nextHorn = t + 2 + Math.random() * CITY.hornEvery;
    this.nextBird = t + 1 + Math.random() * CITY.birdEvery;
  }

  private loop(buffer: AudioBuffer, length: number, into: AudioNode, offset: number): AudioBufferSourceNode {
    const s = mixer.ctx!.createBufferSource();
    s.buffer = buffer;
    s.loop = true;
    s.loopStart = CITY.loopStart;
    s.loopEnd = CITY.loopStart + length;
    s.connect(into);
    s.start(mixer.ctx!.currentTime, CITY.loopStart + offset);
    return s;
  }

  /** Every frame: place each engine where its vehicle is on screen; horns and birds now and then. */
  update(cameraCentreX: number): void {
    const ctx = mixer.ctx;
    if (!ctx || !this.synth || this.stopped) return;
    const now = ctx.currentTime;
    for (const e of this.engines) {
      const sx = e.vehicle.sprite.x - cameraCentreX;
      const d = Math.hypot(sx / CITY.hearWidth, 0.3);
      const level = (e.vehicle.kind === 'bus' ? CITY.bus : CITY.car) / (1 + 3 * d * d);
      glide(e.gain.gain, level < 0.02 ? 0 : level, now, 0.08);
      glide(e.pan.pan, Math.max(-1, Math.min(1, sx / (CITY.hearWidth * 1.1))), now, 0.08);
      const doppler = 1 + Math.max(-0.05, Math.min(0.05, (-sx * e.vehicle.speed) / 3e6));
      glide(e.source.playbackRate, e.rate * doppler, now, 0.1);
    }
    if (now >= this.nextHorn) {
      this.horn(now);
      this.nextHorn = now + CITY.hornEvery * (0.5 + Math.random());
    }
    if (now >= this.nextBird) {
      this.birds(now);
      this.nextBird = now + CITY.birdEvery * (0.5 + Math.random());
    }
  }

  private horn(t: number): void {
    const s = this.synth!;
    const bus = Math.random() < 0.2;
    const f = bus ? 250 + Math.random() * 50 : 380 + Math.random() * 90;
    const far = Math.random();
    const pan = s.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.8 - 0.9;
    pan.connect(s.out);
    const beeps = !bus && Math.random() < 0.4 ? 2 : 1;
    for (let b = 0; b < beeps; b++) {
      const t0 = t + b * 0.32;
      const len = bus ? 0.6 + Math.random() * 0.3 : 0.18 + Math.random() * 0.12;
      const tone = s.lowpass(far > 0.5 ? 1500 : 3000, s.hold(t0, 0.05 - far * 0.03, 0.015, len, 0.05, pan));
      s.osc('sawtooth', f, t0, len + 0.1, tone);
      s.osc('sawtooth', f * 1.25, t0, len + 0.1, tone);
    }
  }

  private birds(t: number): void {
    const s = this.synth!;
    const pan = s.ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(s.out);
    const n = 2 + Math.floor(Math.random() * 4);
    const base = 2800 + Math.random() * 1500;
    for (let i = 0; i < n; i++) {
      const t0 = t + i * (0.11 + Math.random() * 0.05);
      const o = s.osc('sine', base, t0, 0.09, s.env(t0, 0.025, 0.005, 0.07, pan));
      o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.3), t0 + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * 0.9, t0 + 0.09);
    }
  }

  /** The recruit running: call every frame with how fast he goes (px/s). */
  footsteps(speed: number, dt: number): void {
    if (!this.synth || speed < 40) {
      this.stepGap = 0;
      return;
    }
    this.stepGap -= dt;
    if (this.stepGap > 0) return;
    this.stepGap = CITY.step * Math.max(1, 500 / speed);
    const t = this.synth.ctx.currentTime + 0.005;
    this.synth.noiseHit(t, 0.07, 0.06, 'lowpass', 700);
    this.synth.noiseHit(t, 0.025, 0.025, 'bandpass', 2600);
  }

  stop(): void {
    this.stopped = true;
    const ctx = mixer.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.bedGain?.gain.setTargetAtTime(0.0001, t, 0.15);
    for (const e of this.engines) e.gain.gain.setTargetAtTime(0, t, 0.15);
    for (const s of this.sources) s.stop(t + 0.8);
    this.sources = [];
    this.engines = [];
  }
}

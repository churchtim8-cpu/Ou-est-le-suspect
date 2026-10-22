import Phaser from 'phaser';
import { PROPS_LAYOUT, STREET_LINES, TILES } from '../content/centreVille';
import { Figure, type WalkerKey } from './figure';
import { lightGraphics } from './graphics';

/**
 * Draws the living street: the Canva panorama tiles, the street things the
 * suspect hides by, people walking on both pavements and traffic going by.
 * Life is decoration only; taps are decided by the street model's spots.
 */

export const DEPTH = {
  street: 0,
  farWalkers: 10,
  suspectFar: 12,
  traffic: 20,
  suspectBehind: 29,
  props: 30,
  suspectNear: 34,
  nearWalkers: 40,
  effects: 60,
  hud: 100,
} as const;

/** Picture keys for the street things. */
export const PROP_PICTURE = { tree: 'tree', bench: 'bench', red_car: 'car_0', blue_car: 'car_1' } as const;

interface Car {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  baseY: number;
  kind: 'car' | 'bus';
}

interface Walker {
  figure: Figure;
  speed: number;
}

export class StreetView {
  readonly width: number;
  readonly cars: Car[] = [];
  private walkers: Walker[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    width: number,
  ) {
    this.width = width;
    for (let i = 0; i < TILES.count; i++) {
      scene.add.image(i * TILES.width, 0, `street_${i}`).setOrigin(0, 0).setScale(1 / TILES.scale).setDepth(DEPTH.street);
    }
    for (const [key, p] of Object.entries(PROPS_LAYOUT) as [keyof typeof PROPS_LAYOUT, (typeof PROPS_LAYOUT)[keyof typeof PROPS_LAYOUT]][]) {
      const img = scene.add.image(p.x, p.footY, PROP_PICTURE[key]).setOrigin(0.5, 1).setDepth(DEPTH.props);
      img.setScale(p.height / img.height);
      if (key === 'blue_car') img.setFlipX(true);
    }
    this.addLife();
  }

  private addLife(): void {
    const keep = lightGraphics() ? 0.5 : 1;
    const rnd = new Phaser.Math.RandomDataGenerator(['bellevue']);
    // People on the far pavement (smaller: further away) and the near pavement.
    const far = Math.round(14 * keep);
    for (let i = 0; i < far; i++) {
      const f = new Figure(this.scene, `walk_${i % 8}` as WalkerKey, rnd.between(0, this.width), STREET_LINES.base + 26, 74, rnd.frac()).setDepth(DEPTH.farWalkers);
      this.walkers.push({ figure: f.face(rnd.pick([-1, 1])), speed: rnd.realInRange(28, 44) });
    }
    const near = Math.round(6 * keep);
    for (let i = 0; i < near; i++) {
      const f = new Figure(this.scene, `walk_${(i + 3) % 8}` as WalkerKey, rnd.between(0, this.width), 716, 96, rnd.frac()).setDepth(DEPTH.nearWalkers);
      this.walkers.push({ figure: f.face(rnd.pick([-1, 1])), speed: rnd.realInRange(36, 52) });
    }
    // One-way traffic on the far lane: cars about the police car's size, the bus bigger.
    // Every Canva vehicle faces left, so the lane runs right to left (never backwards).
    // Never red or blue: "la voiture rouge" and "la voiture bleue" must stay the parked ones.
    const cars: [string, number][] = [['car_2', 86], ['car_4', 84], ['car_3', 90], ['car_5', 124]];
    const count = Math.max(2, Math.round(cars.length * keep));
    for (let i = 0; i < count; i++) {
      const [key, h] = cars[i]!;
      const s = this.scene.add.image((i * this.width) / count, STREET_LINES.trafficY, key).setOrigin(0.5, 1).setDepth(DEPTH.traffic);
      s.setScale(h / s.height);
      const bus = key === 'car_5';
      this.cars.push({ sprite: s, speed: -(bus ? 120 : rnd.realInRange(150, 190)), baseY: s.y, kind: bus ? 'bus' : 'car' });
    }
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    for (const w of this.walkers) {
      const f = w.figure;
      f.move(w.speed * f.facing * dt);
      const half = f.width / 2;
      if (f.x - half > this.width) f.x = -half;
      if (f.x + half < 0) f.x = this.width + half;
    }
    for (const c of this.cars) {
      const s = c.sprite;
      s.x += c.speed * dt;
      const half = s.displayWidth / 2;
      if (s.x + half < 0) s.x = this.width + half;
    }
  }
}

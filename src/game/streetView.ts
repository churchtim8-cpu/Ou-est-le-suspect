import Phaser from 'phaser';
import { PROPS_LAYOUT, STREET_LINES, TILES } from '../content/centreVille';
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

interface Mover {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  baseY: number;
  phase: number;
  bob: number;
  wheels?: boolean;
}

export class StreetView {
  readonly width: number;
  private movers: Mover[] = [];

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
      const dir = rnd.pick([-1, 1]);
      const s = this.scene.add.image(rnd.between(0, this.width), STREET_LINES.base + 26, `walk_${i % 8}`).setOrigin(0.5, 1).setDepth(DEPTH.farWalkers);
      s.setScale(74 / s.height).setFlipX(dir < 0);
      this.movers.push({ sprite: s, speed: dir * rnd.realInRange(28, 44), baseY: s.y, phase: rnd.realInRange(0, 6), bob: 2.2 });
    }
    const near = Math.round(6 * keep);
    for (let i = 0; i < near; i++) {
      const dir = rnd.pick([-1, 1]);
      const s = this.scene.add.image(rnd.between(0, this.width), 716, `walk_${(i + 3) % 8}`).setOrigin(0.5, 1).setDepth(DEPTH.nearWalkers);
      s.setScale(96 / s.height).setFlipX(dir < 0).setAlpha(0.97);
      this.movers.push({ sprite: s, speed: dir * rnd.realInRange(36, 52), baseY: s.y, phase: rnd.realInRange(0, 6), bob: 2.8 });
    }
    // One-way traffic on the far lane: cars about the police car's size, the bus bigger.
    // Never red or blue: "la voiture rouge" and "la voiture bleue" must stay the parked ones.
    const cars: [string, number][] = [['car_2', 86], ['car_4', 84], ['car_3', 90], ['car_5', 124]];
    const count = Math.max(2, Math.round(cars.length * keep));
    for (let i = 0; i < count; i++) {
      const [key, h] = cars[i]!;
      const s = this.scene.add.image((i * this.width) / count, STREET_LINES.trafficY, key).setOrigin(0.5, 1).setDepth(DEPTH.traffic);
      s.setScale(h / s.height);
      this.movers.push({ sprite: s, speed: key === 'car_5' ? 120 : rnd.realInRange(150, 190), baseY: s.y, phase: 0, bob: 0.6, wheels: true });
    }
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100) / 1000;
    for (const m of this.movers) {
      const s = m.sprite;
      s.x += m.speed * dt;
      const half = s.displayWidth / 2;
      if (m.speed > 0 && s.x - half > this.width) s.x = -half;
      if (m.speed < 0 && s.x + half < 0) s.x = this.width + half;
      s.y = m.baseY - Math.abs(Math.sin(time / (m.wheels ? 90 : 160) + m.phase)) * m.bob;
    }
  }
}

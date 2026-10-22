import Phaser from 'phaser';

/**
 * A walking figure whose legs really move: scripts/art/legs.py turns each
 * Canva walker into an eight-frame walk cycle (new legs with bending knees,
 * the picture's own shoes), and the frames follow the distance walked, so
 * the feet never slide however fast the figure goes.
 */

export const WALKERS = ['walk_0', 'walk_1', 'walk_2', 'walk_3', 'walk_4', 'walk_5', 'walk_6', 'walk_7', 'suspect_0', 'suspect_1', 'pie_walk'] as const;
export type WalkerKey = (typeof WALKERS)[number];
export const WALK_FRAMES = 8;

/** One full cycle (two steps) covers this many times the figure's height. */
const CYCLE_OF_HEIGHT = 0.95;

export class Figure {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly key: WalkerKey;
  private readonly height: number;
  private cycle: number;

  constructor(scene: Phaser.Scene, key: WalkerKey, x: number, footY: number, height: number, cycle = 0) {
    this.key = key;
    this.height = height;
    this.cycle = cycle % 1;
    this.sprite = scene.add.image(x, footY, this.frameKey()).setOrigin(0.5, 1);
    this.sprite.setScale(height / this.sprite.height);
  }

  get x(): number {
    return this.sprite.x;
  }

  set x(v: number) {
    this.sprite.x = v;
  }

  get width(): number {
    return this.sprite.displayWidth;
  }

  get facing(): number {
    return this.sprite.flipX ? -1 : 1;
  }

  face(dir: number): this {
    if (dir !== 0) this.sprite.setFlipX(dir < 0);
    return this;
  }

  setDepth(d: number): this {
    this.sprite.setDepth(d);
    return this;
  }

  /** Moves by dx (world pixels); the legs take as many steps as that distance needs. */
  move(dx: number): void {
    this.sprite.x += dx;
    if (dx !== 0) this.face(dx);
    this.cycle = (this.cycle + Math.abs(dx) / (this.height * CYCLE_OF_HEIGHT)) % 1;
    this.sprite.setTexture(this.frameKey());
  }

  private frameKey(): string {
    return `${this.key}_${Math.floor(this.cycle * WALK_FRAMES) % WALK_FRAMES}`;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

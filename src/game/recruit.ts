import Phaser from 'phaser';

/**
 * Max, the recruit, on the near pavement: he keeps up with the camera as
 * the player looks along the street, running (four Canva run frames) when he
 * has ground to cover and standing to attention when he arrives.
 */

const RUN = { height: 100, standHeight: 110, footY: 714, maxSpeed: 1400, accel: 6000, framePx: 34, arrive: 6 } as const;

export class Recruit {
  readonly sprite: Phaser.GameObjects.Image;
  private speed = 0;
  private frame = 0;
  private travelled = 0;
  private facing = 1;

  constructor(scene: Phaser.Scene, x: number, depth: number) {
    this.sprite = scene.add.image(x, RUN.footY, 'recruit_stand').setOrigin(0.5, 1).setDepth(depth);
    this.standPose();
  }

  get x(): number {
    return this.sprite.x;
  }

  /** How fast he is running now (px/s), for the footsteps. */
  get running(): number {
    return Math.abs(this.speed);
  }

  /** Runs towards targetX; returns once he is there. */
  update(targetX: number, dt: number): void {
    const gap = targetX - this.sprite.x;
    if (Math.abs(gap) < RUN.arrive && Math.abs(this.speed) < 200) {
      if (this.speed !== 0) this.standPose();
      this.speed = 0;
      return;
    }
    // Speed up towards the target, and slow down in time to stop on it.
    const want = Math.sign(gap) * Math.min(RUN.maxSpeed, Math.sqrt(2 * RUN.accel * Math.abs(gap)));
    const dv = Phaser.Math.Clamp(want - this.speed, -RUN.accel * dt, RUN.accel * dt);
    this.speed += dv;
    const dx = this.speed * dt;
    this.sprite.x += dx;
    if (Math.abs(this.speed) > 60) {
      this.facing = this.speed < 0 ? -1 : 1;
      this.travelled += Math.abs(dx);
      if (this.travelled >= RUN.framePx || this.sprite.texture.key === 'recruit_stand') {
        this.travelled = 0;
        this.frame = (this.frame + 1) % 4;
        this.sprite.setTexture(`recruit_run_${this.frame}`);
        this.sprite.setScale(RUN.height / this.sprite.height);
      }
      this.sprite.setFlipX(this.facing < 0);
    }
  }

  private standPose(): void {
    this.sprite.setTexture('recruit_stand').setFlipX(false);
    this.sprite.setScale(RUN.standHeight / this.sprite.height);
  }
}

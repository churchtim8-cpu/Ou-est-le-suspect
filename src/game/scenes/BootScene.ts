import Phaser from 'phaser';
import { TILES } from '../../content/centreVille';
import { COLOURS, GAME_HEIGHT, GAME_WIDTH, text } from '../ui';

/** Loads every picture (all WebP, about 1.2 MB for the sample) behind a progress bar. */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'boot';

  constructor() {
    super(BootScene.KEY);
  }

  preload(): void {
    const bar = this.add.graphics();
    text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Loading Bellevue…', 30).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.clear().fillStyle(0xffffff, 0.2).fillRoundedRect(GAME_WIDTH / 2 - 250, GAME_HEIGHT / 2, 500, 24, 12);
      bar.fillStyle(COLOURS.gold, 1).fillRoundedRect(GAME_WIDTH / 2 - 250, GAME_HEIGHT / 2, Math.max(24, 500 * v), 24, 12);
    });
    const img = (key: string, path: string) => this.load.image(key, `images/${path}.webp`);
    for (let i = 0; i < TILES.count; i++) img(`street_${i}`, `centre/street_${i}`);
    for (let i = 0; i < 6; i++) img(`suspect_${i}`, `sprites/suspect_${i}`);
    for (let i = 0; i < 8; i++) img(`walk_${i}`, `sprites/walk_${i}`);
    for (let i = 0; i < 6; i++) img(`car_${i}`, `sprites/car_${i}`);
    img('tree', 'sprites/tree');
    img('bench', 'sprites/bench');
    for (const n of ['walk', 'run', 'stand', 'ring']) img(`pie_${n}`, `sprites/pie_${n}`);
    for (const n of ['sergeant_bust', 'recruit_girl_bust', 'recruit_boy_bust', 'badge', 'radio', 'suspect-pie']) img(n, `cast/${n}`);
  }

  create(): void {
    // ?case=c1-3 opens one case straight away (a link a teacher can share).
    const caseId = new URLSearchParams(window.location.search).get('case');
    if (caseId) this.scene.start('case', { caseId });
    else this.scene.start('title');
  }
}

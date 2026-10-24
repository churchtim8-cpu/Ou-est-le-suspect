import Phaser from 'phaser';
import { TILES } from '../../content/centreVille';
import { CITY_FILES } from '../audio/city';
import { WALK_FRAMES, WALKERS } from '../figure';
import { COLOURS, GAME_HEIGHT, GAME_WIDTH, text } from '../ui';

/** Loads every picture (all WebP, about 1.8 MB for the sample, with the street sounds) behind a progress bar. */
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
    for (const k of ['lamp', 'kiosk', 'bus_shelter', 'parasol', 'flower_stall', 'phone_box', 'bin', 'corner_sign']) img(k, `sprites/${k}`);
    for (const n of ['walk', 'run', 'stand', 'ring']) img(`pie_${n}`, `sprites/pie_${n}`);
    // Walk cycles (scripts/art/legs.py) and the recruit's run.
    for (const key of WALKERS) for (let i = 0; i < WALK_FRAMES; i++) img(`${key}_${i}`, `walk/${key}_${i}`);
    for (let i = 0; i < 4; i++) img(`recruit_run_${i}`, `sprites/recruit_run_${i}`);
    img('recruit_stand', 'sprites/recruit_stand');
    for (const [key, path] of Object.entries(CITY_FILES)) this.load.binary(key, path);
    for (const n of ['sergeant_bust', 'recruit_girl_bust', 'recruit_boy_bust', 'badge', 'radio', 'suspect-pie']) img(n, `cast/${n}`);
  }

  create(): void {
    // ?case=c1-3 opens one case straight away (a link a teacher can share).
    const caseId = new URLSearchParams(window.location.search).get('case');
    if (caseId) this.scene.start('case', { caseId });
    else this.scene.start('title');
  }
}

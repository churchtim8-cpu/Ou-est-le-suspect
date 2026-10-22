import Phaser from 'phaser';
import { buildCentreVille } from '../../content/centreVille';
import { LEVELS } from '../../engine/difficulty';
import { mixer } from '../audio/mixer';
import { music } from '../audio/music';
import { getLevel, setLevel } from '../store';
import { StreetView } from '../streetView';
import { button, COLOURS, fullscreenButton, GAME_HEIGHT, GAME_WIDTH, goTo, text } from '../ui';

/**
 * Title screen: the street drifts by behind the title, police lights flash,
 * and the English menu offers Play, the level and the music.
 */
export class TitleScene extends Phaser.Scene {
  static readonly KEY = 'title';
  private view!: StreetView;

  constructor() {
    super(TitleScene.KEY);
  }

  create(): void {
    this.cameras.main.fadeIn(300, 10, 16, 30);
    const street = buildCentreVille();
    this.view = new StreetView(this, street.width);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, street.width, GAME_HEIGHT);
    cam.scrollX = 1700;
    this.tweens.add({ targets: cam, scrollX: street.width - GAME_WIDTH - 200, duration: 90_000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const ui = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    const shade = this.add.graphics().fillGradientStyle(0x0a1020, 0x0a1020, 0x0a1020, 0x0a1020, 0.85, 0.85, 0.15, 0.15).fillRect(0, 0, GAME_WIDTH, 380);
    ui.add(shade);
    // Police lights across the top.
    const red = this.add.graphics().fillStyle(COLOURS.red, 1).fillRect(0, 0, GAME_WIDTH / 2, 8);
    const blue = this.add.graphics().fillStyle(0x2a6bff, 1).fillRect(GAME_WIDTH / 2, 0, GAME_WIDTH / 2, 8);
    ui.add([red, blue]);
    this.tweens.add({ targets: red, alpha: 0.15, duration: 260, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: blue, alpha: 0.15, duration: 260, yoyo: true, repeat: -1, delay: 260 });

    const badge = this.add.image(GAME_WIDTH / 2, 92, 'badge').setDisplaySize(96, 96);
    const title = text(this, GAME_WIDTH / 2, 188, 'OÙ EST LE SUSPECT ?', 76, '#ffffff', { stroke: COLOURS.navyText, strokeThickness: 10, shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 12, fill: true } }).setOrigin(0.5);
    const sub = text(this, GAME_WIDTH / 2, 258, 'Les dossiers de Bellevue', 32, COLOURS.goldText, { stroke: COLOURS.navyText, strokeThickness: 6 }).setOrigin(0.5);
    ui.add([badge, title, sub]);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const play = button(this, GAME_WIDTH / 2, 360, 320, 74, 'PLAY', () => {
      mixer.wake();
      goTo(this, 'chapter');
    });
    let level = getLevel();
    const levelBtn = button(this, GAME_WIDTH / 2 - 130, 452, 240, 54, `Level: ${LEVELS[level].label}`, () => {
      level = level === 'easy' ? 'medium' : 'easy';
      setLevel(level);
      levelBtn.setLabel(`Level: ${LEVELS[level].label}`);
    }, COLOURS.navy, '#ffffff');
    const musicBtn = button(this, GAME_WIDTH / 2 + 130, 452, 240, 54, `Music: ${mixer.musicMuted ? 'Off' : 'On'}`, () => {
      mixer.setMusicMuted(!mixer.musicMuted);
      musicBtn.setLabel(`Music: ${mixer.musicMuted ? 'Off' : 'On'}`);
      if (!mixer.musicMuted) music.play('title');
    }, COLOURS.navy, '#ffffff');
    const help = text(this, GAME_WIDTH / 2, 520, 'Listen to la centrale, then tap where the suspect is hiding.  Best with headphones.', 20, '#ffffff', { stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    ui.add([play.container, levelBtn.container, musicBtn.container, help]);
    // Children keep their own scroll factor for tapping, so pin them all to the screen.
    ui.setScrollFactor(0, 0, true);
    fullscreenButton(this);

    // Browsers keep sound asleep until the first tap or key.
    this.input.once('pointerdown', () => music.play('title'));
    this.input.keyboard?.once('keydown', () => music.play('title'));
    if (mixer.ctx?.state === 'running') music.play('title');
    this.input.keyboard?.on('keydown-ENTER', () => goTo(this, 'chapter'));
  }

  override update(time: number, delta: number): void {
    this.view.update(time, delta);
  }
}

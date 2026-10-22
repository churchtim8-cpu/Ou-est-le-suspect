import Phaser from 'phaser';
import { CHAPTER_1 } from '../../engine/cases';
import { isOpen } from '../../engine/scoring';
import { music } from '../audio/music';
import { sounds } from '../audio/sounds';
import { getProfile } from '../store';
import { button, COLOURS, fullscreenButton, GAME_HEIGHT, GAME_WIDTH, goTo, text } from '../ui';

/** Chapter 1 case board: five case files pinned up, the boss poster last. */
export class ChapterScene extends Phaser.Scene {
  static readonly KEY = 'chapter';

  constructor() {
    super(ChapterScene.KEY);
  }

  create(): void {
    this.cameras.main.fadeIn(250, 10, 16, 30);
    music.play('title');
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x22324f, 0x22324f, 0x0f1a2c, 0x0f1a2c, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Cork board.
    bg.fillStyle(0xb98a5a, 1).fillRoundedRect(40, 120, GAME_WIDTH - 80, 500, 18);
    bg.lineStyle(10, 0x6b4a2b, 1).strokeRoundedRect(40, 120, GAME_WIDTH - 80, 500, 18);
    for (let i = 0; i < 400; i++) bg.fillStyle(0x9b6f43, 0.5).fillCircle(50 + Math.random() * (GAME_WIDTH - 100), 130 + Math.random() * 480, 1.5);

    text(this, 60, 30, 'CHAPTER 1', 22, COLOURS.goldText);
    text(this, 60, 56, 'Le centre-ville', 44, '#ffffff');
    text(this, GAME_WIDTH - 60, 70, 'Find the suspect in 5 cases. Win a case to open the next one.', 20, '#d0d8e8').setOrigin(1, 0.5);

    const profile = getProfile();
    const order = CHAPTER_1.map((c) => c.id);
    const cardW = 210;
    const gap = (GAME_WIDTH - 80 - CHAPTER_1.length * cardW) / (CHAPTER_1.length + 1);
    CHAPTER_1.forEach((def, i) => {
      const x = 40 + gap + i * (cardW + gap) + cardW / 2;
      const y = 370;
      const open = isOpen(profile, order, def.id);
      const best = profile.best[def.id];
      const card = this.add.container(x, y).setAngle([-3, 2, -1.5, 3, -2][i] ?? 0);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-cardW / 2 + 5, -170 + 8, cardW, 340, 10);
      g.fillStyle(def.boss ? 0xfff1c9 : 0xf3e2b8, 1).fillRoundedRect(-cardW / 2, -170, cardW, 340, 10);
      g.fillStyle(COLOURS.red, 1).fillCircle(0, -160, 10);
      card.add(g);
      if (def.boss) {
        card.add(text(this, 0, -128, 'AVIS DE RECHERCHE', 17, COLOURS.redText).setOrigin(0.5));
        card.add(this.add.image(0, -20, 'suspect-pie').setDisplaySize(170, 170));
      } else {
        card.add(text(this, 0, -128, 'DOSSIER', 17, COLOURS.redText).setOrigin(0.5));
        card.add(this.add.image(0, -30, 'suspect_4').setDisplaySize(70, 225).setTint(0x14213d).setTintMode(Phaser.TintModes.FILL).setAlpha(0.85));
        card.add(text(this, 0, -30, '?', 70, '#ffffff', { stroke: COLOURS.navyText, strokeThickness: 8 }).setOrigin(0.5));
      }
      card.add(text(this, 0, 85, def.title, 26, COLOURS.navyText).setOrigin(0.5));
      card.add(text(this, 0, 117, def.blurb, 15, '#4a3b25', { align: 'center', wordWrap: { width: cardW - 24 } }).setOrigin(0.5, 0));
      if (open) {
        [0, 1, 2].forEach((n) => card.add(text(this, (n - 1) * 34, 150, '★', 30, (best?.stars ?? 0) > n ? '#e0a000' : '#cdbb94').setOrigin(0.5, 0)));
      } else {
        card.add(text(this, 0, 152, 'LOCKED', 20, '#5a4a35').setOrigin(0.5, 0));
      }
      if (open) {
        card.setSize(cardW, 340).setInteractive({ useHandCursor: true });
        card.on('pointerover', () => {
          sounds.hover();
          this.tweens.add({ targets: card, scale: 1.06, angle: 0, duration: 120 });
        });
        card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, angle: [-3, 2, -1.5, 3, -2][i] ?? 0, duration: 120 }));
        card.on('pointerup', () => {
          sounds.select();
          goTo(this, 'case', { caseId: def.id });
        });
      } else {
        card.setAlpha(0.6);
      }
    });

    button(this, 130, GAME_HEIGHT - 50, 200, 52, '◀ Title', () => goTo(this, 'title'), COLOURS.navy, '#ffffff');
    fullscreenButton(this);
  }
}

import Phaser from 'phaser';
import { sounds } from './audio/sounds';

/** The game's canvas size (it scales to fit the window). */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const FONT = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';

export const COLOURS = {
  navy: 0x14213d,
  navyText: '#14213d',
  gold: 0xf2b134,
  goldText: '#f2b134',
  red: 0xd62839,
  redText: '#d62839',
  paper: 0xfdf6e3,
  paperText: '#fdf6e3',
  /** Prepositions are always shown in this colour, as in the deck. */
  prepText: '#e0218a',
  green: 0x2a9d8f,
} as const;

export function text(scene: Phaser.Scene, x: number, y: number, value: string, size: number, colour = '#ffffff', style: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color: colour, fontStyle: 'bold', ...style });
}

export interface Button {
  container: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  setLabel(v: string): void;
  setEnabled(on: boolean): void;
}

/** A big rounded button that grows a little when pointed at. English labels (menus are English). */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onPress: () => void, colour: number = COLOURS.gold, textColour: string = COLOURS.navyText): Button {
  const c = scene.add.container(x, y);
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, h / 3);
  const bg = scene.add.graphics();
  const draw = (fill: number) => bg.clear().fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 3).lineStyle(3, 0xffffff, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 3);
  draw(colour);
  const t = text(scene, 0, 0, label, Math.round(h * 0.42), textColour).setOrigin(0.5);
  c.add([shadow, bg, t]);
  c.setSize(w, h);
  let enabled = true;
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => {
    if (!enabled) return;
    sounds.hover();
    scene.tweens.add({ targets: c, scale: 1.06, duration: 100 });
  });
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 100 }));
  c.on('pointerup', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
    e.stopPropagation();
    if (!enabled) return;
    sounds.select();
    onPress();
  });
  return {
    container: c,
    label: t,
    setLabel: (v) => t.setText(v),
    setEnabled: (on) => {
      enabled = on;
      c.setAlpha(on ? 1 : 0.45);
    },
  };
}

/** Fade into another scene. */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  scene.cameras.main.fadeOut(250, 10, 16, 30);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

/** A full-screen toggle in the top-right corner of every screen. */
export function fullscreenButton(scene: Phaser.Scene): void {
  const b = button(scene, GAME_WIDTH - 40, GAME_HEIGHT - 36, 56, 44, '⛶', () => {
    if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    else scene.scale.startFullscreen();
  }, COLOURS.navy, '#ffffff');
  b.container.setScrollFactor(0).setDepth(1000);
}

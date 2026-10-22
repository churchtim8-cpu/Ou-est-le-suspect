import Phaser from 'phaser';
import { lightGraphics } from './game/graphics';
import { BootScene } from './game/scenes/BootScene';
import { CaseScene } from './game/scenes/CaseScene';
import { ChapterScene } from './game/scenes/ChapterScene';
import { TitleScene } from './game/scenes/TitleScene';
import { GAME_HEIGHT, GAME_WIDTH } from './game/ui';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0f1a2c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Phaser holds game time to 60 fps for `panicMax` frames after a start or tab
  // switch; the default makes everything crawl for seconds on slow school computers.
  fps: { panicMax: 20 },
  // Every sound comes from our own Web Audio mixer; Phaser's would only run a second, silent engine.
  audio: { noAudio: true },
  // Edge smoothing costs a weak graphics chip the most; light graphics turn it off.
  render: { antialiasGL: !lightGraphics() },
  scene: [BootScene, TitleScene, ChapterScene, CaseScene],
});

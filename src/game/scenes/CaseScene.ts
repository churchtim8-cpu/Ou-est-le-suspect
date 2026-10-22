import Phaser from 'phaser';
import { buildCentreVille, STREET_LINES } from '../../content/centreVille';
import { CHAPTER_1, planCase, type PlannedCase, type PlannedClue } from '../../engine/cases';
import { phraseFr, sentenceEn, type Subject } from '../../engine/clues';
import { LEVELS, TWISTS, type Level } from '../../engine/difficulty';
import { points, stars, type CaseResult } from '../../engine/scoring';
import { centreX, centreY, spotAt, type Spot, type Street } from '../../engine/street';
import { CitySound } from '../audio/city';
import { mixer } from '../audio/mixer';
import { music } from '../audio/music';
import { sounds } from '../audio/sounds';
import { Figure } from '../figure';
import { Recruit } from '../recruit';
import { getLevel, saveResult } from '../store';
import { DEPTH, StreetView } from '../streetView';
import { button, COLOURS, fullscreenButton, GAME_HEIGHT, GAME_WIDTH, goTo, text } from '../ui';

type Phase = 'intro' | 'runaway' | 'radio' | 'search' | 'found' | 'escaped' | 'report';

/** How the scene scrolls and feels. Tunable here, not inline. */
const FEEL = {
  keyScroll: 760,
  edgeScroll: 620,
  dragThreshold: 12,
  typeMs: 34,
  suspectHeight: 82,
  crouchHeight: 56,
  benchCrouchHeight: 42,
  minimap: { x: 14, y: 676, w: 380 },
  recruitScreenX: 470,
  runaway: { fromScreenX: 430, speed: 560, seconds: 2.1 },
} as const;

/** Zoomed in on a catch, keep the suspect in view: roofs near the top, tree and bench near the bottom. */
const panY = (s: Spot): number => Phaser.Math.Clamp(s.footY - 40, 305, 415);

const DECOY_LINES = ['Ce n’est pas moi !', 'Non, non !', 'Pardon ?'];

interface DebugHook {
  phase: Phase;
  target: { id: string; x: number; y: number } | null;
  tap(x: number, y: number): void;
  look(x: number): void;
  wrongSpot(): { x: number; y: number } | null;
}

declare global {
  interface Window {
    __suspect?: DebugHook;
  }
}

export class CaseScene extends Phaser.Scene {
  static readonly KEY = 'case';
  private street!: Street;
  private view!: StreetView;
  private plan!: PlannedCase;
  private level!: Level;
  private phase: Phase = 'intro';
  private current!: PlannedClue;
  private currentSubject!: Subject;
  private timeLeft = 0;
  private elapsed = 0;
  private wrong = 0;
  private english = 0;
  private repeats = 0;
  private moved = false;
  private checked = new Set<string>();
  private lastTick = -1;

  private hover!: Phaser.GameObjects.Graphics;
  private lens!: Phaser.GameObjects.Graphics;
  private radioLead!: Phaser.GameObjects.Text;
  private radioPhrase!: Phaser.GameObjects.Text;
  private radioEnd!: Phaser.GameObjects.Text;
  private radioTop!: Phaser.GameObjects.Text;
  private englishLine!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private timerRing!: Phaser.GameObjects.Graphics;
  private miniView!: Phaser.GameObjects.Graphics;
  private helpBtn: ReturnType<typeof button> | null = null;
  private clueHidden = false;
  private clueTimer: Phaser.Time.TimerEvent | null = null;
  private keys!: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private edgeHeld = 0;
  private drag: { x: number; scroll: number; moved: boolean } | null = null;
  private recruit!: Recruit;
  private recruitTarget: number | null = null;
  private city!: CitySound;
  private runner: { figure: Figure; speed: number } | null = null;

  constructor() {
    super(CaseScene.KEY);
  }

  create(data: { caseId?: string }): void {
    this.cameras.main.fadeIn(300, 10, 16, 30);
    const def = CHAPTER_1.find((c) => c.id === data.caseId) ?? CHAPTER_1[0]!;
    this.level = LEVELS[getLevel()];
    this.street = buildCentreVille();
    const seed = new URLSearchParams(window.location.search).get('seed') ?? Math.random().toString(36).slice(2, 10);
    this.plan = planCase(def, this.street, seed);
    this.current = this.plan.first;
    this.currentSubject = this.plan.subject;
    this.phase = 'intro';
    this.timeLeft = this.level.seconds;
    this.elapsed = 0;
    this.wrong = this.english = this.repeats = 0;
    this.moved = false;
    this.checked = new Set();
    this.lastTick = -1;
    this.clueHidden = false;
    this.helpBtn = null;

    this.view = new StreetView(this, this.street.width);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.street.width, GAME_HEIGHT);
    cam.scrollX = 0;

    this.recruit = new Recruit(this, FEEL.recruitScreenX, DEPTH.nearWalkers + 1);
    this.recruitTarget = null;
    this.runner = null;
    this.city = new CitySound();
    const startCity = () => void this.city.start((key) => this.cache.binary.get(key) as ArrayBuffer | undefined, this.view.cars);
    if (mixer.ctx?.state === 'running') startCity();
    else this.input.once('pointerdown', startCity);
    this.events.once('shutdown', () => this.city.stop());

    this.hover = this.add.graphics().setDepth(DEPTH.effects);
    this.buildHud();
    this.setupInput();
    this.showIntro();
    this.exposeDebug();
  }

  // ---------------------------------------------------------------- HUD

  private buildHud(): void {
    const hud = (o: Phaser.GameObjects.GameObject & { setScrollFactor(v: number): unknown; setDepth(v: number): unknown }) => {
      o.setScrollFactor(0);
      o.setDepth(DEPTH.hud);
      return o;
    };
    // The radio: a police-tablet panel, top left.
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.35).fillRoundedRect(16, 14, 700, 104, 16);
    panel.fillStyle(COLOURS.navy, 0.94).fillRoundedRect(12, 10, 700, 104, 16);
    panel.lineStyle(3, COLOURS.gold, 1).strokeRoundedRect(12, 10, 700, 104, 16);
    hud(panel);
    hud(this.add.image(52, 62, 'radio').setDisplaySize(44, 74));
    this.radioTop = hud(text(this, 86, 20, '', 18, COLOURS.goldText)) as Phaser.GameObjects.Text;
    this.radioLead = hud(text(this, 86, 50, '', 30, '#ffffff')) as Phaser.GameObjects.Text;
    this.radioPhrase = hud(text(this, 86, 50, '', 30, COLOURS.prepText)) as Phaser.GameObjects.Text;
    this.radioEnd = hud(text(this, 86, 50, '', 30, '#ffffff')) as Phaser.GameObjects.Text;
    this.englishLine = hud(text(this, 86, 88, '', 18, '#b9c6dd', { fontStyle: 'italic' })) as Phaser.GameObjects.Text;

    // Timer, top right.
    this.timerRing = hud(this.add.graphics()) as Phaser.GameObjects.Graphics;
    this.timerText = hud(text(this, GAME_WIDTH - 66, 62, '', 30, '#ffffff').setOrigin(0.5)) as Phaser.GameObjects.Text;
    const quit = button(this, GAME_WIDTH - 180, 44, 110, 44, '✕ Quit', () => this.leave(), COLOURS.navy, '#ffffff');
    quit.container.setScrollFactor(0).setDepth(DEPTH.hud);

    // Scroll arrows at the sides.
    for (const dir of [-1, 1] as const) {
      const b = button(this, dir < 0 ? 36 : GAME_WIDTH - 36, 330, 52, 92, dir < 0 ? '◀' : '▶', () => undefined, COLOURS.navy, '#ffffff');
      b.container.setScrollFactor(0).setDepth(DEPTH.hud).setAlpha(0.8);
      b.container.on('pointerdown', () => (this.edgeHeld = dir));
      b.container.on('pointerup', () => (this.edgeHeld = 0));
      b.container.on('pointerout', () => (this.edgeHeld = 0));
    }

    // Minimap of the whole street, bottom left: tap it to jump there.
    const m = FEEL.minimap;
    const k = m.w / this.street.width;
    const h = GAME_HEIGHT * k;
    const frame = this.add.graphics();
    frame.fillStyle(0x000000, 0.45).fillRoundedRect(m.x - 5, m.y - 5, m.w + 10, h + 10, 6);
    hud(frame);
    const tiles = this.textures.getTextureKeys().filter((t) => t.startsWith('street_')).sort();
    tiles.forEach((key, i) => {
      const img = this.add.image(m.x + i * 1365.333 * k, m.y, key).setOrigin(0, 0);
      img.setScale((1365.333 * k) / img.width);
      hud(img);
    });
    this.miniView = hud(this.add.graphics()) as Phaser.GameObjects.Graphics;
    const zone = this.add.zone(m.x, m.y, m.w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hud(zone);
    const jump = (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      this.cameras.main.scrollX = Phaser.Math.Clamp((p.x - m.x) / k - GAME_WIDTH / 2, 0, this.street.width - GAME_WIDTH);
    };
    zone.on('pointerdown', jump);
    zone.on('pointermove', jump);

    this.lens = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 5);
    fullscreenButton(this);
  }

  private setRadio(top: string, subject: Subject | null, clue: PlannedClue | null, plain?: string): void {
    this.radioTop.setText(top);
    if (!clue || !subject) {
      this.radioLead.setText(plain ?? '');
      this.radioPhrase.setText('');
      this.radioEnd.setText('');
    } else {
      this.radioLead.setText(`${subject.fr} est `);
      this.radioPhrase.setText(phraseFr(clue.clue));
      this.radioEnd.setText('.');
    }
    this.layoutRadio();
  }

  private layoutRadio(): void {
    this.radioPhrase.x = this.radioLead.x + this.radioLead.width;
    this.radioEnd.x = this.radioPhrase.x + this.radioPhrase.width;
  }

  /** Types the radio message out letter by letter (the recorded voice comes later). */
  private typeRadio(top: string, subject: Subject, clue: PlannedClue, done: () => void): void {
    sounds.radio();
    mixer.duck(true);
    const lead = `${subject.fr} est `;
    const phrase = phraseFr(clue.clue);
    const all = lead + phrase + '.';
    this.radioTop.setText(top);
    this.englishLine.setText('');
    let n = 0;
    this.time.addEvent({
      delay: FEEL.typeMs,
      repeat: all.length - 1,
      callback: () => {
        n++;
        this.radioLead.setText(all.slice(0, Math.min(n, lead.length)));
        this.radioPhrase.setText(n > lead.length ? all.slice(lead.length, Math.min(n, lead.length + phrase.length)) : '');
        this.radioEnd.setText(n > lead.length + phrase.length ? '.' : '');
        this.layoutRadio();
        if (n === all.length) {
          mixer.duck(false);
          done();
        }
      },
    });
  }

  private hideClueLater(): void {
    this.clueTimer?.remove();
    if (this.level.clueSeconds === null) return;
    this.clueTimer = this.time.delayedCall(this.level.clueSeconds * 1000, () => {
      if (this.phase !== 'search') return;
      this.clueHidden = true;
      for (const t of [this.radioLead, this.radioPhrase, this.radioEnd]) this.tweens.add({ targets: t, alpha: 0, duration: 400 });
      this.englishLine.setText(this.repeatsLeft() > 0 ? 'Tap REPEAT to see the message again.' : 'Remember the message!');
    });
  }

  private repeatsLeft(): number {
    return this.level.repeats === null ? Infinity : this.level.repeats - this.repeats;
  }

  private addHelpButton(): void {
    if (this.level.englishHelp) {
      this.helpBtn = button(this, 800, 44, 150, 44, 'English', () => {
        if (this.phase !== 'search') return;
        this.english = 1;
        this.englishLine.setText(sentenceEn(this.currentSubject, this.current.clue));
      }, COLOURS.paper, COLOURS.navyText);
    } else {
      this.helpBtn = button(this, 800, 44, 170, 44, `Repeat (${this.level.repeats})`, () => {
        if (this.phase !== 'search' || !this.clueHidden || this.repeatsLeft() <= 0) return;
        this.repeats++;
        this.clueHidden = false;
        for (const t of [this.radioLead, this.radioPhrase, this.radioEnd]) t.setAlpha(1);
        this.englishLine.setText('');
        this.helpBtn?.setLabel(`Repeat (${this.repeatsLeft()})`);
        sounds.radio();
        this.hideClueLater();
      }, COLOURS.paper, COLOURS.navyText);
    }
    this.helpBtn.container.setScrollFactor(0).setDepth(DEPTH.hud);
  }

  // ---------------------------------------------------------------- flow

  private showIntro(): void {
    const def = this.plan.def;
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud + 10);
    const shade = this.add.graphics().fillStyle(0x0a1020, 0.72).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    layer.add(shade);
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.35).fillRoundedRect(GAME_WIDTH / 2 - 380 + 6, 130 + 8, 760, 440, 20);
    card.fillStyle(COLOURS.paper, 1).fillRoundedRect(GAME_WIDTH / 2 - 380, 130, 760, 440, 20);
    layer.add(card);
    if (def.boss) {
      layer.add(text(this, GAME_WIDTH / 2, 168, 'AVIS DE RECHERCHE', 40, COLOURS.redText).setOrigin(0.5));
      layer.add(this.add.image(GAME_WIDTH / 2 - 190, 360, 'suspect-pie').setDisplaySize(250, 250));
      layer.add(text(this, GAME_WIDTH / 2 + 160, 260, 'La Pie', 52, COLOURS.navyText).setOrigin(0.5));
      layer.add(text(this, GAME_WIDTH / 2 + 160, 330, 'BOSS CASE\nShe loves high places…\nand she never stays still.\nListen to every message!', 22, '#3a3020', { align: 'center' }).setOrigin(0.5, 0));
    } else {
      layer.add(text(this, GAME_WIDTH / 2, 168, def.title.toUpperCase(), 40, COLOURS.navyText).setOrigin(0.5));
      layer.add(this.add.image(GAME_WIDTH / 2 - 210, 410, 'sergeant_bust').setDisplaySize(250, 259));
      const bubble = this.add.graphics();
      bubble.fillStyle(0xffffff, 1).fillRoundedRect(GAME_WIDTH / 2 - 60, 230, 400, 100, 18).lineStyle(3, COLOURS.navy, 1).strokeRoundedRect(GAME_WIDTH / 2 - 60, 230, 400, 100, 18);
      bubble.fillStyle(0xffffff, 1).fillTriangle(GAME_WIDTH / 2 - 60, 300, GAME_WIDTH / 2 - 100, 330, GAME_WIDTH / 2 - 50, 285);
      layer.add(bubble);
      layer.add(text(this, GAME_WIDTH / 2 + 140, 280, 'Allez, au travail !\nÉcoutez la centrale.', 26, COLOURS.navyText, { align: 'center' }).setOrigin(0.5));
      layer.add(text(this, GAME_WIDTH / 2 + 140, 370, `Case ${def.number} of ${CHAPTER_1.length}\nRead the radio message, then find\nand tap the suspect's hiding place.`, 20, '#3a3020', { align: 'center' }).setOrigin(0.5, 0));
    }
    const go = button(this, GAME_WIDTH / 2 + 150, 520, 240, 64, 'START', () => {
      layer.destroy();
      go.container.destroy();
      this.runAway();
    }, COLOURS.red, '#ffffff');
    go.container.setScrollFactor(0).setDepth(DEPTH.hud + 11);
    this.input.keyboard?.once('keydown-ENTER', () => {
      if (this.phase === 'intro' && go.container.active) {
        layer.destroy();
        go.container.destroy();
        this.runAway();
      }
    });
    music.play('title');
  }

  /** The opening: the suspect is spotted and runs off to hide; the recruit gives chase. */
  private runAway(): void {
    this.phase = 'runaway';
    music.play('search');
    const boss = this.plan.def.boss === 'pie';
    const r = FEEL.runaway;
    const x = this.cameras.main.scrollX + r.fromScreenX;
    const figure = new Figure(this, boss ? 'pie_walk' : 'suspect_1', x, STREET_LINES.base + 30, FEEL.suspectHeight).setDepth(DEPTH.suspectFar);
    this.runner = { figure, speed: r.speed };
    this.time.delayedCall(350, () => (this.recruitTarget = this.cameras.main.scrollX + 900));
    this.say(x, STREET_LINES.base - 70, boss ? 'Attrapez-moi !' : 'Hi hi ! Cherchez-moi !');
    this.time.delayedCall(500, () => this.say(this.recruit.x, 600, 'Halte ! Police !'));
    this.time.delayedCall(r.seconds * 1000, () => {
      this.runner?.figure.destroy();
      this.runner = null;
      this.recruitTarget = null;
      this.startRadio();
    });
  }

  private startRadio(): void {
    this.phase = 'radio';
    music.play('search');
    const top = this.plan.def.boss ? 'LA CENTRALE · Attention, patrouille 7 !' : 'LA CENTRALE · Patrouille 7, ici la centrale !';
    this.time.delayedCall(350, () =>
      this.typeRadio(top, this.currentSubject, this.current, () => {
        this.phase = 'search';
        this.addHelpButton();
        this.hideClueLater();
      }),
    );
  }

  private moveBoss(): void {
    const move = this.plan.move;
    if (!move || this.moved) return;
    this.moved = true;
    const from = this.current.target;
    // She is seen for a moment, then dashes off.
    const pie = this.add.image(from.footX, from.footY, 'pie_run').setOrigin(0.5, 1).setDepth(DEPTH.effects);
    pie.setScale(FEEL.suspectHeight / pie.height);
    if (move.target.footX < from.footX) pie.setFlipX(true);
    this.tweens.add({ targets: pie, x: from.footX + (move.target.footX < from.footX ? -500 : 500), y: from.footY - 120, alpha: 0, duration: 1100, ease: 'Quad.in', onComplete: () => pie.destroy() });
    this.current = move;
    this.currentSubject = this.plan.pronoun;
    this.checked.clear();
    this.clueHidden = false;
    for (const t of [this.radioLead, this.radioPhrase, this.radioEnd]) t.setAlpha(1);
    this.typeRadio('LA CENTRALE · Attention, elle bouge !', this.currentSubject, this.current, () => this.hideClueLater());
    this.cameras.main.shake(200, 0.004);
  }

  // ---------------------------------------------------------------- input

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = { left: kb.addKey(K.LEFT), right: kb.addKey(K.RIGHT), a: kb.addKey(K.A), d: kb.addKey(K.D) };
      kb.on('keydown-ESC', () => this.leave());
    }
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      mixer.wake();
      if (this.input.hitTestPointer(p).length > 0) return;
      this.drag = { x: p.x, scroll: this.cameras.main.scrollX, moved: false };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.drag && p.isDown) {
        if (Math.abs(p.x - this.drag.x) > FEEL.dragThreshold) this.drag.moved = true;
        if (this.drag.moved) this.cameras.main.scrollX = this.drag.scroll - (p.x - this.drag.x);
      }
      this.drawHover(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.moved) return;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      this.tapAt(world.x, world.y);
    });
  }

  private drawHover(p: Phaser.Input.Pointer): void {
    this.hover.clear();
    this.lens.clear();
    if (this.phase !== 'search' && this.phase !== 'radio') return;
    const overUi = this.input.hitTestPointer(p).length > 0;
    if (!p.wasTouch && !overUi) {
      // Magnifying glass instead of the arrow.
      this.lens.lineStyle(5, COLOURS.navy, 1).strokeCircle(p.x, p.y, 26).lineStyle(3, 0xffffff, 0.9).strokeCircle(p.x, p.y, 23);
      this.lens.fillStyle(0xffffff, 0.12).fillCircle(p.x, p.y, 23);
      this.lens.lineStyle(9, COLOURS.navy, 1).lineBetween(p.x + 18, p.y + 18, p.x + 38, p.y + 38);
      this.input.setDefaultCursor('none');
    } else {
      this.input.setDefaultCursor('default');
    }
    if (overUi) return;
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const spot = spotAt(this.street, world.x, world.y);
    if (!spot) return;
    this.hover.fillStyle(0xfff3a0, this.checked.has(spot.id) ? 0.06 : 0.2).fillRoundedRect(spot.x, spot.y, spot.w, spot.h, 14);
    this.hover.lineStyle(3, 0xfff3a0, this.checked.has(spot.id) ? 0.3 : 0.9).strokeRoundedRect(spot.x, spot.y, spot.w, spot.h, 14);
  }

  private tapAt(x: number, y: number): void {
    if (this.phase !== 'search') return;
    const spot = spotAt(this.street, x, y);
    if (!spot) {
      sounds.tap();
      const ring = this.add.circle(x, y, 8, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.9).setDepth(DEPTH.effects);
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
      return;
    }
    if (spot === this.current.target) return this.found();
    if (this.checked.has(spot.id)) {
      this.say(centreX(spot), spot.y - 4, 'Personne !');
      return;
    }
    this.checked.add(spot.id);
    this.wrongTap(spot);
  }

  private wrongTap(spot: Spot): void {
    this.wrong++;
    this.timeLeft = Math.max(0, this.timeLeft - this.level.wrongTapSeconds);
    sounds.decoy();
    this.time.delayedCall(220, () => sounds.wrong());
    this.cameras.main.shake(140, 0.0035);
    const building = spot.zone === 'front' || spot.zone === 'inside' || spot.zone === 'roof' || spot.zone === 'open';
    if (building) {
      const who = this.add.image(spot.footX, spot.footY, `walk_${Phaser.Math.Between(0, 7)}`).setOrigin(0.5, 1).setDepth(DEPTH.effects);
      who.setScale(0);
      const s = (spot.zone === 'roof' ? 70 : 78) / who.height;
      this.tweens.add({ targets: who, scale: s, duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: who, alpha: 0, delay: 1500, duration: 400, onComplete: () => who.destroy() });
      this.say(spot.footX, spot.footY - 84, Phaser.Utils.Array.GetRandom(DECOY_LINES));
    } else {
      const puff = this.add.circle(centreX(spot), centreY(spot), 20, 0xffffff, 0.8).setDepth(DEPTH.effects);
      this.tweens.add({ targets: puff, scale: 3, alpha: 0, duration: 500, onComplete: () => puff.destroy() });
      this.say(centreX(spot), spot.y - 4, 'Personne !');
    }
    const lost = text(this, centreX(spot), spot.y - 40, `-${this.level.wrongTapSeconds} s`, 30, COLOURS.redText, { stroke: '#ffffff', strokeThickness: 6 }).setOrigin(0.5).setDepth(DEPTH.effects + 1);
    this.tweens.add({ targets: lost, y: lost.y - 50, alpha: 0, duration: 1100, onComplete: () => lost.destroy() });
  }

  /** A speech bubble in the street. */
  private say(x: number, y: number, line: string): void {
    const t = text(this, 0, 0, line, 20, COLOURS.navyText).setOrigin(0.5);
    const w = t.width + 28;
    const h = 40;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14).lineStyle(2, COLOURS.navy, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.fillStyle(0xffffff, 1).fillTriangle(-8, h / 2 - 1, 8, h / 2 - 1, 0, h / 2 + 12);
    const c = this.add.container(x, Math.max(30, y - 30), [g, t]).setDepth(DEPTH.effects + 2).setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 1400, duration: 300, onComplete: () => c.destroy() });
  }

  // ---------------------------------------------------------------- endings

  private suspectSprite(spot: Spot): Phaser.GameObjects.Image {
    const boss = this.plan.def.boss === 'pie';
    let key: string;
    let height: number = FEEL.suspectHeight;
    if (boss) key = spot.zone === 'roof' ? 'pie_ring' : 'pie_stand';
    else if (spot.zone === 'under') key = 'suspect_2';
    else if (spot.zone === 'behind' || spot.zone === 'inside') key = 'suspect_3';
    else if (spot.zone === 'roof') key = 'suspect_5';
    else key = 'suspect_4';
    if (spot.zone === 'under') height = (boss ? 1.15 : 1) * (spot.of === 'bench' ? FEEL.benchCrouchHeight : FEEL.crouchHeight);
    const depth = spot.zone === 'behind' ? DEPTH.suspectBehind : spot.zone === 'under' ? DEPTH.suspectNear : DEPTH.suspectFar;
    const img = this.add.image(spot.footX, spot.footY, key).setOrigin(0.5, 1).setDepth(depth);
    img.setScale(height / img.height);
    return img;
  }

  private found(): void {
    this.phase = 'found';
    this.hover.clear();
    this.lens.clear();
    this.input.setDefaultCursor('default');
    music.play('off');
    const spot = this.current.target;
    this.recruitTarget = spot.footX + (spot.footX > this.recruit.x ? -80 : 80);
    const who = this.suspectSprite(spot);
    const finalScale = who.scale;
    who.setScale(0);
    this.tweens.add({ targets: who, scale: finalScale, duration: 320, ease: 'Back.out' });
    sounds.cuffs();
    const cam = this.cameras.main;
    cam.pan(centreX(spot), panY(spot), 600, 'Sine.easeInOut');
    cam.zoomTo(1.18, 600, 'Sine.easeInOut');
    this.time.delayedCall(650, () => {
      sounds.stamp();
      cam.shake(160, 0.006);
      // Stamped away from the suspect so the catch stays visible.
      const stampY = spot.footY < 320 ? 560 : 170;
      const stamp = text(this, GAME_WIDTH / 2, stampY, 'ARRÊTÉ !', 110, COLOURS.redText, { stroke: '#ffffff', strokeThickness: 12 })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud + 20).setAngle(-12).setScale(3).setAlpha(0);
      this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 260, ease: 'Quad.in' });
      this.confetti();
      sounds.victory();
      this.time.delayedCall(1700, () => {
        stamp.destroy();
        // Back to normal size first: the report is drawn on the screen, and the zoom would enlarge it.
        cam.zoomTo(1, 250, 'Sine.easeInOut');
        this.time.delayedCall(260, () => this.report(true));
      });
    });
  }

  private escaped(): void {
    this.phase = 'escaped';
    this.hover.clear();
    this.lens.clear();
    this.input.setDefaultCursor('default');
    music.play('off');
    const spot = this.current.target;
    const cam = this.cameras.main;
    cam.pan(centreX(spot), panY(spot), 700, 'Sine.easeInOut');
    this.time.delayedCall(750, () => {
      const boss = this.plan.def.boss === 'pie';
      const runner = new Figure(this, boss ? 'pie_walk' : 'suspect_1', spot.footX, spot.footY, FEEL.suspectHeight).setDepth(DEPTH.effects);
      this.runner = { figure: runner, speed: 520 };
      this.say(spot.footX, spot.footY - 90, boss ? 'Au revoir !' : 'Hi hi !');
      this.recruitTarget = spot.footX + 600;
      sounds.escape();
      const t = text(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Oh non ! Il s’échappe !', 64, '#ffffff', { stroke: COLOURS.navyText, strokeThickness: 10 })
        .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.hud + 20);
      if (boss) t.setText('Oh non ! Elle s’échappe !');
      this.time.delayedCall(1900, () => {
        t.destroy();
        this.report(false);
      });
    });
  }

  private confetti(): void {
    const colours = [COLOURS.red, COLOURS.gold, 0x2a6bff, 0xffffff, COLOURS.green];
    for (let i = 0; i < 70; i++) {
      const r = this.add.rectangle(GAME_WIDTH / 2 + Phaser.Math.Between(-80, 80), 300, 10, 16, Phaser.Utils.Array.GetRandom(colours)).setScrollFactor(0).setDepth(DEPTH.hud + 19);
      this.tweens.add({
        targets: r,
        x: r.x + Phaser.Math.Between(-620, 620),
        y: r.y + Phaser.Math.Between(-320, 420),
        angle: Phaser.Math.Between(-720, 720),
        alpha: 0,
        duration: Phaser.Math.Between(1200, 2000),
        ease: 'Cubic.out',
        onComplete: () => r.destroy(),
      });
    }
  }

  private report(caught: boolean): void {
    this.phase = 'report';
    this.helpBtn?.container.destroy();
    const result: CaseResult = {
      caught,
      secondsUsed: this.elapsed,
      secondsLeft: this.timeLeft,
      wrongTaps: this.wrong,
      englishHelps: this.english,
      repeats: this.repeats,
    };
    saveResult(this.plan.def.id, result);
    const nStars = stars(result);
    const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.hud + 30);
    layer.add(this.add.graphics().fillStyle(0x0a1020, 0.6).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT));
    const x0 = GAME_WIDTH / 2 - 420;
    const y0 = 90;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(x0 + 6, y0 + 8, 840, 520, 22);
    g.fillStyle(COLOURS.paper, 1).fillRoundedRect(x0, y0, 840, 520, 22);
    g.fillStyle(caught ? COLOURS.green : COLOURS.red, 1).fillRoundedRect(x0, y0, 840, 70, { tl: 22, tr: 22, bl: 0, br: 0 });
    layer.add(g);
    layer.add(text(this, GAME_WIDTH / 2, y0 + 35, caught ? 'RAPPORT : SUSPECT ARRÊTÉ' : 'RAPPORT : SUSPECT ÉCHAPPÉ', 32, '#ffffff').setOrigin(0.5));

    // The answer sentence, with the preposition in colour.
    layer.add(text(this, GAME_WIDTH / 2, y0 + 96, caught ? 'You found the hiding place:' : 'The hiding place was:', 20, '#5a4a35').setOrigin(0.5, 0));
    const lead = text(this, 0, y0 + 130, `${this.currentSubject.fr} est `, 38, COLOURS.navyText);
    const phrase = text(this, 0, y0 + 130, phraseFr(this.current.clue), 38, COLOURS.prepText);
    const end = text(this, 0, y0 + 130, '.', 38, COLOURS.navyText);
    const total = lead.width + phrase.width + end.width;
    lead.x = GAME_WIDTH / 2 - total / 2;
    phrase.x = lead.x + lead.width;
    end.x = phrase.x + phrase.width;
    layer.add([lead, phrase, end]);
    if (this.level.englishHelp) layer.add(text(this, GAME_WIDTH / 2, y0 + 182, sentenceEn(this.currentSubject, this.current.clue), 20, '#6a5a45', { fontStyle: 'italic' }).setOrigin(0.5, 0));

    // Stars, one by one.
    for (let i = 0; i < 3; i++) {
      const s = text(this, GAME_WIDTH / 2 - 110 + i * 110, y0 + 270, '★', 84, i < nStars ? '#f2b134' : '#d8cdb3', { stroke: '#8a6a20', strokeThickness: i < nStars ? 4 : 0 }).setOrigin(0.5).setScale(0);
      layer.add(s);
      this.tweens.add({ targets: s, scale: 1, delay: 300 + i * 260, duration: 260, ease: 'Back.out', onStart: () => i < nStars && sounds.star(i) });
    }
    const pts = points(result);
    layer.add(text(this, GAME_WIDTH / 2, y0 + 330, `${pts} points`, 30, COLOURS.navyText).setOrigin(0.5, 0));
    layer.add(text(this, GAME_WIDTH / 2, y0 + 370, `Time ${Math.round(this.elapsed)} s   ·   Wrong taps ${this.wrong}${this.english ? '   ·   English help used' : ''}${this.repeats ? `   ·   Repeats ${this.repeats}` : ''}`, 18, '#5a4a35').setOrigin(0.5, 0));

    // A recruit cheers (or consoles) in French.
    const praise = ['Courage !', 'Pas mal !', 'Bravo !', 'Excellent !'][nStars] ?? 'Bravo !';
    const recruit = this.add.image(x0 + 90, y0 + 430, nStars >= 2 ? 'recruit_girl_bust' : 'recruit_boy_bust').setDisplaySize(150, 155);
    layer.add(recruit);
    layer.add(text(this, x0 + 175, y0 + 405, praise, 30, COLOURS.navyText));

    const idx = CHAPTER_1.findIndex((c) => c.id === this.plan.def.id);
    const next = CHAPTER_1[idx + 1];
    const btns: ReturnType<typeof button>[] = [];
    btns.push(button(this, GAME_WIDTH / 2 + 30, y0 + 470, 200, 54, 'Play again', () => goTo(this, 'case', { caseId: this.plan.def.id }), COLOURS.navy, '#ffffff'));
    btns.push(button(this, GAME_WIDTH / 2 + 250, y0 + 470, 200, 54, 'Case board', () => goTo(this, 'chapter'), COLOURS.navy, '#ffffff'));
    if (caught && next) btns.push(button(this, GAME_WIDTH / 2 + 250, y0 + 400, 200, 54, 'Next case ▶', () => goTo(this, 'case', { caseId: next.id }), COLOURS.red, '#ffffff'));
    for (const b of btns) b.container.setScrollFactor(0).setDepth(DEPTH.hud + 31);
    music.play('title');
  }

  private leave(): void {
    music.play('off');
    goTo(this, 'chapter');
  }

  // ---------------------------------------------------------------- loop

  override update(time: number, delta: number): void {
    this.view.update(time, delta);
    const cam = this.cameras.main;
    const dt = Math.min(delta, 100) / 1000;
    if (this.runner) this.runner.figure.move(this.runner.speed * dt);
    // The recruit keeps up with the view, or runs to the suspect at the end.
    this.recruit.update(this.recruitTarget ?? cam.scrollX + FEEL.recruitScreenX, dt);
    this.city.footsteps(this.recruit.running, dt);
    this.city.update(cam.midPoint.x);
    if (this.phase === 'search' || this.phase === 'radio') {
      let dir = this.edgeHeld;
      if (this.keys) {
        if (this.keys.left.isDown || this.keys.a.isDown) dir = -1;
        if (this.keys.right.isDown || this.keys.d.isDown) dir = 1;
      }
      if (dir) cam.scrollX = Phaser.Math.Clamp(cam.scrollX + dir * (this.edgeHeld ? FEEL.edgeScroll : FEEL.keyScroll) * dt, 0, this.street.width - GAME_WIDTH);
    }
    if (this.phase === 'search') {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.elapsed += dt;
      const secs = Math.ceil(this.timeLeft);
      if (secs !== this.lastTick && secs <= 10 && secs > 0) sounds.tick(secs <= 5);
      this.lastTick = secs;
      if (this.timeLeft <= 15) music.play('urgent');
      if (this.plan.move && !this.moved && this.elapsed >= TWISTS.moveAfterSeconds) this.moveBoss();
      if (this.timeLeft <= 0) this.escaped();
    }
    this.drawTimer();
    this.drawMinimap();
    if (window.__suspect) window.__suspect.phase = this.phase;
  }

  private drawTimer(): void {
    const g = this.timerRing;
    const cx = GAME_WIDTH - 66;
    const cy = 62;
    const share = this.timeLeft / this.level.seconds;
    const urgent = this.timeLeft <= 15;
    g.clear();
    g.fillStyle(COLOURS.navy, 0.94).fillCircle(cx, cy, 46);
    g.lineStyle(8, 0xffffff, 0.2).strokeCircle(cx, cy, 38);
    g.lineStyle(8, urgent ? COLOURS.red : COLOURS.gold, 1);
    g.beginPath();
    g.arc(cx, cy, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * share, false);
    g.strokePath();
    this.timerText.setText(String(Math.ceil(this.timeLeft)));
    this.timerText.setColor(urgent ? '#ff8a8a' : '#ffffff');
    if (urgent && this.phase === 'search') this.timerText.setScale(1 + 0.08 * Math.abs(Math.sin(this.time.now / 160)));
  }

  private drawMinimap(): void {
    const m = FEEL.minimap;
    const k = m.w / this.street.width;
    const cam = this.cameras.main;
    this.miniView.clear().lineStyle(3, 0xffffff, 1).strokeRect(m.x + cam.scrollX * k, m.y, (GAME_WIDTH / cam.zoom) * k, GAME_HEIGHT * k);
  }

  // ---------------------------------------------------------------- tests

  private exposeDebug(): void {
    window.__suspect = {
      phase: this.phase,
      target: null,
      tap: (x, y) => this.tapAt(x, y),
      look: (x) => (this.cameras.main.scrollX = Phaser.Math.Clamp(x - GAME_WIDTH / 2, 0, this.street.width - GAME_WIDTH)),
      wrongSpot: () => {
        const s = this.street.spots.find((sp) => sp !== this.current.target);
        return s ? { x: centreX(s), y: centreY(s) } : null;
      },
    };
    Object.defineProperty(window.__suspect, 'target', {
      get: () => ({ id: this.current.target.id, x: centreX(this.current.target), y: centreY(this.current.target) }),
    });
  }
}


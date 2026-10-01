// UI: HUD and touch/keyboard controls, drawn as HTML over the game canvas (crisp text, safe areas).
import Phaser from 'phaser';
import { BackpackBar } from '../ui/backpackBar';
import { BeastUi } from '../ui/beastUi';
import { Controls } from '../ui/controls';
import { DialogueBox } from '../ui/dialogueBox';
import { el } from '../ui/dom';
import { Hud } from '../ui/hud';
import type { GameEvent } from '../systems/events';
import { storyHoldsDiver } from '../systems/story';
import type { SceneData, Session } from './session';

export class UIScene extends Phaser.Scene {
  private session!: Session;
  private root!: HTMLDivElement;
  private hud!: Hud;
  private controls!: Controls;
  private beastUi!: BeastUi;
  private backpack!: BackpackBar;
  private dialogue!: DialogueBox;

  constructor() {
    super('UI');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    this.root = el('div', '', document.body);
    this.root.id = 'ui';
    this.hud = new Hud(this.root);
    this.controls = new Controls(this.root, this.session, () => this.openPause());
    this.beastUi = new BeastUi(this.root, this.session);
    this.backpack = new BackpackBar(this.root, this.session);
    this.dialogue = new DialogueBox(this.root);
    const rotate = el('div', 'rotate', document.body);
    el('div', '', rotate, '⟳');
    el('div', '', rotate, 'Ruota il telefono in orizzontale');

    this.session.on('gameEvents', this.onGameEvents, this);
    this.session.on('toast', this.onToast, this);
    this.session.on('resume', this.onResume, this);
    this.session.on('openPort', this.openPort, this);
    this.session.on('battle', this.onBattle, this);
    this.events.once('shutdown', () => {
      this.session.off('gameEvents', this.onGameEvents, this);
      this.session.off('toast', this.onToast, this);
      this.session.off('resume', this.onResume, this);
      this.session.off('openPort', this.openPort, this);
      this.session.off('battle', this.onBattle, this);
      this.controls.destroy();
      this.dialogue.destroy();
      this.root.remove();
      rotate.remove();
    });
    // pause automatically when the app goes to the background
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') this.openPause();
    };
    document.addEventListener('visibilitychange', onHide);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', onHide));
  }

  private onGameEvents(events: GameEvent[]): void {
    if (this.session.game) this.hud.onEvents(events, this.session.game);
  }

  private onToast(text: string): void {
    this.hud.toast(text, 4);
  }

  /** During a battle the sea's interface hides (the battle has its own). */
  private onBattle(on: boolean): void {
    this.controls.releaseAll();
    this.root.style.display = on ? 'none' : '';
  }

  private openMenus(mode: 'pause' | 'port'): void {
    if (this.session.paused || this.session.inBattle || !this.session.game) return;
    this.session.paused = true;
    this.controls.releaseAll();
    this.scene.pause('World');
    this.scene.launch('Menus', { session: this.session, mode });
  }

  private openPause(): void {
    this.openMenus('pause');
  }

  private openPort(): void {
    this.openMenus('port');
  }

  private onResume(): void {
    this.session.paused = false;
    this.controls.releaseAll();
    this.scene.stop('Menus');
    this.scene.resume('World');
  }

  override update(_time: number, deltaMs: number): void {
    const g = this.session.game;
    if (!g) return;
    this.controls.update(g.diver.dashCooldown <= 0);
    const dt = Math.min(0.1, deltaMs / 1000);
    this.hud.update(g, dt);
    this.dialogue.update(g, dt);
    // story scenes: only the story on screen (the controls do nothing then)
    this.root.classList.toggle('in-scene', !!g.story.dialogue || storyHoldsDiver(g));
    this.beastUi.update(g);
    this.backpack.update(g);
  }
}

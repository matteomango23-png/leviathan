// UI: HUD and touch/keyboard controls, drawn as HTML over the game canvas (crisp text, safe areas).
import Phaser from 'phaser';
import { Controls } from '../ui/controls';
import { el } from '../ui/dom';
import { Hud } from '../ui/hud';
import type { GameEvent } from '../systems/events';
import type { SceneData, Session } from './session';

export class UIScene extends Phaser.Scene {
  private session!: Session;
  private root!: HTMLDivElement;
  private hud!: Hud;
  private controls!: Controls;

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
    const rotate = el('div', 'rotate', document.body);
    el('div', '', rotate, '⟳');
    el('div', '', rotate, 'Ruota il telefono in orizzontale');

    this.session.on('gameEvents', this.onGameEvents, this);
    this.session.on('toast', this.onToast, this);
    this.session.on('resume', this.onResume, this);
    this.events.once('shutdown', () => {
      this.session.off('gameEvents', this.onGameEvents, this);
      this.session.off('toast', this.onToast, this);
      this.session.off('resume', this.onResume, this);
      this.controls.destroy();
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
    this.hud.onEvents(events);
  }

  private onToast(text: string): void {
    this.hud.toast(text, 4);
  }

  private openPause(): void {
    if (this.session.paused || !this.session.game) return;
    this.session.paused = true;
    this.controls.releaseAll();
    this.scene.pause('World');
    this.scene.launch('Menus', { session: this.session });
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
    this.hud.update(g, Math.min(0.1, deltaMs / 1000));
  }
}

// Menus: the pause menu and the port of Portofosco (bestiary and beast sheet arrive with tappa 4).
import Phaser from 'phaser';
import { PauseMenu } from '../ui/pauseMenu';
import { PortMenu } from '../ui/portMenu';
import type { SceneData, Session } from './session';

export interface MenusData extends SceneData {
  mode: 'pause' | 'port';
}

export class MenusScene extends Phaser.Scene {
  private session!: Session;
  private mode: MenusData['mode'] = 'pause';
  private menu: { destroy(): void } | null = null;

  constructor() {
    super('Menus');
  }

  init(data: MenusData): void {
    this.session = data.session;
    this.mode = data.mode ?? 'pause';
  }

  create(): void {
    const game = this.session.game;
    const ui = document.getElementById('ui') ?? document.body;
    if (!game) return;
    const close = (): void => this.session.emit('resume');
    this.menu =
      this.mode === 'port'
        ? new PortMenu(ui, this.session, game, close)
        : new PauseMenu(ui, this.session, game, close);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || (this.mode === 'pause' && e.key.toLowerCase() === 'p')) close();
    };
    window.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.menu?.destroy();
      this.menu = null;
    });
  }
}

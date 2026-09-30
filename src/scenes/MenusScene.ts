// Menus: for now only the pause menu (squad, bestiary, beast sheet, port and backpack arrive in later stages).
import Phaser from 'phaser';
import { PauseMenu } from '../ui/pauseMenu';
import type { SceneData, Session } from './session';

export class MenusScene extends Phaser.Scene {
  private session!: Session;
  private menu: PauseMenu | null = null;

  constructor() {
    super('Menus');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    const game = this.session.game;
    const ui = document.getElementById('ui') ?? document.body;
    if (!game) return;
    this.menu = new PauseMenu(ui, this.session, game, () => this.session.emit('resume'));
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') this.session.emit('resume');
    };
    window.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.menu?.destroy();
      this.menu = null;
    });
  }
}

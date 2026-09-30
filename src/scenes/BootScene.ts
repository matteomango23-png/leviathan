// Boot: paints the procedural textures, then starts the world and the interface.
import Phaser from 'phaser';
import { createTextures } from '../views/textures';
import { Session } from './session';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createTextures(this);
    const session = new Session();
    this.scene.start('World', { session });
    this.scene.launch('UI', { session });
  }
}

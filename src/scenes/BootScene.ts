// Boot: loads the beast sprites, paints the procedural textures, then starts the world and the interface.
import Phaser from 'phaser';
import { WHITE_SHARK_FORMS, formKey } from '../systems/beasts/forms';
import { addStripFrames, loadBeastSprites } from '../views/beastView';
import { createTextures } from '../views/textures';
import { Session } from './session';

/** Beast forms whose sprites the game needs (tappa 2: the six white sharks). */
const BEAST_KEYS = WHITE_SHARK_FORMS.map(formKey);

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of BEAST_KEYS) loadBeastSprites(this, key);
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('Immagine mancante:', file.src));
  }

  create(): void {
    createTextures(this);
    for (const key of BEAST_KEYS) addStripFrames(this, key);
    const session = new Session();
    this.scene.start('World', { session });
    this.scene.launch('UI', { session });
  }
}

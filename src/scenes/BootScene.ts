// Boot: loads the beast sprites, paints the procedural textures, then starts the world and the interface.
import Phaser from 'phaser';
import { addStripFrames, loadBeastSprites } from '../views/beastView';
import { neededSpriteKeys } from '../views/neededSprites';
import { createTextures } from '../views/textures';
import { Session } from './session';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { assetUrl } from '../data/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of neededSpriteKeys()) loadBeastSprites(this, key);
    // painted walls and icebergs (views/worldArtView.ts)
    for (const key of WORLD_ART_KEYS) this.load.image(`world-${key}`, assetUrl(`world/${key}.webp`));
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('Immagine mancante:', file.src));
  }

  create(): void {
    createTextures(this);
    for (const key of neededSpriteKeys()) addStripFrames(this, key);
    // the battle prototype (link with ?battaglia): a turn-based fight on its own
    if (new URLSearchParams(window.location.search).has('battaglia')) {
      this.scene.start('Battle');
      return;
    }
    const session = new Session();
    this.scene.start('World', { session });
    this.scene.launch('UI', { session });
  }
}

// Boot: loads the beast sprites, paints the procedural textures, then opens the title menu.
import Phaser from 'phaser';
import { addStripFrames, loadBeastSprites, loadFrontSprites } from '../views/beastView';
import { SPECIES } from '../data/species';
import { neededSpriteKeys } from '../views/neededSprites';
import { createTextures } from '../views/textures';
import { Session } from './session';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { assetUrl } from '../data/assets';
import { WORLD_ART_SPARE } from '../data/worldArt';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of neededSpriteKeys()) loadBeastSprites(this, key);
    // beasts drawn from the front until they have a side profile (the Re Corallo)
    loadFrontSprites(
      this,
      SPECIES.map((s) => s.id),
    );
    // painted walls and icebergs (views/worldArtView.ts)
    for (const key of WORLD_ART_KEYS)
      if (!WORLD_ART_SPARE.includes(key)) this.load.image(`world-${key}`, assetUrl(`world/${key}.webp`));
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
    // first the title menu: which game to play (TitleScene)
    this.scene.start('Title', { session });
  }
}

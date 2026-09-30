// Boot: loads the beast sprites, paints the procedural textures, then starts the world and the interface.
import Phaser from 'phaser';
import { WILD_SPAWNS } from '../data/beasts';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { UNIQUE_VARIANTS } from '../data/species';
import { addStripFrames, loadBeastSprites } from '../views/beastView';
import { createTextures } from '../views/textures';
import { Session } from './session';

/** Sprites the game needs now: every version of the beasts that live in the regions already in the game. */
function neededKeys(): string[] {
  const species = WILD_SPAWNS.map((s) => s.speciesId);
  const uniques = UNIQUE_VARIANTS.filter((u) => species.includes(u.speciesId)).map((u) => u.id);
  return SPRITE_KEYS.filter(
    (k) => uniques.includes(k) || species.some((s) => k === s || k.startsWith(`${s}_`)),
  );
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of neededKeys()) loadBeastSprites(this, key);
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('Immagine mancante:', file.src));
  }

  create(): void {
    createTextures(this);
    for (const key of neededKeys()) addStripFrames(this, key);
    const session = new Session();
    this.scene.start('World', { session });
    this.scene.launch('UI', { session });
  }
}

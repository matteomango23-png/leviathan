// Title: the menu before the sea (owner, 19 ottobre 2026). The old single save moves into the list of games first;
// the game chosen is read here, so an unreadable one never starts (and is never written over), then World and UI
// start with it.
import Phaser from 'phaser';
import { loadSlot, markBroken, markPlayed, migrateLegacySaves } from '../systems/save/slots';
import type { SaveData } from '../systems/save/saveData';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { TitleMenu } from '../ui/titleMenu';
import { splashReady } from '../ui/splash';
import { addStripFrames, loadBeastSprites } from '../views/beastView';
import type { SceneData, Session } from './session';

export class TitleScene extends Phaser.Scene {
  private session!: Session;
  private menu: TitleMenu | null = null;

  constructor() {
    super('Title');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    migrateLegacySaves();
    this.session.sound.titleMusic(true); // the dark under you (it starts with the tap on the opening screen)
    splashReady(); // the opening screen goes once tapped (ui/splash.ts)
    this.menu = new TitleMenu({
      play: (id) => this.play(id),
      gallery: () => this.openGallery(),
    });
    this.events.once('shutdown', () => {
      this.menu?.destroy();
      this.menu = null;
    });
  }

  private play(id: string): string | null {
    const loaded = loadSlot(id);
    if (!loaded.ok) {
      markBroken(id, loaded.error);
      return loaded.error;
    }
    markPlayed(id);
    this.session.slotId = id;
    this.start(loaded.save, false);
    return null;
  }

  /** The test gallery tries every beast, also those of the places not open yet, whose pictures Boot did not load
   *  (owner, 20 ottobre: the Dunkleosteus and the Sfregiato showed with no picture): loaded first, then it opens. */
  private openGallery(): void {
    for (const key of SPRITE_KEYS) loadBeastSprites(this, key);
    this.load.once('complete', () => {
      for (const key of SPRITE_KEYS) addStripFrames(this, key);
      this.start(null, true);
    });
    this.load.start();
  }

  /** The sea and the interface start with this game (or the test gallery's throwaway one: no slot, never saved). */
  private start(save: SaveData | null, gallery: boolean): void {
    if (gallery) this.session.slotId = '';
    this.session.startSave = save;
    this.session.gallery = gallery;
    this.session.sound.titleMusic(false);
    this.scene.start('World', { session: this.session });
    this.scene.launch('UI', { session: this.session });
  }
}

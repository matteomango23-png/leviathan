// What the start of the game adds to the world: Nonno Aurelio on the pier of Portofosco (with you, sitting,
// during the opening) until you set off for Porto Fango.
import Phaser from 'phaser';
import { PORT } from '../data/economy';
import { PIER_ART } from '../data/worldArt';
import { WORLD } from '../data/worldLayout';
import type { StoryState } from '../systems/story';

const S = WORLD.surfaceY;

/** A human silhouette standing on a deck (feet at x, y); with a lantern if lit. */
function drawPerson(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  lantern: boolean,
  sitting = false,
): void {
  const h = sitting ? 5 : 8;
  g.fillStyle(0x0b0e11, 1);
  g.fillRect(x - 1.6, y - h, 3.2, h);
  g.fillCircle(x, y - h - 1.8, 1.8);
  if (!lantern) return;
  g.fillStyle(0xffd9a0, 0.95);
  g.fillCircle(x + 3, y - h * 0.45, 1.1);
}

export class StoryView {
  private readonly people: Phaser.GameObjects.Graphics;
  private drawnPeople = '';

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    this.people = scene.add.graphics();
    layer.add(this.people);
  }

  update(s: StoryState): void {
    const key = s.step === 'intro' ? 'boat' : s.step === 'tutorial' ? 'pier' : 'none';
    if (key === this.drawnPeople) return;
    this.drawnPeople = key;
    const g = this.people.clear();
    // on the deck of the painted pier
    const deckX = (i: 0 | 1) => PORT.shoreX + PIER_ART.fromShore + PIER_ART.people[i];
    const deckY = S - PIER_ART.deckAbove;
    if (key === 'boat') {
      drawPerson(g, deckX(1), deckY, true); // Aurelio
      drawPerson(g, deckX(0), deckY, false, true); // you, sitting
    } else if (key === 'pier') drawPerson(g, deckX(1), deckY, true);
  }
}

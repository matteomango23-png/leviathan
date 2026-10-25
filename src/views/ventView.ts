// The air vents of the endless sea: the owner's painted vent of rock on the floor (lot C3, data/worldArt.ts
// PROP_ART) and a column of bubbles rising from its mouth, so you can spot them from afar in the dark (swim into the
// column to breathe: systems/endlessLife.ts). Only the ones near the camera exist.
import Phaser from 'phaser';
import { ENDLESS } from '../data/endless';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { PROP_ART } from '../data/worldArt';
import { stretchAt, ventsOf } from '../systems/world/endless';
import { drawBubbles } from './bubbles';
import { plant } from './plant';
import type { TileMap } from '../systems/world/tileMap';

const BUBBLES = 16;

export class VentView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly rocks: Phaser.GameObjects.Image[] = [];
  private readonly painted = WORLD_ART_KEYS.includes(PROP_ART.vent);

  /** Where each vent's rock stands (planted on the floor once). */
  private readonly placed = new Map<string, { bottom: number; scale: number }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly map?: TileMap,
    /** Behind the terrain: the rock of the vents goes there, the rock of the floor hides its foot (plant.ts). */
    private readonly under?: Phaser.GameObjects.Container,
  ) {
    this.g = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    layer.add(this.g);
  }

  update(view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.g.clear();
    let used = 0;
    if (view.right >= ENDLESS.startX) {
      const V = ENDLESS.vents;
      for (let k = stretchAt(view.x) - 1; k <= stretchAt(view.right) + 1; k++) {
        for (const v of ventsOf(k)) {
          if (v.x < view.x - 40 || v.x > view.right + 40 || v.y - V.height > view.bottom || v.y < view.y)
            continue;
          let mouth = v.y;
          if (this.painted) {
            let im = this.rocks[used];
            if (!im) {
              im = this.scene.add.image(0, 0, `world-${PROP_ART.vent}`).setOrigin(0.5, 1);
              if (this.under) this.under.add(im);
              else this.layer.addAt(im, this.layer.getIndex(this.g));
              this.rocks.push(im);
            }
            used++;
            const k0 = PROP_ART.ventWidth / im.width;
            const key = `${Math.round(v.x)}:${Math.round(v.y)}`;
            let at = this.placed.get(key);
            if (!at) {
              at = this.map
                ? plant(this.map, v.x, v.y, PROP_ART.ventWidth, im.height * k0)
                : { bottom: v.y + im.height * k0 * PROP_ART.ventSink, scale: 1 };
              this.placed.set(key, at);
            }
            im.setScale(k0 * at.scale).setVisible(true);
            im.setPosition(v.x, at.bottom);
            mouth = im.y - im.displayHeight * 0.92; // the bubbles come out of its crater
          } else {
            g.fillStyle(0x9fe8ff, 0.12);
            g.fillEllipse(v.x, v.y, V.radius * 2.2, 10);
          }
          drawBubbles(
            g,
            v.x,
            mouth,
            V.height - (v.y - mouth),
            V.radius * 0.6,
            BUBBLES,
            time,
            k * 13.7 + v.x * 0.001,
          );
        }
      }
    }
    for (let i = used; i < this.rocks.length; i++) this.rocks[i]!.setVisible(false);
  }
}

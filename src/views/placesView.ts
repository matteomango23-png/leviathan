// The harbours at the surface (Portofosco's pier and houses on the mainland, Porto Fango's pier and huts on the
// Isola delle Mangrovie) and the wrecks/chests on the sea floor.
import Phaser from 'phaser';
import { PIER_ART } from '../data/worldArt';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { HARBOUR_PIECES, OUTPOST_ART, OUTPOSTS, PORT, PORTO_FANGO, type PortDef } from '../data/economy';
import { COAST, WORLD } from '../data/worldLayout';
import { landHeight } from '../systems/world/worldGen';
import type { Wreck } from '../systems/economy/places';
import type { GearState } from '../systems/economy/gear';
import { TEX } from './textures';

/** Houses of Portofosco on the land, back from the shore: x, width, height (world units). The story burns them. */
export const PORT_HOUSES: [number, number, number][] = [
  [COAST.shoreX - 100, 20, 20],
  [COAST.shoreX - 74, 18, 24],
  [COAST.shoreX - 50, 20, 18],
  [COAST.shoreX - 26, 14, 14],
];

/** Fishermen's huts of Porto Fango, on the island by its east shore. */
const FANGO_HUTS: [number, number, number][] = [
  [PORTO_FANGO.shoreX - 62, 16, 14],
  [PORTO_FANGO.shoreX - 40, 20, 18],
  [PORTO_FANGO.shoreX - 18, 12, 11],
];

function drawHouses(g: Phaser.GameObjects.Graphics, houses: [number, number, number][]): void {
  const s = WORLD.surfaceY;
  for (const [hx, w, h] of houses) {
    // the uphill corner sets the floor; the walls go down to the ground on the downhill side too
    const high = s - Math.max(landHeight(hx), landHeight(hx + w)) + 1;
    const low = s - Math.min(landHeight(hx), landHeight(hx + w)) + 2;
    const top = high - h;
    g.fillStyle(0x0d1216, 1);
    g.fillRect(hx, top, w, low - top);
    g.fillTriangle(hx - 3, top, hx + w + 3, top, hx + w / 2, top - 11);
    g.fillStyle(0xffc878, 0.85);
    g.fillRect(hx + w * 0.35, top + h * 0.4, 3, 3);
  }
}

function drawPort(g: Phaser.GameObjects.Graphics, port: PortDef, painted: boolean): void {
  const s = WORLD.surfaceY;
  const x = port.x;
  const shore = port.shoreX;
  if (painted) {
    // the owner's painted pier is laid by PlacesView: only the houses here
    drawHouses(g, port.id === 'portofosco' ? PORT_HOUSES : FANGO_HUTS);
    return;
  }
  // the pier: from the shore out over the water, on stilts
  g.fillStyle(0x1b1612, 1);
  for (let px = shore; px <= x + 30; px += 13) g.fillRect(px - 1, s - 6, 2.2, 24);
  g.fillStyle(0x3a2c20, 1);
  g.fillRect(shore - 8, s - 8, x + 38 - shore, 3.5);
  // houses on the land (dark silhouettes against the storm sky, lit windows)
  drawHouses(g, port.id === 'portofosco' ? PORT_HOUSES : FANGO_HUTS);
  // a small boat moored at the end of the pier
  g.fillStyle(0x141b20, 1);
  g.fillTriangle(x + 8, s - 5, x + 32, s - 5, x + 26, s + 1);
  g.fillRect(x + 12, s - 7, 16, 2);
  g.fillRect(x + 19, s - 24, 1.4, 18);
  // a lantern at the end of the pier
  g.fillStyle(0xffd9a0, 1);
  g.fillRect(x + 1, s - 16, 2.4, 3);
  g.fillStyle(0x1b1612, 1);
  g.fillRect(x + 1.6, s - 13, 1.2, 6);
}

function drawWreck(g: Phaser.GameObjects.Graphics, w: Wreck): void {
  const x = w.x;
  const y = w.y + 4;
  if (w.def.reward.weapon) {
    // a broken hull lying on its side
    g.fillStyle(0x221a14, 1);
    g.fillEllipse(x, y - 6, 60, 16);
    g.fillStyle(0x2e241b, 1);
    for (let i = -24; i <= 24; i += 8) g.fillRect(x + i, y - 16, 2, 12);
    g.fillStyle(0x17110d, 1);
    g.fillRect(x - 4, y - 34, 2.5, 24);
    g.fillTriangle(x - 3, y - 34, x + 12, y - 24, x - 3, y - 22);
  }
  // the chest
  g.fillStyle(0x4a3218, 1);
  g.fillRect(x - 6, y - 8, 12, 8);
  g.fillStyle(0x6b4a22, 1);
  g.fillRect(x - 6.5, y - 10, 13, 3);
  g.fillStyle(0xc9a15a, 1);
  g.fillRect(x - 1, y - 7, 2, 2.5);
}

export class PlacesView {
  private readonly glows: Phaser.GameObjects.Image[];

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly wrecks: Wreck[],
  ) {
    const g = scene.add.graphics();
    const painted = WORLD_ART_KEYS.includes(PIER_ART.key);
    drawPort(g, PORT, painted);
    // the trading harbour of Porto Fango and the outposts: the owner's paintings (owner, 5 ottobre); without them,
    // the old drawn pier
    const harbour = HARBOUR_PIECES.every((p) => WORLD_ART_KEYS.includes(p.art));
    if (harbour)
      for (const p of HARBOUR_PIECES) {
        const im = scene.add.image(p.x, 0, `world-${p.art}`);
        im.setScale(p.width / im.width);
        const base = p.on === 'land' ? WORLD.surfaceY - landHeight(p.x) + 1 : WORLD.surfaceY;
        im.y = base - (p.share - 0.5) * im.displayHeight;
        layer.add(im);
      }
    else drawPort(g, PORTO_FANGO, false);
    for (const o of OUTPOSTS) {
      const key = o === OUTPOSTS[OUTPOSTS.length - 1] ? OUTPOST_ART.last : OUTPOST_ART.art;
      if (!WORLD_ART_KEYS.includes(key)) continue;
      const im = scene.add.image(o.x, 0, `world-${key}`);
      im.setScale(OUTPOST_ART.width / im.width);
      im.y = WORLD.surfaceY - (OUTPOST_ART.waterline - 0.5) * im.displayHeight;
      layer.add(im);
    }
    if (painted)
      for (const port of [PORT]) {
        const im = scene.add
          .image(port.shoreX + PIER_ART.fromShore, 0, `world-${PIER_ART.key}`)
          .setOrigin(0, 0);
        im.setScale(PIER_ART.width / im.width);
        im.y = WORLD.surfaceY - PIER_ART.deckAbove - PIER_ART.deckAt * im.displayHeight;
        layer.add(im);
      }
    for (const w of wrecks) drawWreck(g, w);
    layer.add(g);
    this.glows = wrecks.map(() =>
      scene.add.image(0, 0, TEX.dot).setBlendMode(Phaser.BlendModes.ADD).setTint(0xffd278).setScale(1.3),
    );
    layer.add(this.glows);
  }

  update(gear: GearState, time: number): void {
    this.wrecks.forEach((w, i) => {
      const open = gear.wrecks.includes(w.def.id);
      this.glows[i]!.setVisible(!open)
        .setPosition(w.x, w.y - 4)
        .setAlpha(0.45 + 0.2 * Math.sin(time * 4 + i));
    });
  }

  /** Light spots for the darkness mask: unopened chests glow faintly. */
  glowSpots(gear: GearState): { x: number; y: number; r: number }[] {
    return this.wrecks
      .filter((w) => !gear.wrecks.includes(w.def.id))
      .map((w) => ({ x: w.x, y: w.y - 4, r: 16 }));
  }
}

// The underside of the harbours (lot M2, docs/PROPOSTA-MARE.md: "pali di legno coperti di cozze, reti strappate,
// ancore e catene sul fondo"): under the piers of Portofosco and Porto Fango, the owner's pictures of the piles
// (down to the floor, cut where it starts) and of the old things lying on the floor, tilted with its slope.
import Phaser from 'phaser';
import { PIER_UNDER } from '../data/landmarks';
import { WORLD_ART_KEYS } from '../data/sprites.generated';
import { HARBOUR_PIECES, PORT } from '../data/economy';
import { PIER_ART } from '../data/worldArt';
import { WORLD } from '../data/worldLayout';
import type { TileMap } from '../systems/world/tileMap';

/** The middle of each pier over the water (Portofosco's painted pier, Porto Fango's). */
export function pierMiddles(): number[] {
  const out = [PORT.shoreX + PIER_ART.fromShore + PIER_ART.width / 2];
  const fango = HARBOUR_PIECES.find((p) => p.art === 'porto_molo');
  if (fango) out.push(fango.x);
  return out;
}

/** The piles, from the surface down to the floor: the picture (its beams, net and chain at the top), cut at the floor
 *  in a shallow harbour; in a deep one, the plain poles of its lowest band drawn on down to the floor. */
function drawPiles(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, x: number, floor: number): void {
  const U = PIER_UNDER;
  const top = WORLD.surfaceY - 2;
  const im = scene.add.image(x, top, `world-${U.piles}`).setOrigin(0.5, 0);
  const k = (U.pilesWidthM * WORLD.unitsPerMetre) / im.width;
  im.setScale(k);
  im.setCrop(0, 0, im.width, Math.min(im.height, (floor + 4 - top) / k));
  layer.add(im);
  const end = top + im.height * k;
  if (end >= floor) return;
  const from = Math.round(im.height * U.pilesRepeatFrom);
  const band = scene.add.image(x, 0, `world-${U.piles}`).setOrigin(0.5, 0);
  band.setCrop(0, from, band.width, band.height - from);
  // the band stretched down to the floor: the crop keeps the frame, so the image is placed for its cut part
  const sy = (floor + 4 - end) / (band.height - from);
  band.setScale(k, sy);
  band.y = end - 1 - from * sy;
  layer.add(band);
}

export function drawPierUnder(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, map: TileMap): void {
  const U = PIER_UNDER;
  const m = WORLD.unitsPerMetre;
  for (const x of pierMiddles()) {
    if (WORLD_ART_KEYS.includes(U.piles)) drawPiles(scene, layer, x, map.floorBelow(x, WORLD.surfaceY + 6));
    if (!WORLD_ART_KEYS.includes(U.floor)) continue;
    const w = U.floorWidthM * m;
    const cx = x + U.floorDxM * m;
    const fl = map.floorBelow(cx - w / 2, WORLD.surfaceY + 6);
    const fr = map.floorBelow(cx + w / 2, WORLD.surfaceY + 6);
    const im = scene.add.image(cx, (fl + fr) / 2 + U.floorSink * m, `world-${U.floor}`).setOrigin(0.5, 1);
    im.setScale(w / im.width).setRotation(Math.atan2(fr - fl, w));
    layer.add(im);
  }
}

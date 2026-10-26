// The underside of the harbours (lot M2, docs/PROPOSTA-MARE.md: "pali di legno coperti di cozze, reti strappate,
// ancore e catene sul fondo"): under the piers of Portofosco and Porto Fango, the owner's pictures of the piles
// and of the old things lying on the floor, tilted with its slope. Both are drawn behind the terrain (owner,
// 24 ottobre: the piles ended in the water and the floor piece sat on the drawn floor with straight edges): the
// piles reach the deepest floor under the pier and the rock hides them where they go in, the piece is half buried.
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
function drawPiles(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container | Phaser.GameObjects.Layer,
  x: number,
  floor: number,
): void {
  const U = PIER_UNDER;
  const top = WORLD.surfaceY - 2;
  const im = scene.add.image(x, top, `world-${U.piles}`).setOrigin(0.5, 0);
  const k = (U.pilesWidthM * WORLD.unitsPerMetre) / im.width;
  im.setScale(k);
  im.setCrop(0, 0, im.width, Math.min(im.height, (floor + 4 - top) / k));
  layer.add(im);
  const end = top + im.height * k - 0.5;
  if (end >= floor) return;
  // the picture's lowest band (plain poles) repeated down to the floor, every other copy upside down: each copy
  // starts with the row the one above ends with, so no seam shows (owner, 24 ottobre: the stretch showed one).
  // Only the two copies are painted (a small texture, the same for every pier), then repeated: one tall picture
  // of the whole depth was too big for the iPhone (owner, 26 ottobre: the game would not open).
  const src = scene.textures.get(`world-${U.piles}`).getSourceImage() as HTMLImageElement;
  const from = Math.round(src.height * U.pilesRepeatFrom);
  const bandPx = src.height - from;
  const key = 'pier-poles';
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, src.width, bandPx * 2)!;
    const ctx = tex.getContext();
    ctx.save();
    ctx.translate(0, bandPx);
    ctx.scale(1, -1);
    ctx.drawImage(src, 0, from, src.width, bandPx, 0, 0, src.width, bandPx);
    ctx.restore();
    ctx.drawImage(src, 0, from, src.width, bandPx, 0, bandPx, src.width, bandPx);
    tex.refresh();
  }
  const H = Math.ceil((floor - end) / k);
  layer.add(scene.add.tileSprite(x, end, src.width, H, key).setOrigin(0.5, 0).setScale(k));
}

/** The deepest floor under a pier's piles (their picture's width): only where the water starts at the surface (a
 *  point in the shore's rock would find some floor far below it), never deeper than PIER_UNDER.pilesMaxDepthM. */
function deepestFloor(map: TileMap, x: number): number {
  const half = (PIER_UNDER.pilesWidthM * WORLD.unitsPerMetre) / 2;
  const start = WORLD.surfaceY + 6;
  let y = start;
  for (let k = -1; k <= 1.0001; k += 0.125) {
    if (map.solidAt(x + k * half, start)) continue;
    y = Math.max(y, map.floorBelow(x + k * half, start));
  }
  return Math.min(y, WORLD.surfaceY + PIER_UNDER.pilesMaxDepthM * WORLD.unitsPerMetre);
}

export function drawPierUnder(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container | Phaser.GameObjects.Layer,
  map: TileMap,
): void {
  const U = PIER_UNDER;
  const m = WORLD.unitsPerMetre;
  for (const x of pierMiddles()) {
    if (WORLD_ART_KEYS.includes(U.piles)) drawPiles(scene, layer, x, deepestFloor(map, x) + 6);
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

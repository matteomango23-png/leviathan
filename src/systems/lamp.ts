// Where the light comes from and how long its cone is (the World scene draws it): your lamp (or the beast you ride),
// the speedboat's headlight on its bow, or a diving U-Boat's from its bow, its cone growing as it goes down (owner,
// 9 ottobre: it snapped). No lamp sitting on the ship afloat or during the opening; shorter in murky water.
import { DELTA } from '../data/worldLayout';
import { boatLength } from './boat';
import { diverModifiers } from './economy/gear';
import type { GameState } from './newGame';
import { shipPoint } from './ship/geometry';
import { shipPicture } from './ship/model';
import { diveShare } from './ship/uboat';
import { storyHoldsDiver } from './story';

export function lampOf(
  g: GameState,
  rider: { x: number; y: number } | null,
  murk: number,
): { x: number; y: number; lengthMult: number; widthMult: number } {
  const b = g.boat;
  const dive = g.ship.aboard ? diveShare(g.ship) : 0;
  const pic = shipPicture(g.ship);
  const at = b.aboard
    ? { x: b.x + b.face * boatLength(b) * 0.45, y: b.y - boatLength(b) * 0.06 }
    : dive > 0
      ? shipPoint(g.ship, pic.lampU ?? pic.bowU, pic.waterline)
      : (rider ?? g.diver);
  const mods = diverModifiers(g.gear);
  const off = storyHoldsDiver(g) || (g.ship.aboard && dive <= 0);
  const length = (g.ship.aboard ? 1.6 * dive : mods.coneMult) * (1 - (1 - DELTA.murk.lampMult) * murk);
  return { x: at.x, y: at.y, lengthMult: off ? 0 : length, widthMult: mods.coneWidthMult };
}

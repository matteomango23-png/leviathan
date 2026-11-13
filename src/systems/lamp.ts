// Where the light comes from and how long its cone is (the World scene draws it): your lamp (or the beast you ride),
// the speedboat's headlight on its bow, or a diving U-Boat's from its bow, its cone growing as it goes down (owner,
// 9 ottobre: it snapped). No lamp sitting on the ship afloat or during the opening; shorter in murky water.
import { DELTA } from '../data/worldLayout';
import { RIDE_TALENTS } from '../data/beasts';
import { activeBeast } from './beastState';
import { talentOf } from './beasts/mountTraits';
import { boatLamp } from './boat';
import { diverModifiers } from './economy/gear';
import type { GameState } from './newGame';
import { shipPoint } from './ship/geometry';
import { shipPicture } from './ship/model';
import { diveShare } from './ship/uboat';
import { storyHoldsDiver } from './story';
import { subModel } from './subState';
import { NIGHT } from '../data/daynight';
import { nightness } from './dayNight';

export function lampOf(
  g: GameState,
  rider: { x: number; y: number } | null,
  murk: number,
): { x: number; y: number; lengthMult: number; widthMult: number } {
  const b = g.boat;
  const dive = g.ship.aboard ? diveShare(g.ship) : 0;
  // by night the ship's headlight is on afloat too, and reaches farther (lot N1b, owner 13 novembre 2026)
  const night = g.ship.aboard ? nightness(g.day) : 0;
  const pic = shipPicture(g.ship);
  const at = b.aboard
    ? boatLamp(b)
    : g.ship.aboard && (dive > 0 || night > 0)
      ? shipPoint(g.ship, pic.lamp.u, pic.lamp.v)
      : (rider ?? g.diver);
  const mods = diverModifiers(g.gear);
  const off = storyHoldsDiver(g) || (g.ship.aboard && dive <= 0 && night < 0.2);
  // riding an Abissale, its eyes for the dark: your light reaches much farther (beasts/mountTraits.ts)
  const ridden = g.beasts.riding ? activeBeast(g) : undefined;
  const abyss = ridden && talentOf(ridden.form) === 'abissale' ? RIDE_TALENTS.abyssLampMult : 1;
  // a submarine with a headlight (the abyssal one): its beam, far longer than your lamp
  const beam = g.sub.aboard ? (subModel(g.sub.model).beam ?? 1) : 1;
  const length =
    (g.ship.aboard ? Math.max(1.6 * dive, NIGHT.shipLamp * night) : mods.coneMult * abyss * beam) *
    (1 - (1 - DELTA.murk.lampMult) * murk);
  return { x: at.x, y: at.y, lengthMult: off ? 0 : length, widthMult: mods.coneWidthMult };
}

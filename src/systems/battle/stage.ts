// Pure rules of the battle stage: how big each beast is drawn, where, and which background the battle uses.
import { BATTLE_STAGE, type BattlePlace } from '../../data/battle';
import { formStars, isGiant, type BeastForm } from '../beasts/forms';

export { isGiant };
import type { Side } from './battle';

/** Where a battle picture is not transparent, in its pixels: [left, top, right, bottom] (BATTLE_ART_BOX). */
export type PictureBox = readonly [number, number, number, number];

/** What the stage needs to know about a beast to size it. */
export interface StageBeast {
  lengthM: number;
  giant: boolean;
  /** BATTLE_STAGE.pictureMult of its species (1 if none). */
  pictureMult?: number;
  /** The opaque part of its battle picture; none = it shows its card. */
  box?: PictureBox;
}

/** A card shown in place of a battle picture, measured as if it were one. */
export function cardBox(): PictureBox {
  const P = BATTLE_STAGE.picture;
  const C = BATTLE_STAGE.card;
  const half = (P.box * C.aspect) / 2;
  return [P.square / 2 - half, P.foot - P.box * C.foot, P.square / 2 + half, P.foot + P.box * (1 - C.foot)];
}

/** Where a length falls between the shortest and the longest beast, 0…1, on a log scale. */
export function lengthSpectrum(lengthM: number): number {
  const S = BATTLE_STAGE.size;
  const t = Math.log(Math.max(1e-3, lengthM) / S.minM) / Math.log(S.maxM / S.minM);
  return Math.min(1, Math.max(0, t));
}

/** Its size from its length alone, between BATTLE_STAGE.size.min and max (× its pictureMult). */
export function spectrumSize(beast: StageBeast): number {
  const S = BATTLE_STAGE.size;
  return (S.min + (S.max - S.min) * lengthSpectrum(beast.lengthM)) * (beast.pictureMult ?? 1);
}

/** How much bigger a flat picture is drawn (a turtle from behind looks small at the same longest side). */
function flatBoost(box: PictureBox | undefined): number {
  if (!box) return 1;
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  const F = BATTLE_STAGE.flat;
  return Math.min(F.max, Math.pow(Math.max(w, h) / Math.sqrt(Math.max(1, w * h)), F.exponent));
}

/** How far the beast's picture reaches from its foot, in shares of the screen height per unit of size. */
function reach(box: PictureBox) {
  const P = BATTLE_STAGE.picture;
  return {
    up: (P.foot - box[1]) / P.box,
    left: (P.square / 2 - box[0]) / P.box,
    right: (box[2] - P.square / 2) / P.box,
  };
}

/** The biggest size at which the picture stays whole on a screen `aspect` times wider than tall. */
export function fitSize(side: Side, beast: StageBeast, aspect: number): number {
  const { margin, foeLowest, foeLeft, youMax, youWide, youRight, youTop } = BATTLE_STAGE.fit;
  const r = reach(beast.box ?? cardBox());
  // yours may be cut by the screen's edges (placePicture), like Pokémon, but not too much
  if (side === 'you')
    return Math.min(
      youMax,
      (youWide * youRight * aspect) / (r.left + r.right),
      (youWide * (1 - youTop)) / r.up, // a tall one is not cut too much at the bottom either
    );
  const a = BATTLE_STAGE.anchors.foe;
  return Math.min(
    (foeLowest - BATTLE_STAGE.hover - margin) / r.up,
    ((a.x - foeLeft) * aspect) / r.left,
    ((1 - a.x) * aspect - margin) / r.right,
  );
}

/**
 * The height of a beast's picture box as a share of the screen height: its length placed on the spectrum
 * between BATTLE_STAGE.size.min and max (flat pictures a little bigger), yours closer to the camera and the
 * wild one farther, then shrunk only if it would not fit on screen.
 */
export function battleSize(side: Side, beast: StageBeast, aspect: number): number {
  const S = BATTLE_STAGE.size;
  const size = spectrumSize(beast) * flatBoost(beast.box) * (side === 'you' ? S.youCloser : S.foeDistance);
  return Math.min(size, fitSize(side, beast, aspect));
}

/** How big a beast looks: the square root of its drawn area, in screen heights. */
export function presence(beast: StageBeast, size: number): number {
  const b = beast.box ?? cardBox();
  return (size * Math.sqrt((b[2] - b[0]) * (b[3] - b[1]))) / BATTLE_STAGE.picture.box;
}

/**
 * Both sizes: each from battleSize, then yours, when it is the shorter beast, shrunk so it does not look bigger than
 * the wild one (BATTLE_STAGE.size.smallerYours).
 */
export function battleSizes(you: StageBeast, foe: StageBeast, aspect: number): Record<Side, number> {
  const sizes = { you: battleSize('you', you, aspect), foe: battleSize('foe', foe, aspect) };
  if (you.lengthM < foe.lengthM) {
    const most =
      presence(foe, sizes.foe) * BATTLE_STAGE.size.smallerYours * (spectrumSize(you) / spectrumSize(foe));
    const now = presence(you, sizes.you);
    if (now > most) sizes.you *= most / now;
  }
  return sizes;
}

/** The background of a battle: a Guardian's lair, or the region the wild beast lives in (else the bay). */
export function battlePlace(region: string, inLair: boolean): BattlePlace {
  if (inLair) return 'tana';
  return (BATTLE_STAGE.places as readonly string[]).includes(region) ? (region as BattlePlace) : 'baia';
}

/** How rare a beast looks in battle: 0 common, 1 rare (albino, alfa, 4+ stars), 2 giant or legendary. */
export function rarityTier(form: BeastForm): 0 | 1 | 2 {
  if (isGiant(form)) return 2;
  return form.variant !== 'comune' || formStars(form) >= 4 ? 1 : 0;
}

/**
 * Where a beast's picture goes on a screen of w × h pixels when its box is `size` of the screen height: the
 * point under the middle of its picture's bottom (its ground, minus the hover) and the picture's scale.
 * A wild beast too tall for its place stands lower (down to fit.foeLowest), so its head stays in; yours is placed
 * like Pokémon (fit.youRight, fit.youTop).
 */
export function placePicture(
  side: Side,
  size: number,
  w: number,
  h: number,
  box: PictureBox = cardBox(),
): { x: number; y: number; scale: number } {
  const a = BATTLE_STAGE.anchors[side];
  const { margin, foeLowest, youRight, youTop } = BATTLE_STAGE.fit;
  const r = reach(box);
  const hover = BATTLE_STAGE.hover;
  const scale = (size * h) / BATTLE_STAGE.picture.box;
  if (side === 'you') {
    // its top no higher than youTop (a big one sinks below the screen) and its right edge no further than youRight
    const ground = Math.max(a.y, youTop + hover + r.up * size);
    const x = Math.min(a.x * w, youRight * w - r.right * size * h);
    return { x, y: (ground - hover) * h, scale };
  }
  const ground = Math.min(foeLowest, Math.max(a.y, margin + hover + r.up * size));
  return { x: a.x * w, y: (ground - hover) * h, scale };
}

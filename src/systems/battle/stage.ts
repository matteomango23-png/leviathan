// Pure rules of the battle stage: how big each beast is drawn, where, and which background the battle uses.
import { BATTLE_STAGE, type BattlePlace } from '../../data/battle';
import { formStars, isGiant, type BeastForm } from '../beasts/forms';

export { isGiant };
import type { Side } from './battle';

/** Where a battle picture is not transparent, in its pixels: [left, top, right, bottom] (BATTLE_ART_BOX). */
type PictureBox = readonly [number, number, number, number];

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
function fitSize(side: Side, beast: StageBeast, aspect: number): number {
  const { margin, foeLowest, foeLeft, youMax, youWide, youTall, youRight, youTop } = BATTLE_STAGE.fit;
  const r = reach(beast.box ?? cardBox());
  // yours may be cut by the screen's edges (placePicture), like Pokémon, but not too much
  if (side === 'you')
    return Math.min(
      youMax,
      (youWide * youRight * aspect) / (r.left + r.right),
      (youTall * (1 - youTop)) / r.up, // a tall one is not cut too much at the bottom either
    );
  // the wild one may use its whole side (placePicture slides it within it), a big one leaving the screen on the
  // right and at the bottom with foeKeepW and foeKeepH of it still in view
  const { foeKeepW, foeKeepH } = BATTLE_STAGE.fit;
  return Math.min(
    (foeLowest - BATTLE_STAGE.hover - margin) / (r.up * foeKeepH),
    ((1 - foeLeft) * aspect - margin) / ((r.left + r.right) * foeKeepW),
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

/**
 * How big a beast looks where it stands: the square root of the part of its picture box in view (on a screen
 * `aspect` wide and 1 high; yours above its name box), in screen heights. Yours is partly off screen, so its whole
 * picture would overstate it (owner, 20 ottobre: your Titano looked no bigger than a wild white shark).
 */
export function seenPresence(side: Side, beast: StageBeast, size: number, aspect: number): number {
  const b = beast.box ?? cardBox();
  const P = BATTLE_STAGE.picture;
  const p = placePicture(side, size, aspect, 1, b);
  const left = Math.max(0, p.x + (b[0] - P.square / 2) * p.scale);
  const right = Math.min(aspect, p.x + (b[2] - P.square / 2) * p.scale);
  const top = Math.max(0, p.y + (b[1] - P.foot) * p.scale);
  const floor = side === 'you' ? BATTLE_STAGE.fit.youBoxTop : 1;
  const bottom = Math.min(floor, p.y + (Math.min(b[3], P.foot) - P.foot) * p.scale);
  return Math.sqrt(Math.max(0, right - left) * Math.max(0, bottom - top));
}

/**
 * Both sizes: each from battleSize, then kept in proportion to their lengths. Each fits its own place, so two big
 * ones would both reach their limit and look alike (owner, 20 ottobre: the wild white shark looked bigger than your
 * Titano): the one that looks too big for its length next to the other is drawn smaller.
 */
export function battleSizes(you: StageBeast, foe: StageBeast, aspect: number): Record<Side, number> {
  const S = BATTLE_STAGE.size;
  const sizes = { you: battleSize('you', you, aspect), foe: battleSize('foe', foe, aspect) };
  // how much bigger the wild one should look: its length over yours, softened (lengthExponent; a 9 m Titano clearly
  // bigger than a 6 m shark, a 15 m mosasaur far bigger than a pufferfish), × their pictureMult
  const ratio =
    Math.pow(Math.max(0.01, foe.lengthM) / Math.max(0.01, you.lengthM), S.lengthExponent) *
    ((foe.pictureMult ?? 1) / (you.pictureMult ?? 1));
  // the wild one never looks bigger than that (× foeVsYours: yours is closer, so at the same length it wins)
  // (both measured by what is in view: seenPresence. A beast partly off screen does not shrink in proportion, the
  // hidden part coming into view: a few rounds settle it)
  for (let round = 0; round < 4; round++) {
    const maxFoe = seenPresence('you', you, sizes.you, aspect) * ratio * S.foeVsYours;
    const foeNow = seenPresence('foe', foe, sizes.foe, aspect);
    if (foeNow > maxFoe * 1.001) sizes.foe *= Math.min(1, Math.max(maxFoe, S.minSeen) / foeNow); // a small one stays readable
    // yours never looks bigger than that by more than smallerYours (Guscio next to a hammerhead, 3 ottobre)
    const maxYou = (seenPresence('foe', foe, sizes.foe, aspect) / ratio) * S.smallerYours;
    const youNow = seenPresence('you', you, sizes.you, aspect);
    if (youNow > maxYou * 1.001) sizes.you *= Math.min(1, Math.max(maxYou, S.minSeen) / youNow);
  }
  // and never too far apart (owner, 20 ottobre: a pufferfish next to Moby Dick could hardly be seen): the small one
  // grows as far as its place allows, then the big one shrinks, until the big one is at most maxSeenRatio times it
  const most = S.maxSeenRatio;
  for (let round = 0; round < 4; round++) {
    const seenYou = seenPresence('you', you, sizes.you, aspect);
    const seenFoe = seenPresence('foe', foe, sizes.foe, aspect);
    const [small, big, seenSmall, seenBig] =
      seenYou < seenFoe
        ? (['you', 'foe', seenYou, seenFoe] as const)
        : (['foe', 'you', seenFoe, seenYou] as const);
    if (seenBig <= seenSmall * most * 1.001) break;
    const room = fitSize(small, small === 'you' ? you : foe, aspect) / sizes[small];
    sizes[small] *= Math.max(1, Math.min(room, seenBig / most / seenSmall));
    const now = seenPresence(small, small === 'you' ? you : foe, sizes[small], aspect);
    if (seenBig > now * most) sizes[big] *= (now * most) / seenBig;
  }
  return sizes;
}

/** The background of a battle: a Guardian's lair, or the region the wild beast lives in (else the bay). */
export function battlePlace(region: string, inLair = false): BattlePlace {
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
  const { margin, foeLowest, youRight, youTop, youBoxTop, youShowAbove, foeKeepW, foeKeepH } =
    BATTLE_STAGE.fit;
  const r = reach(box);
  const hover = BATTLE_STAGE.hover;
  const scale = (size * h) / BATTLE_STAGE.picture.box;
  if (side === 'you') {
    // standing on its anchor, raised so that youShowAbove of it is above your name box, but its top no higher than
    // youTop (a big one sinks below the screen) and its right edge no further than youRight
    const tall = r.up * size;
    const top = Math.max(youTop, Math.min(a.y - hover - tall, youBoxTop - youShowAbove * tall));
    const ground = top + hover + tall;
    const x = Math.min(a.x * w, youRight * w - r.right * size * h);
    return { x, y: (ground - hover) * h, scale };
  }
  // standing lower if too tall, down to foeLowest, then with its bottom out of the screen (foeKeepH of it in view)
  const tall = r.up * size;
  const ground = Math.min(foeLowest + (1 - foeKeepH) * tall, Math.max(a.y, margin + hover + tall));
  // at its anchor if it fits; else slid right of foeLeft, or left of the right margin
  const { foeLeft } = BATTLE_STAGE.fit;
  let x = a.x * w;
  x = Math.max(x, foeLeft * w + r.left * size * h);
  // (a big one may leave the screen on the right, its tail, with foeKeepW of it in view)
  x = Math.min(x, w - margin * h - r.right * size * h + (1 - foeKeepW) * (r.left + r.right) * size * h);
  return { x, y: (ground - hover) * h, scale };
}

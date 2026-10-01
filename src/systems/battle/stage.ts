// Pure rules of the battle stage: how big each beast is drawn and which background the battle uses.
import { BATTLE_STAGE, type BattlePlace } from '../../data/battle';
import { formStars, isGiant, type BeastForm } from '../beasts/forms';

export { isGiant };
import type { Side } from './battle';

/** What the stage needs to know about a beast to size it. */
export interface StageBeast {
  lengthM: number;
  giant: boolean;
}

/**
 * Heights of the two beasts as shares of the screen height. The bigger one is standard size, the other in
 * proportion (real ratio squeezed by the exponent); giants are at least `giant`; yours is bigger because it
 * is close to the camera, the wild one smaller because it is farther away.
 */
export function battleSizes(you: StageBeast, foe: StageBeast): Record<Side, number> {
  const S = BATTLE_STAGE.size;
  const longest = Math.max(you.lengthM, foe.lengthM, 0.1);
  const one = (b: StageBeast): number => {
    const rel = S.standard * Math.pow(Math.max(0.1, b.lengthM) / longest, S.exponent);
    return Math.min(S.max, Math.max(b.giant ? S.giant : S.min, rel));
  };
  return { you: Math.min(S.max, one(you) * S.youCloser), foe: one(foe) * S.foeDistance };
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

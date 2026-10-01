// Pure rules of the battle stage: how big each beast is drawn and which background the battle uses.
import { BATTLE_STAGE, type BattlePlace } from '../../data/battle';
import type { Side } from './battle';

/** Height of a beast's picture as a share of the screen height, from its real length in metres. */
export function battleSize(lengthM: number, side: Side): number {
  const S = BATTLE_STAGE.size;
  const own = S.refScreen * Math.pow(Math.max(0.1, lengthM) / S.refLengthM, S.exponent);
  const clamped = Math.min(S.max, Math.max(S.min, own));
  return side === 'foe' ? clamped * S.foeDistance : clamped;
}

/** The background of a battle: a Guardian's lair, or the region the wild beast lives in (else the bay). */
export function battlePlace(region: string, inLair: boolean): BattlePlace {
  if (inLair) return 'tana';
  return (BATTLE_STAGE.places as readonly string[]).includes(region) ? (region as BattlePlace) : 'baia';
}

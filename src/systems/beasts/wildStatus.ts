// What happens to a wild beast when it is hit, and how its mood changes over time.
import { BEAST_COMBAT, TAMING_FLOW } from '../../data/beasts';
import { TAMING } from '../../data/rules';
import type { GameEvent } from '../events';
import { isInWater, type WildBeast } from './wildState';

/** Damage to a wild beast. Returns what happened. */
export function hitWild(
  b: WildBeast,
  dmg: number,
  tameable: boolean,
): 'hit' | 'exhausted' | 'flee' | 'tiredHit' | 'ignored' {
  if (b.mood === 'taming' || b.mood === 'fleeing' || !isInWater(b)) return 'ignored';
  b.flash = BEAST_COMBAT.hitFlashSeconds;
  b.barTime = BEAST_COMBAT.barSeconds;
  if (b.mood === 'tired') {
    b.tiredTime = Math.max(b.tiredTime, TAMING_FLOW.tiredSeconds * 0.5);
    return 'tiredHit';
  }
  b.hp = Math.max(0, b.hp - dmg);
  b.mood = 'angry';
  b.angryTime = BEAST_COMBAT.angrySeconds;
  if (b.motion === 'enter' || b.motion === 'cruise') b.attackPlanned = true;
  const threshold = b.maxHp * TAMING.exhaustionThresholdFraction;
  if (b.hp <= threshold) {
    b.hp = Math.max(b.hp, 0.1); // exhausted, never dead
    b.attackPlanned = false;
    if (b.motion === 'attack') b.motion = 'exit';
    if (tameable) {
      b.mood = 'tired';
      b.tiredTime = TAMING_FLOW.tiredSeconds;
      return 'exhausted';
    }
    b.mood = 'fleeing';
    b.motion = 'bolt';
    return 'flee';
  }
  return 'hit';
}

/** Anger fades; exhaustion ends and the beast recovers. */
export function updateMood(b: WildBeast, dt: number, events: GameEvent[]): void {
  if (b.mood === 'angry') {
    b.angryTime -= dt;
    if (b.angryTime <= 0) b.mood = 'calm';
  } else if (b.mood === 'tired') {
    b.tiredTime -= dt;
    if (b.tiredTime <= 0) {
      b.mood = 'angry';
      b.angryTime = BEAST_COMBAT.angrySeconds;
      b.hp = Math.max(b.hp, b.maxHp * TAMING_FLOW.failHpFraction);
      events.push({ type: 'wildRecovered', id: b.id });
    }
  }
}

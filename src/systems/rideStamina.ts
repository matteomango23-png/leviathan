// The beast you ride, how it swims and how tired it is (rideMotion.ts, stamina.ts): its profile from its length and
// speed, whether it can dash now, and each step its stamina spent by the dash and the faster pace, rested otherwise
// (every beast of the team rests, ridden or not).
import { activeBeast, type BeastWorld } from './beastPlay';
import { formName } from './beasts/forms';
import { mountDepthM, profileOf } from './beasts/mountTraits';
import type { GameEvent } from './events';
import type { InputState } from './input';
import type { RideProfile } from './rideMotion';
import { rest, spendDash, spendSprint, staminaOf } from './stamina';

/** How the beast you ride swims (null: not riding). */
function mountProfile(g: BeastWorld): RideProfile | null {
  const b = activeBeast(g);
  return b && g.beasts.riding ? profileOf(b.form, b.level) : null;
}

/** How deep the beast you ride takes you (metres; 0: not riding). */
export function rideDepthM(g: BeastWorld): number {
  const b = activeBeast(g);
  return b && g.beasts.riding ? mountDepthM(b.form, b.level) : 0;
}

/** What the diver's step needs about the beast you ride (undefined: not riding). */
export function rideNow(
  g: BeastWorld,
): { profile: RideProfile; canDash: boolean; worn: boolean } | undefined {
  const b = activeBeast(g);
  const profile = mountProfile(g);
  if (!b || !profile) return undefined;
  const s = staminaOf(g.beasts.stamina, b.uid);
  return { profile, canDash: !s.worn, worn: s.worn };
}

/** After the diver's step: the dash and the faster pace tire the beast you ride; the rest of the team rests. */
export function stepRideStamina(g: BeastWorld, input: InputState, events: GameEvent[], dt: number): void {
  const b = g.beasts.riding ? activeBeast(g) : undefined;
  const profile = mountProfile(g);
  let busy: string | null = null;
  if (b && profile) {
    const s = staminaOf(g.beasts.stamina, b.uid);
    let worn = false;
    if (events.some((e) => e.type === 'dash')) {
      worn = spendDash(s, profile) || worn;
      busy = b.uid;
    }
    if (input.dashHeld && Math.hypot(input.moveX, input.moveY) > 0.2 && !s.worn) {
      worn = spendSprint(s, profile, dt) || worn;
      busy = b.uid;
    }
    if (worn) events.push({ type: 'mountWorn', name: formName(b.form) });
  }
  for (const m of g.beasts.team) if (m.uid !== busy) rest(staminaOf(g.beasts.stamina, m.uid), dt);
}

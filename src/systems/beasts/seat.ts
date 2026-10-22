// Where you sit on the beast you ride, in the world (on its back, the dorsal fin left out; on the head of a great
// squid). The views draw you there; climbing on and off starts and ends there, so there is no jump (owner, 22 ottobre
// 2026: "un salto non fluido nel momento in cui gli sali in groppa"). Pure logic.
import { TEAM_RULES } from '../../data/beasts';
import { riderSeat, type BodyPose } from './combat';
import { backOfForm, speciesOf, type BeastForm } from './forms';
import { riderForwardOf } from './mountTraits';

export function seatPoint(m: BodyPose, form: BeastForm): { x: number; y: number } {
  const [fwd, up] = riderSeat(m, riderForwardOf(form), TEAM_RULES.riderOffset[1], backOfForm(form));
  const cos = Math.cos(m.pitch);
  const sin = Math.sin(m.pitch);
  const lx = fwd * m.length;
  const ly = up * m.length * (speciesOf(form).girth ?? 1);
  return { x: m.x + (lx * cos - ly * sin) * m.face, y: m.y + lx * sin + ly * cos };
}

/** Climbing on takes TEAM_RULES.mountSeconds: how much of the way from where you were you still are (1 … 0, eased). */
export const seatLag = (secondsLeft: number): number => {
  const k = Math.max(0, Math.min(1, secondsLeft / TEAM_RULES.mountSeconds));
  return k * k * (3 - 2 * k);
};

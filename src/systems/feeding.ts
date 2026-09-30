// Food chain: your big beast (companion or mount) eats the small fish it swims through.
import { FEEDING } from '../data/beasts';
import { headOf } from './beasts/combat';
import type { Companion } from './beasts/companion';
import { speciesOf } from './beasts/forms';
import type { TeamBeast } from './beasts/team';
import type { Fish, FishState } from './fish';

/** Returns the fish eaten this frame (the caller puts it in the bag or heals), or null. */
export function beastEats(
  c: Companion | null,
  b: TeamBeast | undefined,
  fish: FishState,
  timer: { feed: number },
  dt: number,
): Fish | null {
  timer.feed = Math.max(0, timer.feed - dt);
  if (!c || !b || c.state === 'leaving' || timer.feed > 0) return null;
  if (!FEEDING.sizes.includes(speciesOf(b.form).size)) return null;
  const h = headOf(c);
  const reach = c.length * FEEDING.reachFrac;
  const f = fish.fish.find((x) => x.alive && !x.hooked && Math.hypot(x.x - h.x, x.y - h.y) < reach);
  if (!f) return null;
  timer.feed = FEEDING.interval;
  c.jaw = Math.max(c.jaw, 0.3);
  return f;
}

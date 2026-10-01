// Food chain: the big beast you ride eats the small fish it swims through;
// at the port a growing beast eats from the fish bag.
import { FEEDING } from '../data/beasts';
import { headOf } from './beasts/combat';
import type { Mount } from './beasts/mount';
import { feedBeast, isHungry } from './beasts/growth';
import { speciesOf } from './beasts/forms';
import type { TeamBeast } from './beasts/team';
import type { GameEvent } from './events';
import type { Fish, FishState } from './fish';

/** Returns the fish eaten this frame (the caller puts it in the bag or heals), or null. */
export function beastEats(
  c: Mount | null,
  b: TeamBeast | undefined,
  fish: FishState,
  timer: { feed: number },
  dt: number,
): Fish | null {
  timer.feed = Math.max(0, timer.feed - dt);
  if (!c || !b || timer.feed > 0) return null;
  if (c.state !== 'ride' && c.state !== 'follow') return null;
  // a companion eats any small fish it meets; in the saddle only the big beasts eat
  if (c.state === 'ride' && !FEEDING.sizes.includes(speciesOf(b.form).size)) return null;
  const h = headOf(c);
  const reach = c.length * FEEDING.reachFrac;
  const f = fish.fish.find((x) => x.alive && !x.hooked && Math.hypot(x.x - h.x, x.y - h.y) < reach);
  if (!f) return null;
  timer.feed = FEEDING.interval;
  c.jaw = Math.max(c.jaw, 0.3);
  return f;
}

/**
 * At the port: a growing beast (levels 31–50) eats one fish from the bag, the one you have most of.
 * Returns the fish id, or null if it is not hungry or the bag is empty.
 */
export function feedFromBag(bag: Record<string, number>, b: TeamBeast, events: GameEvent[]): string | null {
  if (!isHungry(b)) return null;
  const best = Object.entries(bag)
    .filter(([, n]) => n > 0)
    .sort((x, y) => y[1] - x[1])[0];
  if (!best) return null;
  const [id, n] = best;
  if (n <= 1) delete bag[id];
  else bag[id] = n - 1;
  feedBeast(b, events);
  return id;
}

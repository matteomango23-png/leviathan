// Food chain: the beast you ride (or that swims with you) eats the small fish it meets;
// at the port a growing beast eats from the fish bag.
import { FEEDING } from '../data/beasts';
import { headOf } from './beasts/combat';
import type { Mount } from './beasts/mount';
import { feedBeast, isHungry } from './beasts/growth';
import type { TeamBeast } from './beasts/team';
import type { GameEvent } from './events';
import type { Fish, FishState } from './fish';

/**
 * Returns the fish eaten this frame (the caller puts them in the bag or heals): every fish that is in its mouth
 * when it bites, not one at a time (owner, 4 ottobre: a humpback gulps a whole school). The mouth grows with the
 * body, so a big beast swallows many and a small one one or two.
 */
export function beastEats(
  c: Mount | null,
  b: TeamBeast | undefined,
  fish: FishState,
  timer: { feed: number },
  dt: number,
): Fish[] {
  timer.feed = Math.max(0, timer.feed - dt);
  if (!c || !b || timer.feed > 0) return [];
  if (c.state !== 'ride' && c.state !== 'follow') return [];
  const h = headOf(c);
  const reach = Math.max(FEEDING.minReach, c.length * FEEDING.reachFrac);
  const eaten = fish.fish.filter((x) => x.alive && !x.hooked && Math.hypot(x.x - h.x, x.y - h.y) < reach);
  if (!eaten.length) return [];
  timer.feed = FEEDING.interval;
  c.jaw = Math.max(c.jaw, eaten.length >= FEEDING.gulpFrom ? 0.8 : 0.3);
  return eaten;
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

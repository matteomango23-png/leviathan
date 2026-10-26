// The market's requests for beasts (data/bounties.ts BEAST_REQUESTS; owner, 26 ottobre 2026): each harbour asks for a
// few beasts of your bounties' path, common, alpha or albino (never a legend, a starter, a unique beast or a final
// form), and pays double for one sold from the pen. Each harbour's list comes from its name and the time played
// (it changes every so often); a request met is replaced by the next. Separate from the bounties: you can be paid
// for beating a beast and, once tamed, sell it here too. Pure logic.
import { BEAST_REQUESTS } from '../../data/bounties';
import { hash2 } from '../math';
import { formKey } from '../beasts/forms';
import type { TeamBeast } from '../beasts/team';
import { beastPrice, cannotSell } from './beastSale';
import { bountyPath, type BountyDef } from './bountyPath';
import type { BountyState } from './bounties';

interface RequestWorld {
  playTime: number;
  gear: { teeth: number; bounties: BountyState; requestsMet: string[] };
  beasts: { team: TeamBeast[] };
  huntPinned: string | null;
  port: { id: string } | null;
}

const epochOf = (g: RequestWorld): number => Math.floor(g.playTime / BEAST_REQUESTS.refreshSeconds);
const metKey = (port: string, epoch: number, id: string): string => `${port}:${epoch}:${id}`;

/** The beasts a harbour asks for now: picked among the next ones of your path (common and rare). */
export function requestsAt(g: RequestWorld, port: string): BountyDef[] {
  const epoch = epochOf(g);
  const near = (kind: 'comune' | 'rara'): BountyDef[] => {
    const path = bountyPath(kind);
    // how far along: the bounties closed and the beasts beaten (not the ones you own: taming the beast asked for
    // must not change the list)
    const s = g.gear.bounties;
    const reached = path.filter((b) => s.done.includes(b.id) || s.beaten.includes(b.id)).length;
    return path.slice(0, Math.min(path.length, reached + BEAST_REQUESTS.ahead));
  };
  const pool = [...near('comune'), ...near('rara')];
  const seed = [...port].reduce((a, c) => a + c.charCodeAt(0), 0);
  const ranked = pool
    // ranked by the beast itself, not its place in the pool: a pool grown by one keeps the same order
    .map((b) => ({
      b,
      r: hash2(seed + epoch * 7.3, [...b.id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) % 9973),
    }))
    .sort((p, q) => p.r - q.r)
    .map((p) => p.b)
    .filter((b) => !g.gear.requestsMet.includes(metKey(port, epoch, b.id)));
  return ranked.slice(0, BEAST_REQUESTS.count);
}

/** The request a beast of yours would meet at this harbour now, if any. */
export const requestFor = (g: RequestWorld, b: TeamBeast): BountyDef | undefined =>
  g.port && !b.form.final && !b.form.unique
    ? requestsAt(g, g.port.id).find((r) => r.id === formKey(b.form))
    : undefined;

/** What the harbour pays for it now: double if it asks for it. */
export const priceAt = (g: RequestWorld, b: TeamBeast): number =>
  Math.round(beastPrice(b) * (requestFor(g, b) ? BEAST_REQUESTS.priceMult : 1));

/** Sells it at this harbour: double for a request (met: the next one takes its place). Returns the teeth. */
export function sellAtPort(g: RequestWorld, uid: string): number {
  const b = g.beasts.team.find((x) => x.uid === uid);
  if (!b || !g.port || cannotSell(g.beasts.team, b)) return 0;
  const req = requestFor(g, b);
  const teeth = priceAt(g, b);
  g.beasts.team.splice(g.beasts.team.indexOf(b), 1);
  g.gear.teeth += teeth;
  if (req) {
    const epoch = epochOf(g);
    // only this epoch's are worth keeping
    g.gear.requestsMet = [
      ...g.gear.requestsMet.filter((k) => Number(k.split(':')[1]) >= epoch),
      metKey(g.port.id, epoch, req.id),
    ];
  }
  return teeth;
}

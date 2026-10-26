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

export interface RequestWorld {
  playTime: number;
  gear: { teeth: number; bounties: BountyState; requestsMet: string[] };
  beasts: { team: TeamBeast[] };
  huntPinned: string | null;
  port: { id: string } | null;
}

export const epochOf = (g: RequestWorld): number => Math.floor(g.playTime / BEAST_REQUESTS.refreshSeconds);
const metKey = (port: string, epoch: number, id: string): string => `${port}:${epoch}:${id}`;

/** A beast a harbour asks for, and how many times its plain price it pays. */
export interface BeastRequest extends BountyDef {
  mult: number;
}

/** A number of its own for each beast (its place in the pool never moves the order). */
export const idHash = (id: string): number => [...id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) % 9973;
export const portSeed = (port: string): number => [...port].reduce((a, c) => a + c.charCodeAt(0), 0);

/** The next ones of a kind of your path (the ones closed or beaten, and a few beyond), shuffled by harbour and time. */
export function nearPath(
  g: RequestWorld,
  kind: 'comune' | 'rara',
  port: string,
  epoch: number,
  salt: number,
  ahead: number = BEAST_REQUESTS.ahead,
): BountyDef[] {
  const path = bountyPath(kind);
  // how far along: the bounties closed and the beasts beaten (not the ones you own: taming the beast asked for must
  // not change the list)
  const s = g.gear.bounties;
  const reached = path.filter((b) => s.done.includes(b.id) || s.beaten.includes(b.id)).length;
  return path
    .slice(0, Math.min(path.length, reached + ahead))
    .map((b) => ({ b, r: hash2(portSeed(port) + epoch * 7.3 + salt, idHash(b.id)) }))
    .sort((p, q) => p.r - q.r)
    .map((p) => p.b);
}

/** The beasts a harbour asks for now: almost always common ones (BEAST_REQUESTS.rareChance), each with its price. */
export function requestsAt(g: RequestWorld, port: string): BeastRequest[] {
  const epoch = epochOf(g);
  const R = BEAST_REQUESTS;
  const met = (b: BountyDef): boolean => g.gear.requestsMet.includes(metKey(port, epoch, b.id));
  const pools = { comune: nearPath(g, 'comune', port, epoch, 0), rara: nearPath(g, 'rara', port, epoch, 0) };
  const out: BeastRequest[] = [];
  const taken = new Set<string>();
  for (let slot = 0; out.length < R.count && slot < R.count * 4; slot++) {
    const rare = hash2(portSeed(port) + slot * 3.1, epoch + 0.5) < R.rareChance;
    const next = (rare ? pools.rara : pools.comune).find((b) => !taken.has(b.id) && !met(b));
    if (!next) continue;
    taken.add(next.id);
    // a price of its own between the two ends, in steps (×2, ×2,25 … ×3)
    const steps = Math.round((R.priceMult[1] - R.priceMult[0]) / R.multStep);
    const k = Math.floor(hash2(idHash(next.id), epoch * 1.7 + portSeed(port)) * (steps + 1));
    out.push({ ...next, mult: R.priceMult[0] + Math.min(steps, k) * R.multStep });
  }
  return out;
}

/** The request a beast of yours would meet at this harbour now, if any. */
export const requestFor = (g: RequestWorld, b: TeamBeast): BeastRequest | undefined =>
  g.port && !b.form.final && !b.form.unique
    ? requestsAt(g, g.port.id).find((r) => r.id === formKey(b.form))
    : undefined;

/** What the harbour pays for it now: two to three times more if it asks for it. */
export const priceAt = (g: RequestWorld, b: TeamBeast): number =>
  Math.round(beastPrice(b) * (requestFor(g, b)?.mult ?? 1));

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

// The special powers of some species (data/powers.ts; owner, 21-22 ottobre 2026): the octopus opens the crusted
// chests, the otter gathers more from wrecks, the beluga's echo reaches farther, the
// hammerhead feels the buried chests, the sunfish, seals and walrus give you air. A power works with the beast at your
// side in the pack, or under you when it carries you. Pure logic.
import { SPECIAL_POWER_OF, SPECIAL_POWERS, type SpecialPower } from '../data/powers';
import { WRECK_REACH } from '../data/economy';
import { packMembers, type BeastWorld } from './beastState';
import type { TeamBeast } from './beasts/team';
import type { Wreck } from './economy/places';
import type { GameEvent } from './events';

const P = SPECIAL_POWERS;

export const powerOf = (b: TeamBeast): SpecialPower | undefined => SPECIAL_POWER_OF[b.form.speciesId];

/** The strongest beast with this power at your side or under you: its level and where it is; null if none. */
export function powerHolder(
  g: BeastWorld,
  power: SpecialPower,
): { b: TeamBeast; x: number; y: number } | null {
  const near: { b: TeamBeast; x: number; y: number }[] = packMembers(g)
    .filter(({ m }) => m.state === 'follow')
    .map(({ m, b }) => ({ b, x: m.x, y: m.y }));
  const m = g.beasts.mount;
  const ridden = g.beasts.riding && m ? g.beasts.team.find((b) => b.uid === m.uid) : undefined;
  if (m && ridden) near.push({ b: ridden, x: m.x, y: m.y });
  const have = near.filter((n) => powerOf(n.b) === power);
  return have.sort((a, c) => c.b.level - a.b.level)[0] ?? null;
}

/** A buried chest shows (and opens) only within reach of a hammerhead. */
export function wreckShown(g: BeastWorld, w: Wreck): boolean {
  if (w.def.kind !== 'buried') return true;
  const h = powerHolder(g, 'revealsBuried');
  if (!h) return false;
  const r = P.revealsBuried.radius + P.revealsBuried.perLevel * h.b.level;
  return Math.hypot(w.x - h.x, w.y - h.y) < r;
}

/** A crusted chest opens only with an octopus at your side. */
export const canOpen = (g: BeastWorld, w: Wreck): boolean =>
  w.def.kind !== 'locked' || powerHolder(g, 'opensLocked') !== null;

/** How far you open wrecks from: farther with the otter. */
export const wreckReach = (g: BeastWorld): number =>
  WRECK_REACH * (powerHolder(g, 'scavenger') ? P.scavenger.reachMult : 1);

/** The otter's share of more teeth from a chest (0 without it). */
export function scavengerBonus(g: BeastWorld): number {
  const o = powerHolder(g, 'scavenger');
  return o ? P.scavenger.teethBonus + P.scavenger.perLevel * o.b.level : 0;
}

/** The echo's reach and rhythm: farther and more often with a beluga (null: none of its own). */
export function longEcho(g: BeastWorld): { reachMult: number; seconds: number } | null {
  return powerHolder(g, 'longEcho') ? { reachMult: P.longEcho.reachMult, seconds: P.longEcho.seconds } : null;
}

/** Still beside a sunfish, a seal or the walrus, your air comes back (the first time it says so). */
export function stepAirStation(
  g: BeastWorld & { timers: { airTold?: number } },
  inVehicle: boolean,
  dt: number,
  events: GameEvent[],
): void {
  const d = g.diver;
  if (inVehicle || d.dead || d.o2 >= d.maxO2) return;
  const A = P.airStation;
  const s = powerHolder(g, 'airStation');
  if (!s || Math.hypot(d.vx, d.vy) > A.stillBelow || Math.hypot(s.x - d.x, s.y - d.y) > A.radius) return;
  d.o2 = Math.min(d.maxO2, d.o2 + (A.perSecond + A.perLevel * s.b.level) * dt);
  // its bubbles rise between you
  if (g.rng() < dt * A.bubblesPerSecond)
    events.push({ type: 'bubble', x: (s.x + d.x) / 2, y: (s.y + d.y) / 2 });
  g.timers.airTold = (g.timers.airTold ?? 0) - dt;
  if (g.timers.airTold <= 0) {
    g.timers.airTold = A.toldEvery;
    events.push({ type: 'airGiven', x: s.x, y: s.y, speciesId: s.b.form.speciesId });
  }
}

/** The hammerhead feels a buried chest: it says so once each time one comes within its reach. */
export function stepBuried(
  g: BeastWorld & { timers: { buried?: string } },
  wrecks: readonly Wreck[],
  opened: readonly string[],
  events: GameEvent[],
): void {
  const w = wrecks.find((x) => x.def.kind === 'buried' && !opened.includes(x.def.id) && wreckShown(g, x));
  if (w && w.def.id !== g.timers.buried) events.push({ type: 'buriedFound', x: w.x, y: w.y });
  g.timers.buried = w?.def.id ?? '';
}

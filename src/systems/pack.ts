// The pack (owner, 21 ottobre 2026, docs/PROPOSTA-RUOLI.md): besides the beast you ride, up to PACK.size companions
// swim with you. They hunt the fish you can see (never out of the picture), the small wild beasts go round them, and
// each has its type's power: Caccia (it hunts farther and faster), Guscio (the pressure hurts you deeper down),
// Scarica (it scares bigger beasts and nobody takes you by surprise), Eco (it shows the beasts hidden in the dark),
// Lanterna (a light round you). Numbers in data/beasts.ts PACK. Pure logic.
import { PACK } from '../data/beasts';
import type { TypeId } from '../data/rules';
import { onScreen, packMembers, type BeastWorld } from './beastState';
import { callMount, leftView, sendAway, stepMount, type Mount } from './beasts/mount';
import { formLengthUnits, speciesOf } from './beasts/forms';
import { isInWater, type WildBeast } from './beasts/wildState';
import type { TeamBeast } from './beasts/team';
import type { GameEvent } from './events';
import { beastEats } from './feeding';
import type { Fish, FishState } from './fish';

const typeOf = (b: TeamBeast): TypeId | 'variabile' => speciesOf(b.form).type;
const has = (g: BeastWorld, t: TypeId): TeamBeast[] =>
  packMembers(g)
    .filter(({ m, b }) => m.state === 'follow' && typeOf(b) === t)
    .map(({ b }) => b);

/** A companion joins the pack: with the pack full, the one called longest ago swims off. */
export function joinPack(g: BeastWorld, b: TeamBeast): void {
  const staying = g.beasts.pack.filter((m) => m.state !== 'leaving');
  if (staying.length >= PACK.size) sendAway(staying[0]!, g.diver.x);
  const taken = new Set(g.beasts.pack.filter((m) => m.state !== 'leaving').map((m) => m.slot ?? 0));
  const m = callMount(b, g.diver, g.map, false, g.beasts.view);
  m.slot = taken.has(0) ? 1 : 0;
  m.feed = 0;
  g.beasts.pack.push(m);
}

/** Each step: the companions swim to you, with you, or away (the ones gone are dropped). */
export function stepPackSwim(g: BeastWorld, dt: number): void {
  // riding, they keep clear of the beast that carries you, one on each side
  const around = g.beasts.riding && g.beasts.mount ? g.beasts.mount.length * 0.5 : 0;
  const d = g.diver;
  for (const m of g.beasts.pack) {
    const b = g.beasts.team.find((x) => x.uid === m.uid);
    if (b && m.state !== 'leaving') m.length = formLengthUnits(b.form, b.level); // it grows while it is out
    // never out of the water after you (floating, or up on your ship's deck): just under the surface
    const under = { ...d, y: Math.max(d.y, g.map.surfaceY + m.length * 0.5) };
    if (stepMount(m, under, dt, g.map, around) && m.state === 'in') m.state = 'follow';
  }
  g.beasts.pack = g.beasts.pack.filter((m) => !leftView(m, g.beasts.view) && teamHas(g, m.uid));
}

const teamHas = (g: BeastWorld, uid: string): boolean => g.beasts.team.some((b) => b.uid === uid && !b.ko);

/**
 * The companions hunt: each goes for the nearest fish on screen within its reach of you (a Predatore farther), and
 * bites when it gets there. Returns what each one ate (game.ts puts it in the bag or feeds it).
 */
export function huntWithPack(
  g: BeastWorld,
  fish: FishState,
  dt: number,
  events: GameEvent[],
): { b: TeamBeast; m: Mount; eaten: Fish[] }[] {
  const out: { b: TeamBeast; m: Mount; eaten: Fish[] }[] = [];
  const d = g.diver;
  // where the others are already going: each goes for a fish of its own, not on top of the other (owner's photo)
  const claimed: { x: number; y: number; r: number }[] = [];
  for (const { m, b } of packMembers(g)) {
    if (m.state !== 'follow') continue;
    const hunter = typeOf(b) === 'predatore';
    const reach = PACK.huntReach * (hunter ? PACK.hunterReachMult : 1);
    let best: Fish | null = null;
    let bestD = Infinity;
    for (const f of fish.fish) {
      if (!f.alive || f.hooked || !onScreen(g.beasts.view, f.x, f.y, 0)) continue;
      if (Math.hypot(f.x - d.x, f.y - d.y) > reach) continue;
      if (claimed.some((c) => Math.hypot(f.x - c.x, f.y - c.y) < c.r)) continue;
      const dist = Math.hypot(f.x - m.x, f.y - m.y);
      if (dist < bestD) [best, bestD] = [f, dist];
    }
    m.target = best ? { x: best.x, y: best.y } : null;
    if (best) claimed.push({ x: best.x, y: best.y, r: m.length * PACK.huntSpacing });
    const timer = { feed: m.feed ?? 0 };
    const eaten = beastEats(m, b, fish, timer, dt);
    m.feed = eaten.length ? PACK.eatInterval / (hunter ? PACK.hunterBiteMult : 1) : timer.feed;
    if (eaten.length) {
      out.push({ b, m, eaten });
      // its power at work: a puff of its type's colour beside it
      if (hunter) events.push({ type: 'packPower', x: m.x, y: m.y, power: 'predatore' });
    }
  }
  return out;
}

/** Does the pack make this wild beast go round it (small, of a lower level; a Tempesta scares bigger ones)? */
export function scaredOfPack(g: BeastWorld, w: WildBeast): boolean {
  if (w.boss) return false;
  return packMembers(g).some(({ m, b }) => {
    if (m.state !== 'follow' || b.level <= w.level) return false;
    const share = typeOf(b) === 'tempesta' ? PACK.stormScareShare : PACK.scareShare;
    return w.length < m.length * share;
  });
}

/** With a Tempesta in the pack nobody takes you by surprise. */
export const noSurprise = (g: BeastWorld): boolean => has(g, 'tempesta').length > 0;

/** How much deeper the pressure starts with a Corazzato in the pack (metres; the best of them). */
export const shellDepthM = (g: BeastWorld): number =>
  Math.max(0, ...has(g, 'corazzato').map((b) => PACK.shellDepthM + PACK.shellDepthPerLevel * b.level));

/** The light round you with an Abissale in the pack (units; 0: none). */
export const lanternRadius = (g: BeastWorld): number =>
  Math.max(0, ...has(g, 'abissale').map((b) => PACK.lanternRadius + PACK.lanternPerLevel * b.level));

/** With a Glaciale in the pack, every PACK.echoSeconds an echo shows the wild beasts near you. */
export function stepPackEcho(
  g: BeastWorld & { timers: { packEcho?: number } },
  dt: number,
  events: GameEvent[],
): void {
  const glacial = packMembers(g).find(({ m, b }) => m.state === 'follow' && typeOf(b) === 'glaciale');
  if (!glacial) return;
  const t = (g.timers.packEcho ?? 0) - dt;
  if (t > 0) {
    g.timers.packEcho = t;
    return;
  }
  g.timers.packEcho = PACK.echoSeconds;
  const d = g.diver;
  const found = g.beasts.wilds
    .filter((w) => isInWater(w) && Math.hypot(w.x - d.x, w.y - d.y) < PACK.echoReach)
    .map((w) => ({ x: w.x, y: w.y, r: w.length / 2 }));
  events.push({ type: 'packEcho', x: glacial.m.x, y: glacial.m.y, found });
  events.push({ type: 'packPower', x: glacial.m.x, y: glacial.m.y, power: 'glaciale' });
}

/**
 * Aboard (owner, 22 ottobre: "quando salgo in nave… il compagno rimane in acqua e mi segue?" — his choice: it follows,
 * then goes): on a ship or a boat going slower than PACK.followShipBelow the pack swims alongside it; faster, in a
 * diving U-boat or in the submarine, it swims off the screen and back to the team.
 */
export function packAboard(g: BeastWorld, vessel: { speed: number; under: boolean } | null): void {
  if (!vessel || (!vessel.under && vessel.speed < PACK.followShipBelow)) return;
  for (const m of g.beasts.pack) if (m.state !== 'leaving') sendAway(m, g.diver.x);
}

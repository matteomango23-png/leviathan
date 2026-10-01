// Everything about beasts during a game step in the open sea: wild beasts and encounters, calling a mount
// from the team bar and riding it, its ability, the sardine swarm, sanctuaries. Called by stepGame (game.ts).
// Fights are turn-based battles (systems/battle), opened by the World scene when a battle is requested.
import { TEAM_RULES } from '../data/beasts';
import { canBreakBones, useBreakBones } from './abilities';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { formStats, speciesOf } from './beasts/forms';
import { callMount, stepMount } from './beasts/mount';
import { teamMembers, type TeamBeast } from './beasts/team';
import { stepWildSpawns } from './encounters';
import { activeBeast, dismount, type BeastWorld } from './beastState';
import { stepSanctuaries } from './sanctuary';

export { activeBeast, createBeasts } from './beastState';
export type { BeastState, BeastWorld } from './beastState';
export { weaponHitsBeast } from './encounters';

export type ContextAction = 'sfonda' | 'scendi' | null;

/** What the beast part of the context button does right now. */
export function contextAction(g: BeastWorld): ContextAction {
  if (g.diver.dead || g.beasts.battle) return null;
  if (canBreakBones(g)) return 'sfonda';
  if (g.beasts.riding) return 'scendi';
  return null;
}

/** Speed of the beast you ride (u/s), or undefined on foot. */
export function mountSpeed(g: BeastWorld): number | undefined {
  const b = activeBeast(g);
  return g.beasts.riding && b ? formStats(b.form, b.level).speed * TEAM_RULES.rideSpeedMult : undefined;
}

/** Only mounts (GDD "cavalcatura") can be ridden, and not while worn out. */
export const canRide = (b: TeamBeast): boolean => !b.ko && speciesOf(b.form).role === 'cavalcatura';

/** A tap on a team slot: call that mount to ride it, or climb down if you are on it. */
function callFromTeam(g: BeastWorld, slot: number, events: GameEvent[]): void {
  const b = teamMembers(g.beasts.team)[slot];
  if (!b || g.diver.dead) return;
  const m = g.beasts.mount;
  if (m && m.uid === b.uid && m.state !== 'leaving') {
    dismount(g, events);
    return;
  }
  if (!canRide(b)) {
    events.push({ type: 'cannotRide', uid: b.uid, ko: b.ko });
    return;
  }
  if (m) {
    dismount(g, events);
    g.beasts.mount = null;
  }
  g.beasts.mount = callMount(b, g.diver, g.map);
  events.push({ type: 'summoned', uid: b.uid });
}

/** Runs the context action if it belongs to beasts. Returns true if it did something. */
export function beastAction(g: BeastWorld, events: GameEvent[]): boolean {
  const act = contextAction(g);
  if (act === 'sfonda') useBreakBones(g, events);
  else if (act === 'scendi') dismount(g, events);
  else return false;
  return true;
}

/** One step of all beast-related play in the open sea (the context action is handled by game.ts first). */
export function stepBeasts(g: BeastWorld, input: InputState, dt: number, events: GameEvent[]): void {
  const bs = g.beasts;
  const d = g.diver;
  if (d.dead) dismount(g, events);
  if (input.summon >= 0) callFromTeam(g, input.summon, events);
  if (bs.decoy) {
    bs.decoy.t -= dt;
    if (bs.decoy.t <= 0 || d.dead) bs.decoy = null;
  }
  stepWildSpawns(g, dt, events);
  const m = bs.mount;
  if (m) {
    const reached = stepMount(m, d, dt);
    if (reached && m.state === 'in') {
      m.state = 'ride';
      bs.riding = true;
      events.push({ type: 'mounted' });
    }
    if (m.state === 'leaving' && m.t <= 0) bs.mount = null;
  }
  g.sanctuaries.healing = stepSanctuaries(g.sanctuaries, d, bs.team, dt, events);
}

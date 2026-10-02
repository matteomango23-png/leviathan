// Everything about beasts during a game step in the open sea: wild beasts and encounters, calling a mount
// from the team bar and riding it, its ability, the sardine swarm, sanctuaries. Called by stepGame (game.ts).
// Fights are turn-based battles (systems/battle), opened by the World scene when a battle is requested.
import { TEAM_RULES } from '../data/beasts';
import { canBreakBones, stepBoneHint, useBreakBones } from './abilities';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { formLengthUnits, formStats, speciesOf } from './beasts/forms';
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
  if (!g.beasts.riding || !b) return undefined;
  return formStats(b.form, b.level).speed * TEAM_RULES.rideSpeedMult * (speciesOf(b.form).rideSpeedMult ?? 1);
}

/** Mounts (GDD "cavalcatura") and the second stages that can carry you; not while worn out. */
export const canRide = (b: TeamBeast): boolean => {
  const sp = speciesOf(b.form);
  return !b.ko && (sp.role === 'cavalcatura' || sp.rideSpeedMult !== undefined);
};

/** A tap on a team slot: call that beast (to ride it, or to swim with you), or send it away if it is out. */
function callFromTeam(g: BeastWorld, slot: number, events: GameEvent[]): void {
  const b = teamMembers(g.beasts.team)[slot];
  if (!b || g.diver.dead) return;
  const m = g.beasts.mount;
  if (m && m.uid === b.uid && m.state !== 'leaving') {
    dismount(g, events);
    return;
  }
  if (b.ko) {
    events.push({ type: 'cannotRide', uid: b.uid, ko: true });
    return;
  }
  if (m) {
    dismount(g, events);
    g.beasts.mount = null;
  }
  g.beasts.mount = callMount(b, g.diver, g.map, canRide(b));
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
  stepBoneHint(g, dt, events);
  const m = bs.mount;
  if (m) {
    // it grows (levels, evolutions) while it is out
    const b = activeBeast(g);
    if (b && m.state !== 'leaving') m.length = formLengthUnits(b.form, b.level);
    const reached = stepMount(m, d, dt);
    if (reached && m.state === 'in' && m.rider) {
      m.state = 'ride';
      bs.riding = true;
      events.push({ type: 'mounted' });
    } else if (reached && m.state === 'in') m.state = 'follow';
    if (m.state === 'leaving' && m.t <= 0) bs.mount = null;
  }
  g.sanctuaries.healing = stepSanctuaries(g.sanctuaries, d, bs.team, dt, events);
}

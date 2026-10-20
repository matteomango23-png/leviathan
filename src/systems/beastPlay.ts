// Everything about beasts during a game step in the open sea: wild beasts and encounters, calling a mount
// from the team bar and riding it, its ability, the sardine swarm. Called by stepGame (game.ts).
// Fights are turn-based battles (systems/battle), opened by the World scene when a battle is requested.
import { RIDE_BREACH, RIDE_KMH, RIDE_REF_KMH, RIDEABLE_FORMS, TEAM_RULES } from '../data/beasts';
import { canBreakBones, stepBoneHint, useBreakBones } from './abilities';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { speciesById, swimSpeedOf } from '../data/species';
import { DIVER } from '../data/diver';
import { formKey, formLengthUnits, speciesOf } from './beasts/forms';
import { callMount, stepMount } from './beasts/mount';
import { maxHpOf, teamMembers, type TeamBeast } from './beasts/team';
import { stepSenses, stepWildSpawns } from './encounters';
import { activeBeast, dismount, type BeastWorld } from './beastState';

export { activeBeast, createBeasts } from './beastState';
export type { BeastState, BeastWorld } from './beastState';
export { weaponHitsBeast } from './encounters';

type ContextAction = 'sfonda' | 'scendi' | null;

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
  const sp = speciesOf(b.form);
  // its real speed (data/beasts.ts RIDE_KMH), softened, measured against the white shark's; else by its role and size
  const kmh = RIDE_KMH[sp.id];
  const ref = swimSpeedOf(speciesById('squalo_bianco')!);
  const base =
    kmh !== undefined
      ? ref * Math.sqrt(kmh / RIDE_REF_KMH) * (b.form.variant === 'albino' ? 1.1 : 1)
      : swimSpeedOf(sp, b.form.variant);
  const mult = kmh !== undefined ? 1 : (sp.rideSpeedMult ?? 1);
  // never slower than swimming yourself
  return Math.max(DIVER.maxSpeed * 1.1, base * TEAM_RULES.rideSpeedMult * mult);
}

/** Mounts (GDD "cavalcatura"), the second stages that can carry you and the forms big enough to (RIDEABLE_FORMS:
 *  the Varano d'osso, the armoured swordfish, the prehistoric turtle); not while worn out. */
export const canRide = (b: TeamBeast): boolean => {
  const sp = speciesOf(b.form);
  return (
    !b.ko &&
    (sp.role === 'cavalcatura' || sp.rideSpeedMult !== undefined || RIDEABLE_FORMS.includes(formKey(b.form)))
  );
};

/** A tap on a team slot: call that beast (to ride it, or to swim with you), or send it away if it is out. */
function callFromTeam(g: BeastWorld, slot: number, events: GameEvent[]): void {
  const b = teamMembers(g.beasts.team)[slot];
  if (!b || g.diver.dead || g.beasts.aboard) return;
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
  stepSenses(g, events);
  const m = bs.mount;
  if (m) {
    // it grows (levels, evolutions) while it is out
    const b = activeBeast(g);
    if (b && m.state !== 'leaving') m.length = formLengthUnits(b.form, b.level);
    const reached = stepMount(m, d, dt, g.map);
    if (reached && m.state === 'in' && m.rider) {
      m.state = 'ride';
      bs.riding = true;
      events.push({ type: 'mounted' });
    } else if (reached && m.state === 'in') m.state = 'follow';
    if (m.state === 'leaving' && m.t <= 0) bs.mount = null;
  }
}

/** The beast you ride caught a gull in the air (breach.ts, birds.ts): a little health back (RIDE_BREACH). */
export function mountAteBird(
  g: BeastWorld & { gear: { bag: Record<string, number> }; fishCaught: Record<string, number> },
  x: number,
  y: number,
  events: GameEvent[],
): void {
  const b = activeBeast(g);
  if (!b) return;
  // its jaws snap on it, and the gull goes into the bag to sell at the market (owner, 20 ottobre)
  if (g.beasts.mount) g.beasts.mount.jaw = Math.max(g.beasts.mount.jaw, RIDE_BREACH.birdJawSeconds);
  g.gear.bag.gabbiano = (g.gear.bag.gabbiano ?? 0) + 1;
  g.fishCaught.gabbiano = (g.fishCaught.gabbiano ?? 0) + 1; // in the bestiary's catches
  const max = maxHpOf(b);
  const before = b.hp;
  b.hp = Math.min(max, b.hp + Math.ceil(max * RIDE_BREACH.birdHealShare));
  events.push({ type: 'birdEaten', x, y, healed: Math.round(b.hp - before) });
}

// Everything about beasts during a game step: wild beasts, taming, the team, the companion,
// riding with move buttons, swarms and sanctuaries. Called by stepGame (game.ts).
import { TAMING_FLOW, TEAM_RULES } from '../data/beasts';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { distanceToBody, headOf } from './beasts/combat';
import { sendAway, summonCompanion } from './beasts/companion';
import { formStats, speciesOf } from './beasts/forms';
import { attemptTaming, stepTaming } from './beasts/taming';
import { canSummon, stepTeam, teamMembers } from './beasts/team';
import { isInWater, type Rect, type WildBeast } from './beasts/wild';
import { finishTaming, startTamingWith, stepCompanionAndMoves, stepWildSpawns } from './beastFights';
import { activeBeast, dismount, recall, type BeastWorld } from './beastState';
import { stepSanctuaries } from './sanctuary';

export { activeBeast, createBeasts } from './beastState';
export type { BeastState, BeastWorld } from './beastState';
export { weaponHitsBeast } from './beastFights';

export type ContextAction = 'doma' | 'cavalca' | 'scendi' | null;

function tiredWildInReach(g: BeastWorld): WildBeast | undefined {
  const d = g.diver;
  return g.beasts.wilds.find(
    (w) =>
      isInWater(w) && w.mood === 'tired' && distanceToBody(w, d.x, d.y) < w.length * TAMING_FLOW.reachFrac,
  );
}

/** What the beast part of the context button does right now. */
export function contextAction(g: BeastWorld): ContextAction {
  const b = g.beasts;
  if (g.diver.dead || b.taming) return null;
  if (b.riding) return 'scendi';
  if (tiredWildInReach(g)) return 'doma';
  const c = b.companion;
  const mount = activeBeast(g);
  // only mounts (GDD "cavalcatura") can be ridden; companions and support beasts act by themselves
  if (
    c &&
    mount &&
    speciesOf(mount.form).role === 'cavalcatura' &&
    c.state !== 'leaving' &&
    Math.hypot(c.x - g.diver.x, c.y - g.diver.y) < TEAM_RULES.rideReach + c.length * 0.3
  )
    return 'cavalca';
  return null;
}

/** Speed of the beast you ride (u/s), or undefined on foot. */
export function mountSpeed(g: BeastWorld): number | undefined {
  const b = activeBeast(g);
  return g.beasts.riding && b ? formStats(b.form, b.level).speed * TEAM_RULES.rideSpeedMult : undefined;
}

function summon(g: BeastWorld, slot: number, events: GameEvent[]): void {
  const b = teamMembers(g.beasts.team)[slot];
  if (!b) return;
  const c = g.beasts.companion;
  if (c && c.uid === b.uid && c.state !== 'leaving') {
    recall(g, events);
    return;
  }
  if (!canSummon(b) || g.diver.dead) return;
  if (c) recall(g, events);
  g.beasts.companion = summonCompanion(b, g.diver, g.map);
  events.push({ type: 'summoned', uid: b.uid });
}

/** Runs the context action if it belongs to beasts. Returns true if it did something. */
export function beastAction(g: BeastWorld, events: GameEvent[]): boolean {
  const act = contextAction(g);
  if (act === 'scendi') dismount(g, events);
  else if (act === 'cavalca') {
    g.beasts.riding = true;
    events.push({ type: 'mounted' });
  } else if (act === 'doma') {
    const w = tiredWildInReach(g);
    if (w) startTamingWith(g, w, events);
  } else return false;
  return true;
}

function stepTamingLock(g: BeastWorld, input: InputState, dt: number, events: GameEvent[]): void {
  const bs = g.beasts;
  const t = bs.taming!;
  const w = bs.wilds.find((x) => x.id === t.beastId);
  if (!w) {
    bs.taming = null;
    return;
  }
  stepTaming(t, dt);
  // the beast thrashes while you hold on
  w.phase += dt * 9;
  w.x += Math.sin(w.phase * 0.7) * 8 * dt;
  w.y += Math.cos(w.phase * 0.5) * 6 * dt;
  const d = g.diver;
  const h = headOf(w, 0.08);
  d.x = h.x;
  d.y = h.y - w.length * 0.12;
  d.vx = 0;
  d.vy = 0;
  w.jaw = 0.2;
  if (input.tameTap || input.action) {
    const r = attemptTaming(t, g.rng);
    if (r === 'hit') events.push({ type: 'tamingHit' });
    else if (r === 'miss') events.push({ type: 'tamingMiss' });
    else finishTaming(g, w, r === 'win', events);
  }
}

function stepEffects(g: BeastWorld, dt: number): void {
  const bs = g.beasts;
  const e = bs.effects;
  e.guardTime = Math.max(0, e.guardTime - dt);
  bs.mythic = Math.max(0, bs.mythic - dt);
  if (bs.decoy) {
    bs.decoy.t -= dt;
    if (bs.decoy.t <= 0 || bs.decoy.absorb <= 0 || g.diver.dead) bs.decoy = null;
  }
}

/**
 * One step of all beast-related play (the context action is handled by game.ts first).
 * Returns true while the diver is locked in the taming minigame.
 */
export function stepBeasts(
  g: BeastWorld,
  input: InputState,
  view: Rect,
  dt: number,
  events: GameEvent[],
): boolean {
  const bs = g.beasts;
  stepTeam(bs.team, dt);
  stepEffects(g, dt);
  const d = g.diver;
  if (d.dead) {
    dismount(g, events);
    if (bs.companion && bs.companion.state !== 'leaving') sendAway(bs.companion, d.x);
    if (bs.taming) {
      const w = bs.wilds.find((x) => x.id === bs.taming!.beastId);
      if (w) w.mood = 'angry';
      bs.taming = null;
    }
  }
  if (input.summon >= 0 && !bs.taming) summon(g, input.summon, events);
  if (bs.taming) stepTamingLock(g, input, dt, events);
  stepWildSpawns(g, view, dt, events);
  stepCompanionAndMoves(g, input, dt, events);
  g.sanctuaries.healing = stepSanctuaries(g.sanctuaries, d, bs.team, dt, events);
  return bs.taming !== null;
}

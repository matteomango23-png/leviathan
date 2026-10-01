// The Guardian of the Baia: Lo Sfregiato waits in its lair under the floor of the bay (LAIR in
// data/guardians.ts). Going into the cave it appears and comes at you; touching it (or hitting it) starts a
// boss battle. Beaten, the first time it gives GUARDIAN_TEETH_REWARD teeth and restocks the mythic harpoon,
// then swims off until your next visit to the port. Tamed in battle, it is yours and the lair stays empty.
import { LAIR } from '../data/guardians';
import { MARKET } from '../data/economy';
import { UNIQUE_VARIANTS } from '../data/species';
import { GUARDIAN_TEETH_REWARD } from '../data/world';
import type { BeastState, BeastWorld } from './beastState';
import type { TeamBeast } from './beasts/team';
import { rollWildLevel, type BeastForm } from './beasts/forms';
import { stepRoam } from './beasts/roam';
import { createWild, isInWater, removeWild, spawnWild, type WildBeast } from './beasts/wildState';
import type { BackpackWorld } from './economy/backpack';
import { requestBattle } from './encounters';
import type { GameEvent } from './events';
import { inLairCave, inLairShaft } from './world/lair';

const BOSS_ID = 900;

export interface GuardianState {
  /** idle: not out (or already yours) · present: in the cave, coming at you */
  status: 'idle' | 'present';
  /** It is in its lair (after being beaten it comes back at your next visit to the port). */
  ready: boolean;
}

export interface GuardianWorld extends BackpackWorld {
  guardian: GuardianState;
}

const bossForm = (): BeastForm => {
  const u = UNIQUE_VARIANTS.find((v) => v.id === LAIR.guardian)!;
  return { speciesId: u.speciesId, variant: 'comune', unique: u.id };
};

/** Adds the Guardian to the wild beasts (out of the world until you enter its lair). */
export function createGuardian(beasts: BeastState): GuardianState {
  const area: [number, number, number, number] = [
    LAIR.x - LAIR.rx,
    LAIR.y - LAIR.ry,
    LAIR.x + LAIR.rx,
    LAIR.y + LAIR.ry,
  ];
  const boss = createWild(BOSS_ID, { speciesId: bossForm().speciesId, area, respawnSeconds: [0, 0] });
  boss.guardian = LAIR.guardian;
  boss.arena = true;
  beasts.wilds.push(boss);
  return { status: 'idle', ready: true };
}

const bossOf = (g: BeastWorld): WildBeast | undefined => g.beasts.wilds.find((w) => w.id === BOSS_ID);

export const teamHasGuardian = (team: TeamBeast[]): boolean =>
  team.some((b) => b.form.unique === LAIR.guardian);
/** You already tamed it: the lair stays empty. */
export const guardianOwned = (g: BeastWorld): boolean => teamHasGuardian(g.beasts.team);

function leave(g: GuardianWorld): void {
  const boss = bossOf(g);
  if (boss) removeWild(boss, 0);
  g.guardian.status = 'idle';
  g.beasts.arena = false;
}

/** One step of the lair: the Guardian appears when you come in, comes at you, goes back when you leave. */
export function stepGuardian(g: GuardianWorld, dt: number, events: GameEvent[]): void {
  const gs = g.guardian;
  const d = g.diver;
  const boss = bossOf(g)!;
  if (gs.status === 'idle') {
    if (!inLairCave(d.x, d.y, 8) || !gs.ready || d.dead || guardianOwned(g) || g.beasts.battle) return;
    const form = bossForm();
    const side = d.x < LAIR.x ? 1 : -1; // the far side of the cave
    spawnWild(
      boss,
      form,
      rollWildLevel(form, g.rng),
      LAIR.x + side * LAIR.rx * 0.6,
      LAIR.y,
      side > 0 ? -1 : 1,
    );
    boss.boss = LAIR.title;
    gs.status = 'present';
    g.beasts.arena = true;
    events.push({ type: 'guardianAppeared', id: boss.id });
    return;
  }
  if (guardianOwned(g) || !isInWater(boss)) {
    leave(g);
    return;
  }
  if (d.dead || (!inLairCave(d.x, d.y) && !inLairShaft(d.x, d.y))) {
    leave(g);
    events.push({ type: 'guardianLeft' });
    return;
  }
  if (g.beasts.battle) return;
  if (stepRoam(boss, { diver: d, map: g.map, rng: g.rng, dt, hidden: false }))
    requestBattle(g, boss, 'foe', events);
}

/** The battle with the Guardian ended with it beaten or tamed. */
export function guardianDefeated(g: GuardianWorld, caught: boolean, events: GameEvent[]): void {
  const first = !g.gear.guardians.includes(LAIR.guardian);
  if (first) {
    g.gear.guardians.push(LAIR.guardian);
    g.gear.teeth += GUARDIAN_TEETH_REWARD;
    g.gear.mythicStock = MARKET.mythicHarpoonStock; // "restocked after each Guardian"
  }
  events.push({ type: 'guardianBeaten', teeth: first ? GUARDIAN_TEETH_REWARD : 0 });
  if (!caught) g.guardian.ready = false; // it swims off, back after your next visit to the port
  leave(g);
}

/** A visit to the port: a beaten Guardian is back in its lair. */
export function guardianReturns(g: GuardianWorld): void {
  g.guardian.ready = true;
}

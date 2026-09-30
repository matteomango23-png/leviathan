// The Guardian of the Baia: Lo Sfregiato waits in its lair under the floor of the bay (LAIR in
// data/guardians.ts). Going into the cave starts the fight; below 70% of its health it bites in bursts and
// swipes with its tail, below half it calls two sharks. Exhausted, it can be tamed as its unique variant:
// the first time it also gives GUARDIAN_TEETH_REWARD teeth and restocks the mythic harpoon.
// Dying or leaving resets it; failing the taming makes it escape until your next visit to the port.
import { GUARDIAN_FIGHT as F, LAIR } from '../data/guardians';
import { MARKET } from '../data/economy';
import { UNIQUE_VARIANTS } from '../data/species';
import { GUARDIAN_TEETH_REWARD } from '../data/world';
import { resolveWildBite } from './beastFights';
import type { BeastState, BeastWorld } from './beastState';
import type { TeamBeast } from './beasts/team';
import { newArenaAi, stepArenaBeast, type ArenaAi } from './beasts/arena';
import { rollWildLevel, type BeastForm } from './beasts/forms';
import { createWild, spawnWild, type WildBeast } from './beasts/wildState';
import type { BackpackWorld } from './economy/backpack';
import type { GameEvent } from './events';
import { inLairCave, inLairShaft, lairRoofY } from './world/lair';

const BOSS_ID = 900;
const ESCORT_ID = 901;

export interface GuardianState {
  /** idle: waiting (or tamed) · fight · tired: exhausted, can be tamed · leaving: escaping through the shaft */
  status: 'idle' | 'fight' | 'tired' | 'leaving';
  /** It is in its lair (after escaping it comes back at your next visit to the port). */
  ready: boolean;
  phase: 1 | 2;
  escorted: boolean;
  ai: Record<number, ArenaAi>;
}

export interface GuardianWorld extends BackpackWorld {
  guardian: GuardianState;
}

const bossForm = (): BeastForm => {
  const u = UNIQUE_VARIANTS.find((v) => v.id === LAIR.guardian)!;
  return { speciesId: u.speciesId, variant: 'comune', unique: u.id };
};

/** Adds the Guardian and its escort to the wild beasts (out of the world until the fight). */
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
  for (let i = 0; i < F.escortCount; i++) {
    const e = createWild(ESCORT_ID + i, { speciesId: F.escortSpecies, area, respawnSeconds: [0, 0] });
    e.arena = true;
    beasts.wilds.push(e);
  }
  return { status: 'idle', ready: true, phase: 1, escorted: false, ai: {} };
}

const arenaBeasts = (g: GuardianWorld): WildBeast[] => g.beasts.wilds.filter((w) => w.arena);
const bossOf = (g: GuardianWorld): WildBeast | undefined => g.beasts.wilds.find((w) => w.id === BOSS_ID);

/** You already tamed it: the lair stays empty. */
export const teamHasGuardian = (team: TeamBeast[]): boolean =>
  team.some((b) => b.form.unique === LAIR.guardian);
export const guardianOwned = (g: BeastWorld): boolean => teamHasGuardian(g.beasts.team);

/** The Guardian while it is fighting or can be tamed (for its health bar). */
export function activeGuardian(g: GuardianWorld): WildBeast | undefined {
  const s = g.guardian.status;
  return s === 'fight' || s === 'tired' ? bossOf(g) : undefined;
}

function place(w: WildBeast, x: number, y: number, face: 1 | -1): void {
  Object.assign(w, { x, y, face, vx: face * 20, vy: 0, motion: 'cruise', mood: 'angry', angryTime: 1 });
}

function start(g: GuardianWorld, events: GameEvent[]): void {
  const boss = bossOf(g)!;
  const form = bossForm();
  spawnWild(boss, form, rollWildLevel(form, g.rng), g.rng);
  const side = g.diver.x < LAIR.x ? 1 : -1; // the far side of the cave
  place(boss, LAIR.x + side * LAIR.rx * 0.6, LAIR.y, side > 0 ? -1 : 1);
  boss.boss = LAIR.title;
  g.guardian = { ...g.guardian, status: 'fight', phase: 1, escorted: false, ai: { [BOSS_ID]: newArenaAi() } };
  g.beasts.arena = true;
  events.push({ type: 'guardianAppeared', id: boss.id });
}

function callEscort(g: GuardianWorld, events: GameEvent[]): void {
  g.guardian.escorted = true;
  const x = (LAIR.shaft.x0 + LAIR.shaft.x1) / 2;
  arenaBeasts(g)
    .filter((w) => !w.guardian)
    .forEach((e, i) => {
      spawnWild(e, { speciesId: F.escortSpecies, variant: 'comune' }, F.escortLevel, g.rng);
      place(e, x + (i ? 30 : -30), lairRoofY() + 14, i ? 1 : -1);
      g.guardian.ai[e.id] = newArenaAi();
    });
  events.push({ type: 'guardianCalls' });
}

/** Everyone out of the cave; the fight is over. */
function reset(g: GuardianWorld): void {
  for (const w of arenaBeasts(g)) {
    w.motion = 'gone';
    w.mood = 'calm';
  }
  if (g.beasts.taming && g.beasts.wilds.find((w) => w.id === g.beasts.taming!.beastId)?.arena)
    g.beasts.taming = null;
  g.guardian.status = 'idle';
  g.beasts.arena = false;
}

function flee(g: GuardianWorld, w: WildBeast): void {
  if (w.motion === 'gone') return;
  w.mood = 'fleeing';
  (g.guardian.ai[w.id] ??= newArenaAi()).fleeT = F.fleeSeconds;
}

function onBeaten(g: GuardianWorld, events: GameEvent[]): void {
  g.guardian.status = 'tired';
  for (const w of arenaBeasts(g)) if (!w.guardian) flee(g, w);
  const first = !g.gear.guardians.includes(LAIR.guardian);
  if (first) {
    g.gear.guardians.push(LAIR.guardian);
    g.gear.teeth += GUARDIAN_TEETH_REWARD;
    g.gear.mythicStock = MARKET.mythicHarpoonStock; // "restocked after each Guardian"
  }
  events.push({ type: 'guardianBeaten', teeth: first ? GUARDIAN_TEETH_REWARD : 0 });
}

/** Follows the Guardian's mood: exhausted (by any weapon or beast), recovered, or thrown off in taming. */
function followMood(g: GuardianWorld, boss: WildBeast, events: GameEvent[]): void {
  const gs = g.guardian;
  const down = boss.mood === 'tired' || boss.mood === 'taming';
  if (gs.status === 'fight' && down) onBeaten(g, events);
  else if (gs.status === 'tired' && events.some((e) => e.type === 'tamingFailed')) {
    gs.status = 'leaving';
    gs.ready = false;
    flee(g, boss);
    events.push({ type: 'guardianEscaped' });
  } else if (gs.status === 'tired' && !down) gs.status = 'fight'; // recovered before you tamed it
}

/** One step of the Guardian fight (after stepBeasts, reading this step's events). */
export function stepGuardian(g: GuardianWorld, dt: number, events: GameEvent[]): void {
  const gs = g.guardian;
  const d = g.diver;
  const inCave = inLairCave(d.x, d.y);
  if (gs.status === 'idle') {
    if (inLairCave(d.x, d.y, 8) && gs.ready && !d.dead && !guardianOwned(g)) start(g, events);
    else return;
  }
  const boss = bossOf(g)!;
  followMood(g, boss, events);
  if (guardianOwned(g) || (gs.status === 'leaving' && arenaBeasts(g).every((w) => w.motion === 'gone'))) {
    reset(g); // tamed, or it swam away
    return;
  }
  if (d.dead || (!inCave && !inLairShaft(d.x, d.y))) {
    if (gs.status === 'tired') gs.ready = false; // left it exhausted: it slips away
    if (gs.status === 'fight' || gs.status === 'tired') events.push({ type: 'guardianLeft' });
    reset(g);
    return;
  }
  if (gs.status === 'fight') {
    if (gs.phase === 1 && boss.hp < boss.maxHp * F.phase2HpFraction) {
      gs.phase = 2;
      events.push({ type: 'guardianRage' });
    }
    if (!gs.escorted && boss.hp < boss.maxHp * F.escortHpFraction) callEscort(g, events);
  }
  const bites: GameEvent[] = [];
  for (const w of arenaBeasts(g)) {
    const ai = (gs.ai[w.id] ??= newArenaAi());
    const phase = w.guardian ? gs.phase : 1;
    stepArenaBeast(w, ai, { diver: d, map: g.map, rng: g.rng, dt, phase }, bites);
  }
  for (const e of bites) {
    events.push(e);
    const w = g.beasts.wilds.find((x) => x.id === (e as { id?: number }).id);
    if (!w) continue;
    if (e.type === 'wildBite') resolveWildBite(g, w, events);
    else if (e.type === 'tailSwipe') {
      resolveWildBite(g, w, events);
      d.vx = e.dir * F.tailKnock;
      d.vy = -F.tailKnock * 0.3;
    }
  }
}

/** A visit to the port: an escaped Guardian is back in its lair. */
export function guardianReturns(g: GuardianWorld): void {
  g.guardian.ready = true;
}

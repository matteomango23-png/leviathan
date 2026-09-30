// Everything about beasts during a game step: wild beasts, taming, the team, the companion,
// riding with move buttons, and sanctuaries. Called by stepGame (game.ts).
import { BEAST_COMBAT, MOVE_RULES, TAMING_FLOW, TEAM_RULES, WILD_SPAWNS } from '../data/beasts';
import { movesOf } from '../data/moves';
import { hurtDiver, type DiverState } from './diver';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { range, type Rng } from './math';
import { distanceToBody, headOf, moveDamage } from './beasts/combat';
import { stepCompanion, sendAway, summonCompanion, type Companion } from './beasts/companion';
import { formKey, formStats, formType, rollWildForm, rollWildLevel } from './beasts/forms';
import { companionAttack, stepMoveEffects, useMove, type MoveContext } from './beasts/moves';
import { attemptTaming, startTaming, stepTaming, type TamingState } from './beasts/taming';
import {
  addTamed,
  canSummon,
  damageTeamBeast,
  isTameable,
  makeTeamBeast,
  startRecallCooldown,
  stepTeam,
  strongestLevel,
  teamMembers,
  type TeamBeast,
} from './beasts/team';
import {
  createWild,
  hitWild,
  isInWater,
  spawnWild,
  stepWild,
  type Rect,
  type WildBeast,
} from './beasts/wild';
import { stepSanctuaries, type SanctuaryState } from './sanctuary';
import type { TileMap } from './world/tileMap';

export interface BeastState {
  wilds: WildBeast[];
  team: TeamBeast[];
  companion: Companion | null;
  riding: boolean;
  taming: TamingState | null;
  nextUid: number;
}

export interface BeastWorld {
  map: TileMap;
  rng: Rng;
  diver: DiverState;
  beasts: BeastState;
  sanctuaries: SanctuaryState;
  seen: Set<string>;
  brokenTiles: number[];
}

export function createBeasts(team: TeamBeast[]): BeastState {
  const wilds = WILD_SPAWNS.map((s, i) => {
    const w = createWild(i + 1, s);
    w.respawn = 2;
    return w;
  });
  const maxUid = team.reduce((m, b) => Math.max(m, Number(b.uid.replace(/\D/g, '')) || 0), 0);
  return { wilds, team, companion: null, riding: false, taming: null, nextUid: maxUid + 1 };
}

export const activeBeast = (g: BeastWorld): TeamBeast | undefined =>
  g.beasts.companion ? g.beasts.team.find((b) => b.uid === g.beasts.companion!.uid) : undefined;

export type ContextAction = 'doma' | 'cavalca' | 'scendi' | null;

function tiredWildInReach(g: BeastWorld): WildBeast | undefined {
  const d = g.diver;
  return g.beasts.wilds.find(
    (w) =>
      isInWater(w) && w.mood === 'tired' && distanceToBody(w, d.x, d.y) < w.length * TAMING_FLOW.reachFrac,
  );
}

/** What the context button does right now (shown on the button). */
export function contextAction(g: BeastWorld): ContextAction {
  const b = g.beasts;
  if (g.diver.dead || b.taming) return null;
  if (b.riding) return 'scendi';
  if (tiredWildInReach(g)) return 'doma';
  const c = b.companion;
  if (
    c &&
    c.state !== 'leaving' &&
    Math.hypot(c.x - g.diver.x, c.y - g.diver.y) < TEAM_RULES.rideReach + c.length * 0.3
  )
    return 'cavalca';
  return null;
}

/** Speed of the beast you ride (u/s), or undefined on foot. */
export function mountSpeed(g: BeastWorld): number | undefined {
  const b = activeBeast(g);
  return g.beasts.riding && b ? formStats(b.form, b.level).speed : undefined;
}

function dismount(g: BeastWorld, events: GameEvent[]): void {
  if (!g.beasts.riding) return;
  g.beasts.riding = false;
  g.diver.y -= 10;
  g.diver.vy = -30;
  events.push({ type: 'dismounted' });
}

function recall(g: BeastWorld, events: GameEvent[]): void {
  const c = g.beasts.companion;
  if (!c || c.state === 'leaving') return;
  dismount(g, events);
  sendAway(c, g.diver.x);
  const b = activeBeast(g);
  if (b) {
    startRecallCooldown(b);
    events.push({ type: 'recalled', uid: b.uid });
  }
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

function beastKo(g: BeastWorld, b: TeamBeast, events: GameEvent[]): void {
  events.push({ type: 'beastKo', uid: b.uid });
  dismount(g, events);
  const c = g.beasts.companion;
  if (c && c.uid === b.uid) sendAway(c, g.diver.x);
}

/** A wild beast's bite lands on you — or on the beast you ride, which takes the hit (GDD). */
function resolveWildBite(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  const mount = g.beasts.riding ? activeBeast(g) : undefined;
  if (mount && !mount.ko) {
    const move = movesOf(w.form.speciesId)[0];
    if (!move) return;
    const s = formStats(mount.form, mount.level);
    const dmg = moveDamage({ type: formType(w.form), bite: w.stats.bite, defense: w.stats.defense }, move, {
      type: formType(mount.form),
      defense: s.defense,
      hp: mount.hp,
      maxHp: s.hp,
    });
    events.push({ type: 'damage', x: g.diver.x, y: g.diver.y - 10, amount: dmg, target: 'team' });
    if (g.beasts.companion) g.beasts.companion.flash = BEAST_COMBAT.hitFlashSeconds;
    if (damageTeamBeast(mount, dmg)) beastKo(g, mount, events);
    return;
  }
  const hearts =
    BEAST_COMBAT.diverBiteHearts + (w.form.variant === 'alfa' ? BEAST_COMBAT.alfaExtraHearts : 0);
  const before = g.diver.hp;
  hurtDiver(g.diver, hearts, events);
  if (g.diver.hp < before)
    events.push({
      type: 'damage',
      x: g.diver.x,
      y: g.diver.y - 8,
      amount: before - g.diver.hp,
      target: 'diver',
    });
}

function moveContext(g: BeastWorld, events: GameEvent[]): MoveContext {
  return { wilds: g.beasts.wilds, map: g.map, events, tameable: (w) => isTameable(g.beasts.team, w.form) };
}

/** Harpoon tip vs wild beasts. Returns true if it hit one. */
export function harpoonHitsBeast(
  g: BeastWorld,
  x: number,
  y: number,
  dmg: number,
  events: GameEvent[],
): boolean {
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.mood === 'taming') continue;
    if (distanceToBody(w, x, y) > 1.5) continue;
    const r = hitWild(w, dmg, isTameable(g.beasts.team, w.form));
    if (r === 'ignored') return false;
    if (r !== 'tiredHit') events.push({ type: 'damage', x, y, amount: dmg, target: 'wild' });
    if (r === 'exhausted') events.push({ type: 'wildExhausted', id: w.id });
    if (r === 'flee') events.push({ type: 'wildFled', id: w.id });
    return true;
  }
  return false;
}

function startTamingWith(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  recall(g, events);
  w.mood = 'taming';
  w.vx = 0;
  w.vy = 0;
  g.beasts.taming = startTaming(w.id, w.level, strongestLevel(g.beasts.team), g.rng);
  events.push({ type: 'tamingStarted', id: w.id });
}

function finishTaming(g: BeastWorld, w: WildBeast, won: boolean, events: GameEvent[]): void {
  g.beasts.taming = null;
  const d = g.diver;
  if (won) {
    const b = addTamed(g.beasts.team, makeTeamBeast(`b${g.beasts.nextUid++}`, { ...w.form }, w.level, true));
    g.seen.add(formKey(w.form));
    events.push({ type: 'tamed', uid: b.uid, toTeam: b.inTeam });
    w.motion = 'gone';
    w.mood = 'calm';
    w.respawn = range(g.rng, w.spawn.respawnSeconds[0], w.spawn.respawnSeconds[1]);
    if (b.inTeam) {
      const c = summonCompanion(b, d, g.map);
      Object.assign(c, { x: w.x, y: w.y, face: w.face, state: 'follow', jaw: 0 });
      g.beasts.companion = c;
      g.beasts.riding = true;
      d.x = w.x;
      d.y = w.y;
      events.push({ type: 'mounted' });
    }
    return;
  }
  w.mood = 'angry';
  w.angryTime = BEAST_COMBAT.angrySeconds;
  w.hp = Math.max(w.hp, w.maxHp * TAMING_FLOW.failHpFraction);
  w.motion = 'exit';
  w.vx = w.face * 60;
  d.x = w.x - w.face * w.length * 0.4;
  d.y = w.y - w.length * 0.2;
  d.invulnerable = 0;
  hurtDiver(d, TAMING_FLOW.failHearts, events);
  events.push({ type: 'tamingFailed' });
}

function stepWildSpawns(g: BeastWorld, view: Rect, dt: number, events: GameEvent[]): void {
  const d = g.diver;
  for (const w of g.beasts.wilds) {
    if (w.motion === 'gone') {
      w.respawn -= dt;
      const [x0, y0, x1, y1] = w.spawn.area;
      const inside = d.x > x0 && d.x < x1 && d.y > y0 && d.y < y1;
      if (w.respawn <= 0 && inside && !d.dead) {
        const form = rollWildForm(w.spawn.speciesId, g.rng);
        spawnWild(w, form, rollWildLevel(form, g.rng), g.rng);
      }
      continue;
    }
    const before = w.motion;
    stepWild(w, { diver: d, view, map: g.map, rng: g.rng, dt }, events);
    if (before !== w.motion && isInWater(w)) {
      g.seen.add(w.spawn.speciesId);
      g.seen.add(formKey(w.form));
    }
  }
  for (const e of events) {
    if (e.type !== 'wildBite') continue;
    const w = g.beasts.wilds.find((x) => x.id === e.id);
    if (w) resolveWildBite(g, w, events);
  }
}

function stepCompanionAndMoves(g: BeastWorld, input: InputState, dt: number, events: GameEvent[]): void {
  const c = g.beasts.companion;
  const b = activeBeast(g);
  if (!c || !b) return;
  const d = g.diver;
  const ctx = moveContext(g, events);
  if (g.beasts.riding && input.move > 0) {
    const r = useMove(b, c, input.move, ctx);
    if (r.ok && r.charge) {
      const s = formStats(b.form, b.level).speed * MOVE_RULES.chargeSpeedMult;
      d.vx = c.face * s;
      d.vy = 0;
      d.dashTime = MOVE_RULES.chargeSeconds;
    }
  }
  const reached = stepCompanion(c, b, {
    diver: d,
    riding: g.beasts.riding,
    wilds: g.beasts.wilds,
    map: g.map,
    dt,
  });
  if (reached) {
    companionAttack(b, c, reached, ctx);
    // trading blows: the wild beast bites back
    const move = movesOf(reached.form.speciesId)[0];
    if (move && reached.mood !== 'tired' && reached.mood !== 'fleeing') {
      const s = formStats(b.form, b.level);
      const dmg =
        moveDamage(
          { type: formType(reached.form), bite: reached.stats.bite, defense: reached.stats.defense },
          move,
          { type: formType(b.form), defense: s.defense, hp: b.hp, maxHp: s.hp },
        ) * 0.5;
      c.flash = BEAST_COMBAT.hitFlashSeconds;
      events.push({
        type: 'damage',
        x: c.x,
        y: c.y - c.length * 0.2,
        amount: Math.round(dmg * 10) / 10,
        target: 'team',
      });
      if (damageTeamBeast(b, dmg)) beastKo(g, b, events);
    }
  }
  if (c.state !== 'leaving') stepMoveEffects(b, c, ctx, dt);
  if (c.state === 'leaving' && c.t <= 0) g.beasts.companion = null;
}

/** One step of all beast-related play. Returns true while the diver is locked in the taming minigame. */
export function stepBeasts(
  g: BeastWorld,
  input: InputState,
  view: Rect,
  dt: number,
  events: GameEvent[],
): boolean {
  const bs = g.beasts;
  stepTeam(bs.team, dt);
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

  if (bs.taming) {
    const t = bs.taming;
    const w = bs.wilds.find((x) => x.id === t.beastId);
    if (!w) {
      bs.taming = null;
    } else {
      stepTaming(t, dt);
      // the beast thrashes while you hold on
      w.phase += dt * 9;
      w.x += Math.sin(w.phase * 0.7) * 8 * dt;
      w.y += Math.cos(w.phase * 0.5) * 6 * dt;
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
  } else if (input.action) {
    const act = contextAction(g);
    if (act === 'scendi') dismount(g, events);
    else if (act === 'cavalca') {
      bs.riding = true;
      events.push({ type: 'mounted' });
    } else if (act === 'doma') {
      const w = tiredWildInReach(g);
      if (w) startTamingWith(g, w, events);
    }
  }

  stepWildSpawns(g, view, dt, events);
  stepCompanionAndMoves(g, input, dt, events);
  g.sanctuaries.healing = stepSanctuaries(g.sanctuaries, d, bs.team, dt, events);
  return bs.taming !== null;
}

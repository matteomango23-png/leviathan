// Fights between you, your team and wild beasts: bites, harpoon hits, taming, spawns, the companion.
import { BEAST_COMBAT, MOVE_RULES, TAMING_FLOW, WILD_RULES } from '../data/beasts';
import { movesOf } from '../data/moves';
import { TAMING } from '../data/rules';
import { activeBeast, dismount, recall, type BeastWorld } from './beastState';
import { hurtDiver } from './diver';
import type { GameEvent } from './events';
import type { InputState } from './input';
import { range } from './math';
import { distanceToBody, moveDamage } from './beasts/combat';
import { sendAway, stepCompanion, summonCompanion } from './beasts/companion';
import { formKey, formStats, formType, rollWildForm, rollWildLevel } from './beasts/forms';
import { companionAttack, stepMoveEffects, useMove, type MoveContext } from './beasts/moves';
import { startTaming } from './beasts/taming';
import {
  addTamed,
  damageTeamBeast,
  isTameable,
  makeTeamBeast,
  strongestLevel,
  type TeamBeast,
} from './beasts/team';
import { hitWild, isInWater, spawnWild, stepWild, type Rect, type WildBeast } from './beasts/wild';

export function beastKo(g: BeastWorld, b: TeamBeast, events: GameEvent[]): void {
  events.push({ type: 'beastKo', uid: b.uid });
  dismount(g, events);
  const c = g.beasts.companion;
  if (c && c.uid === b.uid) sendAway(c, g.diver.x);
}

/** Damage to a team beast, reduced while a guard move is active. */
function hurtTeamBeast(
  g: BeastWorld,
  b: TeamBeast,
  dmg: number,
  x: number,
  y: number,
  events: GameEvent[],
): void {
  const e = g.beasts.effects;
  const amount = Math.round(dmg * (e.guardTime > 0 ? e.guardMult : 1) * 10) / 10;
  events.push({ type: 'damage', x, y, amount, target: 'team' });
  if (g.beasts.companion) g.beasts.companion.flash = BEAST_COMBAT.hitFlashSeconds;
  if (damageTeamBeast(b, amount)) beastKo(g, b, events);
}

function wildMoveDamage(w: WildBeast, target: TeamBeast): number {
  const move = movesOf(w.form.speciesId)[0];
  if (!move) return 0;
  const s = formStats(target.form, target.level);
  return moveDamage({ type: formType(w.form), bite: w.stats.bite, defense: w.stats.defense }, move, {
    type: formType(target.form),
    defense: s.defense,
    hp: target.hp,
    maxHp: s.hp,
  });
}

/** A wild beast's bite: the sardine swarm or a shield take it first, then the beast you ride, then you. */
function resolveWildBite(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  const bs = g.beasts;
  if (bs.decoy && bs.decoy.absorb > 0) {
    bs.decoy.absorb--;
    events.push({ type: 'swarmAbsorbed' });
    return;
  }
  if (bs.effects.shield > 0) {
    bs.effects.shield--;
    events.push({ type: 'shieldBlocked' });
    return;
  }
  const mount = bs.riding ? activeBeast(g) : undefined;
  if (mount && !mount.ko) {
    hurtTeamBeast(g, mount, wildMoveDamage(w, mount), g.diver.x, g.diver.y - 10, events);
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

export function moveContext(g: BeastWorld, events: GameEvent[]): MoveContext {
  return {
    wilds: g.beasts.wilds,
    map: g.map,
    events,
    rng: g.rng,
    effects: g.beasts.effects,
    tameable: (w) => isTameable(g.beasts.team, w.form),
  };
}

export function startTamingWith(g: BeastWorld, w: WildBeast, events: GameEvent[]): void {
  recall(g, events);
  w.mood = 'taming';
  w.vx = 0;
  w.vy = 0;
  g.beasts.taming = startTaming(w.id, w.level, strongestLevel(g.beasts.team), g.rng);
  events.push({ type: 'tamingStarted', id: w.id });
}

/** A weapon tip vs wild beasts. Returns true if it hit one. The mythic harpoon goes straight to taming. */
export function weaponHitsBeast(
  g: BeastWorld,
  x: number,
  y: number,
  dmg: number,
  events: GameEvent[],
): boolean {
  for (const w of g.beasts.wilds) {
    if (!isInWater(w) || w.mood === 'taming') continue;
    if (distanceToBody(w, x, y) > 1.5) continue;
    const tameable = isTameable(g.beasts.team, w.form);
    if (g.beasts.mythic > 0 && tameable && w.mood !== 'fleeing') {
      g.beasts.mythic = 0;
      w.hp = Math.min(w.hp, w.maxHp * TAMING.exhaustionThresholdFraction);
      w.mood = 'tired';
      w.tiredTime = TAMING_FLOW.tiredSeconds;
      events.push({ type: 'wildExhausted', id: w.id });
      startTamingWith(g, w, events);
      return true;
    }
    const r = hitWild(w, dmg, tameable);
    if (r === 'ignored') return false;
    if (r !== 'tiredHit') events.push({ type: 'damage', x, y, amount: dmg, target: 'wild' });
    if (r === 'exhausted') events.push({ type: 'wildExhausted', id: w.id });
    if (r === 'flee') events.push({ type: 'wildFled', id: w.id });
    return true;
  }
  return false;
}

export function finishTaming(g: BeastWorld, w: WildBeast, won: boolean, events: GameEvent[]): void {
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

/** Wild beasts come and go; at most WILD_RULES.maxPresent are around at once. */
export function stepWildSpawns(g: BeastWorld, view: Rect, dt: number, events: GameEvent[]): void {
  const d = g.diver;
  let present = g.beasts.wilds.filter((w) => w.motion !== 'gone' && w.motion !== 'away').length;
  for (const w of g.beasts.wilds) {
    if (w.motion === 'gone') {
      w.respawn -= dt;
      const [x0, y0, x1, y1] = w.spawn.area;
      const inside = d.x > x0 && d.x < x1 && d.y > y0 && d.y < y1;
      if (w.respawn <= 0 && inside && !d.dead && present < WILD_RULES.maxPresent) {
        const form = rollWildForm(w.spawn.speciesId, g.rng);
        spawnWild(w, form, rollWildLevel(form, g.rng), g.rng);
        present++;
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

export function stepCompanionAndMoves(
  g: BeastWorld,
  input: InputState,
  dt: number,
  events: GameEvent[],
): void {
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
      d.dashTime = c.charge;
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
    // trading blows: the wild beast bites back (half damage)
    if (reached.mood !== 'tired' && reached.mood !== 'fleeing' && reached.stun <= 0)
      hurtTeamBeast(g, b, wildMoveDamage(reached, b) * 0.5, c.x, c.y - c.length * 0.2, events);
  }
  if (c.state !== 'leaving') stepMoveEffects(b, c, ctx, dt);
  if (c.lunge > 0) {
    // every bite lunges a little forward
    const push = formStats(b.form, b.level).speed * MOVE_RULES.biteLunge;
    if (g.beasts.riding) {
      d.vx += Math.cos(c.pitch) * c.face * push;
      d.vy += Math.sin(c.pitch) * push;
      d.dashTime = Math.max(d.dashTime, 0.15);
    } else c.vx += c.face * push;
    c.lunge = 0;
  }
  if (c.state === 'leaving' && c.t <= 0) g.beasts.companion = null;
}

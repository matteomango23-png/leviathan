// Using moves: the three buttons while riding, and the companion's own attacks.
// fx handled (see moves.ts): 'dash' (+ 'ranged'), 'breakBone', 'executeLowHp', 'frenzy:N', 'x2vsWounded',
// 'hits:N', 'buff:attackSpeed:M:S', 'shield:diver:next', 'dmgReduce:team:M:S', 'stunChance:P:S',
// 'area:vicini' / 'area:ampia' with 'stun:S'. Other fx act as a bite in front of the head for now.
import { MOVE_RULES, STATUS_RULES } from '../../data/beasts';
import type { MoveDef } from '../../data/moves';
import { TILE } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import type { Rng } from '../math';
import type { TileMap } from '../world/tileMap';
import { headOf, moveDamage, type BodyPose } from './combat';
import type { Companion } from './companion';
import { formStats, formType } from './forms';
import { movesFor, type TeamBeast } from './team';
import { hitWild, isInWater, stunWild, type WildBeast } from './wild';

/** Team-wide effects some moves create. */
export interface MoveEffects {
  /** Hits the diver's shield will absorb. */
  shield: number;
  /** Seconds of reduced damage for the team, and the multiplier. */
  guardTime: number;
  guardMult: number;
}

export interface MoveContext {
  wilds: WildBeast[];
  map: TileMap;
  events: GameEvent[];
  rng: Rng;
  effects: MoveEffects;
  tameable: (w: WildBeast) => boolean;
}

const fxNumber = (move: MoveDef, prefix: string, index: number): number | undefined => {
  const f = move.fx.find((x) => x.startsWith(prefix));
  if (!f) return undefined;
  const n = Number(f.split(':')[index]);
  return Number.isFinite(n) ? n : undefined;
};

/** Applies one hit of a move from an attacker to a wild beast (with type and fx bonuses). */
export function strike(attacker: TeamBeast, move: MoveDef, w: WildBeast, ctx: MoveContext): void {
  const s = formStats(attacker.form, attacker.level);
  const target = { type: formType(w.form), defense: w.stats.defense, hp: w.hp, maxHp: w.maxHp };
  let dmg = moveDamage({ type: formType(attacker.form), bite: s.bite, defense: s.defense }, move, target);
  if (move.fx.includes('executeLowHp') && w.hp <= w.maxHp * MOVE_RULES.executeHpFraction)
    dmg = Math.max(dmg, w.hp);
  if (dmg > 0) {
    const result = hitWild(w, dmg, ctx.tameable(w));
    if (result === 'ignored') return;
    if (result !== 'tiredHit')
      ctx.events.push({ type: 'damage', x: w.x, y: w.y - w.length * 0.2, amount: dmg, target: 'wild' });
    if (result === 'exhausted') ctx.events.push({ type: 'wildExhausted', id: w.id });
    if (result === 'flee') ctx.events.push({ type: 'wildFled', id: w.id });
  }
  const chance = fxNumber(move, 'stunChance:', 1);
  if (chance !== undefined && ctx.rng() < chance) stunWild(w, fxNumber(move, 'stunChance:', 2) ?? 1);
}

/** Bites every wild beast within reach of the head. Returns how many were hit. */
export function biteAround(attacker: TeamBeast, pose: BodyPose, move: MoveDef, ctx: MoveContext): number {
  const h = headOf(pose);
  let n = 0;
  const hits = fxNumber(move, 'hits:', 1) ?? 1;
  for (const w of ctx.wilds) {
    if (!isInWater(w)) continue;
    const reach = pose.length * MOVE_RULES.biteReachFrac + w.length * 0.25;
    if (Math.hypot(w.x - h.x, w.y - h.y) - w.length * 0.2 < reach) {
      for (let i = 0; i < hits; i++) strike(attacker, move, w, ctx);
      n++;
    }
  }
  return n;
}

/** Breaks ancient bone tiles around a point. Returns the broken tile indices. */
export function breakBones(map: TileMap, x: number, y: number, radius: number): number[] {
  const T = map.tileSize;
  const out: number[] = [];
  for (let ty = Math.floor((y - radius) / T); ty <= Math.floor((y + radius) / T); ty++) {
    for (let tx = Math.floor((x - radius) / T); tx <= Math.floor((x + radius) / T); tx++) {
      if (map.get(tx, ty) !== TILE.bone) continue;
      if (Math.hypot(tx * T + T / 2 - x, ty * T + T / 2 - y) > radius) continue;
      map.set(tx, ty, TILE.water);
      out.push(ty * map.cols + tx);
    }
  }
  return out;
}

export type MoveResult = { ok: false } | { ok: true; charge: boolean };

/** Runs a move's effect (no cooldown checks). */
function executeMove(b: TeamBeast, c: Companion, move: MoveDef, ctx: MoveContext): MoveResult {
  c.jaw = 0.45;
  const frenzy = fxNumber(move, 'frenzy:', 1);
  if (frenzy !== undefined) {
    c.frenzy = frenzy;
    c.frenzyTick = 0;
    return { ok: true, charge: false };
  }
  if (move.fx.includes('dash')) {
    c.charge = MOVE_RULES.chargeSeconds * (move.fx.includes('ranged') ? 1.5 : 1);
    c.chargeHits = [];
    return { ok: true, charge: true };
  }
  const haste = move.fx.find((f) => f.startsWith('buff:attackSpeed:'));
  if (haste) {
    c.haste = Number(haste.split(':')[3]) || 6;
    return { ok: true, charge: false };
  }
  if (move.fx.includes('shield:diver:next')) {
    ctx.effects.shield = 1;
    return { ok: true, charge: false };
  }
  const guard = move.fx.find((f) => f.startsWith('dmgReduce:team:'));
  if (guard) {
    const [, , mult, secs] = guard.split(':');
    ctx.effects.guardMult = Number(mult) || 0.5;
    ctx.effects.guardTime = Number(secs) || 5;
    return { ok: true, charge: false };
  }
  const area = move.fx.find((f) => f.startsWith('area:'));
  if (area) {
    const radius = area === 'area:ampia' ? STATUS_RULES.areaRadius.ampia : STATUS_RULES.areaRadius.vicini;
    const stun = fxNumber(move, 'stun:', 1) ?? 0;
    for (const w of ctx.wilds) {
      if (!isInWater(w) || Math.hypot(w.x - c.x, w.y - c.y) - w.length * 0.3 > radius) continue;
      if (move.power !== 'nessuno') strike(b, move, w, ctx);
      if (stun > 0) stunWild(w, stun);
    }
    ctx.events.push({ type: 'areaPulse', x: c.x, y: c.y, radius });
    return { ok: true, charge: false };
  }
  biteAround(b, c, move, ctx);
  return { ok: true, charge: false };
}

/** Uses a move by slot (1..3) if unlocked and ready. A charge must also push the rider (caller). */
export function useMove(b: TeamBeast, c: Companion, slot: number, ctx: MoveContext): MoveResult {
  const entry = movesFor(b).find((m) => m.move.slot === slot);
  if (!entry || !entry.unlocked || b.moveCooldowns[slot - 1]! > 0 || b.ko) return { ok: false };
  b.moveCooldowns[slot - 1] = entry.move.cooldown;
  const h = headOf(c);
  ctx.events.push({ type: 'moveUsed', uid: b.uid, slot, x: h.x, y: h.y });
  return executeMove(b, c, entry.move, ctx);
}

/** Ongoing effects: frenzy bites, haste and the charge (hits each beast once, breaks bones). */
export function stepMoveEffects(b: TeamBeast, c: Companion, ctx: MoveContext, dt: number): void {
  const moves = movesFor(b);
  if (c.haste > 0) {
    c.haste -= dt;
    for (let i = 0; i < 3; i++) b.moveCooldowns[i] = Math.max(0, b.moveCooldowns[i]! - dt); // twice as fast
  }
  if (c.frenzy > 0) {
    c.frenzy -= dt;
    c.frenzyTick -= dt;
    c.jaw = Math.max(c.jaw, 0.15);
    if (c.frenzyTick <= 0) {
      c.frenzyTick = MOVE_RULES.frenzyBiteInterval;
      const m = moves.find((x) => x.move.fx.some((f) => f.startsWith('frenzy:')))?.move;
      if (m) biteAround(b, c, m, ctx);
    }
  }
  if (c.charge > 0) {
    c.charge -= dt;
    c.jaw = Math.max(c.jaw, 0.2);
    const m = moves.find((x) => x.move.fx.includes('dash'))?.move;
    if (!m) return;
    const h = headOf(c);
    for (const w of ctx.wilds) {
      if (!isInWater(w) || c.chargeHits.includes(w.id)) continue;
      if (Math.hypot(w.x - h.x, w.y - h.y) - w.length * 0.25 < c.length * MOVE_RULES.biteReachFrac) {
        c.chargeHits.push(w.id);
        strike(b, m, w, ctx);
      }
    }
    if (m.fx.includes('breakBone')) {
      const tiles = breakBones(ctx.map, h.x, h.y, MOVE_RULES.boneBreakRadius);
      if (tiles.length) ctx.events.push({ type: 'bonesBroken', tiles });
    }
  }
}

/** The companion fights on its own: the strongest ready move (support moves when you are threatened). */
export function companionAttack(b: TeamBeast, c: Companion, w: WildBeast, ctx: MoveContext): void {
  const ready = movesFor(b)
    .filter((m) => m.unlocked && b.moveCooldowns[m.move.slot - 1]! <= 0)
    .sort((a, z) => z.move.slot - a.move.slot);
  const pick = ready[0];
  if (!pick) return;
  b.moveCooldowns[pick.move.slot - 1] = pick.move.cooldown;
  const needsContact = !pick.move.fx.some(
    (f) =>
      f.startsWith('area:') ||
      f.startsWith('buff:') ||
      f.startsWith('shield') ||
      f.startsWith('dmgReduce') ||
      f.startsWith('frenzy:'),
  );
  if (needsContact && !pick.move.fx.includes('dash')) {
    const hits = fxNumber(pick.move, 'hits:', 1) ?? 1;
    for (let i = 0; i < hits; i++) strike(b, pick.move, w, ctx);
    c.jaw = 0.4;
    return;
  }
  executeMove(b, c, pick.move, ctx);
}

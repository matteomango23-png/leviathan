// Using moves: the three buttons while riding, and the companion's own attacks.
// fx handled here (moves.ts): 'dash' (charge), 'breakBone', 'executeLowHp', 'frenzy:N', 'x2vsWounded'.
// Any other move acts as a bite in front of the head (more fx arrive with the other beasts).
import { MOVE_RULES } from '../../data/beasts';
import type { MoveDef } from '../../data/moves';
import { TILE } from '../../data/worldLayout';
import type { GameEvent } from '../events';
import type { TileMap } from '../world/tileMap';
import { headOf, moveDamage, type BodyPose } from './combat';
import type { Companion } from './companion';
import { formStats, formType } from './forms';
import { movesFor, type TeamBeast } from './team';
import { hitWild, isInWater, type WildBeast } from './wild';

export interface MoveContext {
  wilds: WildBeast[];
  map: TileMap;
  events: GameEvent[];
  tameable: (w: WildBeast) => boolean;
}

/** Applies one move's damage from an attacker to a wild beast (with type and fx bonuses). */
export function strike(attacker: TeamBeast, move: MoveDef, w: WildBeast, ctx: MoveContext): void {
  const s = formStats(attacker.form, attacker.level);
  const target = { type: formType(w.form), defense: w.stats.defense, hp: w.hp, maxHp: w.maxHp };
  let dmg = moveDamage({ type: formType(attacker.form), bite: s.bite, defense: s.defense }, move, target);
  if (move.fx.includes('executeLowHp') && w.hp <= w.maxHp * MOVE_RULES.executeHpFraction)
    dmg = Math.max(dmg, w.hp);
  const result = hitWild(w, dmg, ctx.tameable(w));
  if (result === 'ignored') return;
  if (result !== 'tiredHit')
    ctx.events.push({ type: 'damage', x: w.x, y: w.y - w.length * 0.2, amount: dmg, target: 'wild' });
  if (result === 'exhausted') ctx.events.push({ type: 'wildExhausted', id: w.id });
  if (result === 'flee') ctx.events.push({ type: 'wildFled', id: w.id });
}

/** Bites every wild beast within reach of the head. Returns how many were hit. */
export function biteAround(attacker: TeamBeast, pose: BodyPose, move: MoveDef, ctx: MoveContext): number {
  const h = headOf(pose);
  let n = 0;
  for (const w of ctx.wilds) {
    if (!isInWater(w)) continue;
    const reach = pose.length * MOVE_RULES.biteReachFrac + w.length * 0.25;
    if (Math.hypot(w.x - h.x, w.y - h.y) - w.length * 0.2 < reach) {
      strike(attacker, move, w, ctx);
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

/** Uses a move by slot (1..3) if unlocked and ready. A charge must also push the rider (caller). */
export function useMove(b: TeamBeast, c: Companion, slot: number, ctx: MoveContext): MoveResult {
  const entry = movesFor(b).find((m) => m.move.slot === slot);
  if (!entry || !entry.unlocked || b.moveCooldowns[slot - 1]! > 0 || b.ko) return { ok: false };
  const move = entry.move;
  b.moveCooldowns[slot - 1] = move.cooldown;
  const h = headOf(c);
  ctx.events.push({ type: 'moveUsed', uid: b.uid, slot, x: h.x, y: h.y });
  c.jaw = 0.45;
  const frenzy = move.fx.find((f) => f.startsWith('frenzy:'));
  if (frenzy) {
    c.frenzy = Number(frenzy.split(':')[1]) || 4;
    c.frenzyTick = 0;
    return { ok: true, charge: false };
  }
  if (move.fx.includes('dash')) {
    c.charge = MOVE_RULES.chargeSeconds;
    c.chargeHits = [];
    return { ok: true, charge: true };
  }
  biteAround(b, c, move, ctx);
  return { ok: true, charge: false };
}

/** Ongoing effects: frenzy bites and the charge (hits each beast once, breaks bones). */
export function stepMoveEffects(b: TeamBeast, c: Companion, ctx: MoveContext, dt: number): void {
  const moves = movesFor(b);
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

/** The companion attacks on its own with the strongest move it has ready. */
export function companionAttack(b: TeamBeast, c: Companion, w: WildBeast, ctx: MoveContext): void {
  const ready = movesFor(b)
    .filter((m) => m.unlocked && b.moveCooldowns[m.move.slot - 1]! <= 0)
    .sort((a, z) => z.move.slot - a.move.slot);
  const pick = ready.find((m) => !m.move.fx.some((f) => f.startsWith('frenzy:'))) ?? ready[0];
  if (!pick) return;
  b.moveCooldowns[pick.move.slot - 1] = pick.move.cooldown;
  if (pick.move.fx.some((f) => f.startsWith('frenzy:'))) {
    c.frenzy = 2;
    c.frenzyTick = 0;
    return;
  }
  strike(b, pick.move, w, ctx);
}

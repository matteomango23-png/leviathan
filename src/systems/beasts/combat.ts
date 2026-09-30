// Damage and hit shapes for beasts.
// Damage of a move = attacker bite × POWER_MULT[power] × type multiplier (× bonuses) × (1 − target defence).
// The bite stat already grows 4% per level (PROGRESSION.statGrowthPerLevel), so moves grow with it.
import { BEAST_COMBAT, MOVE_RULES } from '../../data/beasts';
import { POWER_MULT, type MoveDef } from '../../data/moves';
import { counterTypeOf, typeMultiplier, type TypeId } from '../../data/rules';

export interface Fighter {
  type: TypeId | 'variabile';
  bite: number;
  defense: number;
}

export interface Target {
  type: TypeId | 'variabile';
  defense: number;
  hp: number;
  maxHp: number;
}

/** Type multiplier of a move against a target (Leviatano's 'variabile' takes the winning type). */
export function moveTypeMult(moveType: MoveDef['type'], target: Target['type']): number {
  if (target === 'variabile') return 1;
  const atk: TypeId = moveType === 'variabile' ? counterTypeOf(target) : moveType;
  return typeMultiplier(atk, target);
}

export function moveDamage(attacker: Fighter, move: MoveDef, target: Target): number {
  let dmg = attacker.bite * POWER_MULT[move.power] * moveTypeMult(move.type, target.type);
  if (move.fx.includes('x2vsWounded') && target.hp < target.maxHp * MOVE_RULES.woundedFraction) dmg *= 2;
  dmg *= 1 - target.defense;
  return Math.max(dmg > 0 ? 1 : 0, Math.round(dmg * 10) / 10);
}

/** A beast's body in the world: centre, facing, pitch and length. */
export interface BodyPose {
  x: number;
  y: number;
  face: 1 | -1;
  pitch: number;
  length: number;
}

/** Unit vector from tail to head. */
export function bodyAxis(p: BodyPose): { dx: number; dy: number } {
  return { dx: Math.cos(p.pitch) * p.face, dy: Math.sin(p.pitch) };
}

export function headOf(p: BodyPose, forward = 0.45): { x: number; y: number } {
  const a = bodyAxis(p);
  return { x: p.x + a.dx * p.length * forward, y: p.y + a.dy * p.length * forward };
}

/** Distance from a point to the body (a thick segment from tail to head). */
export function distanceToBody(p: BodyPose, x: number, y: number): number {
  const a = bodyAxis(p);
  const half = p.length * 0.45;
  const rx = x - p.x;
  const ry = y - p.y;
  const along = Math.max(-half, Math.min(half, rx * a.dx + ry * a.dy));
  const cx = p.x + a.dx * along;
  const cy = p.y + a.dy * along;
  // the body is thicker in the middle and thin at the tail
  const t = along / half; // -1 tail … 1 head
  const thickness = p.length * BEAST_COMBAT.bodyThicknessFrac * (t < 0 ? 1 + t * 0.7 : 1 - t * 0.3);
  return Math.max(0, Math.hypot(x - cx, y - cy) - thickness);
}

/** Is a point within the bite reach of the head? */
export function inBiteReach(
  p: BodyPose,
  x: number,
  y: number,
  reachFrac = BEAST_COMBAT.headRadiusFrac,
): boolean {
  const h = headOf(p);
  return Math.hypot(x - h.x, y - h.y) <= p.length * reachFrac;
}

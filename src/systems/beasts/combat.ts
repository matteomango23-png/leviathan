// Damage and hit shapes for beasts.
// Damage, like Pokémon (Gen V+): floor(floor(floor(2 × level / 5 + 2) × power × attack / defence) / 50) + 2,
// then × the modifiers (fighter.ts): same type 1.5, type ×2 / ×½, critical 1.5, random 0.85–1.
import { BEAST_BODY, MOVE_RULES } from '../../data/beasts';
import { MOVE_POWER, type MoveDef } from '../../data/moves';
import { counterTypeOf, typeMultiplier, type TypeId } from '../../data/rules';
import { PHYSICAL_TYPES } from '../../data/stats';
import type { BodyCircle } from '../world/tileMap';

/** Type multiplier of a move against a target (Leviatano's 'variabile' takes the winning type). */
export function moveTypeMult(moveType: MoveDef['type'], target: TypeId | 'variabile'): number {
  if (target === 'variabile') return 1;
  const atk: TypeId = moveType === 'variabile' ? counterTypeOf(target) : moveType;
  return typeMultiplier(atk, target);
}

/** A move's power (0 for a move that does no damage). */
export const powerOf = (move: MoveDef): number => MOVE_POWER[move.power];

/** Physical moves use Attack against Defence, the others Special Attack against Special Defence. */
export const isPhysical = (move: MoveDef): boolean => PHYSICAL_TYPES.includes(move.type);

/** The core of the Pokémon damage formula, before its modifiers. */
export function baseDamage(level: number, power: number, attack: number, defence: number): number {
  if (power <= 0) return 0;
  return (
    Math.floor(Math.floor((Math.floor((2 * level) / 5 + 2) * power * attack) / Math.max(1, defence)) / 50) + 2
  );
}

/** Below this share of health a target counts as wounded (MOVE_RULES), for 'x2vsWounded'. */
export const isWounded = (hp: number, maxHp: number): boolean => hp < maxHp * MOVE_RULES.woundedFraction;

/** A beast's body in the world: centre, facing, pitch and length. */
export interface BodyPose {
  x: number;
  y: number;
  face: 1 | -1;
  pitch: number;
  length: number;
  /** Its real outline (bodyShapes.generated.ts): how far it reaches above and below the spine, head to tail. */
  shape?: readonly (readonly [number, number])[];
}

/** Unit vector from tail to head. */
export function bodyAxis(p: BodyPose): { dx: number; dy: number } {
  return { dx: Math.cos(p.pitch) * p.face, dy: Math.sin(p.pitch) };
}

/** The body against rock: circles along the spine, as offsets from its middle (BEAST_BODY.collideAlong). */
export function bodyCircles(p: BodyPose): BodyCircle[] {
  const a = bodyAxis(p);
  const L = p.length;
  if (p.shape?.length) {
    // its real outline (owner, 4 ottobre: the bigger the beast, the more it sank into the rock): one circle at
    // each point from head to tail, as tall as the body there; the picture's middle is 45% from the head
    const n = p.shape.length;
    return p.shape.map(([top, bottom], k) => {
      const t = 0.45 - (k + 0.5) / n; // along the spine, + towards the head
      const v = ((top + bottom) / 2) * L; // the body's middle, above (−) or below the spine
      return {
        dx: a.dx * L * t - p.face * Math.sin(p.pitch) * v,
        dy: a.dy * L * t + Math.cos(p.pitch) * v,
        r: Math.max(1.5, ((bottom - top) / 2) * L * BEAST_BODY.shapeFill),
      };
    });
  }
  const r = L * BEAST_BODY.collideRadiusFrac;
  return BEAST_BODY.collideAlong.map(([t, k]) => ({
    dx: a.dx * L * t,
    dy: a.dy * L * t,
    r: Math.max(1.5, r * k),
  }));
}

/**
 * Where you sit on a beast you ride, × its length (forward from its middle, up from its spine): on top of its
 * real back at that point when its outline is known (owner, 4 ottobre: on the Piovra you floated over the tentacles).
 */
export function riderSeat(p: BodyPose, forward: number, fallbackUp: number): [number, number] {
  if (!p.shape?.length) return [forward, fallbackUp];
  const n = p.shape.length;
  const k = Math.max(0, Math.min(n - 1, Math.floor((0.45 - forward) * n)));
  return [forward, p.shape[k]![0] - 0.01];
}

/** Do two bodies touch (their circles overlap, with a little margin)? */
export function bodiesTouch(a: BodyPose, b: BodyPose, margin = 0): boolean {
  const ca = bodyCircles(a);
  const cb = bodyCircles(b);
  return ca.some((p) =>
    cb.some((q) => Math.hypot(a.x + p.dx - b.x - q.dx, a.y + p.dy - b.y - q.dy) < p.r + q.r + margin),
  );
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
  const thickness = p.length * BEAST_BODY.bodyThicknessFrac * (t < 0 ? 1 + t * 0.7 : 1 - t * 0.3);
  return Math.max(0, Math.hypot(x - cx, y - cy) - thickness);
}

/** Is a point within the bite reach of the head? */
export function inBiteReach(
  p: BodyPose,
  x: number,
  y: number,
  reachFrac = BEAST_BODY.headRadiusFrac,
): boolean {
  const h = headOf(p);
  return Math.hypot(x - h.x, y - h.y) <= p.length * reachFrac;
}

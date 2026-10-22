// Which look of the sea is where (data/seaLooks.ts; owner, 22 ottobre 2026: every region recognisable at a glance):
// the coast before the open sea, then the region's (in the Foresta e Banchisa, the kind of the stretch), two looks
// blending across a border over SEA_LOOK_BLEND. Pure logic.
import { ENDLESS } from '../data/endless';
import { SEA_LOOK_BLEND, SEA_LOOKS, SEA_SNOW, type SeaLookDef, type SeaLookId } from '../data/seaLooks';
import type { BattlePlace } from '../data/battle';
import { biomeOf, regionAt, stretchAt } from './world/stretches';

/** The look at one point, without blending. */
export function lookIdAt(x: number): SeaLookId {
  if (x < ENDLESS.startX) return 'costa';
  const r = regionAt(x).id;
  if (r === 'barriera_esterna') return 'barriera';
  if (r === 'mare_blu') return 'mareblu';
  if (r === 'banchisa') return biomeOf(stretchAt(x)).id === 'foresta' ? 'foresta' : 'banchisa';
  if (r === 'grandi_fosse') return 'fosse';
  return 'abisso';
}

export interface LookMix {
  a: SeaLookId;
  b: SeaLookId;
  /** 0: all of `a` … 1: all of `b`. */
  t: number;
}

/** The look at x, two of them blending near a border. */
export function lookAt(x: number): LookMix {
  const h = SEA_LOOK_BLEND / 2;
  const a = lookIdAt(x - h);
  const b = lookIdAt(x + h);
  if (a === b) return { a, b, t: 0 };
  // where the border is between the two ends (it changes once there)
  let lo = x - h;
  let hi = x + h;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (lookIdAt(mid) === a) lo = mid;
    else hi = mid;
  }
  const border = (lo + hi) / 2;
  const t = Math.min(1, Math.max(0, (x - (border - h)) / SEA_LOOK_BLEND));
  return { a, b, t: t * t * (3 - 2 * t) };
}

const mixN = (p: number, q: number, t: number): number => p + (q - p) * t;

/** The water's tint at a mix (each colour × this). */
export function waterTint(m: LookMix): [number, number, number] {
  const p = SEA_LOOKS[m.a].water;
  const q = SEA_LOOKS[m.b].water;
  return [mixN(p[0], q[0], m.t), mixN(p[1], q[1], m.t), mixN(p[2], q[2], m.t)];
}

/** A number of the looks at a mix (rays, snow, glow). */
export const lookNumber = (m: LookMix, pick: (d: SeaLookDef) => number): number =>
  mixN(pick(SEA_LOOKS[m.a]), pick(SEA_LOOKS[m.b]), m.t);

/** How thick the marine snow is: the look's, more with depth, 0…1 of the most there can be. */
export function snowShare(look: LookMix, depthM: number): number {
  const deeper = 1 + (SEA_SNOW.perDepth * Math.max(0, depthM)) / 100;
  return Math.min(1, (lookNumber(look, (l) => l.snow) * deeper) / SEA_SNOW.max);
}

/** The battle's background at a point: the place's own on the coast, the look where you are out in the sea. */
export function battlePlaceAt(x: number, coastPlace: BattlePlace): BattlePlace {
  const id = lookIdAt(x);
  return id === 'costa' ? coastPlace : id;
}

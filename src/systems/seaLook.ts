// Which look of the sea is where (data/seaLooks.ts; owner, 22 ottobre 2026: every region recognisable at a glance):
// the coast before the open sea, then the region's (in the Foresta e Banchisa, the kind of the stretch), two looks
// blending across a border over SEA_LOOK_BLEND. Pure logic.
import { ENDLESS } from '../data/endless';
import { DELTA } from '../data/worldLayout';
import {
  SEA_LOOK_BLEND,
  SEA_LOOK_BLEND_DELTA,
  SEA_LOOK_BLEND_STRETCH,
  SEA_LOOKS,
  SEA_SNOW,
  type SeaLookDef,
  type SeaLookId,
} from '../data/seaLooks';
import type { BattlePlace } from '../data/battle';
import { biomeOf, regionAt, stretchAt } from './world/stretches';

/** The look at one point, without blending. */
export function lookIdAt(x: number): SeaLookId {
  if (x >= DELTA.x0 && x < DELTA.x1) return 'delta';
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

const ORDER = Object.keys(SEA_LOOKS) as SeaLookId[];

/** How much of the window around x each look holds (samples across it). */
function shares(x: number, half: number, idAt: (x: number) => SeaLookId, n: number): Map<SeaLookId, number> {
  const w = new Map<SeaLookId, number>();
  for (let i = 0; i < n; i++) {
    const id = idAt(x - half + ((i + 0.5) / n) * 2 * half);
    w.set(id, (w.get(id) ?? 0) + 1 / n);
  }
  return w;
}

/** The region's look, the forest and the ice taken as one (their own shorter blend is inside it). */
const regionLook = (x: number): SeaLookId => {
  if (x < ENDLESS.startX) return 'costa'; // the Delta has its own short blend
  const id = lookIdAt(x);
  return id === 'foresta' ? 'banchisa' : id;
};

/**
 * The look at x, two of them blending near a border (owner, 24 ottobre: panoramas came and went in jumps). Each
 * look counts for the share of the window around x it holds, so the mix changes evenly however short a stretch is:
 * the regions over SEA_LOOK_BLEND, the forest and the ice of one region over SEA_LOOK_BLEND_STRETCH, the short
 * Delta over its own.
 */
export function lookAt(x: number): LookMix {
  const delta = blendAt(x, SEA_LOOK_BLEND_DELTA);
  if (delta.a === 'delta' || delta.b === 'delta') return delta;
  const w = shares(x, SEA_LOOK_BLEND / 2, regionLook, 32);
  const ice = w.get('banchisa') ?? 0;
  if (ice > 0) {
    w.delete('banchisa');
    const st = shares(x, SEA_LOOK_BLEND_STRETCH / 2, lookIdAt, 16);
    const f = st.get('foresta') ?? 0;
    const b = st.get('banchisa') ?? 0;
    const sum = f + b;
    for (const [id, part] of [
      ['foresta', sum > 0 ? f / sum : 0],
      ['banchisa', sum > 0 ? b / sum : 1],
    ] as const)
      if (part > 0) w.set(id, (w.get(id) ?? 0) + ice * part);
  }
  // the two that hold the most, in a fixed order (the views never swap them)
  const top = [...w.entries()].sort((p, q) => q[1] - p[1]).slice(0, 2);
  if (top.length < 2) return { a: top[0]![0], b: top[0]![0], t: 0 };
  const [p, q] =
    ORDER.indexOf(top[0]![0]) < ORDER.indexOf(top[1]![0]) ? [top[0]!, top[1]!] : [top[1]!, top[0]!];
  const t = q[1] / (p[1] + q[1]);
  return { a: p[0], b: q[0], t: t * t * (3 - 2 * t) };
}

/** A blend across the one border near x (the Delta's). */
function blendAt(x: number, blend: number, idAt: (x: number) => SeaLookId = lookIdAt): LookMix {
  const h = blend / 2;
  const a = idAt(x - h);
  const b = idAt(x + h);
  if (a === b) return { a, b, t: 0 };
  // where the border is between the two ends (it changes once there)
  let lo = x - h;
  let hi = x + h;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (idAt(mid) === a) lo = mid;
    else hi = mid;
  }
  const border = (lo + hi) / 2;
  const t = Math.min(1, Math.max(0, (x - (border - h)) / blend));
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
  return id === 'costa' || id === 'delta' ? coastPlace : id;
}

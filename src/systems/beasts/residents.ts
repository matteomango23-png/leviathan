// The beasts living in the endless sea (owner, 5 ottobre 2026: "the ocean must have something for a few km ahead
// and behind"). Each stretch has its residents, always the same (from the seed): a species of its kind of sea, a
// home at the depth that species lives at, a slow lap round it. They exist even when you are far: the ship's sonar
// hears them, and near you they come out for real in a wild slot (encounters.ts). Caught or beaten, the place stays
// empty for a while. Pure logic, no Phaser.
import { SPECIES_DEPTH } from '../../data/beasts';
import { ENDLESS } from '../../data/endless';
import { WORLD } from '../../data/worldLayout';
import { makeRng, range } from '../math';
import { biomeOf, endlessFloor, regionAt, stretchAt } from '../world/endless';
import { bandAt } from './forms';

const R = ENDLESS.residents;

export interface Resident {
  id: string;
  speciesId: string;
  homeX: number;
  homeY: number;
  /** Its depth band (the top and bottom of where it may swim, world y). */
  top: number;
  bottom: number;
  lap: number;
  phase: number;
  /** Where in its danger band its level falls (forms.ts rollWildLevel). */
  band: number;
}

/** Which residents are out for real (id → wild slot id), which are gone and until when; and the sea's clock. */
export interface ResidentsState {
  clock: number;
  awake: Record<string, number>;
  gone: Record<string, number>;
}

export const newResidents = (): ResidentsState => ({ clock: 0, awake: {}, gone: {} });

const cache = new Map<number, Resident[]>();

/** The residents of stretch k (none on the hand-made coast or past the end of the sea). */
export function residentsOf(k: number): Resident[] {
  const hit = cache.get(k);
  if (hit) return hit;
  const out: Resident[] = [];
  const x0 = ENDLESS.startX + k * ENDLESS.stretch;
  if (k >= 0 && x0 < ENDLESS.maxX - ENDLESS.endWall) {
    const rng = makeRng(ENDLESS.seed * 7919 + k * 104729 + 13);
    const kinds = Object.entries(biomeOf(k).beasts);
    const total = kinds.reduce((a, [, n]) => a + n, 0);
    for (let i = 0; i < R.perStretch && kinds.length; i++) {
      let r = rng() * total;
      const pick = kinds.find(([, n]) => (r -= n) <= 0) ?? kinds[kinds.length - 1]!;
      const speciesId = pick[0];
      const homeX = x0 + rng() * ENDLESS.stretch;
      const floor = endlessFloor(homeX) - 30;
      const z = SPECIES_DEPTH[speciesId];
      const top = Math.max(WORLD.surfaceY + 20, WORLD.surfaceY + (z?.minM ?? 0) * WORLD.unitsPerMetre);
      const bottom = Math.min(
        floor,
        z?.maxM !== undefined ? WORLD.surfaceY + z.maxM * WORLD.unitsPerMetre : floor,
      );
      const lap = range(rng, R.lapSeconds[0], R.lapSeconds[1]);
      const phase = rng() * Math.PI * 2;
      if (bottom <= top) continue; // the floor is too high here for it
      const homeY = top + rng() * (bottom - top);
      const depthM = (homeY - WORLD.surfaceY) / WORLD.unitsPerMetre;
      out.push({
        id: `r${k}.${i}`,
        speciesId,
        homeX,
        homeY,
        top,
        bottom,
        lap,
        phase,
        band: bandAt(regionAt(homeX).bandAt, depthM),
      });
    }
  }
  cache.set(k, out);
  return out;
}

/** Where a resident is at this time of the sea's clock: a slow lap round its home, inside its depth band. */
export function residentAt(r: Resident, clock: number): { x: number; y: number } {
  const a = (clock / r.lap) * Math.PI * 2 + r.phase;
  const y = r.homeY + Math.sin(a * 1.7 + r.phase) * R.roamY;
  return { x: r.homeX + Math.sin(a) * R.roamX, y: Math.max(r.top, Math.min(r.bottom, y)) };
}

/** The residents living (not gone) within `reach` units of x, with where they are now. */
export function residentsNear(
  s: ResidentsState,
  x: number,
  reach: number,
): { r: Resident; x: number; y: number }[] {
  const out: { r: Resident; x: number; y: number }[] = [];
  for (let k = stretchAt(x - reach - R.roamX); k <= stretchAt(x + reach + R.roamX); k++)
    for (const r of residentsOf(k)) {
      if ((s.gone[r.id] ?? -1) > s.clock) continue;
      const p = residentAt(r, s.clock);
      if (Math.abs(p.x - x) <= reach) out.push({ r, ...p });
    }
  return out;
}

/** Its waters once out for real: round its home, inside its depth band (a wild slot's `area`). */
export const residentArea = (r: Resident): [number, number, number, number] => [
  r.homeX - R.roamX - 120,
  r.top,
  r.homeX + R.roamX + 120,
  Math.max(r.top + 40, r.bottom),
];

/** Caught or beaten: its place stays empty for a while. */
export function residentGone(s: ResidentsState, id: string, rng: () => number): void {
  s.gone[id] = s.clock + range(rng, R.returnSeconds[0], R.returnSeconds[1]);
  delete s.awake[id];
}

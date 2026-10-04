// The sea map in the pause menu (owner, 2 and 4 ottobre): a tab for the hand-made coast, with its zones, and one
// for each region of the 30 km ocean (data/regions.ts), with its kinds of stretches, its outpost once found and
// the beasts that live there with their rarity and how often you meet them. Places visited are kept in the
// bestiary's "seen" list as `zona:<name>` (no change to the save file).
import { mapWeight } from './beasts/spawnDraw';
import { WILD_SPAWNS } from '../data/beasts';
import { BIOMES } from '../data/endless';
import { OUTPOSTS } from '../data/economy';
import { RARITY } from '../data/cards';
import { SEA_REGIONS } from '../data/regions';
import { SPECIES } from '../data/species';
import { WORLD, ZONES } from '../data/worldLayout';
import { outpostKey } from './economy/places';
import { zoneAt } from './world/zones';

export const zoneKey = (name: string): string => `zona:${name}`;

export interface MapBeast {
  id: string;
  /** The name, or null if you have never seen it. */
  name: string | null;
  stars: number;
  rarityName: string;
  /** Share of the encounters in this zone (0…1). */
  share: number;
}

export interface MapZone {
  name: string;
  visited: boolean;
  depth: [number, number | null];
  beasts: MapBeast[];
}

export interface MapRegion {
  name: string;
  visited: boolean;
  km: [number, number];
  note: string;
  /** Its kinds of stretches. */
  kinds: string[];
  /** Its outpost, named once found. */
  outpost: string | null;
  beasts: MapBeast[];
}

const metres = (y: number): number => Math.max(0, Math.round((y - WORLD.surfaceY) / WORLD.unitsPerMetre));

function beastsOf(weights: Map<string, number>, seen: Set<string>): MapBeast[] {
  const total = [...weights.values()].reduce((a, b) => a + b, 0) || 1;
  return [...weights.entries()]
    .map(([id, w]) => {
      const sp = SPECIES.find((s) => s.id === id)!;
      return {
        id,
        name: seen.has(id) ? sp.name : null,
        stars: sp.rarity,
        rarityName: RARITY[sp.rarity].name,
        share: w / total,
      };
    })
    .sort((a, b) => b.share - a.share);
}

/** The zones of the hand-made coast. */
export function coastMap(seen: Set<string>): MapZone[] {
  const byZone = new Map<string, Map<string, number>>();
  for (const s of WILD_SPAWNS) {
    if (s.endless || s.hunt) continue;
    const [x0, y0, x1, y1] = s.area;
    const zone = zoneAt((x0 + x1) / 2, (y0 + y1) / 2);
    const weights = byZone.get(zone) ?? new Map<string, number>();
    // the same weights as the draw of who comes (spawnDraw.ts): rarity, and how soon it comes back
    weights.set(s.speciesId, (weights.get(s.speciesId) ?? 0) + mapWeight(s));
    byZone.set(zone, weights);
  }
  return ZONES.map((z) => ({
    name: z.name,
    visited: seen.has(zoneKey(z.name)),
    depth: [metres(Math.max(WORLD.surfaceY, z.yMin)), Number.isFinite(z.yMax) ? metres(z.yMax) : null],
    beasts: beastsOf(byZone.get(z.name) ?? new Map(), seen),
  }));
}

/** The regions of the open sea: their beasts are those of their kinds of stretches, by how often each comes. */
export function regionsMap(seen: Set<string>): MapRegion[] {
  return SEA_REGIONS.map((r, i) => {
    const weights = new Map<string, number>();
    const total = Object.values(r.biomes).reduce((a, b) => a + (b ?? 0), 0) || 1;
    for (const b of BIOMES) {
      const share = (r.biomes[b.id] ?? 0) / total;
      if (!share) continue;
      const sum = Object.values(b.beasts).reduce((a, n) => a + n, 0) || 1;
      for (const [id, n] of Object.entries(b.beasts))
        weights.set(id, (weights.get(id) ?? 0) + (share * n) / sum);
    }
    const outpost = OUTPOSTS[i]!;
    return {
      name: r.name,
      visited: seen.has(zoneKey(r.name)),
      km: [r.fromKm, r.toKm],
      note: r.note,
      kinds: BIOMES.filter((b) => r.biomes[b.id]).map((b) => b.name),
      outpost: seen.has(outpostKey(outpost.id)) ? outpost.name : null,
      beasts: beastsOf(weights, seen),
    };
  });
}

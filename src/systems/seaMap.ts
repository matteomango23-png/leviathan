// The sea map in the pause menu (owner, 2 ottobre): every zone, the ones you visited, and in those the beasts
// that live there with their rarity and how often you meet them. Zones visited are kept in the bestiary's
// "seen" list as `zona:<name>` (no change to the save file).
import { WILD_SPAWNS } from '../data/beasts';
import { BIOMES } from '../data/endless';
import { RARITY } from '../data/cards';
import { SPECIES } from '../data/species';
import { WORLD, ZONES } from '../data/worldLayout';
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

const metres = (y: number): number => Math.max(0, Math.round((y - WORLD.surfaceY) / WORLD.unitsPerMetre));

export function seaMap(seen: Set<string>): MapZone[] {
  const byZone = new Map<string, Map<string, number>>();
  // the endless sea: each kind of stretch is a zone of the map, with the beasts it brings
  for (const b of BIOMES) byZone.set(b.name, new Map(Object.entries(b.beasts)));
  for (const s of WILD_SPAWNS) {
    if (s.endless) continue;
    const [x0, y0, x1, y1] = s.area;
    const zone = zoneAt((x0 + x1) / 2, (y0 + y1) / 2);
    const weights = byZone.get(zone) ?? new Map<string, number>();
    weights.set(
      s.speciesId,
      (weights.get(s.speciesId) ?? 0) + 2 / (s.respawnSeconds[0] + s.respawnSeconds[1]),
    );
    byZone.set(zone, weights);
  }
  const far = BIOMES.map((b) => ({ name: b.name, yMin: WORLD.surfaceY, yMax: Infinity }));
  return [...ZONES, ...far].map((z) => {
    const weights = byZone.get(z.name) ?? new Map<string, number>();
    const total = [...weights.values()].reduce((a, b) => a + b, 0) || 1;
    const beasts = [...weights.entries()]
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
    return {
      name: z.name,
      visited: seen.has(zoneKey(z.name)),
      depth: [metres(Math.max(WORLD.surfaceY, z.yMin)), Number.isFinite(z.yMax) ? metres(z.yMax) : null],
      beasts,
    };
  });
}

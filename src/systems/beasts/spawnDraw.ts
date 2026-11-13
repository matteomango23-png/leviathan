// Who comes when there is room in the water (owner, 4 ottobre: "you always see the same beasts"): a fair draw
// among the beasts ready to come, weighted by rarity, less for a species already around or seen a moment ago.
// The map's shares use the same weights (seaMap.ts). Numbers in WILD_RULES (data/beasts.ts).
import { WILD_RULES, type WildSpawnDef } from '../../data/beasts';
import { SPECIES } from '../../data/species';
import { NIGHT_SPECIES } from '../../data/daynight';
import { clamp, type Rng } from '../math';

/** How often a species comes, by its stars (common ones much more often). */
export function rarityWeight(speciesId: string): number {
  const stars = SPECIES.find((s) => s.id === speciesId)?.rarity ?? 1;
  return WILD_RULES.rarityWeight[stars] ?? 1;
}

/** The night's species (lot N1) come mostly by night: their weight between full day (0) and full night (1). */
export function nightWeight(speciesId: string, night: number): number {
  const n = NIGHT_SPECIES[speciesId];
  return n ? n.day + (n.night - n.day) * night : 1;
}

/** A spawn's share on the map: its rarity, and less if it takes long to come back. */
export function mapWeight(s: WildSpawnDef): number {
  const mean = (s.respawnSeconds[0] + s.respawnSeconds[1]) / 2;
  return rarityWeight(s.speciesId) * clamp(WILD_RULES.quickRespawn / mean, WILD_RULES.minAvailability, 1);
}

/**
 * Picks one of the beasts ready to come. `present`: species in the water now; `recent`: the last ones that came;
 * `lured`: species a bait calls (they come first); `night` (0 … 1): the night's species come more.
 */
export function drawSpawn<T extends { spawn: { speciesId: string } }>(
  ready: readonly T[],
  present: readonly string[],
  recent: readonly string[],
  lured: readonly string[],
  rng: Rng,
  night = 0,
): T {
  const weight = (w: T): number => {
    const id = w.spawn.speciesId;
    let k = rarityWeight(id) * nightWeight(id, night);
    if (present.includes(id)) k *= WILD_RULES.presentMult;
    if (recent.includes(id)) k *= WILD_RULES.recentMult;
    if (lured.includes(id)) k *= 20;
    return k;
  };
  const weights = ready.map(weight);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ready.length; i++) {
    r -= weights[i]!;
    if (r < 0) return ready[i]!;
  }
  return ready[ready.length - 1]!;
}

/** Remembers the species that just came (the last WILD_RULES.recentMemory). */
export function rememberSpawn(recent: string[], speciesId: string): void {
  recent.push(speciesId);
  while (recent.length > WILD_RULES.recentMemory) recent.shift();
}

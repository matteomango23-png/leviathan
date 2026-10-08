// Which beast sprites the game loads at start: every version of the beasts that live in the regions already in
// the game, the three starter lines and every evolution of all of these. The beasts of the paused story
// (storyOnly in data/species.ts) are left out.
import { WILD_SPAWNS } from '../data/beasts';
import { BIOMES } from '../data/endless';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { SPECIES, UNIQUE_VARIANTS } from '../data/species';

export function neededSpriteKeys(): string[] {
  const starterLines = SPECIES.filter((s) => s.starter || s.movesFrom).map((s) => s.id);
  const endless = BIOMES.flatMap((b) => Object.keys(b.beasts));
  const species = [...WILD_SPAWNS.map((s) => s.speciesId), ...starterLines, ...endless];
  // evolutions of a beast you can tame, and the species whose pictures they borrow
  for (let i = 0; i < species.length; i++) {
    const sp = SPECIES.find((s) => s.id === species[i]);
    for (const next of [sp?.evolvesTo, sp?.artFrom]) if (next && !species.includes(next)) species.push(next);
  }
  const uniques = UNIQUE_VARIANTS.filter((u) => !u.storyOnly && species.includes(u.speciesId)).map(
    (u) => u.id,
  );
  return SPRITE_KEYS.filter(
    (k) => uniques.includes(k) || species.some((s) => k === s || k.startsWith(`${s}_`)),
  );
}

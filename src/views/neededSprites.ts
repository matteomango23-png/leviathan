// Which beast sprites the game loads at start: every version of the beasts that live in the regions already in
// the game, the whale of the opening, the three starter lines, the Guardians (they can join your team: the
// Piovra was invisible as a companion, 4 ottobre) and every evolution of all of these.
import { WILD_SPAWNS } from '../data/beasts';
import { BIOMES } from '../data/endless';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { SPECIES, UNIQUE_VARIANTS } from '../data/species';
import { SCENES } from '../data/story';

export function neededSpriteKeys(): string[] {
  const starterLines = SPECIES.filter((s) => s.starter || s.movesFrom).map((s) => s.id);
  const endless = BIOMES.flatMap((b) => Object.keys(b.beasts));
  const guardians = SPECIES.filter((s) => s.guardian).map((s) => s.id);
  const species = [
    ...WILD_SPAWNS.map((s) => s.speciesId),
    SCENES.ship.whaleSpecies,
    ...starterLines,
    ...endless,
    ...guardians,
  ];
  // evolutions of a beast you can tame, and the species whose pictures they borrow
  for (let i = 0; i < species.length; i++) {
    const sp = SPECIES.find((s) => s.id === species[i]);
    for (const next of [sp?.evolvesTo, sp?.artFrom]) if (next && !species.includes(next)) species.push(next);
  }
  const uniques = UNIQUE_VARIANTS.filter((u) => species.includes(u.speciesId)).map((u) => u.id);
  return SPRITE_KEYS.filter(
    (k) => uniques.includes(k) || species.some((s) => k === s || k.startsWith(`${s}_`)),
  );
}

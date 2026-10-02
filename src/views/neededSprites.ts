// Which beast sprites the game loads at start: every version of the beasts that live in the regions already in
// the game, the whale of the opening, and the three starter lines (your first beast and its evolutions).
import { WILD_SPAWNS } from '../data/beasts';
import { BIOMES } from '../data/endless';
import { SPRITE_KEYS } from '../data/sprites.generated';
import { SPECIES, UNIQUE_VARIANTS } from '../data/species';
import { SCENES } from '../data/story';

export function neededSpriteKeys(): string[] {
  const starterLines = SPECIES.filter((s) => s.starter || s.movesFrom).map((s) => s.id);
  const endless = BIOMES.flatMap((b) => Object.keys(b.beasts));
  const species = [
    ...WILD_SPAWNS.map((s) => s.speciesId),
    SCENES.ship.whaleSpecies,
    ...starterLines,
    ...endless,
  ];
  const uniques = UNIQUE_VARIANTS.filter((u) => species.includes(u.speciesId)).map((u) => u.id);
  return SPRITE_KEYS.filter(
    (k) => uniques.includes(k) || species.some((s) => k === s || k.startsWith(`${s}_`)),
  );
}

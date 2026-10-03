// Leviatano — painted pieces of the world (owner's pictures, docs/PROMPT-MONDO.md): rock, coral and ice walls laid
// over the straight faces of the shafts and trenches, and icebergs floating in the cold seas. Sizes in world
// units (the diver is 12). Values marked "tuning" are a first pass: change them here, never in systems.
import { east } from './worldLayout';

/** Icebergs: their width (the height follows the picture); the waterline of the picture sits on the surface. */
export const ICEBERG_WIDTH: Record<string, number> = {
  iceberg_1: 560, // wide and massive
  iceberg_2: 170, // tall and narrow
  iceberg_3: 330, // broken in two, a tunnel between
  iceberg_4: 210, // small and round
};

/**
 * The owner's painted pier (owner, 3 ottobre), laid at each harbour instead of the drawn one: from a little behind
 * the shore out over the water; its deck (that share of the picture's height) sits just above the surface.
 */
export const PIER_ART = {
  key: 'molo_porto',
  fromShore: -12,
  width: 150,
  deckAt: 0.41,
  deckAbove: 8,
  /** Where Aurelio and you stand on its flat deck, before the ramp (units from its left edge; owner, 3 ottobre:
   *  "gli omini sono sospesi in aria"). */
  people: [82, 88] as const,
};

export interface IcebergPlace {
  id: string;
  x: number; // centre
}

/** Icebergs of the hand-made Mare di Ghiaccio (the endless Banchisa places its own, ICEBERGS_PER_STRETCH). */
export const ICEBERGS: IcebergPlace[] = [
  { id: 'iceberg_2', x: east(5420) },
  { id: 'iceberg_1', x: east(5800) },
  { id: 'iceberg_3', x: east(6130) },
];
/** How deep an iceberg may reach under the surface (units): taller pictures are drawn smaller, so there is
 *  always room to swim under them (owner: "sotto non si passa"). The sea floor there is at ~380 or deeper. */
export const ICEBERG_MAX_DRAFT = 190;
/** Around a painted iceberg the old blocky ice (ceiling, pillars) is left out, so only the picture shows. */
export const ICEBERG_CLEAR_MARGIN = 24;
export const ICEBERGS_PER_STRETCH = 2; // tuning, Banchisa stretches of the endless sea

/** Painted walls: their size, how much of them sits in the rock, and which picture goes where. */
export const WALLS = {
  width: 74, // tuning
  inRock: 0.92, // share of the width inside the rock (was 0.75: the part over the water looked solid and was not; owner)
  overlap: 0.18, // walls stacked on a long face overlap by this share of their height
  minFace: 60, // units: shorter straight faces are left as they are
  rock: ['parete_roccia_1', 'parete_roccia_2', 'parete_roccia_3'],
  coral: 'parete_corallo',
  ice: 'parete_ghiaccio',
};

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
export const ICEBERGS_PER_STRETCH = 2; // tuning, Banchisa stretches of the endless sea

/** Painted walls: their size, how much of them sits in the rock, and which picture goes where. */
export const WALLS = {
  width: 74, // tuning
  inRock: 0.75, // share of the width inside the rock (the rest covers the edge and juts a little into the water)
  overlap: 0.18, // walls stacked on a long face overlap by this share of their height
  minFace: 60, // units: shorter straight faces are left as they are
  rock: ['parete_roccia_1', 'parete_roccia_2', 'parete_roccia_3'],
  coral: 'parete_corallo',
  ice: 'parete_ghiaccio',
};

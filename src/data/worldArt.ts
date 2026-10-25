// Leviatano — painted pieces of the world (owner's pictures, docs/PROMPT-MONDO.md): rock, coral and ice walls laid
// over the straight faces of the shafts and trenches, and icebergs floating in the cold seas. Sizes in world
// units (the diver is 12). Values marked "tuning" are a first pass: change them here, never in systems.

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

/** Icebergs of the hand-made Mare di Ghiaccio (the endless Banchisa places its own, ICEBERGS_PER_STRETCH).
 *  None for now (owner, 5 ottobre: the ship must find nothing in its way east of the harbour); the pictures and
 *  the code stay, to bring them back one day: { id: 'iceberg_2', x: east(5420) }, iceberg_1 at east(5800),
 *  iceberg_3 at east(6130). */
export const ICEBERGS: IcebergPlace[] = [];
/** How deep an iceberg may reach under the surface (units): taller pictures are drawn smaller, so there is
 *  always room to swim under them (owner: "sotto non si passa"). The sea floor there is at ~380 or deeper. */
export const ICEBERG_MAX_DRAFT = 190;
/** Around a painted iceberg the old blocky ice (ceiling, pillars) is left out, so only the picture shows. */
export const ICEBERG_CLEAR_MARGIN = 24;
export const ICEBERGS_PER_STRETCH = 0; // tuning, Banchisa stretches of the endless sea (0: none for now, owner 5 ottobre)

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

/**
 * The painted ice sheet (lot P1; owner, 23 ottobre: the blocky ice "fa un po' cagare", and the old icebergs showed
 * drawn ice poking out of the picture with no collisions on it). The slab under the surface between the breathing
 * holes is its picture (`slab`), copies one after the other fading into each other where they overlap, ragged where it
 * ends at a hole; the pillars hang from it. Its ice is solid exactly where the picture is (its mask, from
 * `npm run art`): what you see is what you bump into, and nothing else is drawn there. Units. Tuning.
 */
export const ICE_ART = {
  slab: 'ghiaccio_soffitto',
  /** The top of the picture (its snow) above the surface; the picture's height (its body reaches about the old
   *  ceiling, its icicles hang lower). */
  above: 4,
  height: 40,
  /** How far the ragged end bites into the slab at a hole: at the top, and more towards the bottom. */
  ragged: 10,
  /** The share of a copy's width laid over the next one (they fade into each other there). */
  overlap: 0.22,
  raggedBottom: 10,
  pillar: 'ghiaccio_pilastro_1',
  /** A pillar's width for each unit of its old ellipse's half-width; its top this far up inside the slab. */
  pillarPerRx: 3,
  pillarUp: 12,
  /** Pixels of the slab's painting per unit (at most `maxPx` wide). */
  pxPerUnit: 4,
  maxPx: 4096,
};

/**
 * The painted props of the sea (lot C3; owner, 24 ottobre: what was still drawn with code "non è bello"): the corals
 * on the rock tops (their height in units, a little sunk into the rock), the kelp strands (cut in slices that sway,
 * the front ones dark), the bone walls' texture (texels of the picture per world unit), the air vents (their width,
 * sunk into the floor) and the chests and weapon wrecks (their width). Tuning.
 */
export const PROP_ART = {
  corals: ['corallo_1', 'corallo_2', 'corallo_3', 'corallo_4', 'corallo_5'],
  coralHeight: [6, 13] as [number, number],
  coralSink: 0.8,
  kelp: ['alga_1', 'alga_2', 'alga_3', 'alga_4'],
  kelpSlices: 8,
  kelpFrontTint: 0x16211c,
  kelpRootSink: 3,
  bones: 'trama_ossa',
  bonesTexelsPerUnit: 9,
  vent: 'sfiato_aria',
  ventWidth: 44,
  ventSink: 0.12,
  chest: { plain: 'forziere', locked: 'forziere_incrostato', buried: 'forziere_sepolto', width: 15, buriedWidth: 18 },
  weaponWreck: { art: 'relitto_arma', width: 62 },
};

/** The old story's scenery painted (lot C3): the red corals of the amphitheatre, the galleon in the kelp (the
 *  Cimitero dei velieri's picture, this many times the old drawing's length, sunk this share into the floor). */
export const SCENERY_ART = {
  arenaCorals: ['corallo_1', 'corallo_5'],
  wreck: 'luogo_galeone_1',
  wreckScale: 1.35,
  wreckSink: 0.1,
};

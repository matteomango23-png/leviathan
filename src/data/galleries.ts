// Leviatano — the Gallerie of the Grandi fosse (lot M3, docs/PROPOSTA-MARE.md: "stretto, stretto, stretto… e poi il
// vuoto"). From a wall of each abyssal trench a tunnel goes into the rock under the stretch, winding gently (a
// submarine stays level: no steep climbs), narrowing at its squeezes, and ends in a cave; the longest ends in the
// Cattedrale. Air pockets breathe you and your submarine, currents push along it, big beasts stay out. All fixed by
// the seed of the sea: nothing to save. Units (the diver is 12, 6 a metre). Values marked "tuning" are a first pass.

export const GALLERIES = {
  /** The kind of stretch they open in (data/endless.ts BIOMES) and the region (data/regions.ts). */
  biome: 'fossa',
  region: 'grandi_fosse',
  /** Where the mouth opens: this share of the way down the trench wall. */
  mouthDepth: 0.45,
  /** How far it runs (units, 100-150 m), a point every `step`. Tuning. */
  length: [600, 900] as [number, number],
  step: 36,
  /** Its slope at most (rise over run): the submarine stays level, so the tunnel never climbs steeply. */
  maxSlope: 0.22,
  /** Half its height (units): along it, at its squeezes (room for the biggest submarine, 4.5 m tall, and a margin),
   *  and how often a squeeze comes (one point in this many). Tuning. */
  radius: [28, 34] as [number, number],
  squeeze: 22,
  squeezeEvery: 6,
  /** It keeps at least this much rock over it (units): it never breaks out into the sea above by mistake. */
  roof: 60,
  /** The cave at its end: half-width and half-height (units). */
  cave: { rx: [90, 120] as [number, number], ry: [55, 75] as [number, number] },
  /** One gallery in this many has a branch, from its middle, ending in a smaller cave. */
  branchEvery: 3,
  /** Air pockets: in every cave, and one every `airEvery` units along the tunnel. */
  airEvery: 320,
  /** Currents: this share of the tunnel's stretches push (units/s along it, in or out). Tuning. */
  currentShare: 0.3,
  currentSpeed: 55,
  /** How quickly a current carries you or your submarine towards its speed (per second). Tuning. */
  currentPull: 2.2,
  /** Air a pocket gives your submarine back (seconds of air each second). Tuning. */
  subRefill: 20,
  /** Beasts longer than this (m) never go in (owner: "le grandi restano fuori"). */
  maxBeastM: 5,
  /** The bumps of its walls (units): rock, never a smooth pipe. */
  wobble: 6,
};

/** The Cattedrale (owner's proposal: "una caverna enorme alla fine delle Gallerie, con colonne di roccia e funghi
 *  luminosi"): at the end of the gallery of the trench nearest `km`. Half-sizes in units; its painted columns and
 *  glowing mushrooms. Tuning. */
export const CATHEDRAL = {
  id: 'cattedrale',
  name: 'Cattedrale',
  km: 24,
  length: 1100,
  rx: 300,
  ry: 150,
  columns: ['colonna_cattedrale_1', 'colonna_cattedrale_2'],
  columnCount: 4,
  /** At most this wide (units): taller ones are drawn slimmer, not thicker. */
  columnMaxWidth: 64,
  /** No column this close (units) to where the tunnel comes in. */
  entryClear: 140,
  mushrooms: ['funghi_luminosi_1', 'funghi_luminosi_2', 'funghi_luminosi_3'],
  mushroomCount: 14,
  mushroomWidth: 14,
};

/** The pictures of the galleries: the arch at each mouth, the dark cave wall behind you inside (a texture), and
 *  how dark it is drawn. */
export const GALLERY_ART = {
  mouth: 'ingresso_galleria',
  mouthWidth: 120,
  wall: 'trama_basalto',
  wallTexelsPerUnit: 2.5,
  wallShade: 0x6a7480,
  /** Glowing mushrooms in the smaller caves too, and their light in the dark (units). */
  caveMushrooms: 4,
  mushroomLight: 40,
};

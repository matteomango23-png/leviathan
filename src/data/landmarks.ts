// The landmarks of the sea (lot M2, docs/PROPOSTA-MARE.md: "posti memorabili… li ritrovi, li segni sulla mappa,
// ci torni"): the Grande Arco on the reef, the Cimitero dei velieri on the edge of the blue, the Balena caduta under
// the ice. Each lies in the middle of the first stretch of its kind past `minKm` (fixed by the seed: nothing to
// save), the floor flattened under it. Its pieces are the owner's pictures (public/world/luogo_*.webp, with a solid
// mask from `npm run art`); the solid ones you bump into. Values marked "tuning" are a first pass.
import type { WreckDef } from './economy';

export interface LandmarkPiece {
  /** Its picture in public/world (and its mask, ICEBERG_SHAPES). */
  art: string;
  /** Its width in the sea, metres (the height follows the picture). Tuning. */
  widthM: number;
  /** Its middle, metres from the landmark's. */
  dxM: number;
  /** Share of its height sunk under the floor. */
  sink: number;
  /** You bump into it (the arch, the galleons); the bones you swim through. */
  solid: boolean;
  /** Never solid there (shares of the picture: x0, y0, x1, y1): the galleon's rooms, so the barrels painted on
   *  their floors do not close them. */
  open?: [number, number, number, number][];
}

/** A beast always living there, metres from the landmark's middle and above the floor. */
export interface LandmarkResident {
  speciesId: string;
  dxM: number;
  upM: number;
}

export interface LandmarkDef {
  id: string;
  name: string;
  /** The kind of stretch it lies in (data/endless.ts BIOMES) and how far out at least. */
  where: { biome: string; minKm: number };
  /** Units around it where the floor bends to meet its ground. */
  flatten: number;
  pieces: LandmarkPiece[];
  residents: LandmarkResident[];
  /** A chest inside (the galleon you enter): its place as shares of one piece's picture. */
  chest?: { piece: number; u: number; v: number; def: Omit<WreckDef, 'x' | 'y'> };
}

export const LANDMARKS: LandmarkDef[] = [
  {
    id: 'grande_arco',
    name: 'Grande Arco',
    where: { biome: 'barriera', minKm: 2.4 },
    flatten: 220,
    pieces: [{ art: 'luogo_arco', widthM: 46, dxM: 0, sink: 0.06, solid: true }],
    // "under it there is always a turtle or a manta" (the proposal)
    residents: [
      { speciesId: 'tartaruga_marina', dxM: -4, upM: 5 },
      { speciesId: 'manta', dxM: 5, upM: 11 },
    ],
  },
  {
    id: 'cimitero_velieri',
    name: 'Cimitero dei velieri',
    where: { biome: 'aperto', minKm: 7.5 },
    flatten: 320,
    pieces: [
      { art: 'luogo_galeone_1', widthM: 34, dxM: -48, sink: 0.08, solid: true },
      {
        art: 'luogo_galeone_dentro',
        widthM: 54,
        dxM: 0,
        sink: 0.22,
        solid: true,
        open: [[0.22, 0.565, 0.84, 0.745]],
      },
      { art: 'luogo_galeone_2', widthM: 32, dxM: 48, sink: 0.12, solid: true },
    ],
    residents: [{ speciesId: 'murena', dxM: 10, upM: 4 }],
    chest: {
      piece: 1,
      u: 0.79,
      v: 0.68,
      def: { id: 'forziere_velieri', name: 'Forziere del galeone', reward: { teeth: 1800, item: 'bolla_aria' } },
    },
  },
  {
    id: 'balena_caduta',
    name: 'Balena caduta',
    where: { biome: 'ghiaccio', minKm: 13 },
    flatten: 260,
    pieces: [{ art: 'luogo_balena', widthM: 42, dxM: 0, sink: 0.1, solid: false }],
    // life round the bones (the proposal: crabs, eels, fish)
    residents: [
      { speciesId: 'granchio_ragno', dxM: -8, upM: 2 },
      { speciesId: 'anguilla_elettrica', dxM: 12, upM: 6 },
    ],
  },
];

/** Near enough (metres) to a landmark to find it: it shows on the map from then on. Tuning. */
export const LANDMARK_SIGHT_M = 120;

/** The underside of the harbours (lot M2): the pier's piles with mussels and nets, and the old things on the floor
 *  under it, in metres. Tuning. */
export const PIER_UNDER = {
  piles: 'molo_pali',
  floor: 'molo_fondo',
  /** The piles' picture: its width, and how far above the surface its top starts. */
  pilesWidthM: 34,
  /** In a deep harbour the poles go on down to the floor: the picture's lowest band (from this share of its height,
   *  under the net) stretched. */
  pilesRepeatFrom: 0.86,
  /** The things on the floor: width, metres right of the pier's middle, how far sunk into the sand. */
  floorWidthM: 18,
  floorDxM: 14,
  floorSink: 1,
};

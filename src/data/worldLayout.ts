// Leviatano — shape of the ocean (ported from prototype/leviatano.html: isOpen, genWorld, zoneOf).
// World units ("u") are the prototype's pixels. The diver is DIVER.lengthUnits long (= 2 m).
// Values marked "tuning" are a first pass: change them here, never in systems.

/** Tile grid. Collision and generation work on tiles; rendering smooths them. */
export const WORLD = {
  tileSize: 8,
  cols: 1207, // tappa 10: the coast (beach, wider bay, Isola delle Mangrovie) widened the world to 9656 units
  rows: 200,
  surfaceY: 24, // water surface (world y); above it is air
  unitsPerMetre: 6, // diver 12 u = 2 m
  noiseScale: 0.011, // generator noise frequency
  noiseAmp: 0.9, // generator noise strength
  edgeMargin: 20, // solid border around the world
};

/**
 * The coast (tappa 10, owner's decisions of 1 ottobre 2026), west to east: Portofosco on the land, a long beach
 * sloping gently into the bay, the bay (wider than before), the Isola delle Mangrovie rising out of the water (you
 * dive under it; Porto Fango is on its east shore), the Delta at the mouth of its river, then the open sea. The
 * bay, the Delta and the open sea keep their earlier hand-made design, moved and stretched by these transforms
 * (an "old" x is a position in the design before tappa 10): bay(780) is where 780 is now.
 */
export const LAYOUT = {
  shoreX: 260, // the land meets the water here
  bay: { from: 110, x0: 1700, stretch: 1.6 }, // old 110…1940 → 1700…4628
  island: { x0: 4628, x1: 5000, halfWidth: 168, landHeight: 24 }, // Isola delle Mangrovie: its zone, its rock
  delta: { from: 1940, x0: 5000, stretch: 1.6 }, // old 1940…2460 → 5000…5832
  eastShift: 3372, // old 2460… (the open sea) → 5832…
};
export const bay = (x: number): number => LAYOUT.bay.x0 + (x - LAYOUT.bay.from) * LAYOUT.bay.stretch;
export const bayW = (w: number): number => w * LAYOUT.bay.stretch;
export const delta = (x: number): number => LAYOUT.delta.x0 + (x - LAYOUT.delta.from) * LAYOUT.delta.stretch;
export const east = (x: number): number => x + LAYOUT.eastShift;
/** The middle of the Isola delle Mangrovie. */
export const ISLAND_X = (LAYOUT.island.x0 + LAYOUT.island.x1) / 2;
/** Where the open sea begins (the end of the Delta). */
export const OPEN_SEA_X = east(2460);

/** Tile values stored in the map. */
export const TILE = { water: 0, rock: 1, bone: 2, ice: 3 } as const;
export type TileValue = (typeof TILE)[keyof typeof TILE];

/** Ellipse: (dx/rx)² + (dy/ry)² < 1 + noise × noiseMult. */
export interface EllipseShape {
  kind: 'ellipse';
  x: number;
  y: number;
  rx: number;
  ry: number;
  noiseMult: number;
}
/** Vertical passage: x0 + noise × shift < x < x1 + noise × shift, yMin < y < yMax. */
export interface ShaftShape {
  kind: 'shaft';
  x0: number;
  x1: number;
  yMin: number;
  yMax: number;
  noiseShift: number;
}
export type Shape = EllipseShape | ShaftShape;

/** Sea floor height under open water: interpolated points (or a base) + sine waves + noise. */
export interface FloorDef {
  base?: number;
  points?: [number, number][];
  waves: { amp: number; freq: number }[];
  noise: number;
}

/** A band of the world between xMin and xMax: rock pillars first, then open water above the floor, then caves. */
export interface ZoneShapeDef {
  xMin: number;
  xMax: number;
  solids: EllipseShape[];
  floor: FloorDef;
  openings: Shape[];
}

const ell = (x: number, y: number, rx: number, ry: number, noiseMult: number): EllipseShape => ({
  kind: 'ellipse',
  x,
  y,
  rx,
  ry,
  noiseMult,
});
const shaft = (x0: number, x1: number, yMin: number, yMax: number, noiseShift: number): ShaftShape => ({
  kind: 'shaft',
  x0,
  x1,
  yMin,
  yMax,
  noiseShift,
});

const bayEll = (x: number, y: number, rx: number, ry: number, n: number): EllipseShape =>
  ell(bay(x), y, bayW(rx), ry, n);
const bayShaft = (x0: number, x1: number, yMin: number, yMax: number, n: number): ShaftShape =>
  shaft(bay(x0), bay(x1), yMin, yMax, n);
const eastEll = (x: number, y: number, rx: number, ry: number, n: number): EllipseShape => ell(east(x), y, rx, ry, n);
const eastShaft = (x0: number, x1: number, yMin: number, yMax: number, n: number): ShaftShape =>
  shaft(east(x0), east(x1), yMin, yMax, n);

export const WORLD_SHAPE: ZoneShapeDef[] = [
  {
    // West: the beach (the coast slope, COAST) and the bay with its twilight caves and abyss below
    xMin: 0,
    xMax: LAYOUT.island.x0,
    solids: [bayEll(700, 690, 40, 100, 0.6), bayEll(1180, 800, 70, 50, 0.6), bayEll(1000, 1330, 60, 70, 0.6)],
    floor: { base: 335, waves: [{ amp: 28, freq: 0.0045 / LAYOUT.bay.stretch }], noise: 80 },
    openings: [
      bayShaft(1395, 1515, -Infinity, 690, 30),
      bayEll(1000, 720, 760, 225, 1),
      bayEll(1455, 525, 105, 80, 1),
      bayEll(480, 800, 220, 70, 0.5),
      bayShaft(285, 395, 780, 1310, 25),
      bayEll(360, 1320, 150, 80, 0.4),
      bayEll(900, 1325, 790, 225, 1),
      bayEll(1430, 1440, 215, 118, 0.5),
    ],
  },
  {
    // The Isola delle Mangrovie: rock from above the water down to ~23 m; you pass under it
    xMin: LAYOUT.island.x0,
    xMax: LAYOUT.island.x1,
    solids: [ell(ISLAND_X, 40, LAYOUT.island.halfWidth, 120, 0.35)],
    floor: { base: 330, waves: [{ amp: 10, freq: 0.01 }], noise: 30 },
    openings: [],
  },
  {
    // The Delta delle Mangrovie (chapter 2): the shallow, murky mouth of the island's river
    xMin: LAYOUT.island.x1,
    xMax: OPEN_SEA_X,
    solids: [],
    floor: {
      points: [
        [delta(1940), 330],
        [delta(2030), 212],
        [delta(2380), 214],
        [delta(2460), 345],
      ],
      waves: [{ amp: 6, freq: 0.03 / LAYOUT.delta.stretch }],
      noise: 30,
    },
    openings: [],
  },
  {
    // East, the open sea: reef, kelp forest, ice sea and the eastern trench (tappa 11 makes it endless)
    xMin: OPEN_SEA_X,
    xMax: Infinity,
    solids: [eastEll(3120, 300, 40, 70, 0.5), eastEll(3720, 285, 55, 45, 0.5), eastEll(4870, 330, 35, 90, 0.5)],
    floor: {
      points: [
        [east(2460), 350],
        [east(2820), 300],
        [east(3520), 280],
        [east(3920), 320],
        [east(4220), 430],
        [east(5020), 450],
        [east(5320), 380],
        [east(6260), 390],
      ],
      waves: [{ amp: 8, freq: 0.02 }],
      noise: 70,
    },
    openings: [
      eastEll(3420, 360, 170, 60, 0.6),
      eastShaft(3300, 3350, -Infinity, 400, 0),
      eastShaft(4470, 4570, -Infinity, 1260, 25),
      eastShaft(5670, 5770, -Infinity, 1260, 20),
      eastEll(4820, 1320, 700, 190, 1),
      eastEll(5670, 1300, 200, 130, 0.4),
    ],
  },
];

/** Special tiles: the ancient bone wall (broken by a charge, tappa 2) and the ice sheet (orca, later). */
export const BONE_WALL = { tx0: 230, tx1: 288, ty0: 125, ty1: 128 }; // tiles bay(200)…bay(488), across the abyss shaft
export const ICE = {
  xMin: east(5220), // ice region starts here
  ceilingY: 44, // ice ceiling under the surface
  holes: [
    [east(5470), east(5510)],
    [east(5940), east(5980)],
  ] as [number, number][], // breathing holes in the ceiling (x ranges)
  pillars: [
    [east(5340), 52, 10, 22],
    [east(5620), 50, 8, 26],
    [east(6120), 54, 12, 24],
  ] as [number, number, number, number][], // ellipses x, y, rx, ry
  sheet: { x0: east(5620), x1: east(5820), y0: 700, y1: 734 }, // ancient ice over the eastern trench
};

/** Sanctuaries: x and a y above the sea floor they rest on (the floor is found at runtime). */
export interface SanctuaryDef {
  name: string;
  x: number;
  y: number;
}
export const SANCTUARIES: SanctuaryDef[] = [
  { name: 'il santuario della Barriera', x: east(2850), y: 200 },
  { name: 'il santuario della Baia', x: bay(1010), y: 200 },
  { name: 'il santuario crepuscolare', x: bay(1290), y: 650 },
  { name: "il santuario dell'abisso", x: bay(520), y: 1250 },
  { name: 'il santuario della fossa', x: east(4820), y: 1250 },
];

/** The west coast: a long beach slopes gently from Portofosco down to the floor of the bay. */
export const COAST = {
  shoreX: LAYOUT.shoreX, // where the land meets the water line
  dropDepth: 36, // by the shore the floor drops quickly to 6 m, so the pier stands in water…
  dropSlope: 1.2, // …(units out per unit of depth)…
  slope: 4.6, // …then the beach slopes gently into the bay (units out per unit of depth, ~12°)
  maxY: 420, // the slope stops here (the caves below are unchanged)
  noise: 20, // how rough the underwater shore is
  landHeight: 18, // how high the land rises above the water, inland
  landRise: 0.3, // how quickly it rises going inland
};

/** The Delta delle Mangrovie (tappa 6): mangrove islands above the water and murky water below. */
export const DELTA = {
  x0: LAYOUT.island.x1,
  x1: OPEN_SEA_X,
  islands: [
    [delta(2060), delta(2125), 8],
    [delta(2200), delta(2295), 11],
    [delta(2350), delta(2400), 6],
  ] as [number, number, number][], // x0, x1, height above the water
  murk: { lampMult: 0.6, darkness: 0.3, tint: 0x2a2a12 }, // tuning: shorter lamp, darker, brownish water
  murkFade: 90, // units over which the murk fades in at the Delta's edges
};

/** Where a new game starts (at the surface, by the pier of Portofosco). */
export const START = { x: LAYOUT.shoreX + 95, y: 38 };

/** Named zones shown when you enter them (prototype zoneOf). First match wins. */
export interface ZoneDef {
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
export const ZONES: ZoneDef[] = [
  { name: 'Tana dello Sfregiato', xMin: bay(780) - 220, xMax: bay(780) + 220, yMin: 340, yMax: 512 }, // LAIR in guardians.ts
  { name: 'Spiaggia di Portofosco', xMin: 0, xMax: LAYOUT.bay.x0, yMin: -Infinity, yMax: 420 },
  { name: 'Baia di Portofosco', xMin: LAYOUT.bay.x0, xMax: LAYOUT.island.x0, yMin: -Infinity, yMax: 420 },
  { name: 'Isola delle Mangrovie', xMin: LAYOUT.island.x0, xMax: LAYOUT.island.x1, yMin: -Infinity, yMax: 420 },
  { name: 'Delta delle Mangrovie', xMin: LAYOUT.island.x1, xMax: OPEN_SEA_X, yMin: -Infinity, yMax: 420 },
  { name: 'Barriera Rossa', xMin: OPEN_SEA_X, xMax: east(4020), yMin: -Infinity, yMax: 420 },
  { name: 'Foresta Sommersa', xMin: east(4020), xMax: east(5220), yMin: -Infinity, yMax: 420 },
  { name: 'Mare di Ghiaccio', xMin: east(5220), xMax: Infinity, yMin: -Infinity, yMax: 420 },
  { name: 'Zona crepuscolare', xMin: 0, xMax: LAYOUT.island.x0, yMin: 420, yMax: 1060 },
  { name: 'Abisso', xMin: 0, xMax: LAYOUT.island.x0, yMin: 1060, yMax: Infinity },
  { name: 'Profondità orientali', xMin: OPEN_SEA_X, xMax: Infinity, yMin: 420, yMax: 1100 },
  { name: 'Fossa orientale', xMin: OPEN_SEA_X, xMax: Infinity, yMin: 1100, yMax: Infinity },
];

/** Sardine schools: centre and the area they roam (x0, y0, x1, y1). */
export interface SchoolDef {
  x: number;
  y: number;
  roam: [number, number, number, number];
}
const BAY_ROAM: [number, number, number, number] = [LAYOUT.shoreX + 60, 40, bay(1850), 290];
const SEA_ROAM: [number, number, number, number] = [east(2480), 48, east(5120), 300];
// tappa 10c: sardines everywhere, like the common Pokémon in the grass
export const SARDINE_SCHOOLS: SchoolDef[] = [
  { x: 900, y: 70, roam: BAY_ROAM }, // over the beach
  { x: 1300, y: 90, roam: BAY_ROAM },
  { x: bay(200), y: 120, roam: BAY_ROAM },
  { x: bay(420), y: 170, roam: BAY_ROAM },
  { x: bay(650), y: 110, roam: BAY_ROAM },
  { x: bay(900), y: 230, roam: BAY_ROAM },
  { x: bay(1100), y: 140, roam: BAY_ROAM },
  { x: bay(1300), y: 150, roam: BAY_ROAM },
  { x: bay(1600), y: 200, roam: BAY_ROAM },
  { x: east(2720), y: 150, roam: SEA_ROAM },
  { x: east(3000), y: 100, roam: SEA_ROAM },
  { x: east(3270), y: 200, roam: SEA_ROAM },
  { x: east(3550), y: 120, roam: SEA_ROAM },
  { x: east(3820), y: 170, roam: SEA_ROAM },
  { x: east(4200), y: 130, roam: SEA_ROAM },
  { x: east(4620), y: 260, roam: SEA_ROAM },
  { x: east(4950), y: 160, roam: SEA_ROAM },
];

/** Kelp grows on rock tops above these depths (tuning). */
export const KELP = {
  forest: { xMin: east(4020), xMax: east(5220), maxY: 520, chance: 0.8, minH: 30, maxH: 100 },
  elsewhere: { maxY: 420, chance: 0.28, minH: 10, maxH: 40 },
  frontFraction: 0.25, // share of strands drawn in front of the diver
};

/** Corals on rock tops (baked into the terrain). */
export const CORALS = {
  reef: { xMin: east(2460), xMax: east(4020), maxY: 420, chance: 0.55, colors: ['#d0584e', '#e8a547', '#d98cb8', '#5fc4b3'] },
  shallow: { maxY: 420, chance: 0.14, colors: ['#8c3b3b', '#a67c3d', '#b9ab8a'] },
  deep: { maxY: 1050, chance: 0.14, colors: ['#3b5f66', '#5a4a6e', '#6e7f7a'] },
};

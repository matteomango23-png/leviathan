// Leviatano — shape of the ocean (ported from prototype/leviatano.html: isOpen, genWorld, zoneOf).
// World units ("u") are the prototype's pixels. The diver is DIVER.lengthUnits long (= 2 m).
// Values marked "tuning" are a first pass: change them here, never in systems.

/** Tile grid. Collision and generation work on tiles; rendering smooths them. */
export const WORLD = {
  tileSize: 8,
  cols: 720,
  rows: 200,
  surfaceY: 24, // water surface (world y); above it is air
  unitsPerMetre: 6, // diver 12 u = 2 m
  noiseScale: 0.011, // generator noise frequency
  noiseAmp: 0.9, // generator noise strength
  edgeMargin: 20, // solid border around the world
};

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

export const WORLD_SHAPE: ZoneShapeDef[] = [
  {
    // West: the bay, the twilight caves and the abyss
    xMin: 0,
    xMax: 1940,
    solids: [ell(700, 690, 40, 100, 0.6), ell(1180, 800, 70, 50, 0.6), ell(1000, 1330, 60, 70, 0.6)],
    floor: { base: 335, waves: [{ amp: 28, freq: 0.0045 }], noise: 80 },
    openings: [
      shaft(1395, 1515, -Infinity, 690, 30),
      ell(1000, 720, 760, 225, 1),
      ell(1455, 525, 105, 80, 1),
      ell(480, 800, 220, 70, 0.5),
      shaft(285, 395, 780, 1310, 25),
      ell(360, 1320, 150, 80, 0.4),
      ell(900, 1325, 790, 225, 1),
      ell(1430, 1440, 215, 118, 0.5),
    ],
  },
  {
    // East: reef, kelp forest, ice sea and the eastern trench
    xMin: 1940,
    xMax: Infinity,
    solids: [ell(2600, 300, 40, 70, 0.5), ell(3200, 285, 55, 45, 0.5), ell(4350, 330, 35, 90, 0.5)],
    floor: {
      points: [
        [1940, 350],
        [2300, 300],
        [3000, 280],
        [3400, 320],
        [3700, 430],
        [4500, 450],
        [4800, 380],
        [5740, 390],
      ],
      waves: [{ amp: 8, freq: 0.02 }],
      noise: 70,
    },
    openings: [
      ell(2900, 360, 170, 60, 0.6),
      shaft(2780, 2830, -Infinity, 400, 0),
      shaft(3950, 4050, -Infinity, 1260, 25),
      shaft(5150, 5250, -Infinity, 1260, 20),
      ell(4300, 1320, 700, 190, 1),
      ell(5150, 1300, 200, 130, 0.4),
    ],
  },
];

/** Special tiles: the ancient bone wall (broken by a charge, tappa 2) and the ice sheet (orca, later). */
export const BONE_WALL = { tx0: 25, tx1: 60, ty0: 125, ty1: 128 };
export const ICE = {
  xMin: 4700, // ice region starts here
  ceilingY: 44, // ice ceiling under the surface
  holes: [
    [4950, 4990],
    [5420, 5460],
  ] as [number, number][], // breathing holes in the ceiling (x ranges)
  pillars: [
    [4820, 52, 10, 22],
    [5100, 50, 8, 26],
    [5600, 54, 12, 24],
  ] as [number, number, number, number][], // ellipses x, y, rx, ry
  sheet: { x0: 5100, x1: 5300, y0: 700, y1: 734 }, // ancient ice over the eastern trench
};

/** Sanctuaries: x and a y above the sea floor they rest on (the floor is found at runtime). */
export interface SanctuaryDef {
  name: string;
  x: number;
  y: number;
}
export const SANCTUARIES: SanctuaryDef[] = [
  { name: 'il santuario della Barriera', x: 2330, y: 200 },
  { name: 'il santuario della Baia', x: 1010, y: 200 },
  { name: 'il santuario crepuscolare', x: 1290, y: 650 },
  { name: "il santuario dell'abisso", x: 520, y: 1250 },
  { name: 'il santuario della fossa', x: 4300, y: 1250 },
];

/** The west coast of the bay: the sea floor rises to a rocky shore; Portofosco stands on the land. */
export const COAST = {
  shoreX: 110, // where the land meets the water line
  slope: 0.55, // under water the shore moves out this many units per unit of depth
  maxY: 420, // the slope stops here (the caves below are unchanged)
  noise: 20, // how rough the underwater shore is
  landHeight: 18, // how high the land rises above the water, inland
  landRise: 0.3, // how quickly it rises going inland
};

/** Where a new game starts (at the surface, by the pier of Portofosco). */
export const START = { x: 185, y: 38 };

/** Named zones shown when you enter them (prototype zoneOf). First match wins. */
export interface ZoneDef {
  name: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
export const ZONES: ZoneDef[] = [
  { name: 'Tana dello Sfregiato', xMin: 560, xMax: 1000, yMin: 340, yMax: 512 }, // LAIR in guardians.ts
  { name: 'Baia di Portofosco', xMin: 0, xMax: 1940, yMin: -Infinity, yMax: 420 },
  { name: 'Barriera Rossa', xMin: 1940, xMax: 3500, yMin: -Infinity, yMax: 420 },
  { name: 'Foresta Sommersa', xMin: 3500, xMax: 4700, yMin: -Infinity, yMax: 420 },
  { name: 'Mare di Ghiaccio', xMin: 4700, xMax: Infinity, yMin: -Infinity, yMax: 420 },
  { name: 'Zona crepuscolare', xMin: 0, xMax: 1940, yMin: 420, yMax: 1060 },
  { name: 'Abisso', xMin: 0, xMax: 1940, yMin: 1060, yMax: Infinity },
  { name: 'Profondità orientali', xMin: 1940, xMax: Infinity, yMin: 420, yMax: 1100 },
  { name: 'Fossa orientale', xMin: 1940, xMax: Infinity, yMin: 1100, yMax: Infinity },
];

/** Sardine schools: centre and the area they roam (x0, y0, x1, y1). */
export interface SchoolDef {
  x: number;
  y: number;
  roam: [number, number, number, number];
}
export const SARDINE_SCHOOLS: SchoolDef[] = [
  { x: 420, y: 170, roam: [80, 48, 1850, 290] },
  { x: 900, y: 230, roam: [80, 48, 1850, 290] },
  { x: 1300, y: 150, roam: [80, 48, 1850, 290] },
  { x: 2200, y: 150, roam: [1960, 48, 4600, 300] },
  { x: 2750, y: 200, roam: [1960, 48, 4600, 300] },
  { x: 3300, y: 170, roam: [1960, 48, 4600, 300] },
  { x: 4100, y: 260, roam: [1960, 48, 4600, 300] },
];

/** Kelp grows on rock tops above these depths (tuning). */
export const KELP = {
  forest: { xMin: 3500, xMax: 4700, maxY: 520, chance: 0.8, minH: 30, maxH: 100 },
  elsewhere: { maxY: 420, chance: 0.28, minH: 10, maxH: 40 },
  frontFraction: 0.25, // share of strands drawn in front of the diver
};

/** Corals on rock tops (baked into the terrain). */
export const CORALS = {
  reef: { xMin: 1940, xMax: 3500, maxY: 420, chance: 0.55, colors: ['#d0584e', '#e8a547', '#d98cb8', '#5fc4b3'] },
  shallow: { maxY: 420, chance: 0.14, colors: ['#8c3b3b', '#a67c3d', '#b9ab8a'] },
  deep: { maxY: 1050, chance: 0.14, colors: ['#3b5f66', '#5a4a6e', '#6e7f7a'] },
};

// How each part of the sea looks and sounds (owner, 22 ottobre 2026, docs/PROPOSTA-MARE.md M1: "ogni regione si
// riconosce in un secondo"). The water's tint over its colour by depth (SEA.waterByY), the far and middle ridges'
// colours and shapes (until the painted panoramas of docs/GEMINI-LOTTO-9.md arrive), the light shafts, the marine
// snow and the bioluminescent specks, the sound, and the battle's background. Tuning.

export type SeaLookId = 'costa' | 'delta' | 'barriera' | 'mareblu' | 'foresta' | 'banchisa' | 'fosse' | 'abisso';

/** The shape of a ridge: rolling hills, coral humps with fans, a flat shelf ending in a drop, tall kelp stalks,
 *  ice slabs and spikes, basalt spires, steep trench walls. */
export type RidgeStyle = 'hills' | 'reef' | 'plateau' | 'kelp' | 'ice' | 'spires' | 'trench';

export type SeaSound = 'none' | 'reef' | 'ice' | 'deep' | 'swamp';

export interface SeaLookDef {
  /** × the water's colour by depth (red, green, blue). */
  water: [number, number, number];
  far: { top: string; bottom: string; style: RidgeStyle };
  mid: { top: string; bottom: string; style: RidgeStyle };
  /** A colour picked out on the ridges (coral, glowing vents, ice light); null: none. */
  accent: string | null;
  /** × the light shafts. */
  rays: number;
  /** × the marine snow (it grows with depth too: SEA_SNOW). */
  snow: number;
  /** How many of the glowing specks show (bioluminescence, SEA_SNOW.glowSpecks), 0…1, and their colours. */
  glow: number;
  glowColors: string[];
  sound: SeaSound;
}

export const SEA_LOOKS: Record<SeaLookId, SeaLookDef> = {
  costa: {
    water: [1, 1, 1],
    far: { top: '#0b2531', bottom: '#04111a', style: 'hills' },
    mid: { top: '#0f2a33', bottom: '#050e13', style: 'hills' },
    accent: null,
    rays: 1,
    snow: 1,
    glow: 0,
    glowColors: [],
    sound: 'none',
  },
  // the Delta delle Mangrovie (lot P1): murky green-brown water among the roots, the mud bubbling
  delta: {
    water: [1.08, 1.02, 0.62],
    far: { top: '#2a2a16', bottom: '#0c0c06', style: 'kelp' },
    mid: { top: '#26220f', bottom: '#0a0904', style: 'kelp' },
    accent: null,
    rays: 0.7,
    snow: 1.6,
    glow: 0,
    glowColors: [],
    sound: 'swamp',
  },
  barriera: {
    water: [1.05, 1.18, 1.1],
    far: { top: '#1a4a52', bottom: '#082029', style: 'reef' },
    mid: { top: '#3a3036', bottom: '#120e12', style: 'reef' },
    accent: '#c8604e',
    rays: 1.25,
    snow: 0.8,
    glow: 0,
    glowColors: [],
    sound: 'reef',
  },
  mareblu: {
    water: [0.75, 0.95, 1.25],
    far: { top: '#0c2a44', bottom: '#030c18', style: 'plateau' },
    mid: { top: '#123248', bottom: '#040d16', style: 'plateau' },
    accent: null,
    rays: 1.35,
    snow: 1.1,
    glow: 0,
    glowColors: [],
    sound: 'none', // the whale call was taken out (owner, 23 ottobre: "fastidiosissimo")
  },
  foresta: {
    water: [0.95, 1.15, 0.85],
    far: { top: '#1d3e2a', bottom: '#07140c', style: 'kelp' },
    mid: { top: '#24402a', bottom: '#08120a', style: 'kelp' },
    accent: '#b89a48',
    rays: 1.1,
    snow: 1,
    glow: 0,
    glowColors: [],
    sound: 'none',
  },
  banchisa: {
    water: [0.85, 1.05, 1.25],
    far: { top: '#2c4a5e', bottom: '#0a1822', style: 'ice' },
    mid: { top: '#40667c', bottom: '#0e1e28', style: 'ice' },
    accent: '#bfe6f2',
    rays: 0.8,
    snow: 0.7,
    glow: 0,
    glowColors: [],
    sound: 'ice',
  },
  fosse: {
    water: [0.7, 0.8, 0.95],
    far: { top: '#141c24', bottom: '#030508', style: 'spires' },
    mid: { top: '#161a1e', bottom: '#030406', style: 'spires' },
    accent: '#e0703a',
    rays: 0.6,
    snow: 1.8,
    glow: 0.6,
    glowColors: ['#5fd3e6', '#7cf0b0'],
    sound: 'deep',
  },
  abisso: {
    water: [0.55, 0.65, 0.85],
    far: { top: '#0e121a', bottom: '#020306', style: 'trench' },
    mid: { top: '#10141c', bottom: '#020305', style: 'trench' },
    accent: '#4fb8d8',
    rays: 0.45,
    snow: 2.2,
    glow: 1,
    glowColors: ['#5fd3e6', '#9a8cff', '#7cf0b0'],
    sound: 'deep',
  },
};

/** Two looks blend over this many units across a border (about 400 m), never a change at a stroke. */
export const SEA_LOOK_BLEND = 2400;
/**
 * The ridges stand at the seabed of each region (owner, 22 ottobre: the deep regions' panoramas were never seen near
 * their floor): this much lower than the reference (units, − higher: the bay, the Delta), a fixed height for each
 * look, blended across borders like the pictures. Not the floor under you (owner, 25 ottobre: following it, the
 * ridges rose and sank as you went along, more the faster). The typical seabed of each region, measured. Tuning.
 */
/**
 * The far ridges darken by themselves with depth, this share of the darkness there (owner, 25 ottobre: the lamp lit
 * the far mountains as if they were a metre away). The lamp opens the darkness over everything, so without this
 * they showed bright in its cone; now in its cone they stay as dim as far things are. Tuning.
 */
export const SEA_RIDGE_SHADE = 0.75;

export const SEA_RIDGE_SINK: Record<SeaLookId, number> = {
  costa: 0,
  delta: -30,
  barriera: 260,
  mareblu: 650,
  foresta: 980,
  banchisa: 980,
  fosse: 1630,
  abisso: 1980,
};

/** Within the Foresta e Banchisa the kind changes every 300 m (ENDLESS.stretch): the forest and the ice blend over
 *  about 100 m, or they would never be seen apart. */
export const SEA_LOOK_BLEND_STRETCH = 600;

/** The Delta is short (about 140 m): its look comes and goes over this many units at its edges. */
export const SEA_LOOK_BLEND_DELTA = 420;

/**
 * The marine snow grows with depth: × (1 + `perDepth` × metres / 100), up to `max` times the specks of the
 * surface (SEA.particles). The glowing specks (up to `glowSpecks`, `size` px at a 400 px tall screen) show from
 * `glowFromM` down, fully at twice that, and pulse every `pulseSeconds`. Tuning.
 */
export const SEA_SNOW = {
  perDepth: 0.25,
  max: 2,
  glowSpecks: 40,
  size: [1.6, 3.2] as [number, number],
  glowFromM: 30,
  pulseSeconds: 3.5,
};

/**
 * The region sounds (audio/regionSound.ts), synthesized: the reef's crackle (clicks per second, volume), the ice
 * creaking (seconds between, volume), the deep's low grumble (seconds between, Hz, volume), the Delta's mud
 * bubbling (seconds between, volume: soft and rare). Tuning.
 */
export const REGION_SOUND = {
  ice: { every: [6, 14] as [number, number], volume: 0.05 },
  deep: { every: [5, 11] as [number, number], hz: 38, volume: 0.07 },
  swamp: { every: [3, 8] as [number, number], volume: 0.04 },
  /** Inside the Gallerie (lot M3): a drop and its echo, now and then. */
  cave: { every: [2.5, 6] as [number, number], volume: 0.035 },
};

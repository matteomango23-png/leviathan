// Leviatano — the speedboats and the jet ski (owner, 8 ottobre 2026, block 4b): each comes in a hatch of its ship
// (data/fleet.ts). Fast on the surface, a small tank, and drums of fuel: at an outpost you fill the drums, back at
// the ship they are poured into its tank, so the ship refuels without moving. They never dive and never break ice.
// Values marked "tuning" are a first pass: change them here, never in systems.

/** Where things are on a boat's picture (bow on the right), as shares of its width and height. */
export interface BoatPicture {
  aspect: number; // height / width
  waterline: number;
  keel: number;
  propX: number; // where the water is churned behind it
  propY: number;
}

export interface BoatModel {
  id: string;
  name: string;
  /** The whole picture's width in metres (it fits its hatch). */
  lengthM: number;
  knots: number; // top speed
  /** units/s² speeding up, slowing down by itself and braking. Tuning. */
  accel: number;
  coast: number;
  brake: number;
  tank: number; // litres
  perKm: number; // litres per km at full throttle
  drums: number; // litres of fuel it carries for the ship
  note: string;
  /** Its painting in public/world (and the engine running, same frame). */
  art: string;
  moving?: string;
  picture: BoatPicture;
  /** Its reactors' nozzles on the picture: they smoke while the engine pushes (owner, 9 ottobre). */
  reactors?: { u: number; v: number; size: number }[];
}

const PICTURE = { aspect: 781 / 1400, waterline: 0.62, keel: 0.74 };

export const BOAT_MODELS: BoatModel[] = [
  {
    id: 'motoscafo_eh2',
    name: 'Motoscafo da gara',
    lengthM: 14,
    knots: 40,
    accel: 120,
    coast: 50,
    brake: 160,
    tank: 60,
    perKm: 3,
    drums: 200,
    note: 'Serbatoio piccolo, velocissimo: va a prendere carburante e conchiglie all’avamposto',
    art: 'motoscafo_eh2',
    // (its picture with the jets on fire is gone, owner 9 ottobre: they smoke instead)
    picture: { ...PICTURE, propX: 0.04, propY: 0.62 },
    reactors: [
      { u: 0.04, v: 0.3, size: 0.8 },
      { u: 0.03, v: 0.6, size: 0.8 },
    ],
  },
  {
    id: 'motoscafo_poseidon',
    name: 'Motoscafo',
    lengthM: 9,
    knots: 48,
    accel: 150,
    coast: 55,
    brake: 190,
    tank: 80,
    perKm: 4,
    drums: 150,
    note: 'Il motoscafo più veloce del mare',
    art: 'motoscafo_poseidon',
    picture: { ...PICTURE, keel: 0.73, propX: 0.05, propY: 0.72 },
  },
  {
    id: 'moto_imperium',
    name: 'Moto d’acqua',
    lengthM: 4,
    knots: 44,
    accel: 170,
    coast: 60,
    brake: 210,
    tank: 35,
    perKm: 2,
    drums: 80,
    note: 'Piccola e scattante: pochi fusti, ma arriva ovunque',
    art: 'moto_imperium',
    picture: { ...PICTURE, keel: 0.72, propX: 0.06, propY: 0.66 },
  },
];

/** Rules all boats share. Tuning. */
export const BOAT = {
  /** Dry, it still crawls on its reserve at this share of its top speed (never stuck far from the ship). */
  dryCrawl: 0.15,
  /** Seconds down or up its ramp. */
  launchSeconds: 2.4,
  /** How near its hatch (sideways) "Aggancia" appears. */
  dockReach: 50,
  /** Slow enough to moor at a pier or dock in its hatch: slower than this (units/s, ~3 knots:
   *  the throttle lever rarely sits exactly at zero). */
  stillBelow: 28,
  /** It stops this far (units) from the edge of the ice sheet: it cannot break it. */
  iceMargin: 4,
  /** Its view (owner, 8 ottobre: like the submarine's, closer than the helm's, so the boat does not look tiny):
   *  sea shown top to bottom, how far it may look above the surface, and how far ahead at top speed (units). */
  camera: { viewHeightUnits: 150, minY: -90, lookAhead: 90 },
  /** The engine sound: higher and quicker than the ship's. */
  soundPitch: 1.8,
};

export const BOAT_TEXT = {
  launched: (name: string): string =>
    `${name} in acqua. Per rientrare torna davanti al portellone aperto e premi Aggancia.`,
  docked: (name: string, poured: number, filled: number): string =>
    [
      `${name} nella stiva.`,
      poured > 0 ? `Travasati ${Math.round(poured)} L dai fusti nella nave.` : '',
      filled > 0 ? `Serbatoio rifornito dalla nave (${Math.round(filled)} L).` : '',
    ]
      .filter(Boolean)
      .join(' '),
  ice: 'Il ghiaccio blocca il motoscafo: solo la nave lo rompe.',
  dry: 'Serbatoio vuoto: vai avanti piano con la riserva.',
  stopToLaunch: 'Ferma la nave e apri il portellone.',
};

// Leviatano — the expedition ship (owner's decisions of 4 ottobre 2026): your home at sea. Aurelio brings it at the
// end of chapter 4 with your submarine in its hold. It sails on the surface, breaks the ice, never gets stuck
// (what sticks out of the water it sails round, on the far lane, behind it); stopped, its side hatch opens, the
// submarine slides down the ramp to mid-water under it and docks again only in front of the hatch. Open, the ship
// does not move. You drive it, and the submarine, with levers (HELM). Values marked "tuning" are a first pass.
import { PORT, PORTO_FANGO, type PortDef } from './economy';

export const SHIP = {
  art: 'nave_1', // public/world: hatch closed…
  artOpen: 'nave_1_aperta', // …and open (same frame, so they line up)
  length: 180, // units ≈ 30 m: the whole picture's width
  /** Where things are on the picture (1379×752, bow on the right), as shares of its width and height. Tuning. */
  picture: {
    aspect: 752 / 1379, // height / width
    waterline: 0.57, // the sea surface crosses the hull here
    keel: 0.79, // bottom of the hull (rudder and sonar dome hang a little lower)
    hatchX: 0.45, // middle of the hatch, from the stern (left edge)
    hatchY: 0.62, // middle of the hatch opening
    rampEnd: 0.93, // lowest point of the open ramp
    helmX: 0.35, // the wheelhouse: where you stand at the helm
    deckY: 0.38,
  },
  maxSpeed: 220, // units/s at full throttle (~1 km in 27 s). Tuning: fast, not extreme
  accel: 38, // units/s² while speeding up: a heavy hull
  coast: 22, // units/s² it slows down by itself, throttle down (inertia)
  brake: 60, // units/s² when the lever points the other way
  stillBelow: 4, // units/s: slower than this it counts as still (the instruments show 0 knots)
  turnBelow: 12, // units/s: slower than this, a lever the other way turns it round (at once: owner's choice)
  /** Fuel (owner, 4 ottobre: bought at the port, planned for the expedition). Tuning. */
  fuel: { tank: 500, perKm: 10 },
  /** Breaking the ice: slower, and the channel freezes again later, far from you. */
  iceMult: 0.4,
  iceBite: 180, // units/s² it slows down when the bow hits the ice too fast
  refreezeSeconds: 40,
  refreezeDistance: 420, // units from you and the ship before the ice closes again (never on screen)
  /** Shallow water: it stops this far above the keel. */
  minUnderKeel: 10,
  /** The far lane: what sticks out of the water (islands, islets, icebergs) it sails round, behind it. */
  lane: { seconds: 0.9, scale: 0.72, darken: 0.45, lift: 10, lookAhead: 70 },
  /** Planing at speed: the bow lifts (radians) and the hull rises a little (units). Look only. */
  plane: { from: 0.55, pitch: 0.05, lift: 2.5 },
  /** Rocking on the waves (look only), scaled by the weather's waves. */
  rock: { pitch: 0.012, heave: 1.1, hz: 0.35 },
  hatchSeconds: 1.4, // opening or closing
  /** The submarine: down the ramp to this depth under the surface, back the same way. */
  launchSeconds: 3.2,
  launchDepth: 62, // units under the surface (~10 m)
  dockReach: 26, // units from the docking point (under the ramp) where Aggancia appears
  boardReach: 18, // units beyond the hull (sideways) or under the surface where A bordo appears
  /** Where it docks in each port (deep enough water, alongside the pier) and how near counts. */
  dock: { portofosco: PORT.x + 120, fango: PORTO_FANGO.x + 50 } as Record<PortDef['id'], number>,
  dockReachPort: 90,
  /** The view at the helm: wider (the ship is big) and higher (its masts). Tuning. */
  camera: { viewHeightUnits: 230, minY: -150, lookAhead: 70, y: -16 },
};

/** Fuel of the ship and the submarine: how much going slowly saves, the price, the transfer between them. */
export const FUEL = {
  /** Litres per km = perKm × (idleShare + (1 − idleShare) × throttle): going slowly lasts longer. Tuning. */
  idleShare: 0.5,
  pricePerLitre: 0.25, // teeth. Tuning
  transferStep: 25, // litres per tap in the cockpit
  /** The submarine fills up at a harbour when it is moored this close to the pier (units). */
  portReach: 320,
};

/** The rescue flare (owner: a button in the cockpit, and in the submarine left dry). */
export const RESCUE = {
  teethShare: 0.25,
  minTeeth: 50,
};

/** The levers, for the ship and the submarine (owner: no joystick in a vehicle). */
export const HELM = {
  /** Shown speed: knots per unit/s. One factor for both: the ship at full throttle shows ~24 knots. */
  knotsPerUnit: 24 / 220,
  diveDeadzone: 0.15, // the dive lever snaps to the middle this close to it
  keyThrottlePerSec: 0.6, // keyboard: W / S move the throttle this much per second
  subTurnBelow: 18, // units/s: the submarine turns round below this speed
  subDiveMult: 0.6, // the dive lever at full: this share of the submarine's top speed, up or down
};

export const SHIP_TEXT = {
  given:
    'Aurelio è arrivato con una nave da spedizione e ha caricato il tuo sottomarino nella stiva. Avvicinati in superficie e premi A bordo.',
  aboard: 'Al timone. Leva a sinistra: il gas (resta dove la lasci). Leva a destra: la direzione.',
  shallow: 'Fondale troppo basso: la nave non passa.',
  hatchMoving: 'Ferma la nave per aprire il portellone.',
  launched: 'Il sottomarino è in acqua. Per rientrare torna sotto il portellone e premi Aggancia.',
  docked: 'Il sottomarino è nella stiva. Chiudi il portellone per ripartire.',
  hatchOpenStill: 'Col portellone aperto la nave non si muove.',
  fuelOutShip: 'La nave è senza carburante: si ferma. Nel cockpit c’è il razzo di soccorso.',
  fuelOutSub: 'Il sottomarino è senza carburante. Puoi uscire e nuotare, o usare il razzo di soccorso.',
  rescued: (where: string, teeth: number): string =>
    `Razzo di soccorso: un rimorchiatore ti porta ${where}${teeth ? `. Paghi ${teeth} denti` : ''}.`,
  wreckedToShip: (teeth: number): string =>
    `Lo scafo del sottomarino cede. Ti rimorchiano alla nave${teeth ? `: perdi ${teeth} denti` : ''}. Riparalo al porto.`,
};

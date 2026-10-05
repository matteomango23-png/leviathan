// Leviatano — the expedition ship (owner's decisions of 4 ottobre 2026): your home at sea. Aurelio brings it at the
// end of chapter 4 with your submarine in its hold. It sails on the surface east of the trading harbour of Porto
// Fango, breaks the ice and finds nothing in its way (owner, 5 ottobre); stopped, its side hatch opens, the
// submarine slides down the ramp to mid-water under it and docks again only in front of the hatch. Open, the ship
// does not move. You drive it, and the submarine, with levers (HELM). Values marked "tuning" are a first pass.

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
    propX: 0.15, // the propeller (bubbles when it turns)
    propY: 0.72,
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
  /** Planing at speed: the bow lifts (radians) and the hull rises a little (units). Look only. */
  plane: { from: 0.55, pitch: 0.05, lift: 2.5 },
  /** Rocking on the waves (look only), scaled by the weather's waves. */
  rock: { pitch: 0.012, heave: 1.1, hz: 0.35 },
  /** Its lights (owner, 5 ottobre): lit windows and lanterns of the painting (shares of the picture, radius in
   *  units) and a floodlight under the hull shining down this far (units). Tuning. */
  /** A soft light under the hull, like the submarine's (owner, 5 ottobre: the lit windows and the floodlight
   *  "fanno cacare"): spots along the keel (shares of the picture) that open the dark, and a faint wash. */
  lights: { under: { from: 0.25, to: 0.75, v: 0.8, below: 18, radius: 34, spots: 4, wash: 0.03 } },

  /** The tug of the rescue flare (public/world/rimorchiatore.webp): its length, waterline, gap ahead of the bow. */
  tug: { art: 'rimorchiatore', length: 110, waterline: 0.66, gap: 26, seconds: 9 },
  /** The sonar (owner, 5 ottobre): switched on at the helm, it hears only under this speed; it pings this often. */
  sonar: { maxKnots: 10, pingSeconds: 2.6, cruiseKnots: 8 }, // cruise: "Avanti adagio" in the cockpit
  /** The chart of the bridge: km shown each side of the ship (owner, 5 ottobre: "i prossimi 2 km"). */
  chart: { halfKm: 2 },
  hatchSeconds: 1.4, // opening or closing
  /** The submarine: down the ramp to this depth under the surface, back the same way. */
  launchSeconds: 3.2,
  /** Docking: the submarine first glides from where it is to the nearest point of the ramp (units/s; owner,
   *  5 ottobre: "non teletrasportarlo"). */
  dockGlide: 45,
  launchDepth: 62, // units under the surface (~10 m)
  dockReach: 40, // units: how near the hatch (sideways) Aggancia appears, from under the ramp up to the hatch
  boardReach: 18, // units beyond the hull (sideways) or under the surface where A bordo appears
  /** How near its berth (PortDef.shipDock) counts as alongside the pier. */
  dockReachPort: 90,
  /** The view at the helm: wider (the ship is big) and higher (its masts). Tuning. */
  camera: { viewHeightUnits: 230, minY: -150, lookAhead: 70, y: -16 },
};

/** Parts for the ship, bought at the harbours (owner, 4 ottobre: the rewards of the far seas). Tuning. */
export interface ShipUpgradeDef {
  id: string;
  name: string;
  price: number;
  text: string;
  tankExtra?: number; // litres more in the tank
  sonarMult?: number; // × the range of the anomalous echoes
  speedMult?: number; // × top speed
}
export const SHIP_UPGRADES: ShipUpgradeDef[] = [
  { id: 'serbatoio', name: 'Serbatoio grande', price: 900, text: '300 litri in più: spedizioni più lunghe', tankExtra: 300 },
  { id: 'sonar_profondo', name: 'Sonar profondo', price: 1500, text: 'Sente le echi anomale dal doppio della distanza', sonarMult: 2 },
  { id: 'motori', name: 'Motori potenziati', price: 2500, text: 'Il 20% più veloce', speedMult: 1.2 },
];

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
  hatchMoving: 'Ferma la nave per aprire il portellone.',
  launched: 'Il sottomarino è in acqua. Per rientrare torna sotto il portellone e premi Aggancia.',
  docked: 'Il sottomarino è nella stiva. Chiudi il portellone per ripartire.',
  hatchOpenStill: 'Col portellone aperto la nave non si muove.',
  // owner, 5 ottobre: diving off a moving ship (or out of a moving submarine) left you behind
  stopToDive: 'Ferma la nave prima di tuffarti.',
  stopToLeave: 'Fermati prima di uscire dal sottomarino.',
  fuelOutShip: 'La nave è senza carburante: si ferma. Nel cockpit c’è il razzo di soccorso.',
  fuelOutSub: 'Il sottomarino è senza carburante. Puoi uscire e nuotare, o usare il razzo di soccorso.',
  rescued: (where: string, teeth: number): string =>
    `Razzo di soccorso: un rimorchiatore ti porta ${where}${teeth ? `. Paghi ${teeth} denti` : ''}.`,
  wreckedToShip: (teeth: number): string =>
    `Lo scafo del sottomarino cede. Ti rimorchiano alla nave${teeth ? `: perdi ${teeth} denti` : ''}. Riparalo al porto.`,
};

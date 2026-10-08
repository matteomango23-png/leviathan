// Leviatano — the expedition ship (owner's decisions of 4 ottobre 2026): your home at sea. Aurelio gives you the
// first at Porto Fango with your submarine in its hold; each model's own numbers are in data/fleet.ts, the rules
// they share are here. It sails on the surface east of the trading harbour of Porto
// Fango, breaks the ice and finds nothing in its way (owner, 5 ottobre); stopped, its side hatch opens, the
// submarine slides down the ramp to mid-water under it and docks again only in front of the hatch. Open, the ship
// does not move. You drive it, and the submarine, with levers (HELM). Values marked "tuning" are a first pass.

export const SHIP = {
  stillBelow: 4, // units/s: slower than this it counts as still (the instruments show 0 knots)
  turnBelow: 12, // units/s: slower than this, a lever the other way turns it round (at once: owner's choice)
  /** Fuel: tank and use are each ship's (data/fleet.ts). idlePerMinute: litres burnt by a running engine even
   *  with the ship still (owner, 8 ottobre: switch it off). */
  fuel: { idlePerMinute: 0.5 },
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
  /** The sonar (owner, 5 ottobre): switched on at the helm, it pings this often. */
  sonar: { pingSeconds: 2.6, cruiseKnots: 8 }, // up to which speed it hears: each ship's (fleet.ts); cruise: "Avanti adagio"
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
  /** An outpost is a barge in open water: alongside it on either side counts (owner, 8 ottobre: only its right side
   *  did). Half the barge (OUTPOST_ART.width) + half the ship + a margin. */
  dockReachOutpost: 280,
  /** The view at the helm: wider (the ship is big) and higher (its masts). Tuning. */
  /** The view at the helm (getting on or off cuts to it behind a short fade: CAMERA.cutFadeMs). */
  /** The view grows with the ship (viewHeightUnits is for a 180-unit ship), up to maxScale. Tuning. */
  camera: { viewHeightUnits: 230, minY: -150, lookAhead: 70, y: -16, refLength: 180, maxScale: 2.2 },
};

/** Fuel of the ship and the submarine: how much going slowly saves, the price, the transfer between them. */
export const FUEL = {
  /** Litres per km = perKm × (idleShare + (1 − idleShare) × throttle): going slowly lasts longer. Tuning. */
  idleShare: 0.5,
  pricePerLitre: 1, // teeth (owner, 8 ottobre: fuel to plan for; was 0.25). Tuning
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
    'La nave è tua, con il sottomarino nella stiva. Avvicinati al fianco in superficie e premi A bordo.',
  aboard: 'Al timone. Leva a sinistra: il gas (resta dove la lasci). Leva a destra: la direzione.',
  hatchMoving: 'Ferma la nave per aprire il portellone.',
  launched: 'Il sottomarino è in acqua. Per rientrare torna sotto il portellone e premi Aggancia.',
  docked: 'Il sottomarino è nella stiva. Chiudi il portellone per ripartire.',
  hatchOpenStill: 'Col portellone aperto la nave non si muove.',
  // owner, 5 ottobre: diving off a moving ship (or out of a moving submarine) left you behind
  stopToDive: 'Ferma la nave prima di tuffarti.',
  stopToLeave: 'Fermati prima di uscire dal sottomarino.',
  subBroken: 'Il sottomarino è rotto e non hai denti per ripararlo: vendi i pesci al porto, poi riprova.',
  fuelOutShip: 'La nave è senza carburante: si ferma. Nel cockpit c’è il razzo di soccorso.',
  fuelOutSub: 'Il sottomarino è senza carburante. Puoi uscire e nuotare, o usare il razzo di soccorso.',
  rescued: (where: string, teeth: number): string =>
    `Razzo di soccorso: un rimorchiatore ti porta ${where}${teeth ? `. Paghi ${teeth} denti` : ''}.`,
  wreckedToShip: (teeth: number): string =>
    `Lo scafo del sottomarino cede. Ti rimorchiano alla nave${teeth ? `: perdi ${teeth} denti` : ''}.`,
};

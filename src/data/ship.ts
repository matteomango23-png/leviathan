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
  /** The ice sheet breaks this far behind the bow (units, near…far): under the hull, never ahead of it. */
  iceBehindBow: [8, 40] as [number, number],
  iceCrackSeconds: 0.4, // after the last ice broken, the bow still counts as in the ice this long (look only)
  refreezeSeconds: 40,
  refreezeDistance: 420, // units from you and the ship before the ice closes again (never on screen)
  /** Smoke from the stacks while the engine runs, like a steam train (owner, 8 ottobre): puffs born at the stack
   *  stay in the air where they were born, so at speed they stretch into a long trail behind; they rise, swell and
   *  turn from near black to grey. More throttle, more smoke. Rates in puffs per second per stack, life in seconds,
   *  lift in units/s (slowing by liftDrag per second), size and swell (× size over its life), wind drift (units/s).
   *  Tuning. */
  smoke: { idleRate: 1.5, fullRate: 30, life: 5.5, lift: 45, liftDrag: 0.6, size: 7, swell: 4.5, alpha: 0.8, wind: 5, max: 360 },
  /** Coming into Porto Fango (and to the end of the sea): within range (units) it slows down by itself at decel
   *  (units/s²) so that it stops at the berth (owner, 8 ottobre). Tuning. */
  /** The U-Boats' dive (block 4c): air refilled afloat (seconds of air per second), the warning before it runs out
   *  (seconds), shallower than this (units) it counts as afloat, how fast it surfaces when the air is gone, and the air it
   *  needs afloat to dive again (seconds). Tuning. */
  dive: { refill: 4, warnAt: 30, afloatBelow: 3, emergencyRise: 60, minAir: 40 },
  approach: { range: 1800, decel: 30 }, // from 1800 units the curve allows ~330 u/s: above the fastest ship
  /** Planing at speed: the bow lifts (radians) and the hull rises a little (units). Look only. */
  plane: { from: 0.55, pitch: 0.05, lift: 2.5 },
  /** Its lights (owner, 5 ottobre): lit windows and lanterns of the painting (shares of the picture, radius in
   *  units) and a floodlight under the hull shining down this far (units). Tuning. */
  /** A soft light under the hull, like the submarine's (owner, 5 ottobre: the lit windows and the floodlight
   *  "fanno cacare"): spots along the keel (shares of the picture) that open the dark, and a faint wash. */
  lights: { under: { from: 0.25, to: 0.75, v: 0.8, below: 18, radius: 34, spots: 4, wash: 0.03 } },

  /** The light under the still ship (block 5b, owner 9 ottobre 2026): a switch at the helm, only with the ship still;
   *  it burns a little fuel. Every `pulseSeconds` the beasts in its sonar's range get a place under the hull to
   *  swim to: the curious (calm and shy) at once, the hunters (aggressive) after `predatorsAfter` seconds of light.
   *  Their places: this far each side of the ship and this deep under its keel (units); its glow (units). Tuning. */
  underLight: {
    litresPerMinute: 2,
    pulseSeconds: 5,
    predatorsAfter: 45,
    spread: 120,
    below: [25, 90] as [number, number],
    glow: 90,
  },
  /** The ships' hull (block 5c, owner 10 ottobre 2026). A U-Boat under water bumping rock faster than `bumpFrom`
   *  (units/s) takes `perSpeed` a unit/s above it (once every `bumpWait` s) and bounces back by `bounce`; in a storm
   *  above half its top speed it wears `stormPerSecond` at the worst weather (from the weather's waves `stormFrom`);
   *  a giant ramming it hits `ram` × its length in metres / 6, then backs off `ramCalm` s. Half the hull: a warning;
   *  nothing left: broken down (no engine). Mended only at Porto Fango: teeth per point, or spare parts brought by
   *  the speedboat or the submarine, priced by the ship's worth (fullRepairShare). Tuning. */
  hull: {
    bumpFrom: 20,
    perSpeed: 0.25,
    bumpWait: 1,
    bounce: 0.3,
    stormPerSecond: 0.6,
    stormFrom: 1.8,
    ram: 8,
    ramCalm: 3,
    /** Mending it from nothing to whole costs this share of the ship's price (owner, 10 ottobre: the Ocean's
     *  Nightmare, the dearest, 10%); Aurelio's gift counts as worth `giftValue`; spare parts cost `partsMult` times
     *  the yard (they travel). */
    fullRepairShare: 0.1,
    giftValue: 6000,
    partsMult: 1.2,
    /** Spare parts a speedboat or jet ski / a submarine carries (hull points of the ship). */
    partsBoat: 80,
    partsSub: 50,
  },
  /** The surface radar of the cockpit (block 5c): what is within `rangeM` of the hull's ends, swept round once every
   *  `sweepSeconds`; the parking-sensor beeps for an obstacle ahead within `rangeM` faster than `beepFromKnots`,
   *  every `beepFar` s far away down to `beepNear` s close. Tuning. */
  radar: { rangeM: 30, sweepSeconds: 3, beepFromKnots: 4, beepFar: 1.2, beepNear: 0.18 },
  /** The Krill Hunter's mouth (owner, 10 ottobre 2026): it opens only with the ship still and its hatches shut, lights
   *  the sea, draws the sardine schools within `reach` (units) and swallows the fish within `bite` of it; at most
   *  `maxSardines` and `seconds` each time, then `rechargeSeconds` to open again (no endless feast). Tuning. */
  mouth: { seconds: 60, maxSardines: 25, rechargeSeconds: 600, reach: 420, bite: 22, openSeconds: 0.8 },
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
  /** The view grows with the ship, less than the ship (owner, 8 ottobre: the big ones looked as big as the first):
   *  × (length / refLength) ^ growth, up to maxScale. viewHeightUnits is for a 180-unit ship. Tuning. */
  camera: { viewHeightUnits: 230, minY: -150, lookAhead: 70, y: -16, refLength: 180, growth: 0.4, maxScale: 2 },
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

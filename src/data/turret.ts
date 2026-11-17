// Leviatano — the turret (owner, 17 novembre 2026: "una view in prima persona su una mitragliatrice o una
// cannoniera… deve essere figa… un gioco nel gioco"): a sea battle seen from inside your ship's gun turret. The duel
// lives on a plane (ahead along your course, and to your side), the view turns with the turret, the sea and the sky
// come from the weather and the hour of that moment. Distances in metres, angles in radians, times in seconds.
// Values marked "tuning" are a first pass: change them here, never in systems.

export const TURRET = {
  /** The view: how wide it sees across (radians) and how high above the sea the turret sits (m). */
  fov: 1.05,
  height: 9,
  /** Turning the turret: radians per screen pixel dragged, and how far up and down it goes. */
  dragRad: 0.0042,
  keyRad: 1.1,
  pitchMin: -0.14,
  pitchMax: 0.32,
  /** Your gun's shells from the turret fly this many times faster than in the side battle (a real gun's shell:
   *  you lead it a little and lift it far away); the enemy's keep their speed, so you can dodge them. */
  gunSpeedMult: 2.6,
  /** How far it sees before the mist of the horizon swallows everything (m), more in fog. */
  horizonM: 900,
  fogHorizonM: 260,
  /** The ship under you on the waves: the view rolls (radians) and heaves (m) this much per unit of the weather's
   *  waves (1 calm … 3.2 storm), at these speeds (rad/s). */
  roll: 0.03,
  heave: 0.55,
  rollSpeed: 0.7,
  heaveSpeed: 0.9,
  /** The swells you see: their height (m per unit of waves), length (m) and speed (m/s). */
  swell: { height: 1.1, length: 38, speed: 6 },
};

/** Moving in the duel: your ship along its course at the throttle's share of its top speed; "Accosta" closes or opens
 *  the distance to the side at this speed (m/s); the whole duel never goes nearer than nearM. Tuning. */
export const DUEL = {
  /** The vessel starts this far to your side (m). */
  startSideM: 110,
  sideSpeed: 9,
  nearM: 35,
  /** The enemy's fighting distance (m), its weaving (degrees off it, seconds between changes) and turning speed. */
  rangeM: 150,
  weaveDeg: 55,
  weaveSeconds: [3, 6] as [number, number],
  turnRate: 0.35,
  /** After the end (sunk, or you sunk) the view stays this long before going back to the helm. */
  endSeconds: 4,
};

/** The turret's machine gun (owner: "tum tum tum"): rounds a second, speed (m/s), fall (m/s²), how far off each round
 *  goes, how far a tracer flies before it burns out, hull points per hit, the heat each round adds (1 = it stops),
 *  how fast it cools (per second) and how cool it must be to fire again; a hit's chance of a fire on deck. Tuning. */
export const MACHINE_GUN = {
  rate: 9,
  speed: 260,
  gravity: 9.8,
  spread: 0.007,
  rangeM: 480,
  damage: 1.2,
  heat: 0.055,
  cool: 0.32,
  restartBelow: 0.45,
  fireChance: 0.04,
};

/** The turret's look (colours, sizes on screen in CSS-ish pixels). Tuning. */
export const TURRET_LOOK = {
  /** The glass: the whole view through a reddish pane (multiplied), darker red at its edges. */
  pane: 0xffc8b8,
  /** Under the water the pane looks blue-green. */
  paneUnder: 0xb8e0e4,
  glass: 0x5a0d0a,
  glassAlpha: 0.4,
  rim: 0x1c1512,
  /** The reticle's colour, and its distance marks (m). */
  reticle: 0xff7a4a,
  marks: [100, 200, 300],
  /** How long a crack on the glass stays (s), the red flash of a hit and the shake. */
  crackSeconds: 9,
  hitFlash: 0.35,
  shake: 7,
};

/** Under the water in the turret (owner, 17 novembre 2026: "deve funzionare anche sott'acqua… si vede lo scafo da
 *  sotto"). A U-Boat dives in the duel at `diveSpeed` (m/s) up to its own depth (data/fleet.ts dive); deeper than
 *  `periscopeM` the turret's eye is under the water and only torpedoes work. The water's colour by depth (m), how
 *  far one sees (m) by day and by night, the snow of particles. Tuning. */
export const UNDERWATER = {
  diveSpeed: 4,
  periscopeM: 4,
  /** The deepest a duel goes, whatever the U-Boat (m): the fight stays near the ships. */
  maxDepthM: 60,
  colours: [
    [0, 0x2c6a7c],
    [25, 0x103a4a],
    [70, 0x061820],
    [150, 0x020608],
  ] as [number, number][],
  surfaceLight: 0x9fd6e0,
  seeM: 150,
  nightSeeM: 45,
  snow: 70,
  /** The turret looks further up and down under the water (radians). */
  pitchMin: -0.7,
  pitchMax: 0.75,
};

/** The guided torpedo (owner, 8 ottobre idea, 17 novembre 2026: "siluri… li porti su e giù"): it runs at a set speed
 *  (m/s) and turns towards where the turret points, at most this fast (rad/s); it stays under the water, gets lost
 *  past its reach (m); a hit takes these hull points and lets in this much water; one at a time, then a reload (s).
 *  The enemy's run straight at where you were. Tuning. */
export const TORPEDO_GUIDE = {
  speed: 24,
  turn: 0.7,
  rangeM: 420,
  damage: 38,
  flood: 0.42,
  reload: 6,
  depthMin: 1.2,
  /** The enemy U-Boat's torpedoes: speed (m/s) and seconds between them. */
  foeSpeed: 16,
  foeReload: 9,
};

/** The rough 3D hulls (owner: "anche in modo abbastanza sommario 3D"): beam and draft as shares of the length, the
 *  height of the deck above the water and of the superstructure (shares of the picture's height above the water),
 *  the stations along the hull; the colours of the bottom and the deck. A U-Boat is a cigar this thick. Tuning. */
export const HULL_3D = {
  beam: 0.16,
  stations: 12,
  superstructure: { from: -0.22, to: 0.12, width: 0.62, height: 0.55 },
  bottom: 0x2a1f1b,
  deck: 0x5a524a,
  cigar: 0.09,
  /** Above the water the painted side view shows while the ship is broadside; the 3D one when it points its bow
   *  or stern at you this much (|sin| below). */
  sideBelow: 0.45,
};

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

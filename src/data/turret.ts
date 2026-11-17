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

/** Moving in the duel (owner, 17 novembre 2026: "il gas per avvicinarsi non funziona… la nave scompariva"): your
 *  ship goes where its bow points, at the throttle's share of its top speed (backwards at most `reverse` of it), the
 *  rudder turning the bow at `steerRate` (rad/s); never nearer than nearM. The vessel is never faster than
 *  `foeSpeedShare` of your top speed, never farther than `leashM` (past it, it circles back), and broken it runs at
 *  only `fleeShare` of that. Tuning. */
export const DUEL = {
  /** The vessel starts this far to your side (m). */
  startSideM: 110,
  reverse: 0.3,
  steerRate: 0.32,
  nearM: 35,
  /** The enemy's fighting distance (m), its weaving (degrees off it, seconds between changes) and turning speed. */
  rangeM: 150,
  weaveDeg: 55,
  weaveSeconds: [3, 6] as [number, number],
  turnRate: 0.35,
  foeSpeedShare: 0.8,
  leashM: 260,
  fleeShare: 0.55,
  /** After the end (sunk, or you sunk) the view stays this long before going back to the helm. */
  endSeconds: 4,
};

/** The turret's machine gun (owner: "tum tum tum"; "voglio sparare per un po'… sentirmi potente": about eight
 *  seconds of fire before it is too hot): rounds a second, speed (m/s), fall (m/s²), how far off each round
 *  goes, how far a tracer flies before it burns out, hull points per hit, the heat each round adds (1 = it stops),
 *  how fast it cools (per second) and how cool it must be to fire again; a hit's chance of a fire on deck. Tuning. */
export const MACHINE_GUN = {
  rate: 11,
  speed: 260,
  gravity: 9.8,
  spread: 0.007,
  rangeM: 480,
  damage: 1.2,
  heat: 0.0115,
  cool: 0.3,
  restartBelow: 0.45,
  fireChance: 0.04,
  /** The tracer's width on screen (px): at least, at most. */
  tracer: [1.5, 4] as [number, number],
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

/** The 3D hulls (owner, 17 novembre 2026: "Preferisco che mi crei un modello tu in 3D per la nave nemica, simile a
 *  quello che sarà il suo asset 2D"): the stations along a hull, the colours of its parts (the side takes the class's
 *  tint), a U-Boat's thickness (share of its length). Tuning. */
export const HULL_3D = {
  stations: 14,
  cigar: 0.085,
  colours: {
    /** Under the waterline: the red of the antifouling, darkened by the sea. */
    bottom: 0x5a1e16,
    /** The waterline's stripe. */
    boot: 0x8a2a1c,
    deck: 0x4e4842,
    top: 0x8a8378,
    metal: 0x2a2826,
    funnel: 0x1e1a18,
    /** The funnel's band: the Compagnia's black oil on rust red. */
    band: 0x7a2416,
  },
  /** Its portholes and windows, lit by night. */
  window: 0xffd27a,
};

/** The three models of the Compagnia (shares of the length; heights in metres): beam, the deck's height above the
 *  water and the keel's depth under it (shares of the length), how much the bow rises (share of the deck's height),
 *  and where the parts sit along the hull (−0.5 stern … 0.5 bow). Tuning. */
export const HULL_MODELS = {
  baleniera: {
    beam: 0.2,
    freeboard: 0.075,
    draft: 0.09,
    bowRise: 0.7,
    /** The wheelhouse: from … to along it, its width (share of the beam), height (m). */
    house: { from: -0.3, to: -0.06, width: 0.72, height: 3.2 },
    funnel: { at: -0.2, width: 0.1, height: 5.2 },
    mast: { at: 0.18, height: 9 },
    harpoon: { at: 0.44 },
    boat: { at: -0.36 },
  },
  caccia: {
    beam: 0.12,
    freeboard: 0.05,
    draft: 0.055,
    bowRise: 0.45,
    /** The stepped bridge: two blocks, the upper smaller. */
    house: { from: -0.06, to: 0.14, width: 0.7, height: 3 },
    funnel: { at: -0.12, width: 0.11, height: 4.6 },
    mast: { at: 0.06, height: 11 },
    /** Its two gun turrets. */
    turrets: [0.3, -0.32],
  },
  uboot: {
    /** The tower: where, how long (share of the length), how tall above the hull (m). */
    tower: { at: 0.06, length: 0.13, height: 3.2 },
    gun: { at: 0.2 },
  },
};

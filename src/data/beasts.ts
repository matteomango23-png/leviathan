// Leviatano — how big beasts move, fight, get tamed and follow you (tappa 2).
// Speeds marked "U/s" are in diver lengths per second (DIVER.lengthUnits), as in prototype/prova-realistica.html.
// Values marked "tuning" are a first pass: change them here, never in systems.

/** Movement rules of big beasts (CLAUDE.md, "Regole di movimento delle bestie grandi"). */
export const BIG_BEAST_MOTION = {
  enterSpeed: 3.5, // U/s when coming in from the edge…
  enterSlowdown: 2.2, // …slowing down by this much while entering
  cruiseSpeed: 1.7, // U/s, slow pass near the diver
  exitBoost: 6, // U/s added while accelerating out towards the far edge
  boltSpeed: 14, // U/s at least when bolting away…
  boltOverDiver: 11, // …or this much faster than the diver (also faster than the dash)
  catchUpSpeed: 6, // U/s when left behind off screen while facing the screen
  attackSpeed: 8, // U/s when lunging
  followSeconds: 1.1, // followed this long by the diver → bolt
  followMinSpeed: 1.4, // U/s: the diver counts as "following" above this speed
  lingerSeconds: 9, // in view this long without attacking → bolt
  waitHidden: [0.9, 2.2] as [number, number], // seconds off screen before turning back (angry)
  waitCalm: [3, 7] as [number, number], // tuning: seconds off screen between calm passes
  waitAfterBolt: [1.2, 2.6] as [number, number],
  depthSpread: 0.22, // passes at the diver's depth ± this fraction of the view height
  enterZone: 0.35, // first 35% of the screen: entering
  exitZone: 0.72, // after 72%: accelerating out
  offscreenMargin: 0.52, // off screen when the centre is this many body lengths past the edge
  steerX: 2,
  steerY: 1.5,
  pitchMax: 0.4,
  pitchRate: 3,
  swimPhaseBase: 2.6,
  swimPhasePerSpeed: 0.9,
};

/** Wild beasts: where they live (world units) and when they come back. */
export interface WildSpawnDef {
  speciesId: string;
  area: [number, number, number, number]; // x0, y0, x1, y1: present while the diver is inside
  respawnSeconds: [number, number];
}
export const WILD_SPAWNS: WildSpawnDef[] = [
  { speciesId: 'squalo_bianco', area: [80, 60, 1900, 380], respawnSeconds: [45, 90] },
  { speciesId: 'barracuda', area: [80, 60, 1900, 340], respawnSeconds: [15, 35] },
  { speciesId: 'tartaruga_marina', area: [200, 60, 1800, 320], respawnSeconds: [30, 60] },
  { speciesId: 'torpedine', area: [100, 180, 1900, 380], respawnSeconds: [25, 50] },
];

/** At most this many wild beasts are around you at the same time (tuning). */
export const WILD_RULES = { maxPresent: 2 };

/** How eager each species is to attack on a pass (default BEAST_COMBAT.attackChance). */
export const BEAST_TEMPER: Record<string, { attackChance: number; speedMult?: number }> = {
  tartaruga_marina: { attackChance: 0, speedMult: 0.4 }, // only defends itself when hit; slow swimmer
  barracuda: { attackChance: 0.5 },
  torpedine: { attackChance: 0.25, speedMult: 0.65 },
};

/** Big beasts eat small fish they swim through (food chain): into your bag, or a heart back. */
export const FEEDING = {
  sizes: ['grande', 'colossale'], // species size classes that eat fish
  reachFrac: 0.22, // × body length, around the head
  interval: 0.25, // seconds between bites
};

/** Status effects on wild beasts. */
export const STATUS_RULES = {
  areaRadius: { vicini: 60, ampia: 140 }, // 'area:vicini', 'area:ampia' in moves.ts
  stunSlowdown: 0.1, // speed multiplier while stunned
};

/** Fighting (tuning). Beast damage comes from statsAt().bite × POWER_MULT of the move × type multiplier. */
export const BEAST_COMBAT = {
  attackChance: 0.35, // a calm beast attacks on this share of its passes
  angrySeconds: 30, // after being hit it attacks on every pass for this long
  attackRange: 7, // U: starts the attack when the diver is this close ahead
  telegraphSeconds: 0.55, // jaws open and it slows before lunging: the cue to dodge
  headRadiusFrac: 0.13, // bite reach around the head, × body length
  bodyThicknessFrac: 0.1, // half thickness of the body for hits, × body length
  collideRadiusFrac: 0.07, // radius used against rock, × body length
  diverBiteHearts: 1,
  alfaExtraHearts: 1,
  biteCooldown: 2.5,
  hitFlashSeconds: 0.15,
  barSeconds: 4, // health bar stays visible after a hit
  weaponHitMargin: 1.5, // units: a weapon tip this close to the body hits
};

/** Taming flow around the minigame (TAMING in rules.ts sets the minigame itself). */
export const TAMING_FLOW = {
  levelWithoutTeam: 1, // your "strongest beast" level when the team is empty
  reachFrac: 0.25, // how close to its body (× body length) you must be to start taming
  tiredSeconds: 20, // how long it stays exhausted
  tiredSpeed: 0.6, // U/s drifting while exhausted
  failHpFraction: 0.45, // after a failed taming it recovers to this share of its health
  failHearts: 1, // it throws you off and bites
};

/** Your team in the water (tuning). */
export const TEAM_RULES = {
  recallCooldown: 8, // seconds before a recalled beast can come back
  summonDistance: 90, // appears this far behind you
  followDistance: 34,
  guardRange: 150, // defends you from wild beasts this close
  biteCooldown: 1.6,
  leaveSeconds: 1.5,
  rideReach: 40, // how close to your beast you must be to climb on
  riderOffset: [-0.02, -0.13] as [number, number], // where you sit, × body length (forward, up)
  turnSeconds: 0.6, // a companion turning around (only allowed for your own beasts)
  accelMult: 1.7, // riding: acceleration × the beast's speed
  rideSpeedMult: 1.6, // tuning: riding speed × the beast's speed stat
  rideDash: { speedMult: 2.4, duration: 0.35, cooldown: 1.2 }, // the dash button while riding
};

/** How moves behave (fx names in moves.ts). */
export const MOVE_RULES = {
  biteReachFrac: 0.2, // × body length, around the head
  chargeSpeedMult: 2.2, // × the beast's speed
  chargeSeconds: 0.5,
  executeHpFraction: 0.25, // 'executeLowHp': targets under this share of health are overwhelmed
  woundedFraction: 0.5, // 'x2vsWounded': double damage under this share of health
  frenzyBiteInterval: 0.35,
  biteLunge: 1.3, // a bite pushes the beast forward: × its speed
  boneBreakRadius: 28, // world units around the head
};

/** Sanctuaries: stand still inside to heal (PROGRESSION.sanctuaryHealSeconds). */
export const SANCTUARY_RULES = {
  radius: 26,
  stillSpeed: 14, // u/s: slower than this counts as standing still
};

/** Sprite frame of big beasts (docs/ART.md). */
export const BEAST_SPRITE = {
  frameW: 1000,
  frameH: 460,
  spineY: 250,
  segments: 26,
};

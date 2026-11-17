// The Compagnia dell'Olio Nero at sea (owner, 17 novembre 2026; docs/PROPOSTA-COMPAGNIA.md): its vessels and the
// shots flying between them and you. Not saved: for now they live only in the test arena (arena.ts). Pure logic.
import { ENEMY_CLASSES, type EnemyClassId, type WeaponId } from '../../data/company';
import { HELM } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';

/** calm: on patrol · suspicious: it searches where it last perceived you · hunting: it comes for you and shoots ·
 *  lost: it lost you and searches the last place seen. */
export type AlertPhase = 'calm' | 'suspicious' | 'hunting' | 'lost';

export interface EnemyVessel {
  id: number;
  cls: EnemyClassId;
  x: number;
  face: 1 | -1;
  /** Speed along where it points (units/s, ≥ 0). */
  speed: number;
  /** Units under its floating line (a U-Boat's depth; 0 afloat). */
  dive: number;
  hull: number;
  /** 0 … 1 (data/company.ts DETECTION), and what it does about it. */
  alert: number;
  phase: AlertPhase;
  /** Where it last perceived you, and the seconds since. */
  lastSeen: { x: number; y: number } | null;
  unseen: number;
  /** Seconds before each of its weapons fires again. */
  reload: Partial<Record<WeaponId, number>>;
  /** The middle of its patrol (world x). */
  home: number;
  /** 0 afloat; > 0 seconds since it broke in two and began to sink. */
  sinkT: number;
  /** Its propeller fouled by a beast (seconds left at half speed: lot B3). */
  fouled: number;
  /** What its hull has taken (hullDamage.ts): water in, a fire on deck, its guns jammed. */
  dmg: HullDamage;
  /** Its gun glinting before it fires (s left) and where it aims: where you were when it began (you can dodge). */
  aimT: number;
  aimAt: { x: number; y: number } | null;
  /** In battle: how far off its distance it weaves now (units), and the seconds to its next change. */
  weave: number;
  weaveT: number;
  /** In the inside view (systems/turret/): the view sails it, the world only shows it (not saved). */
  inView?: boolean;
}

/** Water taken in (0 … 1: full, it sinks), a fire on deck and guns jammed (s left). */
export interface HullDamage {
  flood: number;
  fire: number;
  jam: number;
}

export const freshDamage = (): HullDamage => ({ flood: 0, fire: 0, jam: 0 });

/** Battle stations (battle.ts): which vessel you fight, the fixed view, slow motion, how it ended. */
export interface BattleState {
  foe: number;
  /** The view: its middle (world x) and width (units); it never zooms while the battle lasts. */
  cx: number;
  width: number;
  /** The usual width for your ship (BATTLE.frameM): the enemy's distance is a share of it. */
  base: number;
  /** Your first shot before it saw you is worth more. */
  surprise: boolean;
  /** Seconds of slow motion left (real time). */
  slow: number;
  /** Set when it is over (the view holds a moment). */
  result: 'victory' | 'left' | 'lost' | null;
  /** Seconds since it ended. */
  over: number;
}

/** A shell, a torpedo or a depth charge on its way. */
export interface Shot {
  id: number;
  weapon: WeaponId;
  /** Who fired it: it only hits the other side. */
  from: 'you' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Units it may still travel (a torpedo) or the depth it blows up at (a charge, world y). */
  left: number;
  fuseY: number;
}

export interface CompanyState {
  enemies: EnemyVessel[];
  shots: Shot[];
  /** Seconds before each of your ship's weapons fires again. */
  yourReload: Partial<Record<WeaponId, number>>;
  /** What your ship's hull has taken in a battle (not saved). */
  yourDmg: HullDamage;
  /** At battle stations, or null. */
  battle: BattleState | null;
  /** "Armi" opens the inside view in first person instead of the side battle (on by default; the arena's tick turns
   *  it off, owner 17 novembre 2026). */
  turret: boolean;
  /** The inside view is open: the world runs, your ship and the vessels in it are sailed by the view. */
  inside: boolean;
  nextId: number;
}

export const newCompany = (): CompanyState => ({
  enemies: [],
  shots: [],
  yourReload: {},
  yourDmg: freshDamage(),
  battle: null,
  turret: true,
  inside: false,
  nextId: 1,
});

/** Metres to world units, and knots to units/s. */
export const metres = (m: number): number => m * WORLD.unitsPerMetre;
export const knotsToUnits = (k: number): number => k / HELM.knotsPerUnit;

/** Its pose for the ship geometry (systems/ship/geometry.ts): the borrowed picture gives its size. */
export const enemyPose = (e: EnemyVessel): { x: number; face: 1 | -1; dive: number; model: string } => ({
  x: e.x,
  face: e.face,
  dive: e.dive,
  model: ENEMY_CLASSES[e.cls].look,
});

/** A new vessel of this class at x, patrolling round there. */
export function spawnEnemy(c: CompanyState, cls: EnemyClassId, x: number, face: 1 | -1): EnemyVessel {
  const def = ENEMY_CLASSES[cls];
  const e: EnemyVessel = {
    id: c.nextId++,
    cls,
    x,
    face,
    speed: 0,
    dive: metres(def.depthM),
    hull: def.hull,
    alert: 0,
    phase: 'calm',
    lastSeen: null,
    unseen: 0,
    reload: {},
    home: x,
    sinkT: 0,
    fouled: 0,
    dmg: freshDamage(),
    aimT: 0,
    aimAt: null,
    weave: 0,
    weaveT: 0,
  };
  c.enemies.push(e);
  return e;
}

export const afloatEnemies = (c: CompanyState): EnemyVessel[] => c.enemies.filter((e) => e.sinkT <= 0);

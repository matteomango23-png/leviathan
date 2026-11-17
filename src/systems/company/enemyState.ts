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
  /** Its propeller fouled by a beast (seconds left at half speed: lot A2). */
  fouled: number;
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
  nextId: number;
}

export const newCompany = (): CompanyState => ({ enemies: [], shots: [], yourReload: {}, nextId: 1 });

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
  };
  c.enemies.push(e);
  return e;
}

export const afloatEnemies = (c: CompanyState): EnemyVessel[] => c.enemies.filter((e) => e.sinkT <= 0);

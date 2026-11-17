// How the Compagnia finds you (owner, 17 novembre 2026): it sees your ship (farther by day, or by night with your
// lights on; less in Silence, never deep under the water) and hears its engine (louder the faster you go, hardly at
// all in Silence; under the water only with a hydrophone). What it perceives raises its alert; at the top it hunts
// you, and it loses you if it perceives nothing for a while. Numbers in data/company.ts DETECTION. Pure logic.
import { DETECTION, type EnemyClass } from '../../data/company';
import { WORLD } from '../../data/worldLayout';
import type { AlertPhase, EnemyVessel } from './enemyState';

/** What the enemy can perceive of you. */
export interface Quarry {
  x: number;
  y: number;
  /** Metres under the surface (0 afloat). */
  depthM: number;
  /** 0 still … 1 at your top speed. */
  speedShare: number;
  engineOn: boolean;
  silent: boolean;
  /** Any light of yours shining: deck lights, the headlight, the light under the hull. */
  lightsOn: boolean;
  /** Half your hull's length (m): it is seen from its nearest end, not its middle. */
  halfM?: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** How far it sees you now (m): the day's sight fading into the night's, your lights at night seen from afar. */
export function sightRange(def: EnemyClass, q: Quarry, night: number): number {
  const dark = def.sightM * (1 - night * (1 - DETECTION.nightSight));
  const lit = q.lightsOn ? def.sightM * DETECTION.lightsMult * night : 0;
  return Math.max(dark, lit) * (q.silent ? DETECTION.silentSight : 1);
}

/** How loud you are (0 … 1): the engine's noise with your speed, in Silence only the electric motors' whisper. */
export function noiseOf(q: Quarry): number {
  if (q.silent) return q.speedShare * DETECTION.silentNoise;
  return q.engineOn ? Math.max(DETECTION.idleNoise, q.speedShare) : 0;
}

/** How well it perceives you now (0 … 1), from where it is (world point, metres under the surface, half its own
 *  length in metres): hull to hull, not middle to middle. */
export function perceive(
  def: EnemyClass,
  at: { x: number; y: number; depthM: number; halfM?: number },
  q: Quarry,
  night: number,
): number {
  const across = Math.max(0, Math.abs(q.x - at.x) / WORLD.unitsPerMetre - (q.halfM ?? 0) - (at.halfM ?? 0));
  const d = Math.hypot(across, (q.y - at.y) / WORLD.unitsPerMetre);
  // a surface ship's lookouts do not see under the water; a U-Boat sees only close by
  const deep = q.depthM > DETECTION.periscopeM;
  const canSee = !deep || at.depthM > DETECTION.periscopeM;
  const see = canSee ? clamp01(1 - d / sightRange(def, q, night)) : 0;
  // the engine's noise carries through the air to a whaler only while you are afloat
  const canHear = def.hydrophone || !deep;
  const range = def.hearM * noiseOf(q);
  const hear = canHear && range > 0 ? clamp01(1 - d / range) : 0;
  const p = Math.max(see, hear);
  return p < DETECTION.floor ? 0 : p;
}

/** One step of its alert from what it perceives; returns its new phase when it changed. */
export function stepAlert(
  e: EnemyVessel,
  p: number,
  you: { x: number; y: number },
  dt: number,
): AlertPhase | null {
  const was = e.phase;
  if (p > 0) {
    e.alert = Math.min(1, e.alert + DETECTION.rise * p * dt);
    e.lastSeen = { x: you.x, y: you.y };
    e.unseen = 0;
  } else {
    e.unseen += dt;
    if (e.phase !== 'hunting') e.alert = Math.max(0, e.alert - DETECTION.fall * dt);
  }
  if (e.phase === 'hunting') {
    // it keeps hunting while it perceives you, and for a while after; then it searches where you were
    if (e.unseen >= DETECTION.loseSeconds) {
      e.phase = 'lost';
      e.alert = Math.min(e.alert, DETECTION.hunting - 0.05);
    }
  } else if (e.alert >= DETECTION.hunting) e.phase = 'hunting';
  else if (e.alert >= DETECTION.suspicious) e.phase = was === 'lost' ? 'lost' : 'suspicious';
  else e.phase = 'calm';
  return e.phase !== was ? e.phase : null;
}

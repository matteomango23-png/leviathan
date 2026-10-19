// One row of a ship's card (ship/stats.ts, ship/bayStats.ts) and the knots of a speed.
import { HELM } from '../../data/ship';

export interface StatRow {
  /** Same key on every ship: what is compared. */
  key: string;
  /** The section: the ship, or one of its vehicles ("Sottomarino con sonar"). */
  group: string;
  label: string;
  value: number;
  text: string;
  /** Which way is better (none: just a fact, like the length). */
  better: 'high' | 'low' | 'none';
  /** The difference shown, in its unit ("+13 km"). */
  unit: string;
}

export const knots = (unitsPerSec: number): number => Math.round(unitsPerSec * HELM.knotsPerUnit);

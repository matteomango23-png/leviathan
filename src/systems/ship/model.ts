// Which ship you sail (data/fleet.ts): its size, speed, tank, sonar and painting, read from its model. The rules all
// ships share stay in data/ship.ts.
import {
  FIRST_SHIP,
  SHIP_MODELS,
  type BayHatch,
  type ShipModelDef,
  type ShipPicture,
} from '../../data/fleet';
import { HELM, SHIP } from '../../data/ship';
import { WORLD } from '../../data/worldLayout';

const FIRST = SHIP_MODELS.find((m) => m.id === FIRST_SHIP)!;

/** A ship's model (an unknown id: the first ship). */
export const shipModel = (s: { model: string }): ShipModelDef =>
  SHIP_MODELS.find((m) => m.id === s.model) ?? FIRST;

/** Its painting and where things are on it (a model not painted yet borrows the first ship's). */
export const shipArt = (s: { model: string }): NonNullable<ShipModelDef['art']> =>
  shipModel(s).art ?? FIRST.art!;
export const shipPicture = (s: { model: string }): ShipPicture => shipArt(s).picture;

/** Its length in world units: the real metres (owner, 8 ottobre: the big ones must look majestic). */
export const shipLength = (s: { model: string }): number => shipModel(s).lengthM * WORLD.unitsPerMetre;

/** Top speed, in units/s. */
export const shipTopSpeed = (s: { model: string }): number => shipModel(s).knots / HELM.knotsPerUnit;

/** Litres in a full tank. */
export const shipTank = (s: { model: string }): number => shipModel(s).tank;

/** How it speeds up, slows down and turns round (the heavy ones slowly). */
export function shipRates(s: { model: string }): {
  accel: number;
  coast: number;
  brake: number;
  turnBelow: number;
} {
  const m = shipModel(s);
  return { accel: m.accel, coast: m.coast, brake: m.brake, turnBelow: SHIP.turnBelow };
}

/** The sonar: × the base range, and the speed (knots) up to which it hears. */
export const sonarRange = (s: { model: string }): number => shipModel(s).sonar.range;
export const sonarMaxKnots = (s: { model: string }): number => shipModel(s).sonar.maxKnots;

/** Which of its hatches holds the submarine, and which the speedboat or jet ski (−1: none). */
export const subBay = (s: { model: string }): number => shipModel(s).bays.findIndex((b) => b.kind === 'sub');
export const boatBay = (s: { model: string }): number =>
  shipModel(s).bays.findIndex((b) => b.kind === 'boat' || b.kind === 'jetski');

/** Where a hatch is on the picture (a bay that does not exist: the middle of the hull). */
export const bayHatch = (s: { model: string }, bay: number): BayHatch =>
  shipModel(s).bays[bay]?.hatch ?? { x: 0.5, y: 0.6, rampEnd: 0.9 };

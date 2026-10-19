// The saved vehicles checked on loading: the submarine, the speedboat, the ship (split from saveData.ts in the
// cleanup of 19 ottobre 2026).
import { SUB_MODELS } from '../../data/submarine';
import type { SavedSub } from '../submarine';
import type { SavedShip } from '../ship/ship';
import type { SavedBoat } from '../boat';
import { BOAT_MODELS } from '../../data/boats';
import { FIRST_SHIP, SHIP_MODELS } from '../../data/fleet';
import { isFiniteNumber, isObject } from './guards';

/** The saved submarine, checked: unknown models dropped, numbers kept in range. */
export function checkedSub(raw: unknown): SavedSub | null {
  if (!isObject(raw) || !isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) return null;
  const known = SUB_MODELS.map((m) => m.id);
  const models = Array.isArray(raw.models)
    ? [...new Set(raw.models.filter((m): m is string => typeof m === 'string' && known.includes(m)))]
    : [];
  if (!models.length) models.push(SUB_MODELS[0]!.id);
  const model = typeof raw.model === 'string' && models.includes(raw.model) ? raw.model : models[0]!;
  const max = SUB_MODELS.find((m) => m.id === model)!.hull;
  const hull = isFiniteNumber(raw.hull) ? Math.max(0, Math.min(max, raw.hull)) : max;
  const tank = SUB_MODELS.find((m) => m.id === model)!.tank;
  const fuel = isFiniteNumber(raw.fuel) ? Math.max(0, Math.min(tank, raw.fuel)) : tank;
  const air = isFiniteNumber(raw.air) ? Math.max(0, raw.air) : undefined;
  const parts = isFiniteNumber(raw.parts) && raw.parts > 0 ? { parts: raw.parts } : {};
  return { x: raw.x, y: raw.y, model, models, hull, fuel, ...(air !== undefined ? { air } : {}), ...parts };
}

/** The saved speedboat, checked: a broken one is dropped (the next shipyard visit gives none: newBoat). */
export function checkedBoat(raw: unknown): SavedBoat | null {
  if (!isObject(raw) || !BOAT_MODELS.some((m) => m.id === raw.model)) return null;
  const num = (v: unknown): number => (isFiniteNumber(v) ? Math.max(0, v) : 0);
  return {
    model: String(raw.model),
    x: num(raw.x),
    face: raw.face === -1 ? -1 : 1,
    fuel: isFiniteNumber(raw.fuel) ? Math.max(0, raw.fuel) : Infinity, // newBoat caps it at its tank
    drums: num(raw.drums),
    out: raw.out === true,
    aboard: raw.aboard === true,
    ...(isFiniteNumber(raw.hull) ? { hull: Math.max(0, raw.hull) } : {}),
    ...(isFiniteNumber(raw.parts) && raw.parts > 0 ? { parts: raw.parts } : {}),
  };
}

/** The saved ship, checked: a broken one is dropped (the story gives it again at Porto Fango). */
export function checkedShip(raw: unknown): SavedShip | null {
  if (!isObject(raw) || !isFiniteNumber(raw.x)) return null;
  const bay = raw.bay === 'docked' || raw.bay === 'out' ? raw.bay : 'none';
  return {
    x: raw.x,
    face: raw.face === -1 ? -1 : 1,
    hatches: Array.isArray(raw.hatches) ? raw.hatches.map((h) => h === true) : [],
    bay,
    aboard: raw.aboard === true,
    fuel: isFiniteNumber(raw.fuel) ? Math.max(0, raw.fuel) : Infinity, // newShip caps it at its tank
    engineOn: raw.engineOn === true,
    ...(isFiniteNumber(raw.dive) ? { dive: Math.max(0, raw.dive) } : {}),
    ...(isFiniteNumber(raw.air) ? { air: Math.max(0, raw.air) } : {}),
    model: SHIP_MODELS.some((m) => m.id === raw.model) ? String(raw.model) : FIRST_SHIP,
    ...(isFiniteNumber(raw.hull) ? { hull: Math.max(0, raw.hull) } : {}),
  };
}

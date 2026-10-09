// The beast you follow (part 4d, owner 9 ottobre 2026): picked from the Ocean's Nightmare drone's report, it is a
// resident of the endless sea (by its id: the same beast whether it is out for real or not) or a wild one of the
// coast (by its slot and species). Where it is now, the beasts the sonar can reach, and the compass. Pure logic.
import { HUNT_RULES } from '../data/hunts';
import { COMPASS } from '../data/nightmare';
import { WORLD } from '../data/worldLayout';
import type { Held, BeastState } from './beastState';
import { formLengthM, formName } from './beasts/forms';
import { residentAt, residentById, residentsNear } from './beasts/residents';
import { isInWater } from './beasts/wildState';
import { sonarRange } from './ship/model';

export type Target = { resident: string; speciesId: string } | { wild: number; speciesId: string };

/** A beast within the sonar's reach: who, and where now. */
export interface Contact {
  target: Target;
  speciesId: string;
  name: string;
  lengthM: number;
  /** Known only for the ones out for real. */
  level?: number;
  x: number;
  y: number;
}

interface TrackWorld {
  beasts: Pick<BeastState, 'wilds' | 'residents' | 'held'>;
}

const common = (speciesId: string) => ({ speciesId, variant: 'comune' as const });

/** Where the beast is now, with its level when it is out for real; null when it is gone (caught, beaten, away). */
export function locate(g: TrackWorld, t: Target): { x: number; y: number; level?: number } | null {
  const b = g.beasts;
  if ('wild' in t) {
    const w = b.wilds.find((x) => x.id === t.wild);
    return w && isInWater(w) && w.spawn.speciesId === t.speciesId ? { x: w.x, y: w.y, level: w.level } : null;
  }
  const res = b.residents;
  if ((res.gone[t.resident] ?? -1) > res.clock) return null;
  const out = res.awake[t.resident];
  if (out !== undefined) {
    const w = b.wilds.find((x) => x.id === out);
    if (w && isInWater(w) && w.spawn.resident === t.resident) return { x: w.x, y: w.y, level: w.level };
  }
  const r = residentById(t.resident);
  if (!r) return null;
  const h = b.held;
  return h && h.left > 0 && h.resident === t.resident ? { x: h.x, y: h.y } : residentAt(r, res.clock);
}

/** Every beast the ship's sonar can reach from x (the ones out for real and the residents), nearest first. */
export function beastsInRange(g: TrackWorld, ship: { x: number; model: string }): Contact[] {
  const range = HUNT_RULES.bigEchoRange * sonarRange(ship);
  const out: Contact[] = [];
  const b = g.beasts;
  for (const w of b.wilds) {
    if (!isInWater(w) || w.y <= WORLD.surfaceY || Math.abs(w.x - ship.x) > range) continue;
    const target: Target = w.spawn.resident
      ? { resident: w.spawn.resident, speciesId: w.spawn.speciesId }
      : { wild: w.id, speciesId: w.spawn.speciesId };
    const name = formName(w.form);
    out.push({
      target,
      speciesId: w.spawn.speciesId,
      name,
      lengthM: formLengthM(w.form),
      level: w.level,
      x: w.x,
      y: w.y,
    });
  }
  for (const c of residentsNear(b.residents, ship.x, range, b.held)) {
    if (b.residents.awake[c.r.id] !== undefined) continue; // out for real: listed above
    const form = common(c.r.speciesId);
    out.push({
      target: { resident: c.r.id, speciesId: c.r.speciesId },
      speciesId: c.r.speciesId,
      name: formName(form),
      lengthM: formLengthM(form),
      x: c.x,
      y: c.y,
    });
  }
  return out.sort((a, c) => Math.abs(a.x - ship.x) - Math.abs(c.x - ship.x));
}

/** The sphere holds this beast: the hold it puts on it, where it is now. */
export function holdOf(t: Target, at: { x: number; y: number }, seconds: number): Held {
  return { ...('wild' in t ? { wild: t.wild } : { resident: t.resident }), x: at.x, y: at.y, left: seconds };
}

/** The compass: from where you are to the beast you follow, in metres (y down), or null. */
export function compassTo(
  g: TrackWorld,
  t: Target | null,
  from: { x: number; y: number },
): { dxM: number; dyM: number; distM: number; here: boolean } | null {
  const p = t && locate(g, t);
  if (!p) return null;
  const dxM = (p.x - from.x) / WORLD.unitsPerMetre;
  const dyM = (p.y - from.y) / WORLD.unitsPerMetre;
  const distM = Math.hypot(dxM, dyM);
  return { dxM, dyM, distM, here: distM < COMPASS.hereM };
}

/** A saved target read back: a resident of the endless sea that exists (null: missing or not valid). */
export function checkedTarget(raw: unknown): { target: Target; name: string } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as { target?: { resident?: unknown; speciesId?: unknown }; name?: unknown };
  const t = r.target;
  if (!t || typeof t.resident !== 'string' || typeof t.speciesId !== 'string' || typeof r.name !== 'string')
    return null;
  const res = residentById(t.resident);
  return res && res.speciesId === t.speciesId
    ? { target: { resident: res.id, speciesId: res.speciesId }, name: r.name }
    : null;
}

// Analysing an echo (block 5a, owner 9 ottobre 2026: the sonar at the centre of the hunt). Touched on the cockpit's
// sonar screen, an echo is locked: while the sonar listens (on, the ship slow) and the beast stays in its range, the
// analysis goes on (SONAR.analyzeSeconds ÷ the sonar's range); it starts over if the echo is lost. At the end a
// species you have seen is named, a new one gives clues (its type, its length, its depth); either way the hunting
// diary notes where and how deep you heard it (sonarNotes, saved). Pure logic.
import { SONAR, type EchoClass } from '../data/hunts';
import { HUNT_RULES } from '../data/hunts';
import { TYPES } from '../data/rules';
import { speciesById } from '../data/species';
import { WORLD } from '../data/worldLayout';
import type { BeastState } from './beastState';
import { formLengthM, formName, type BeastForm } from './beasts/forms';
import { isInWater } from './beasts/wildState';
import { heardClass, trueClass } from './echoClass';
import type { GameEvent } from './events';
import { shipModel, sonarRange } from './ship/model';
import { sonarActive, type ShipState } from './ship/ship';
import { locate, type Target } from './tracking';
import { biomeAt, regionAt } from './world/endless';
import { zoneAt } from './world/zones';
import { addNote, type SonarNotes } from './sonarNotes';

export interface ScanState {
  /** The echo being analysed, and for how long (seconds). */
  lock: Target | null;
  t: number;
  /** What the analyses of this outing found, by echo (targetKey): the words shown by its dot. */
  results: Record<string, string>;
}

export interface ScanWorld {
  ship: ShipState;
  beasts: Pick<BeastState, 'wilds' | 'residents' | 'held'>;
  seen: Set<string>;
  sonarScan: ScanState;
  sonarNotes: SonarNotes;
}

export const newScan = (): ScanState => ({ lock: null, t: 0, results: {} });

/** One beast, one key (an echo keeps it while it moves). */
export const targetKey = (t: Target): string =>
  'wild' in t ? `w${t.wild}:${t.speciesId}` : `r${t.resident}`;

/** Seconds this ship's sonar takes to analyse an echo. */
export const scanSeconds = (ship: { model: string }): number => SONAR.analyzeSeconds / sonarRange(ship);

/** Touched on the screen: this echo is analysed (another one touched replaces it; the same one again lets it go). */
export function lockEcho(s: ScanState, t: Target): void {
  if (s.lock && targetKey(s.lock) === targetKey(t)) {
    s.lock = null;
    s.t = 0;
    return;
  }
  s.lock = t;
  s.t = 0;
}

/** The beast's form as the sonar hears it (out for real: its own; a resident not out: the common one). */
function formOf(g: ScanWorld, t: Target): BeastForm {
  const out =
    'wild' in t
      ? t.wild
      : g.beasts.residents.awake[t.resident] === undefined
        ? -1
        : g.beasts.residents.awake[t.resident];
  const w = g.beasts.wilds.find((x) => x.id === out);
  return w && isInWater(w) ? w.form : { speciesId: t.speciesId, variant: 'comune' };
}

/** Where in the sea: the region out in the open sea, the zone along the coast. */
export function placeName(x: number, y: number): string {
  if (biomeAt(x)) return regionAt(x).name;
  return zoneAt(x, y).split(' · ')[0] || 'Costa';
}

/** One step: the locked echo's analysis goes on, is lost, or ends (its words, the diary's note). */
export function stepScan(g: ScanWorld, dt: number, events: GameEvent[]): void {
  const s = g.sonarScan;
  if (!s.lock) return;
  const range = HUNT_RULES.bigEchoRange * sonarRange(g.ship);
  const p = locate(g, s.lock);
  if (!p || Math.abs(p.x - g.ship.x) > range || p.y <= WORLD.surfaceY) {
    s.lock = null;
    s.t = 0;
    events.push({ type: 'scanLost' });
    return;
  }
  if (!g.ship.sonarOn || !sonarActive(g.ship)) return; // it waits: deaf for now
  s.t += dt;
  if (s.t < scanSeconds(g.ship)) return;
  const t = s.lock;
  s.lock = null;
  s.t = 0;
  const form = formOf(g, t);
  const sp = speciesById(t.speciesId);
  const depthM = Math.round((p.y - WORLD.surfaceY) / WORLD.unitsPerMetre);
  const lengthM = formLengthM(form);
  const cls: EchoClass = heardClass(trueClass(form), shipModel(g.ship).sonar.classes);
  const known = g.seen.has(t.speciesId);
  const type = sp && sp.type !== 'variabile' ? TYPES[sp.type].name : 'Mutevole';
  const text = known
    ? `${formName(form)}${p.level ? ` · liv. ${p.level}` : ''}`
    : `Sconosciuta · ${type} · circa ${lengthM < 3 ? lengthM.toFixed(1).replace('.', ',') : Math.round(lengthM)} m`;
  s.results[targetKey(t)] = text;
  addNote(g.sonarNotes, t.speciesId, { place: placeName(p.x, p.y), depthM, cls, type });
  events.push({ type: 'scanDone', text, known });
}

/** The drone's report (ship/gadgets.ts): every beast it reached is named on the sonar at once, and noted in the
 *  diary, as if analysed (owner, 10 ottobre: "it already did everything itself"). */
export function learnFromReport(
  g: ScanWorld,
  report: {
    target: Target;
    name: string;
    speciesId: string;
    level?: number;
    depthM: number;
    dxM: number;
    lengthM: number;
  }[],
): void {
  const classes = shipModel(g.ship).sonar.classes;
  for (const e of report) {
    g.sonarScan.results[targetKey(e.target)] = `${e.name}${e.level ? ` · liv. ${e.level}` : ''}`;
    const sp = speciesById(e.speciesId);
    const x = g.ship.x + e.dxM * WORLD.unitsPerMetre;
    const y = WORLD.surfaceY + e.depthM * WORLD.unitsPerMetre;
    addNote(g.sonarNotes, e.speciesId, {
      place: placeName(x, y),
      depthM: e.depthM,
      cls: heardClass(trueClass({ speciesId: e.speciesId, variant: 'comune' }), classes),
      type: sp && sp.type !== 'variabile' ? TYPES[sp.type].name : 'Mutevole',
    });
  }
}

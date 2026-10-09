// What the sonar taught you about each species (block 5a, owner 9 ottobre 2026: "help to understand what you are
// looking for", in the hunting diary). Each analysed echo adds where you heard it and how deep; the notes grow, they
// are never a checklist. Saved. Pure logic.
import type { EchoClass } from '../data/hunts';
import { speciesById } from '../data/species';

export interface SonarNote {
  /** The regions or zones where you heard it, in the order you did. */
  places: string[];
  /** The shallowest and the deepest you heard it (m). */
  minM: number;
  maxM: number;
  /** Its size, as your best sonar named it; its type in words. */
  cls: EchoClass;
  type: string;
}

export type SonarNotes = Record<string, SonarNote>;

const CLASSES: EchoClass[] = ['piccola', 'media', 'grande', 'enorme', 'leggendaria'];
const MAX_PLACES = 8;

/** One more echo of this species: its place, its depth, its size and type. */
export function addNote(
  notes: SonarNotes,
  speciesId: string,
  e: { place: string; depthM: number; cls: EchoClass; type: string },
): void {
  const n = notes[speciesId];
  if (!n) {
    notes[speciesId] = { places: [e.place], minM: e.depthM, maxM: e.depthM, cls: e.cls, type: e.type };
    return;
  }
  if (!n.places.includes(e.place) && n.places.length < MAX_PLACES) n.places.push(e.place);
  n.minM = Math.min(n.minM, e.depthM);
  n.maxM = Math.max(n.maxM, e.depthM);
  if (CLASSES.indexOf(e.cls) > CLASSES.indexOf(n.cls)) n.cls = e.cls; // a better sonar tells it better
  n.type = e.type;
}

/** Saved notes read back: only real species and sound values (anything else is left out). */
export function checkedNotes(raw: unknown): SonarNotes {
  const out: SonarNotes = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!speciesById(id) || typeof v !== 'object' || v === null) continue;
    const n = v as Partial<SonarNote>;
    const places = Array.isArray(n.places) ? n.places.filter((p): p is string => typeof p === 'string') : [];
    if (
      !places.length ||
      !Number.isFinite(n.minM) ||
      !Number.isFinite(n.maxM) ||
      !CLASSES.includes(n.cls as EchoClass) ||
      typeof n.type !== 'string'
    )
      continue;
    out[id] = {
      places: places.slice(0, MAX_PLACES),
      minM: n.minM!,
      maxM: n.maxM!,
      cls: n.cls as EchoClass,
      type: n.type,
    };
  }
  return out;
}

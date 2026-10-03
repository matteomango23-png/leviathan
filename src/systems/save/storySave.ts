// Checking the saved story (v5). Unknown steps or ids (e.g. from a newer game) are dropped.
import { CLUES, DIALOGUES, STORY_STEPS, TUTORIAL, type SavedStory } from '../../data/story';
import { chapter4MarkIds } from '../../data/chapter4';
import { jobMarkIds, PORT_JOBS } from '../../data/portJobs';
import { chapter3MarkIds } from '../../data/chapter3';

export type { SavedStory } from '../../data/story';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const known = (v: unknown, ids: string[]): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ids.includes(x)))]
    : [];

export function validateStory(raw: unknown): SavedStory | null {
  if (!isObj(raw) || typeof raw.step !== 'string') return null;
  const step = STORY_STEPS.find((s) => s === raw.step);
  if (!step || step === 'off') return null;
  const tutorial = Number.isInteger(raw.tutorial)
    ? Math.max(0, Math.min(TUTORIAL.length, raw.tutorial as number))
    : 0;
  return {
    step,
    tutorial,
    clues: known(
      raw.clues,
      CLUES.map((c) => c.id),
    ),
    seen: known(raw.seen, [
      ...Object.keys(DIALOGUES),
      'gate',
      'freed',
      'starter',
      ...chapter3MarkIds(),
      ...chapter4MarkIds(),
      ...jobMarkIds(),
    ]),
    jobs: jobsOf(raw.jobs),
  };
}

/** Aurelio's jobs: known ids, whole counts. */
function jobsOf(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isObj(raw)) return out;
  for (const j of PORT_JOBS) {
    const n = raw[j.id];
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) out[j.id] = Math.floor(n);
  }
  return out;
}

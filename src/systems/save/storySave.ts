// Checking the saved story (v17). Unknown steps or ids (e.g. from a newer game) are dropped.
import { DIALOGUES, STORY_STEPS, TUTORIAL, type SavedStory } from '../../data/story';

export type { SavedStory } from '../../data/story';

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const known = (v: unknown, ids: string[]): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ids.includes(x)))]
    : [];
const whole = (v: unknown, max: number): number =>
  typeof v === 'number' && Number.isInteger(v) ? Math.max(0, Math.min(max, v)) : 0;

export function validateStory(raw: unknown): SavedStory | null {
  if (!isObj(raw) || typeof raw.step !== 'string') return null;
  const step = STORY_STEPS.find((s) => s === raw.step);
  if (!step || step === 'off') return null;
  const tutorial = whole(raw.tutorial, TUTORIAL.length);
  return {
    step,
    tutorial,
    count: whole(raw.count, TUTORIAL[tutorial]?.count ?? 0),
    seen: known(raw.seen, [...Object.keys(DIALOGUES), 'starter']),
  };
}

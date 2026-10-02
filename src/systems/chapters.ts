// The chapters together: closing a dialogue and the goal under the hearts, whichever chapter they belong to.
// (story.ts is chapter 1 and the shared story state; chapter2.ts and chapter3.ts build on it.)
import { chapter2Objective, closeChapter2Dialogue } from './chapter2';
import { jobsObjective } from './portJobs';
import { chapter3Objective, closeChapter3Dialogue, type Chapter3World } from './chapter3';
import type { GameEvent } from './events';
import { closeDialogue, objectiveText } from './story';

/** The interface read the last line of the open dialogue. */
export function finishDialogue(g: Chapter3World, events: GameEvent[]): void {
  const id = g.story.dialogue;
  if (!id) return;
  closeDialogue(g, events);
  closeChapter2Dialogue(g, id, events);
  closeChapter3Dialogue(g, id, events);
}

/** The goal shown under the hearts, or null. */
export const currentObjective = (g: Chapter3World): string | null =>
  (g.story.step === 'portJobs' ? jobsObjective(g) : null) ??
  chapter3Objective(g) ??
  chapter2Objective(g) ??
  objectiveText(g.story);

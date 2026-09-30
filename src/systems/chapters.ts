// The chapters together: closing a dialogue and the goal under the hearts, whichever chapter they belong to.
// (story.ts is chapter 1 and the shared story state; chapter2.ts builds on it.)
import { chapter2Objective, closeChapter2Dialogue, type Chapter2World } from './chapter2';
import type { GameEvent } from './events';
import { closeDialogue, objectiveText } from './story';

/** The interface read the last line of the open dialogue. */
export function finishDialogue(g: Chapter2World, events: GameEvent[]): void {
  const id = g.story.dialogue;
  if (!id) return;
  closeDialogue(g, events);
  closeChapter2Dialogue(g, id, events);
}

/** The goal shown under the hearts, or null. */
export const currentObjective = (g: Chapter2World): string | null =>
  chapter2Objective(g) ?? objectiveText(g.story);

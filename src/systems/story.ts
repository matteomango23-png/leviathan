// The start of the game (data/story.ts; owner, 8 ottobre 2026: the old chapters are paused): the opening on
// Aurelio's boat, the guided first dive at Portofosco, then Aurelio waits at Porto Fango with your ship and your
// submarine. Pure logic: it reads the step's events and opens dialogues (the game stops while one is open; the
// interface calls closeDialogue when the last line has been read).
import {
  DIALOGUES,
  OBJECTIVES,
  SCENES,
  TUTORIAL,
  TUTORIAL_SWIM_DISTANCE,
  type DialogueId,
  type DialogueLine,
  type SavedStory,
  type StoryStep,
} from '../data/story';
import { PORTO_FANGO } from '../data/economy';
import { WORLD } from '../data/worldLayout';
import type { BackpackWorld } from './economy/backpack';
import { portAt } from './economy/places';
import type { GameEvent } from './events';
import { giftShip, type ShipState } from './ship/ship';
import { giftSub, type SubState } from './submarine';

export type { SavedStory } from '../data/story';

export interface StoryState {
  step: StoryStep;
  /** Index of the current guided task in TUTORIAL. */
  tutorial: number;
  /** Progress of the current guided task (e.g. sardines caught). */
  count: number;
  /** Dialogues already shown once. */
  seen: string[];
  // --- not saved ---
  /** The dialogue on screen (the game waits), or null. */
  dialogue: DialogueId | null;
  /** Seconds since the current step began. */
  t: number;
  /** Where the guided dive started (for "swim"). */
  swimFrom: { x: number; y: number } | null;
  /** Events made outside a game step (a dialogue closed from the interface): sent with the next step. */
  pending: GameEvent[];
  /** Replaying the opening from the pause menu: the step to go back to afterwards. */
  resume: StoryStep | null;
}

export interface StoryWorld extends BackpackWorld {
  ship: ShipState;
  sub: SubState;
  story: StoryState;
}

/**
 * @param hasSave false for games made without a save (tests, tools): no story
 * @param shipOwned an older save without a story: the sea is already open if the ship is yours
 */
export function createStory(saved: SavedStory | null, hasSave: boolean, shipOwned: boolean): StoryState {
  const base = { dialogue: null, t: 0, swimFrom: null, pending: [], resume: null };
  if (saved) return { ...saved, seen: [...saved.seen], ...base };
  const step: StoryStep = !hasSave ? 'off' : shipOwned ? 'free' : 'toPortoFango';
  return { step, tutorial: 0, count: 0, seen: [], ...base };
}

export const saveStory = (s: StoryState): SavedStory | null =>
  s.step === 'off' ? null : { step: s.step, tutorial: s.tutorial, count: s.count, seen: [...s.seen] };

export function setStep(s: StoryState, step: StoryStep, events: GameEvent[]): void {
  s.step = step;
  s.t = 0;
  events.push({ type: 'storyStep', step });
}

export function openDialogue(s: StoryState, id: DialogueId, events: GameEvent[]): void {
  s.dialogue = id;
  events.push({ type: 'dialogueOpened', id });
}

/** A brand new game: it begins on Aurelio's boat. */
export function startNewGame(g: StoryWorld): void {
  const s = g.story;
  s.step = 'intro';
  s.t = 0;
  Object.assign(g.diver, { x: SCENES.boat.x, y: SCENES.boat.y, vx: 0, vy: 0, face: 1 });
}

/** "Rivedi l'inizio" (pause menu): the opening again, without losing progress. */
export function replayIntro(g: StoryWorld): void {
  const s = g.story;
  if (s.step === 'intro' || g.diver.dead || g.beasts.riding) return;
  s.resume = s.step === 'off' ? 'free' : s.step;
  startNewGame(g);
}

/** On the boat the diver does not swim or shoot. */
export const storyHoldsDiver = (g: StoryWorld): boolean => g.story.step === 'intro';

/** How much of the current guided task this step did. */
function taskProgress(g: StoryWorld, events: GameEvent[]): number {
  const s = g.story;
  const d = g.diver;
  const task = TUTORIAL[s.tutorial];
  if (!task) return 0;
  switch (task.id) {
    case 'swim': {
      const from = s.swimFrom ?? { x: d.x, y: d.y };
      const far = Math.hypot(d.x - from.x, d.y - from.y) > TUTORIAL_SWIM_DISTANCE;
      return d.y > WORLD.surfaceY + 4 && far ? 1 : 0;
    }
    case 'fish':
      return events.filter((e) => e.type === 'fishCaught' && e.fishId === 'sardina').length;
    case 'dash':
      return events.some((e) => e.type === 'dash') ? 1 : 0;
    case 'tame':
      return events.filter((e) => e.type === 'tamed').length;
    case 'surface':
      return portAt(d, g.map)?.id === 'portofosco' ? 1 : 0;
  }
}

function stepTutorial(g: StoryWorld, events: GameEvent[]): void {
  const s = g.story;
  const task = TUTORIAL[s.tutorial];
  if (!task) return;
  const done = taskProgress(g, events);
  if (!done) return;
  s.count += done;
  if (s.count >= task.count) {
    s.tutorial++;
    s.count = 0;
    if (task.id === 'surface') openDialogue(s, 'farewell', events);
  }
  events.push({ type: 'storyStep', step: s.step }); // the goal under the hearts changed
}

/** One step of the story (at the end of stepGame, reading its events). */
export function stepStory(g: StoryWorld, dt: number, events: GameEvent[]): void {
  const s = g.story;
  const d = g.diver;
  s.t += dt;
  if (s.dialogue) return;
  switch (s.step) {
    case 'intro':
      Object.assign(d, { x: SCENES.boat.x, y: SCENES.boat.y, vx: 0, vy: 0 });
      if (s.t >= SCENES.introSeconds) openDialogue(s, 'intro', events);
      break;
    case 'tutorial':
      stepTutorial(g, events);
      break;
    case 'toPortoFango':
      if (portAt(d, g.map)?.id === PORTO_FANGO.id) openDialogue(s, 'portoFango', events);
      break;
    default:
      break;
  }
}

/** The last line of a dialogue was read: what it changes. */
export function closeDialogue(g: StoryWorld, events: GameEvent[]): void {
  const s = g.story;
  const id = s.dialogue;
  if (!id) return;
  s.dialogue = null;
  if (!s.seen.includes(id)) s.seen.push(id);
  if (id === 'intro') {
    // into the water with a splash (or back where you were, when replayed from the pause menu)
    Object.assign(g.diver, { ...SCENES.jumpIn, vx: 30, vy: 20 });
    for (let i = 0; i < 6; i++)
      events.push({ type: 'bubble', x: SCENES.jumpIn.x + i * 2 - 5, y: SCENES.jumpIn.y });
    if (s.resume) {
      setStep(s, s.resume, events);
      s.resume = null;
      return;
    }
    s.swimFrom = { ...SCENES.jumpIn };
    s.tutorial = 0;
    s.count = 0;
    setStep(s, 'tutorial', events);
  } else if (id === 'farewell') setStep(s, 'toPortoFango', events);
  else if (id === 'portoFango') {
    // the submarine first, so the ship takes it in its hold
    giftSub(g.sub, PORTO_FANGO.shipDock);
    giftShip(g, events);
    setStep(s, 'free', events);
  }
}

/** "Aurelio" in the port menu: a hint for where you are. */
export function askAurelio(g: StoryWorld, events: GameEvent[]): void {
  const step = g.story.step;
  const id: DialogueId =
    step === 'intro' || step === 'tutorial'
      ? 'hintTutorial'
      : step === 'toPortoFango'
        ? 'hintToPortoFango'
        : 'hintFree';
  openDialogue(g.story, id, events);
}

/** The goal shown under the hearts, or null. */
export function currentObjective(g: { story: StoryState }): string | null {
  const s = g.story;
  if (s.step === 'toPortoFango') return OBJECTIVES.toPortoFango;
  if (s.step !== 'tutorial') return null;
  const task = TUTORIAL[s.tutorial];
  return task ? OBJECTIVES.task(task.text, s.count, task.count) : null;
}

export const dialogueLines = (id: DialogueId): readonly DialogueLine[] => DIALOGUES[id];

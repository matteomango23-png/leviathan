// The story of chapter 1 (data/story.ts): the opening on Aurelio's boat, the guided first dive, the burning
// pier and the broken collar, the clues to Lo Sfregiato's lair, the fight, the return to Aurelio and the
// Company ship sailing east. Pure logic: it reads the step's events and opens dialogues (the game stops
// while one is open; the interface calls closeDialogue when the last line has been read).
import {
  CLUE_REACH,
  CLUES,
  DIALOGUES,
  GATE_HINT_REACH,
  OBJECTIVES,
  SCENES,
  STORY_NOTES,
  TUTORIAL,
  TUTORIAL_SWIM_DISTANCE,
  type DialogueId,
  type SavedStory,
  type StoryStep,
} from '../data/story';
import { LAIR } from '../data/guardians';
import { TILE, WORLD } from '../data/worldLayout';
import { atPort } from './economy/places';
import type { GameEvent } from './events';
import type { TileMap } from './world/tileMap';
import { guardianOwned, type GuardianWorld } from './guardian';

export type { SavedStory } from '../data/story';

export interface StoryState {
  step: StoryStep;
  /** Index of the current guided task in TUTORIAL. */
  tutorial: number;
  /** Clues found (CLUES ids). */
  clues: string[];
  /** Dialogues and notes already shown once. */
  seen: string[];
  // --- not saved ---
  /** The dialogue on screen (the game waits), or null. */
  dialogue: DialogueId | null;
  /** Seconds since the current step began. */
  t: number;
  /** The Company ship on the surface during a scene (x of its bow), or null. */
  ship: { x: number; untilX: number; whale: boolean } | null;
  /** Where the guided dive started (for "swim"). */
  swimFrom: { x: number; y: number } | null;
  /** Events made outside a game step (a dialogue closed from the interface): sent with the next step. */
  pending: GameEvent[];
  /** Replaying the opening from the pause menu: the step to go back to afterwards. */
  resume: StoryStep | null;
  /** Clues on the sea floor (found at start from the map). */
  spots: { id: string; x: number; y: number; text: string }[];
}

export interface StoryWorld extends GuardianWorld {
  story: StoryState;
}

/**
 * @param tamedGuardian the Sfregiato is already in the team (older saves pick up from there)
 * @param hasSave false for games made without a save (tests, tools): no story
 */
export function createStory(
  map: TileMap,
  saved: SavedStory | null,
  hasSave: boolean,
  tamedGuardian: boolean,
): StoryState {
  const spots = CLUES.map((c) => ({ ...c, y: map.floorBelow(c.x, WORLD.surfaceY + 20) - 5 }));
  const base = { dialogue: null, t: 0, ship: null, swimFrom: null, pending: [], resume: null, spots };
  // saved during the opening: it starts again, ship included
  if (saved)
    return {
      ...saved,
      clues: [...saved.clues],
      seen: [...saved.seen],
      ...base,
      ship: saved.step === 'intro' ? introShip() : null,
    };
  // an older save without a story: pick up from where the player is (owner's decision)
  const step: StoryStep = !hasSave ? 'off' : tamedGuardian ? 'chapter1Done' : 'findShark';
  return { step, tutorial: 0, clues: [], seen: [], ...base };
}

export const saveStory = (s: StoryState): SavedStory | null =>
  s.step === 'off' ? null : { step: s.step, tutorial: s.tutorial, clues: [...s.clues], seen: [...s.seen] };

export function setStep(s: StoryState, step: StoryStep, events: GameEvent[]): void {
  s.step = step;
  s.t = 0;
  events.push({ type: 'storyStep', step });
}

export function openDialogue(s: StoryState, id: DialogueId, events: GameEvent[]): void {
  s.dialogue = id;
  events.push({ type: 'dialogueOpened', id });
}

function note(s: StoryState, id: string, text: string, events: GameEvent[]): void {
  if (s.seen.includes(id)) return;
  s.seen.push(id);
  events.push({ type: 'storyNote', text });
}

const introShip = (): StoryState['ship'] => ({
  x: SCENES.ship.introFromX,
  untilX: SCENES.ship.introFromX + 700,
  whale: true, // dragging the chained whale
});

/** A brand new game: it begins on Aurelio's boat while the Company ship goes by. */
export function startNewGame(g: StoryWorld): void {
  const s = g.story;
  s.step = 'intro';
  s.t = 0;
  s.ship = introShip();
  Object.assign(g.diver, { x: SCENES.boat.x, y: SCENES.boat.y, vx: 0, vy: 0, face: 1 });
}

/** "Rivedi l'inizio" (pause menu): the opening again, without losing progress. */
export function replayIntro(g: StoryWorld): void {
  const s = g.story;
  if (s.step === 'intro' || g.diver.dead || g.beasts.riding || g.beasts.arena) return;
  s.resume = s.step === 'off' ? 'findShark' : s.step;
  startNewGame(g);
}

/** On the boat the diver does not swim or shoot. */
export const storyHoldsDiver = (g: StoryWorld): boolean => g.story.step === 'intro';

/** The ancient bones over the lair are still there. */
function gateClosed(g: StoryWorld): boolean {
  const tx = Math.floor((LAIR.shaft.x0 + LAIR.shaft.x1) / 2 / WORLD.tileSize);
  return LAIR.gateRows.some((ty) => g.map.get(tx, ty) === TILE.bone);
}

function stepTutorial(g: StoryWorld, events: GameEvent[]): void {
  const s = g.story;
  const d = g.diver;
  const task = TUTORIAL[s.tutorial];
  if (!task) return;
  const from = s.swimFrom ?? { x: d.x, y: d.y };
  const done =
    (task.id === 'swim' &&
      d.y > WORLD.surfaceY + 4 &&
      Math.hypot(d.x - from.x, d.y - from.y) > TUTORIAL_SWIM_DISTANCE) ||
    (task.id === 'fish' && events.some((e) => e.type === 'fishCaught')) ||
    (task.id === 'dash' && events.some((e) => e.type === 'dash')) ||
    (task.id === 'surface' && atPort(d, g.map));
  if (!done) return;
  s.tutorial++;
  if (task.id === 'surface') setStep(s, 'pier', events);
  else events.push({ type: 'storyStep', step: s.step });
}

function stepFindShark(g: StoryWorld, events: GameEvent[]): void {
  const s = g.story;
  const d = g.diver;
  for (const c of s.spots)
    if (!s.clues.includes(c.id) && Math.hypot(d.x - c.x, d.y - c.y) < CLUE_REACH) {
      s.clues.push(c.id);
      events.push({ type: 'storyNote', text: c.text });
      events.push({ type: 'storyStep', step: s.step });
    }
  const gx = (LAIR.shaft.x0 + LAIR.shaft.x1) / 2;
  const gy = LAIR.gateRows[0]! * WORLD.tileSize;
  if (gateClosed(g) && Math.hypot(d.x - gx, d.y - gy) < GATE_HINT_REACH)
    note(s, 'gate', STORY_NOTES.gate, events);
  if (events.some((e) => e.type === 'guardianAppeared') && !s.seen.includes('sharkFound'))
    openDialogue(s, 'sharkFound', events);
  if (guardianOwned(g)) {
    note(s, 'freed', STORY_NOTES.freed, events);
    setStep(s, 'returnToAurelio', events);
  }
}

/** One step of the story (at the end of stepGame, reading its events). */
export function stepStory(g: StoryWorld, dt: number, events: GameEvent[]): void {
  const s = g.story;
  const d = g.diver;
  s.t += dt;
  if (s.ship) {
    s.ship.x += SCENES.ship.speed * dt;
    if (s.ship.x > s.ship.untilX) s.ship = null;
  }
  if (s.dialogue) return;
  switch (s.step) {
    case 'intro':
      Object.assign(d, { x: SCENES.boat.x, y: SCENES.boat.y, vx: 0, vy: 0 });
      if (s.t >= SCENES.introShipSeconds) openDialogue(s, 'intro', events);
      break;
    case 'tutorial':
      stepTutorial(g, events);
      break;
    case 'pier':
      if (s.t >= SCENES.collarDelay) openDialogue(s, 'collar', events);
      break;
    case 'findShark':
      stepFindShark(g, events);
      break;
    case 'returnToAurelio':
      if (atPort(d, g.map)) openDialogue(s, 'end', events);
      break;
    default:
      break;
  }
}

/** The last line of a chapter 1 dialogue was read: what it changes (chapters.ts calls it). */
export function closeDialogue(g: StoryWorld, events: GameEvent[]): void {
  const s = g.story;
  const id = s.dialogue;
  if (!id) return;
  s.dialogue = null;
  if (!s.seen.includes(id)) s.seen.push(id);
  if (id === 'intro' && s.resume) {
    // replayed from the pause menu: back where you were, in the water by the boat
    Object.assign(g.diver, { ...SCENES.jumpIn, vx: 30, vy: 20 });
    setStep(s, s.resume, events);
    s.resume = null;
  } else if (id === 'intro') {
    // into the water with a splash
    Object.assign(g.diver, { ...SCENES.jumpIn, vx: 30, vy: 20 });
    s.swimFrom = { ...SCENES.jumpIn };
    s.tutorial = 0;
    for (let i = 0; i < 6; i++)
      events.push({ type: 'bubble', x: SCENES.jumpIn.x + i * 2 - 5, y: SCENES.jumpIn.y });
    setStep(s, 'tutorial', events);
  } else if (id === 'collar') setStep(s, 'findShark', events);
  else if (id === 'end') {
    s.ship = { x: SCENES.ship.endFromX, untilX: SCENES.ship.endFromX + 800, whale: false };
    events.push({ type: 'storyNote', text: STORY_NOTES.chapterDone });
    setStep(s, 'chapter1Done', events);
  }
}

/** "Aurelio" in the port menu: a hint for where you are in the story. */
export function askAurelio(g: StoryWorld, events: GameEvent[]): void {
  const step = g.story.step;
  const id: DialogueId =
    step === 'chapter2Done'
      ? 'hintChapter2Done'
      : step === 'freeWhale'
        ? 'hintFreeWhale'
        : step === 'chapter1Done'
          ? 'hintDone'
          : step === 'findShark' || step === 'off'
            ? 'hintFindShark'
            : 'hintTutorial';
  openDialogue(g.story, id, events);
}

/** The chapter 1 goal shown under the hearts, or null (chapters.ts adds the later chapters). */
export function objectiveText(s: StoryState): string | null {
  if (s.step === 'tutorial') return TUTORIAL[s.tutorial]?.text ?? null;
  if (s.step === 'findShark') return OBJECTIVES.findShark(s.clues.length, CLUES.length);
  if (s.step === 'returnToAurelio') return OBJECTIVES.returnToAurelio;
  return null;
}

export const dialogueLines = (id: DialogueId) => DIALOGUES[id];

// Leviatano — the start of the game (owner, 8 ottobre 2026: the old story is paused until it is rethought, see
// docs/BACKLOG.md). Nonno Aurelio gives you the harpoon and the shell, you choose your first beast, a short guided
// dive at Portofosco, then he waits for you at Porto Fango with your ship and your submarine.
// Values marked "tuning" are a first pass: change them here, never in systems.
import { PORT } from './economy';
import { WORLD } from './worldLayout';

/** Where the story is. 'off' = no story (games created by tests or tools). */
export type StoryStep =
  | 'off'
  | 'intro' // on Aurelio's boat
  | 'tutorial' // the guided first dive
  | 'toPortoFango' // swim east: Aurelio waits at Porto Fango with the ship
  | 'free'; // the ship and the submarine are yours: the sea is open

export const STORY_STEPS: StoryStep[] = ['off', 'intro', 'tutorial', 'toPortoFango', 'free'];

/** The story as kept in the save (v17). */
export interface SavedStory {
  step: StoryStep;
  /** Index of the current guided task in TUTORIAL. */
  tutorial: number;
  /** Progress of the current guided task (e.g. sardines caught). */
  count: number;
  seen: string[];
}

export type Speaker = 'aurelio' | 'tu' | 'narratore';
export const SPEAKERS: Record<Speaker, string> = {
  aurelio: 'Nonno Aurelio',
  tu: 'Tu',
  narratore: '',
};

export interface DialogueLine {
  who: Speaker;
  text: string;
}

/** Scenes that stop the game until the last line is read. */
export const DIALOGUES = {
  intro: [
    { who: 'aurelio', text: 'Eccoti. Il mare di Portofosco è calmo, oggi: il giorno giusto per cominciare.' },
    {
      who: 'aurelio',
      text: 'Prendi. L’arpione di tuo padre, e la Conchiglia del domatore: con questa le bestie ti ascoltano.',
    },
    { who: 'aurelio', text: 'Scendi e prendi confidenza col mare. Ti aspetto al molo.' },
  ],
  farewell: [
    { who: 'aurelio', text: 'Te la cavi, in acqua. E hai già una squadra.' },
    {
      who: 'aurelio',
      text: 'Ti ho preparato una sorpresa a Porto Fango, il porto grande oltre il Delta delle Mangrovie.',
    },
    { who: 'aurelio', text: 'Nuota verso est e passa sotto l’isola. Ci vediamo laggiù.' },
  ],
  portoFango: [
    { who: 'aurelio', text: 'Eccoti! Guarda: questa è la tua nave. E nella stiva c’è il tuo sottomarino.' },
    { who: 'aurelio', text: 'Sali a bordo dal fianco della nave, in superficie. Al timone guidi con le leve.' },
    { who: 'aurelio', text: 'Quando vuoi esplorare le profondità, ferma la nave e tocca Cala sottomarino.' },
    { who: 'aurelio', text: 'Il mare aperto è a est: le bestie lì sono più grandi, e più pericolose. Buona caccia.' },
  ],
  // Aurelio at the port (button "Aurelio" in the port menu), one per step
  hintTutorial: [
    {
      who: 'aurelio',
      text: 'Prendi confidenza col mare: segui i compiti scritti in alto, uno alla volta. Poi torna qui al molo.',
    },
    {
      who: 'aurelio',
      text: 'Per domare: sfinisci la bestia in battaglia e lancia la Conchiglia. Più è stanca, più è facile.',
    },
  ],
  hintToPortoFango: [
    {
      who: 'aurelio',
      text: 'Porto Fango è a est, oltre il Delta delle Mangrovie: passa sotto l’isola. Ti aspetto lì.',
    },
  ],
  hintFree: [
    {
      who: 'aurelio',
      text: 'Ascolta le voci nei porti: parlano di bestie leggendarie. Il sonar della nave ti aiuta a trovarle.',
    },
    { who: 'aurelio', text: 'E tieni d’occhio il carburante: il mare aperto è grande.' },
  ],
} satisfies Record<string, DialogueLine[]>;
export type DialogueId = keyof typeof DIALOGUES;

/** The guided first dive, in order (owner, 8 ottobre: swim, catch sardines, tame your first beast). */
export const TUTORIAL = [
  { id: 'swim', count: 1, text: 'Nuota: joystick a sinistra (sul computer WASD o frecce)' },
  {
    id: 'fish',
    count: 5, // tuning
    text: 'Cattura le sardine: trascina il pulsante Fucile verso il pesce per mirare e sparare (sul computer clic o Spazio)',
  },
  { id: 'dash', count: 1, text: 'Scatta: pulsante Scatto (sul computer Maiusc)' },
  {
    id: 'tame',
    count: 1,
    text: 'Doma una bestia: sfiniscila in battaglia con il tuo compagno, poi lancia la Conchiglia',
  },
  { id: 'surface', count: 1, text: 'Torna in superficie al molo di Portofosco' },
] as const;
export const TUTORIAL_SWIM_DISTANCE = 60; // units swum under water to complete "swim"

export const OBJECTIVES = {
  task: (text: string, done: number, total: number): string =>
    total > 1 ? `${text} (${done}/${total})` : text,
  toPortoFango: 'Raggiungi Porto Fango, oltre il Delta delle Mangrovie: Aurelio ti aspetta',
};

/** The opening scene (tuning). */
export const SCENES = {
  boat: { x: PORT.x + 20, y: WORLD.surfaceY - 6 }, // Aurelio's boat, where a new game starts
  jumpIn: { x: PORT.x + 34, y: WORLD.surfaceY + 10 }, // where you land in the water after the intro
  introSeconds: 2, // looking at the sea before Aurelio speaks
};

/** The first beast, chosen right after the opening (systems/starter.ts). */
export const STARTER = {
  level: 5, // tuning
  title: 'Scegli il tuo compagno',
  aurelio:
    '«Il mare non perdona chi nuota da solo. Ho cresciuto tre creature antiche, nate prima dei nostri nonni: scegline una. Crescerà con te.»',
  evolves: (name: string, level: number): string => `Al livello ${level} diventa ${name}`,
  choose: 'Scegli',
};

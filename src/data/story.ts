// Leviatano — the story of chapter 1 (tappa 5): dialogue lines, objectives, clues, the scripted scenes.
// Owner's decisions (30 settembre 2026): Lo Sfregiato is Nonno Aurelio's lost shark; the opening is
// playable on Aurelio's boat; the chapter ends with Aurelio and the Company ship sailing east.
// Values marked "tuning" are a first pass: change them here, never in systems.
import { PORT } from './economy';
import { LAIR } from './guardians';
import { WORLD } from './worldLayout';

/** Where the story is. 'off' = no story (games created by tests or tools). */
export type StoryStep =
  | 'off'
  | 'intro'
  | 'tutorial'
  | 'pier'
  | 'findShark'
  | 'returnToAurelio'
  | 'chapter1Done' // …and on the way to the Delta
  | 'freeWhale' // chapter 2: break the chains in the Delta
  | 'chapter2Done';

export const STORY_STEPS: StoryStep[] = [
  'off',
  'intro',
  'tutorial',
  'pier',
  'findShark',
  'returnToAurelio',
  'chapter1Done',
  'freeWhale',
  'chapter2Done',
];

/** The story as kept in the save (v5). */
export interface SavedStory {
  step: StoryStep;
  tutorial: number;
  clues: string[];
  seen: string[];
}

export type Speaker = 'aurelio' | 'vedova' | 'tu' | 'narratore';
export const SPEAKERS: Record<Speaker, string> = {
  aurelio: 'Nonno Aurelio',
  vedova: 'La Vedova Nera',
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
    { who: 'aurelio', text: 'Hai visto? La Compagnia dell’Olio Nero. Trascinano una balena in catene come fosse un barile.' },
    { who: 'aurelio', text: 'Da quando il Leviatano si è svegliato, le bestie impazziscono. E loro ne approfittano.' },
    { who: 'aurelio', text: 'Prendi. L’arpione di tuo padre, e la Conchiglia del domatore: con questa le bestie ti ascoltano.' },
    { who: 'aurelio', text: 'Scendi, prendi confidenza col mare. Ti aspetto al molo.' },
  ],
  collar: [
    { who: 'narratore', text: 'Il molo brucia. Nell’aria, l’odore dell’olio nero.' },
    { who: 'aurelio', text: 'Sono passati mentre eri giù. Cercavano bestie da incatenare… e hanno lasciato questo.' },
    { who: 'aurelio', text: 'Un collare spezzato. Uno uguale l’avevano messo al mio squalo, anni fa. Da allora non l’ho più visto.' },
    { who: 'aurelio', text: 'Ha le cicatrici di mille catene. Se è ancora vivo, è nella Baia. Trovalo.' },
  ],
  sharkFound: [
    { who: 'tu', text: 'Il collare nel collo… è lui. Lo squalo di Aurelio.' },
    { who: 'narratore', text: 'Il ferro lo ha fatto impazzire. Sfiancalo senza ucciderlo, poi domalo per liberarlo.' },
  ],
  end: [
    { who: 'aurelio', text: 'Sei tornato… e lui è con te. Quelle cicatrici le riconoscerei tra mille.' },
    { who: 'aurelio', text: 'La Compagnia non lascia niente di libero. Ma questa volta gliel’abbiamo tolto.' },
    { who: 'narratore', text: 'In lontananza, una nave nera lascia la Baia verso est.' },
    { who: 'aurelio', text: 'Vanno al Delta delle Mangrovie. Altre bestie, altre catene. Tu e lui adesso siete una squadra.' },
    { who: 'aurelio', text: 'Riposa. Quando sarai pronto, seguili.' },
  ],
  // chapter 2: the Delta delle Mangrovie
  vedova: [
    { who: 'narratore', text: 'Tra le mangrovie, la nave nera è all’ancora. Sotto la chiglia, la balena tira le catene.' },
    { who: 'vedova', text: 'Un domatore di Portofosco. Aurelio manda i ragazzini, adesso.' },
    { who: 'vedova', text: 'Quella balena vale più del tuo villaggio intero. Toccala, e il mio coccodrillo ti trova prima del buio.' },
    { who: 'narratore', text: 'Tre ancoraggi tengono le catene sul fondale. Spezzali con l’arpione.' },
  ],
  whaleFree: [
    { who: 'narratore', text: 'L’ultimo anello cede. La megattera si scuote, e il suo canto riempie il Delta.' },
    { who: 'vedova', text: 'Questa me la pagherete. Si salpa: rotta sulla Barriera Rossa!' },
    { who: 'narratore', text: 'La megattera ti gira intorno, lenta. Ha scelto di seguirti.' },
  ],
  // Aurelio at the port (button "Aurelio" in the port menu), one per step
  hintTutorial: [{ who: 'aurelio', text: 'Prendi confidenza col mare: nuota, pesca una sardina, prova lo scatto. Poi torna qui.' }],
  hintFindShark: [
    { who: 'aurelio', text: 'Il mio squalo è nella Baia, lo sento. Segui le catene spezzate verso il centro.' },
    { who: 'aurelio', text: 'Se trovi ossa antiche, serve una bestia che carichi: uno squalo al livello 7 impara la Carica.' },
  ],
  hintDone: [
    { who: 'aurelio', text: 'La nave è andata a est, verso il Delta. Rinforza la squadra: laggiù l’acqua è torbida e piena di denti.' },
  ],
  hintFreeWhale: [
    { who: 'aurelio', text: 'La Vedova Nera… la conosco di fama. Non combatterla: libera la balena e lascia che sia lei a scappare.' },
    { who: 'aurelio', text: 'Gli ancoraggi sono di ferro vecchio. Colpiscili tante volte, e tieni d’occhio la superficie: i coccodrilli attaccano da lì.' },
  ],
  hintChapter2Done: [
    { who: 'aurelio', text: 'Una megattera che ti segue di sua volontà. Tuo padre non ci avrebbe creduto.' },
    { who: 'aurelio', text: 'La Vedova è andata alla Barriera Rossa. Quando sarai pronto, ci andremo.' },
  ],
} satisfies Record<string, DialogueLine[]>;
export type DialogueId = keyof typeof DIALOGUES;

/** Short thoughts shown as messages, without stopping the game. */
export const STORY_NOTES = {
  gate: 'Ossa antiche, dure come ferro. Solo una bestia che carica può sfondarle (Carica, livello 7).',
  freed: 'Il collare si spezza e cade nel buio. Lo Sfregiato è libero. Portalo da Aurelio.',
  chapterDone: 'Capitolo 1 completato.',
  anchorBroken: (n: number, total: number): string => `Un ancoraggio cede (${n}/${total}). La balena tira più forte.`,
  chapter2Done: 'Capitolo 2 completato.',
};

/** The guided first dive, in order. */
export const TUTORIAL = [
  { id: 'swim', text: 'Nuota: joystick a sinistra (sul computer WASD o frecce)' },
  { id: 'fish', text: 'Cattura una sardina: trascina il pulsante Fucile verso il pesce per mirare e sparare (sul computer clic o Spazio)' },
  { id: 'dash', text: 'Scatta: pulsante Scatto (sul computer Maiusc)' },
  { id: 'surface', text: 'Torna in superficie al molo di Portofosco' },
] as const;
export const TUTORIAL_SWIM_DISTANCE = 60; // units swum under water to complete "swim"

/** Clues on the sea floor from the port to the lair: chain links, black oil, bones. */
export const CLUES = [
  { id: 'catena', x: 380, text: 'Un anello di catena arrugginita, spezzato. Le tracce vanno verso il centro della Baia.' },
  { id: 'olio', x: 560, text: 'Olio nero sul fondale. E segni di denti enormi sulla roccia.' },
  { id: 'ossa', x: LAIR.x + 70, text: 'Catene spezzate intorno a una botola di ossa. Sotto, qualcosa respira.' },
];
export const CLUE_REACH = 34; // how close you must swim to notice a clue (tuning)
export const GATE_HINT_REACH = 50;

export const OBJECTIVES = {
  findShark: (found: number, total: number): string =>
    found < total
      ? `Trova lo squalo di Aurelio: segui le tracce (${found}/${total})`
      : 'Sfonda le ossa al centro della Baia e scendi nella tana',
  returnToAurelio: 'Porta lo Sfregiato da Aurelio, al molo',
  chapter1Done: 'Segui la nave della Compagnia a est, nel Delta delle Mangrovie',
  freeWhale: (broken: number, total: number): string =>
    `Libera la balena: spezza gli ancoraggi delle catene sul fondale (${broken}/${total})`,
  chapter2Done: 'Capitolo 2 completato · la Vedova Nera fugge verso la Barriera Rossa (capitolo 3 in arrivo)',
};

/** The scripted scenes (tuning). */
export const SCENES = {
  boat: { x: PORT.x + 20, y: WORLD.surfaceY - 6 }, // Aurelio's boat, where a new game starts
  jumpIn: { x: PORT.x + 34, y: WORLD.surfaceY + 10 }, // where you land in the water after the intro
  introShipSeconds: 7, // the Company ship passes before Aurelio speaks
  collarDelay: 1.4, // seconds looking at the burning pier before Aurelio speaks
  ship: {
    speed: 26, // u/s along the surface
    introFromX: PORT.x + 270, // bow off screen to the east: the chained whale passes right in front of the boat
    endFromX: PORT.x + 110, // at the end it sails east from the harbour
    whaleGap: 78, // the chained whale is dragged this far behind
    whaleSpecies: 'megattera',
    length: 90,
  },
};

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
  // Aurelio's tips (owner, 16 ottobre 2026: the first tester "non aveva capito nulla del gioco"): each once, the
  // first time it happens (systems/tips.ts); all of them can be read again in the pause menu's Guida
  tipShip: [
    { who: 'aurelio', text: 'Al timone: la leva a sinistra è il gas, a destra la direzione. Più vai forte, più carburante bruci.' },
    { who: 'aurelio', text: 'Il pulsante Sonar ascolta il mare intorno alla nave: le bestie grandi rispondono con un’eco.' },
    { who: 'aurelio', text: 'Il pieno e le riparazioni si fanno in ogni porto e avamposto, nella scheda Mezzi.' },
  ],
  tipRumour: [
    { who: 'aurelio', text: 'Hai sentito una voce: una leggenda vive in quei mari. La trovi in Bacheca, tra i Ricercati, e nel diario della nave.' },
    { who: 'aurelio', text: 'Ogni caccia ha quattro passi: la Voce, l’Eco col sonar della nave, le Tracce col sottomarino, poi la Bestia.' },
    { who: 'aurelio', text: 'Tocca la caccia e premi Segui: la vedrai in plancia e al timone, con la strada da fare.' },
  ],
  tipEcho: [
    { who: 'aurelio', text: 'Un’eco anomala! Lì sotto c’è la sua tana. Ferma la nave vicino e cala il sottomarino.' },
    { who: 'aurelio', text: 'Vicino alla tana troverai le tracce. La bestia esce solo col suo tempo: pioggia, nebbia, tempesta… come dice la voce.' },
  ],
  tipSub: [
    { who: 'aurelio', text: 'Nel sottomarino respiri, ma la sua aria finisce: tieni d’occhio la barra.' },
    { who: 'aurelio', text: 'Non scendere oltre la sua profondità massima, o la pressione lo schiaccia. Per tornare, riportalo nella stiva della nave.' },
  ],
  tipBoat: [
    { who: 'aurelio', text: 'Il motoscafo è veloce ma le onde lo rovinano: con il mare grosso vai piano.' },
    { who: 'aurelio', text: 'Può portare fusti di carburante per la nave, e ricambi da Porto Fango se la nave si rompe in mare.' },
  ],
  tipLegend: [
    { who: 'aurelio', text: 'Quella non è una bestia qualunque: è una leggenda, o un gigante antico.' },
    { who: 'aurelio', text: 'Sfiniscila bene prima di domarla, e lancia la conchiglia migliore che hai. La Conchiglia del Re non sbaglia mai.' },
  ],
  tipRide: [
    { who: 'aurelio', text: 'Sei in groppa! Tieni premuto lo scatto per andare più forte.' },
    { who: 'aurelio', text: 'Sali verso la superficie a tutta velocità e salterai fuori dall’acqua: in aria puoi prendere i gabbiani. Scendi quando vuoi.' },
  ],
  tipTeamFull: [
    { who: 'aurelio', text: 'La squadra è piena: porti con te cinque bestie. Le altre vanno nella stiva della nave, se ha posto.' },
    { who: 'aurelio', text: 'Quando la stiva è piena aspettano al Recinto del porto: lì le scambi, e puoi anche venderle.' },
  ],
  tipPort: [
    { who: 'aurelio', text: 'Ogni porto ha le sue schede: guarda prima la Bacheca, coi Ricercati di questi mari e le taglie.' },
    { who: 'aurelio', text: 'Conchiglie, cure ed esche si comprano qui. Un’esca pregiata a volte porta un alfa, o un albino.' },
  ],
  // the abyssal ship (owner, 25 ottobre 2026): told when the first rare part is found, and in the Guida
  tipAbyss: [
    { who: 'aurelio', text: 'Un pezzo abissale! Ce ne sono sei: nei relitti più lontani e nei forzieri delle caverne delle Gallerie, uno nella Cattedrale.' },
    { who: 'aurelio', text: 'Portali tutti al cantiere di Porto Fango: con quelli, e un bel po’ di denti, costruiscono la nave abissale, la più veloce del mare, che scende a 300 m.' },
    { who: 'aurelio', text: 'Il suo sottomarino arriva a 1000 m, sta mezz’ora sott’acqua e ha un cockpit tutto suo: puoi lasciare la nave e cacciare lontano. Con la visione notturna il buio diventa verde e il sonar ti mostra la roccia attorno.' },
  ],
} satisfies Record<string, DialogueLine[]>;
export type DialogueId = keyof typeof DIALOGUES;

/** Aurelio's tips, in the order of the Guida: its title, its dialogue, the game event that opens it the first time. */
export type TipTrigger =
  | 'shipBoarded'
  | 'rumourHeard'
  | 'echoFound'
  | 'boarded'
  | 'boatBoarded'
  | 'legendAppeared'
  | 'mounted'
  | 'tamedOutOfTeam'
  | 'portArrived'
  | 'abyssPart';
export const TIPS: { id: DialogueId; title: string; on: TipTrigger }[] = [
  { id: 'tipShip', title: 'La nave', on: 'shipBoarded' },
  { id: 'tipRumour', title: 'Le voci e le cacce', on: 'rumourHeard' },
  { id: 'tipEcho', title: 'L’eco anomala', on: 'echoFound' },
  { id: 'tipSub', title: 'Il sottomarino', on: 'boarded' },
  { id: 'tipBoat', title: 'Il motoscafo', on: 'boatBoarded' },
  { id: 'tipLegend', title: 'Le leggende', on: 'legendAppeared' },
  { id: 'tipRide', title: 'In groppa', on: 'mounted' },
  { id: 'tipTeamFull', title: 'Squadra, stiva e Recinto', on: 'tamedOutOfTeam' },
  { id: 'tipPort', title: 'Il porto', on: 'portArrived' },
  { id: 'tipAbyss', title: 'La nave abissale', on: 'abyssPart' },
];
/** In story.seen: the tips are switched off (the Guida in the pause menu). */
export const TIPS_OFF = 'tips-off';

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

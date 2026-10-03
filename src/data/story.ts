// Leviatano — the story of chapter 1 (tappa 5): dialogue lines, objectives, clues, the scripted scenes.
// Owner's decisions (30 settembre 2026): Lo Sfregiato is Nonno Aurelio's lost shark; the opening is
// playable on Aurelio's boat; the chapter ends with Aurelio and the Company ship sailing east.
// Values marked "tuning" are a first pass: change them here, never in systems.
import { PORT } from './economy';
import { LAIR } from './guardians';
import { bay, WORLD } from './worldLayout';

/** Where the story is. 'off' = no story (games created by tests or tools). */
export type StoryStep =
  | 'off'
  | 'intro'
  | 'tutorial'
  | 'portJobs' // Aurelio's jobs at the port (tappa 17), before the pier burns
  | 'pier'
  | 'findShark'
  | 'returnToAurelio'
  | 'chapter1Done' // …and on the way to the Delta
  | 'freeWhale' // chapter 2: break the chains in the Delta
  | 'chapter2Done'
  | 'freeKing' // chapter 3: the Re Corallo in the amphitheatre of the Barriera Rossa
  | 'chapter3Done'
  | 'freePiovra' // chapter 4: the Piovra bound by the Horn in the Foresta Sommersa
  | 'chapter4Done';

export const STORY_STEPS: StoryStep[] = [
  'off',
  'intro',
  'tutorial',
  'portJobs',
  'pier',
  'findShark',
  'returnToAurelio',
  'chapter1Done',
  'freeWhale',
  'chapter2Done',
  'freeKing',
  'chapter3Done',
  'freePiovra',
  'chapter4Done',
];

/** The story as kept in the save (v5). */
export interface SavedStory {
  step: StoryStep;
  tutorial: number;
  clues: string[];
  seen: string[];
  /** Progress of Aurelio's jobs (tappa 17; missing in older saves). */
  jobs?: Record<string, number>;
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
  jobs: [
    { who: 'aurelio', text: 'Te la cavi, in acqua. Ma prima di scendere sul serio, il porto ha bisogno di una mano.' },
    { who: 'aurelio', text: 'Quattro lavori: sardine per il mercato, i barracuda che rubano dalle reti, una nuova bestia in squadra, e il tuo compagno più forte.' },
    { who: 'aurelio', text: 'Li vedi scritti in alto. Quando hai finito, torna qui al molo.' },
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
  hintJobs: [
    { who: 'aurelio', text: 'I lavori sono scritti in alto: uno alla volta. Le sardine nuotano in banchi vicino alla spiaggia.' },
    { who: 'aurelio', text: 'Per domare: sfinisci la bestia in battaglia e lancia la Conchiglia. Più è stanca, più è facile.' },
  ],
  hintTutorial: [{ who: 'aurelio', text: 'Prendi confidenza col mare: nuota, pesca una sardina, prova lo scatto. Poi torna qui.' }],
  hintFindShark: [
    { who: 'aurelio', text: 'Il mio squalo è nella Baia, lo sento. Segui le catene spezzate verso il centro.' },
    { who: 'aurelio', text: 'Se trovi ossa antiche, serve una bestia forte: un Predatore o un Corazzato dal livello 16 impara Sfondamento e le rompe. Anche uno squalo bianco ci riesce.' },
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
    { who: 'aurelio', text: 'Laggiù vive il Re Corallo, il granchio più vecchio del mare. Se lei lo vuole, non è per venderlo.' },
  ],
  // chapter 3: the Barriera Rossa
  reCorallo: [
    { who: 'narratore', text: 'Sopra la Barriera, la nave nera è all’ancora. Tre catene scendono tese fino al fondale, tirate dagli argani.' },
    { who: 'narratore', text: 'In fondo a un anfiteatro di corallo, un granchio enorme si dibatte: il Re Corallo, strappato dal suo trono.' },
    { who: 'vedova', text: 'Ancora tu. Il ragazzino della balena.' },
    { who: 'vedova', text: 'Nei templi sommersi c’è una reliquia che piega le bestie come giunchi. Per trovarla mi serve una corazza che non si spezza: la sua.' },
    { who: 'vedova', text: 'Il dolore lo ha reso cieco. Scendi pure: attaccherà chiunque.' },
    { who: 'narratore', text: 'Sfinisci il Re Corallo nell’anfiteatro, poi spezza le catene degli argani.' },
  ],
  kingFree: [
    { who: 'narratore', text: 'L’ultima catena si spezza e frusta l’acqua. Il Re Corallo si rialza, lento, e ti guarda.' },
    { who: 'vedova', text: 'Tienitelo, il tuo granchio. La reliquia la troverò lo stesso.' },
    { who: 'vedova', text: 'Si salpa! Rotta sulla Foresta Sommersa.' },
    { who: 'narratore', text: 'Il Re Corallo batte le chele due volte sul corallo: ha scelto di seguirti.' },
  ],
  // chapter 4: the Foresta Sommersa
  piovra: [
    { who: 'narratore', text: 'Sopra la foresta di alghe la nave nera è all’ancora. Sotto la chiglia pende una campana di bronzo.' },
    { who: 'vedova', text: 'Sei puntuale, ragazzino. Senti questo suono? È il Corno delle Catene: il primo pezzo della reliquia.' },
    { who: 'vedova', text: 'Non servono più collari. La Piovra ora fa la guardia a quel galeone per me, e i suoi tentacoli sono ovunque tra le alghe.' },
    { who: 'narratore', text: 'Il suono passa per la campana sotto la nave. Spezzala, e l’incantesimo si spezza con lei.' },
  ],
  piovraFree: [
    { who: 'narratore', text: 'Il collare della Compagnia cade sul ponte del galeone. La Piovra ti avvolge piano un braccio, senza stringere.' },
    { who: 'vedova', text: 'Il Corno resta mio. Al nord c’è una regina che non ha bisogno di catene: le basterà sentirlo.' },
    { who: 'vedova', text: 'Si salpa! Rotta sul Mare di Ghiaccio.' },
    { who: 'narratore', text: 'La Piovra ha scelto di seguirti.' },
  ],
  hintPiovra: [
    { who: 'aurelio', text: 'Un corno che lega le bestie col suono… Rompi quello che lo fa arrivare in acqua, prima di tutto.' },
    { who: 'aurelio', text: 'Tra le alghe guarda dove si muovono da sole: lì sotto c’è un tentacolo. Se ti prende, scatta più volte.' },
  ],
  hintChapter4Done: [
    { who: 'aurelio', text: 'La Regina bianca… l’orca più vecchia del Mare di Ghiaccio. Se la Vedova la piega, nessuno al nord sarà al sicuro.' },
  ],
  hintFreeKing: [
    { who: 'aurelio', text: 'Un re impazzito dal dolore non riconosce nessuno. Sfinitelo, senza ucciderlo: poi le catene.' },
    { who: 'aurelio', text: 'È un Corazzato di livello 20: porta bestie forti, e cura la squadra al santuario della Barriera prima di scendere.' },
  ],
  hintChapter3Done: [
    { who: 'aurelio', text: 'Il Re Corallo con noi… Il mare se lo ricorderà.' },
    { who: 'aurelio', text: 'Una reliquia che piega le bestie, nei templi. Se la Vedova la trova, nessuna catena servirà più. Cerca i templi prima di lei.' },
  ],
} satisfies Record<string, DialogueLine[]>;
export type DialogueId = keyof typeof DIALOGUES;

/** Short thoughts shown as messages, without stopping the game. */
export const STORY_NOTES = {
  gate: 'Ossa antiche, dure come ferro. Le rompe una bestia Predatore o Corazzato dal livello 16 (mossa Sfondamento), o uno squalo bianco: chiamala e premi Sfonda.',
  boneHint:
    'Ossa antiche, dure come ferro. Serve una bestia Predatore o Corazzato di livello 16 o più: impara Sfondamento e le rompe (pulsante Sfonda).',
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
  { id: 'catena', x: bay(380), text: 'Un anello di catena arrugginita, spezzato. Le tracce vanno verso il centro della Baia.' },
  { id: 'olio', x: bay(560), text: 'Olio nero sul fondale. E segni di denti enormi sulla roccia.' },
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
  chapter2Done: 'Raggiungi la Barriera Rossa: la nave della Vedova Nera è ancorata sopra un anfiteatro di corallo',
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
    awaySpeedMult: 3.5, // after the opening it sails off faster than you can swim…
    goneDistance: 520, // …and is gone only this far from you (out of sight)
    length: 90,
  },
};

/** The first beast, chosen right after the opening (systems/starter.ts). */
export const STARTER = {
  level: 5, // tuning
  title: 'Scegli il tuo compagno',
  aurelio:
    "«Il mare non perdona chi nuota da solo. Ho cresciuto tre creature antiche, nate prima dei nostri nonni: scegline una. Crescerà con te.»",
  evolves: (name: string, level: number): string => `Al livello ${level} diventa ${name}`,
  choose: 'Scegli',
};

/** The evolution on screen (ui/evolutionShow.ts). */
export const EVOLUTION_TEXT = {
  what: (name: string): string => `Cosa succede? ${name} si sta evolvendo!`,
  done: (from: string, to: string): string => `${from} si evolve in ${to}!`,
};

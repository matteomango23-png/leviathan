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
    { who: 'aurelio', text: 'Con la nave ferma, Luce accende un faro sotto lo scafo: le bestie curiose vengono a vedere, i predatori arrivano dopo un po’. Consuma un poco di carburante.' },
    { who: 'aurelio', text: 'Il pieno e le riparazioni si fanno in ogni porto e avamposto, nella scheda Mezzi.' },
  ],
  tipRumour: [
    { who: 'aurelio', text: 'Hai sentito una voce: una leggenda vive in quei mari. La trovi in Bacheca, tra i Ricercati, e nel diario della nave.' },
    { who: 'aurelio', text: 'Ogni caccia ha quattro passi: la Voce, l’Eco col sonar della nave, le Tracce col sottomarino, poi la Bestia.' },
    { who: 'aurelio', text: 'Le voci di una leggenda le senti solo quando la tua squadra è abbastanza forte per affrontarla. Sulla Bacheca vedi a che livello devi arrivare.' },
    { who: 'aurelio', text: 'Tocca la caccia e premi Segui: la vedrai in plancia e al timone, con la strada da fare.' },
  ],
  tipEcho: [
    { who: 'aurelio', text: 'Un’eco anomala! Lì sotto c’è la sua tana: sul sonar ha la sua scritta, e se è oltre il bordo una freccia ti dice da che parte e quanto è lontana. Ferma la nave vicino e cala il sottomarino.' },
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
    { who: 'aurelio', text: 'Prima cosa, sempre: se hai pesci nella sacca, tocca “Vendi” in alto. Il pescato diventa denti, e coi denti compri tutto.' },
    { who: 'aurelio', text: 'Le schede a sinistra: la Bacheca con le taglie, il Mercato col pescato e le bestie che il porto compra, Conchiglie, Cure ed Esche, il Sub (mute e armi), i Mezzi (pieno, riparazioni, nuove navi a Porto Fango), lo Zaino e il Recinto delle bestie.' },
    { who: 'aurelio', text: 'Riposa cura te e la squadra e ti fa risvegliare qui; Tuffati ti rimette in acqua.' },
  ],
  // the first hours (owner, 12 novembre 2026: "non è spiegato nulla"): they come during the guided first dive too
  tipPack: [
    { who: 'aurelio', text: 'Le bestie piccole sono compagne: nuotano al tuo fianco, cacciano i pesci e ti aiutano coi loro poteri. In acqua ne porti fino a due.' },
    { who: 'aurelio', text: 'Per chiamarne una, tocca la sua sfera nella barra della squadra in alto. Se ne chiami una terza, la prima se ne va.' },
    { who: 'aurelio', text: 'Le bestie lunghe più di quattro metri e mezzo sono cavalcature: ti prendono in groppa e vanno veloci. Il tuo compagno lo diventerà crescendo.' },
  ],
  tipBigBeasts: [
    { who: 'aurelio', text: 'Attento! Qui vicino nuota una bestia molto più forte della tua squadra.' },
    { who: 'aurelio', text: 'Le bestie grosse hanno un livello alto. All’inizio evitale: fai crescere la squadra con le bestie piccole della baia, poi torna da loro.' },
  ],
  tipSmokers: [
    { who: 'aurelio', text: 'Quei camini neri sul fondo delle fosse sputano acqua bollente: dentro il pennacchio ti scotti, a nuoto. Nel sottomarino non ti fa niente.' },
    { who: 'aurelio', text: 'Attorno ai camini vive gente strana: vermi, granchi bianchi, funghi che fanno luce. E nel buio delle fosse nuotano i pesci lanterna, con la loro lucina: si pescano e si vendono bene.' },
  ],
  tipNight: [
    { who: 'aurelio', text: 'Cala la notte. Il giorno qui dura poco più di mezz’ora, e quasi metà è buio.' },
    { who: 'aurelio', text: 'Di notte si vede poco: solo la luna, la tua lampada e le luci della nave. Le bestie lontane sono sagome. I predatori ti vedono da più lontano e nuotano più forte; quelle tranquille si nascondono.' },
    { who: 'aurelio', text: 'Ma è anche l’ora buona: certe bestie escono quasi solo col buio, e gli albini si incontrano più spesso.' },
    { who: 'aurelio', text: 'Riposa cura te e la squadra e non fa passare il tempo. Dormi, al porto o a nave ferma, fa correre le ore fino a sera o fino al mattino: ti svegli quando vuoi.' },
  ],
  tipGun: [
    { who: 'aurelio', text: 'Il caricatore del fucile tiene dieci dardi: sul pulsante vedi quanti ne restano, e quanti ne hai di scorta.' },
    { who: 'aurelio', text: 'Quando è vuoto, tocca di nuovo Fucile: ricarichi in un attimo, e se lo tieni premuto la raffica riprende da sola. I dardi di scorta si comprano in ogni porto, scheda Sub.' },
  ],
  tipTaming: [
    { who: 'aurelio', text: 'Per domare una bestia sfiniscila in battaglia: più la sua barra è vuota, più la conchiglia tiene. Sul pulsante Doma vedi la probabilità prima di lanciare.' },
    { who: 'aurelio', text: 'Ogni livello che ha sopra la tua bestia più forte la rende più difficile: con nove livelli di differenza riesci di rado. Le conchiglie migliori aiutano, quella del Re non sbaglia mai.' },
  ],
  tipSell: [
    { who: 'aurelio', text: 'Il pesce che prendi finisce nella sacca. Al porto tocca “Vendi” in alto: le sardine diventano denti.' },
    { who: 'aurelio', text: 'I denti sono il denaro del mare: conchiglie per domare, cure, esche, mute, armi e navi.' },
  ],
  // the bounties' path, the diary and the market's requests (owner, 26 ottobre 2026)
  tipBounties: [
    { who: 'aurelio', text: 'Sulla bacheca di ogni porto ci sono le taglie: tutte le bestie del mare, dalle più facili alle più difficili. Ogni card ti dice dove vive la bestia e a che profondità.' },
    { who: 'aurelio', text: 'Accettale qui al porto: puoi seguirne 5 comuni, 2 alfa o albine e un leggendario. Le ritrovi nel Diario del cockpit.' },
    { who: 'aurelio', text: 'Batti o cattura una bestia che segui e i denti arrivano subito, ovunque tu sia. Più la bestia è forte, più paga: un leggendario vale diecimila denti.' },
  ],
  tipRequests: [
    { who: 'aurelio', text: 'Al Mercato guarda le richieste: ogni porto compra alcune bestie e le paga da due a tre volte il prezzo.' },
    { who: 'aurelio', text: 'C’è anche il Baratto: dai più bestie comuni della stessa specie e ricevi la sua versione albina o alfa. Più è rara, più ne chiedono.' },
    { who: 'aurelio', text: 'Catturane una, lasciala in riserva e vendila lì. È un guadagno a parte: la taglia l’hai già incassata quando l’hai presa.' },
  ],
  tipPlaces: [
    { who: 'aurelio', text: 'Hai trovato un luogo che finisce sulla mappa. Più al largo ce ne sono altri: archi, relitti, ossa di giganti.' },
    { who: 'aurelio', text: 'Nelle Grandi fosse, a metà parete, archi di roccia segnano le Gallerie: tunnel bui fino a una caverna. Ci passi a nuoto o in sottomarino, non con le bestie grandi né con l’U-Boot. La più grande è la Cattedrale.' },
  ],
  tipDiveLock: [
    { who: 'aurelio', text: 'Nel sottomarino il Gas e la leva Sali/Scendi tornano a riposo quando li lasci. Tocca il pulsante B: restano tutti e due dove li metti, così vai avanti e scendi piano anche guardando il cockpit. Toccalo di nuovo e tornano a riposo.' },
    { who: 'aurelio', text: 'Se un mezzo resta incastrato da qualche parte, nel menu di pausa c’è "Sono bloccato": ti riporta al molo di Porto Fango con la nave.' },
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
  | 'abyssPart'
  | 'landmarkFound'
  | 'tamedToTeam'
  | 'dangerSeen'
  | 'fishCaught'
  | 'battleOver'
  | 'gunEmpty'
  | 'smokerBurn'
  | 'nightFalls';
/** `early`: it can open during the guided first dive too. */
export const TIPS: { id: DialogueId; title: string; on: TipTrigger; early?: true }[] = [
  { id: 'tipPack', title: 'Compagni e cavalcature', on: 'tamedToTeam', early: true },
  { id: 'tipSell', title: 'Vendere il pescato', on: 'fishCaught', early: true },
  { id: 'tipBigBeasts', title: 'Le bestie grandi', on: 'dangerSeen', early: true },
  { id: 'tipTaming', title: 'Domare', on: 'battleOver', early: true },
  { id: 'tipGun', title: 'Il fucile e i dardi', on: 'gunEmpty', early: true },
  { id: 'tipSmokers', title: 'Il fondo delle fosse', on: 'smokerBurn' },
  { id: 'tipNight', title: 'Il giorno e la notte', on: 'nightFalls', early: true },
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
  { id: 'tipBounties', title: 'Taglie e Diario', on: 'portArrived' },
  { id: 'tipRequests', title: 'Le richieste del mercato', on: 'portArrived' },
  { id: 'tipPlaces', title: 'Luoghi e Gallerie', on: 'landmarkFound' },
  { id: 'tipDiveLock', title: 'Le leve bloccabili e "Sono bloccato"', on: 'boarded' },
];
/** In story.seen: the tips are switched off (the Guida in the pause menu). */
export const TIPS_OFF = 'tips-off';

/** The guided first dive, in order (owner, 8 ottobre: swim, catch sardines, tame your first beast). */
export const TUTORIAL = [
  { id: 'swim', count: 1, text: 'Nuota: joystick a sinistra (sul computer WASD o frecce)' },
  {
    id: 'fish',
    count: 5, // tuning
    text: 'Cattura le sardine: trascina il pulsante Fucile verso il pesce e tienilo premuto per la raffica (sul computer clic o Spazio)',
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

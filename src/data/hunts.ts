// Leviatano — the hunts (owner's decisions of 4 ottobre 2026): the legends and the prehistoric giants no longer
// come by chance. Each lives in a den, in its region, at its depth, and shows itself only in its weather. A hunt
// has four steps, written in the hunting diary: a rumour heard at a harbour or an outpost (its region and its
// weather), the anomalous echo found with the ship's sonar (close enough, in its weather), the traces found under
// water by the den, then the beast. Values marked "tuning" are a first pass: change them here, never in systems.
import type { SeaRegionId } from './regions';
import { kmToX } from './regions';
import type { WeatherId } from './weather';
import { delta } from './worldLayout';

export type HuntCondition = WeatherId | 'sempre';

export interface HuntDef {
  id: string;
  /** What you hunt: a legend (unique) or a species (a prehistoric giant). */
  form: { speciesId: string; unique?: string };
  /** Shown before you meet it (the rumour's name for it). */
  name: string;
  region: SeaRegionId | 'costa';
  /** The den: world x and depth (m); the den sits above the floor if the floor is shallower. */
  x: number;
  depthM: number;
  condition: HuntCondition;
  rumour: string;
  traces: string;
}

export const HUNTS: HuntDef[] = [
  {
    id: 'caccia_coccodrillo',
    form: { speciesId: 'coccodrillo_marino', unique: 'coccodrillo_marino_leggendario' },
    name: 'Coccodrillo albino leggendario',
    region: 'costa',
    x: delta(2300),
    depthM: 15,
    condition: 'pioggia',
    rumour: 'I pescatori di Porto Fango giurano di aver visto un coccodrillo bianco come un osso nel Delta, quando piove.',
    traces: 'Carcasse di bufali trascinate sul fondo e solchi enormi nel fango.',
  },
  {
    id: 'caccia_martello',
    form: { speciesId: 'squalo_martello', unique: 'squalo_martello_preistorico' },
    name: 'Squalo martello preistorico',
    region: 'barriera_esterna',
    x: kmToX(5.1),
    depthM: 60,
    condition: 'sereno',
    rumour: 'Nella Barriera esterna, nelle giornate serene, un martello corazzato squarcia le reti dei pescatori.',
    traces: 'Coralli spezzati di netto e denti grandi come una mano piantati nella roccia.',
  },
  {
    id: 'caccia_tartaruga',
    form: { speciesId: 'tartaruga_marina', unique: 'tartaruga_preistorica' },
    name: 'Tartaruga preistorica',
    region: 'mare_blu',
    x: kmToX(10.4),
    depthM: 40,
    condition: 'nuvoloso',
    rumour: 'Nel Mare blu, sotto il cielo coperto, un’isola che si muove: è un guscio grande come una casa.',
    traces: 'Gusci di molluschi frantumati e alghe strappate a grandi morsi.',
  },
  {
    id: 'caccia_beluga',
    form: { speciesId: 'beluga', unique: 'beluga_spettro' },
    name: 'Beluga spettro',
    region: 'banchisa',
    x: kmToX(13.7),
    depthM: 30,
    condition: 'nebbia',
    rumour: 'Oltre la foresta di alghe, nella nebbia, si sente cantare una balena bianca che nessuno ha mai catturato.',
    traces: 'Bolle d’aria che salgono senza sosta e un canto che fa vibrare il ghiaccio.',
  },
  {
    id: 'caccia_matriarca',
    form: { speciesId: 'orca', unique: 'orca_matriarca_finale' },
    name: 'Madre delle madri',
    region: 'banchisa',
    x: kmToX(16.3),
    depthM: 50,
    condition: 'pioggia',
    rumour: 'Quando nevica sulla Banchisa, le orche cacciano tutte insieme: le guida una madre più vecchia del porto.',
    traces: 'Resti di foche e di narvali sotto il ghiaccio spaccato.',
  },
  {
    id: 'caccia_orca_albina',
    form: { speciesId: 'orca', unique: 'orca_preistorica_albina' },
    name: 'Orca preistorica albina',
    region: 'banchisa',
    x: kmToX(17.4),
    depthM: 80,
    condition: 'tempesta',
    rumour: 'Nella bufera, al confine della Banchisa, un’orca bianca e enorme sfonda il ghiaccio dal basso.',
    traces: 'Ghiaccio spaccato dal basso e una scia di sangue che scende nel buio.',
  },
  {
    id: 'caccia_megalodonte',
    form: { speciesId: 'megalodonte' },
    name: 'Megalodonte',
    region: 'grandi_fosse',
    x: kmToX(23.6),
    depthM: 220,
    condition: 'nuvoloso',
    rumour: 'All’Orlo delle Grandi fosse le balene arrivano morse a metà. Qualcosa di più grande di uno squalo bianco.',
    traces: 'Una carcassa di balena tagliata in due da un morso solo.',
  },
  {
    id: 'caccia_livyatan',
    form: { speciesId: 'livyatan' },
    name: 'Il Leviatano (Livyatan)',
    region: 'abisso',
    x: kmToX(28.6),
    depthM: 250,
    condition: 'tempesta',
    rumour: 'All’Ultimo Avamposto dicono che nelle tempeste l’Abisso respira: il Leviatano sale dal fondo.',
    traces: 'Ossa di capodoglio spezzate e un ruggito che fa tremare lo scafo.',
  },
];

export const HUNT_RULES = {
  /** The ship's sonar hears an anomalous echo this close to the den (units, ~300 m). Tuning. */
  sonarRange: 1800,
  /** Under water, the traces show this close to the den (units). */
  traceRadius: 280,
  /** The beast comes out of its den when you are this close (its waters, units). */
  denHalfWidth: 300,
  denHalfHeight: 110,
  /** Echoes of beasts on the sonar: this close (units, × the sonar's range; their sizes: SONAR). */
  bigEchoRange: 900,
};

/** The sonar at the centre of the hunt (block 5a, owner 9 ottobre 2026): echoes of five sizes, each ship's sonar
 *  telling apart as many as it is good for; touched on the cockpit's screen an echo is analysed (this many seconds,
 *  ÷ the sonar's range): a species you have seen is named, a new one gives clues. Tuning. */
export type EchoClass = 'piccola' | 'media' | 'grande' | 'enorme' | 'leggendaria';
export const SONAR = {
  /** By length (m, from), smallest first; 'leggendaria' is for the unique beasts and the legends. */
  classes: [
    ['piccola', 0],
    ['media', 2],
    ['grande', 4],
    ['enorme', 9],
  ] as [EchoClass, number][],
  /** What a sonar telling apart this many classes can name (the others join the nearest smaller one it names). */
  named: {
    2: ['piccola', 'grande'],
    3: ['piccola', 'media', 'grande'],
    4: ['piccola', 'media', 'grande', 'enorme'],
    5: ['piccola', 'media', 'grande', 'enorme', 'leggendaria'],
  } as Record<number, EchoClass[]>,
  analyzeSeconds: 8,
};

/** The tracker dart (block 5a): shot from any submarine at a wild beast this close in front (m), it follows the beast
 *  for this many seconds of play (owner: about 30 minutes, time to go back, refuel and set out again). Tuning. */
export const TRACKER = { reachM: 25, seconds: 1800 };

export const CONDITION_TEXT: Record<HuntCondition, string> = {
  sereno: 'solo col cielo sereno',
  nuvoloso: 'solo col cielo coperto',
  pioggia: 'solo quando piove (sulla Banchisa: quando nevica)',
  tempesta: 'solo in tempesta',
  nebbia: 'solo con la nebbia',
  sempre: 'in ogni momento',
};

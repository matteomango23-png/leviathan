// How each battle move looks (owner, 8 and 22 ottobre 2026: "animazioni diverse per le mosse, oggi tutte uguali").
// A general rule (systems/battle/moveAnim.ts): a physical move bites, a special one shoots from afar, a status move
// on itself makes the beast swell and glow, one on the other sends waves at it. These are the exceptions, by move id:
// - `ram`: a long, fast charge with the whole body (head-butts, charges, dives);
// - `tail`: a turn of the body and a sweeping cut (tails, fins, claws, blades, pincers);
// - `burst`: it throbs where it is and rings of force break over the other (quakes, storms, landslides);
// - `ranged`: thrown or shot from afar though physical (stones, spikes, ice);
// - `bite`: a special move that is a bite after all.
export type MoveAnim = 'bite' | 'ram' | 'tail' | 'ranged' | 'burst' | 'self' | 'hex';

const RAM = [
  'spinta',
  'guizzo',
  'capocciata',
  'schiacciata',
  'testata_cieca',
  'carica_suicida',
  'carica_preistorica',
  'assalto',
  'forza_bruta',
  'risalita',
  'scatto_acqua',
  'carica_elettrica',
  'carica_fulminea',
  'tuffo',
  'picchiata',
  'testata_roccia',
  'testata_acciaio',
];
const TAIL = [
  'graffio',
  'fendente',
  'taglio_buio',
  'finta',
  'artigliata',
  'colpo_coda',
  'artiglio_antico',
  'lambita',
  'artiglio_ombra',
  'codata',
  'colpo_ala',
  'lama_pietra',
  'pinza',
  'chela_acciaio',
  'martello_chela',
  'coda_acciaio',
];
const BURST = [
  'onda_marina',
  'maremoto',
  'bufera',
  'tuono',
  'onda_urto',
  'uragano',
  'frana',
  'smottamento',
  'scossa_fondale',
  'eruzione',
  'tomba_sassi',
  'ira_leviatano',
];
const RANGED = ['sassi', 'aculei', 'scheggia', 'stalattite', 'ghiaccioli', 'fango_nero'];

/** The exceptions to the general rule, by move id. */
export const MOVE_ANIM: Readonly<Record<string, MoveAnim>> = Object.fromEntries([
  ...RAM.map((id) => [id, 'ram'] as const),
  ...TAIL.map((id) => [id, 'tail'] as const),
  ...BURST.map((id) => [id, 'burst'] as const),
  ...RANGED.map((id) => [id, 'ranged'] as const),
]);

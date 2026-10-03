// Leviatano — chapter 4 (tappa 18): in the Foresta Sommersa the Vedova Nera has found a first piece of the relic,
// the Corno delle Catene. Its sound, from a bronze bell under her ship, binds La Piovra: the giant octopus with
// the Company's collar guards a galleon sunk among the kelp, and her tentacles rise from the kelp at whoever comes.
// Break the bell and the spell breaks; then the Piovra fights you by the wreck; beaten, the collar snaps and she
// joins you; the Vedova flees towards the Mare di Ghiaccio. Owner's decisions of 3 ottobre 2026 (level 25).
// Values marked "tuning" are a first pass: change them here, never in systems.
import { east, WORLD } from './worldLayout';

export const WRECK = {
  x: east(4700), // the galleon on the floor of the kelp forest (the floor there is at ~446)
  floorY: 446,
  length: 150, // units, as drawn
  arena: { rx: 120, top: 330 }, // where the Piovra fights you: around the wreck, from this depth down to the floor
};

export const PIOVRA = {
  speciesId: 'piovra',
  level: 25, // owner: "si ok" to 25 (the Re Corallo was 20)
  title: 'Guardiana della Foresta',
  shipX: east(4700), // the Vedova's ship, right above the wreck
  meetDistance: 160,
  shipLeaveDistance: 1400, // after she is free the ship sails east, towards the Mare di Ghiaccio
  walkSpeed: 26, // u/s along the wreck (tuning)
  reach: 8,
};

/** The bronze bell under the ship that sounds the Horn: break it and the spell breaks. */
export const BELL = {
  x: east(4700),
  y: WORLD.surfaceY + 34,
  hp: 3, // tuning: weapon hits (each shot is one hit, whatever the weapon)
  reach: 12,
  ringEvery: 2.4, // seconds between the sound waves drawn under water
};

/** The tentacles that rise from the kelp while the spell holds (systems/chapter4.ts). */
export const TENTACLES = {
  xs: [east(4300), east(4400), east(4620)], // where they rise from the floor, on the way to the wreck
  height: 70, // units up from the floor
  reach: 10, // a diver this close to a raised tentacle is grabbed
  warn: 1.3, // seconds of warning (the kelp shakes, a shadow) before it rises
  up: 2.2, // seconds it stays up
  rest: [2, 4.5] as [number, number], // seconds down before the next warning
  wakeRange: 140, // they move only when you are this close
  /** Grabbed: you are pulled towards its base and lose air; free yourself by tapping the dash. */
  grab: { taps: 5, o2PerSecond: 6, pull: 30, cooldown: 3 },
};

export const CHAPTER4_MARKS = {
  bell: 'piovra:campana',
  down: 'piovra:sfinita',
  reward: 'piovra:premio',
};
export const chapter4MarkIds = (): string[] => Object.values(CHAPTER4_MARKS);

export const CHAPTER4_TEXT = {
  objective: 'Raggiungi la Foresta Sommersa: la nave della Vedova è ancorata sopra un galeone affondato',
  bell: (left: number): string =>
    `Spezza la campana di bronzo sotto la nave: il suono del Corno incatena la Piovra (${left} colpi)`,
  fight: 'L’incantesimo è spezzato: affronta la Piovra vicino al galeone',
  done: 'Capitolo 4 completato · la Vedova Nera fugge verso il Mare di Ghiaccio (capitolo 5 in arrivo)',
  grabbed: 'Un tentacolo ti afferra! Premi Scatto più volte per liberarti.',
  freed: 'Ti liberi dalla stretta.',
  bellHit: (left: number): string =>
    left > 0 ? `La campana si incrina (${left}).` : 'La campana si spacca: il suono del Corno si spegne.',
  exhausted: 'La Piovra si accascia sul galeone. Il collare della Compagnia si spezza.',
  chapterDone: 'Capitolo 4 completato.',
};

// The abyssal ship and its submarine (owner, 23 and 25 ottobre 2026): built at Porto Fango's shipyard from six rare
// parts found in the farthest wrecks and in the caves of the Gallerie, plus teeth. Night vision and the abyssal
// submarine's own cockpit come with them. Values marked "tuning" are a first pass: change them here.

export interface AbyssPart {
  id: string;
  name: string;
  text: string;
  /** Where it lies: in a wreck of the open sea (its id, data/economy.ts) or in a chest in a cave of the Gallerie
   *  ('cathedral', or the n-th other gallery from the west). */
  where: { wreck: string } | { gallery: 'cathedral' | number };
}

export const ABYSS_PARTS: AbyssPart[] = [
  {
    id: 'scafo_titanio',
    name: 'Scafo di titanio',
    text: 'Lamiere che reggono mille metri d’acqua.',
    where: { wreck: 'relitto_grandi_fosse_3' },
  },
  {
    id: 'fari_abissali',
    name: 'Fari abissali',
    text: 'Luci che bucano il buio più nero.',
    where: { wreck: 'relitto_abisso_1' },
  },
  {
    id: 'cuore_reattore',
    name: 'Cuore del reattore',
    text: 'Un motore che non si ferma mai.',
    where: { wreck: 'relitto_abisso_3' },
  },
  {
    id: 'vetro_pressione',
    name: 'Vetro di pressione',
    text: 'L’oblò del sottomarino abissale: non si incrina.',
    where: { gallery: 'cathedral' },
  },
  {
    id: 'visore_verde',
    name: 'Visore verde',
    text: 'La visione notturna: vedi nel buio come di giorno.',
    where: { gallery: 0 },
  },
  {
    id: 'eliche_mute',
    name: 'Eliche mute',
    text: 'Eliche che non fanno rumore: le bestie non ti sentono arrivare.',
    where: { gallery: 1 },
  },
];

/** Building them: the ship's id, the teeth it costs besides the parts, and the teeth in a Gallerie's chest. Tuning. */
export const ABYSS_BUILD = { ship: 'abissale', price: 80000, chestTeeth: 1500 };

/** Night vision (owner, 23 ottobre): the screen goes green, the dark opens, a green sonar wave goes out every
 *  `waveEvery` seconds at `waveSpeed` units/s up to `waveReach` and lights what it touches for `glowSeconds`. Tuning. */
export const NIGHT_VISION = {
  tint: 0x2bff6a,
  /** How much of the darkness it takes away (1: all). */
  clear: 1,
  waveEvery: 2.5,
  waveSpeed: 260,
  waveReach: 420,
  glowSeconds: 0.9,
  /** The rock it lights: soft spots this far apart and this big (units), each this bright, overlapping into a line. */
  spotStep: 4,
  spotSize: 16,
  spotAlpha: 0.22,
  /** The fine lines and the grain of the visor (0…1). */
  lines: 0.12,
  grain: 0.08,
};

export const ABYSS_TEXT = {
  partFound: (name: string, have: number, of: number): string =>
    `Pezzo abissale: ${name}! (${have}/${of}) Portali al cantiere di Porto Fango.`,
  needParts: (have: number, of: number): string => `Servono tutti i pezzi abissali: ne hai ${have} su ${of}.`,
  built: 'La nave abissale è pronta, con il suo sottomarino!',
  nightOn: 'Visione notturna',
  nightOff: 'Visione normale',
};

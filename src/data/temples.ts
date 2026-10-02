// Leviatano — the sunken temples (tappa 14, owner's decisions of 2 ottobre 2026: "vedi tu" for the puzzles). The
// first one lies on the floor of the open sea, ~3 km from the coast: four halls in a row, a puzzle each, and at
// the end a relic. The Company has been here before you (the hook for chapter 3). Laid out by hand below: one
// character per cell of `cell` units. Values marked "tuning" are a first pass.
//   #  carved stone          .  water
//   1 2 3  gates (stone that slides away when opened)
//   L  a lever (hit it with a weapon)         a b  the twin levers (both within `twinWindow` seconds)
//   w x y z  runes (swim to them in the order of the mosaic)   M  the mosaic showing the order
//   V  an air vent (a column of bubbles)      C  the relic      N  the Company's chains (a note)
export interface TempleDef {
  id: string;
  name: string;
  /** Where it lies: in the middle of the first stretch of this kind at least minKm from the coast. */
  where: { biome: string; minKm: number };
  rise: number; // cells of the temple standing above the sea floor (the rest is buried)
  flatten: number; // units around it where the floor bends to meet it
  cell: number; // units per character
  layout: string[];
  runeOrder: string[]; // the order shown on the mosaic
  twinWindow: number; // seconds between the two twin levers
  relic: string; // RELICS id
}

export const TEMPLES: TempleDef[] = [
  {
    id: 'tempio_1',
    name: 'Tempio sommerso',
    where: { biome: 'aperto', minKm: 3 },
    rise: 9, // its lowest hall stays within reach of the light suit (150 m)
    flatten: 260,
    cell: 16,
    runeOrder: ['x', 'z', 'w', 'y'],
    twinWindow: 6, // tuning: about the time to swim from one lever to the other
    relic: 'respiro_antico',
    layout: [
      '######....######################################################################################',
      '#..............#a..............#................#..............................................#',
      '#..............#...............#..w.........x...#...........................................C..#',
      '#..............#...............#................#..............................................#',
      '#..N...........#...............#................#.............................V................#',
      '#..............#...............#................#..#############################################',
      '#..............#...............#................#..#############################################',
      '#..............#...............#................#..............................................#',
      '#.............L#....########...#.......M........#..............................................#',
      '#..............#...............#................#..............................................#',
      '#...#......#...#...............#................#.............V................................#',
      '#...#......#...#...............#................############################################...#',
      '#...#......#...#...............#................############################################...#',
      '#...#......#...1...............2................3..............................................#',
      '#...#......#...1...............2..z.........y...3..............................................#',
      '#...#......#...1.............b.2................3..............................................#',
      '#...#......#...1...............2................3..............................................#',
      '#...#......#...#...............#................#.....................V........................#',
      '################################################################################################',
      '################################################################################################',
    ],
  },
];

/** Relics: found at the end of the temples; their effect lasts for ever. */
export const RELICS: { id: string; name: string; text: string; o2DrainMult?: number }[] = [
  {
    id: 'respiro_antico',
    name: 'Respiro degli Antichi',
    text: 'Una conchiglia d’oro che respira da sola: la tua aria dura molto di più.',
    o2DrainMult: 0.65, // tuning: ~50% more air
  },
];

export const TEMPLE_TEXT = {
  entered: (name: string): string => `${name}: colonne spezzate, porte di pietra e rune che nessuno legge da secoli.`,
  chains: 'Catene spezzate e segni di argani, freschi: la Compagnia dell’Olio Nero è stata qui. Cosa cerca la Vedova Nera nei templi?',
  lever: 'Un meccanismo antico si muove: una porta di pietra scivola via.',
  twinFirst: 'La leva scatta… e torna su piano piano. Forse c’è un’altra leva da colpire subito dopo.',
  twinDone: 'Le due leve insieme: la porta si apre.',
  runeLit: 'La runa si accende.',
  runeWrong: 'Le rune si spengono tutte: non era l’ordine giusto. Guarda il mosaico.',
  runesDone: 'Le quattro rune brillano insieme: la porta si apre.',
  mosaic: (order: string[]): string =>
    `Il mosaico mostra quattro simboli in fila: ${order.map((r) => RUNE_GLYPHS[r]).join('  ')}`,
  relic: (name: string): string => `Hai trovato una reliquia: ${name}!`,
};

/** How each rune looks (on the walls and on the mosaic). */
export const RUNE_GLYPHS: Record<string, string> = { w: '☾', x: '✶', y: '◆', z: '▲' };

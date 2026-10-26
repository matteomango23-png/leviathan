// The bounties (owner, 26 ottobre 2026): every beast of the sea on the harbour's board, from the easiest to the
// hardest, as a path to follow; taken at a harbour, followed in the diary, paid at once when the beast is beaten
// or tamed. Besides them, the harbour's market asks for some beasts and pays double for them. Values marked
// "tuning" are a first pass: change them here.

export const BOUNTY_RULES = {
  /** Cards shown in each row of the board: the next ones of the path. */
  visible: 10,
  /** How many you follow at once, by kind (owner: 5 common, 2 alpha or albino, 1 legend). */
  follow: { comune: 5, rara: 2, leggendaria: 1 } as Record<BountyKind, number>,
  /** The reward: `base` + `perLevel` × the middle of its wild levels ^ `power`, × (1 + `perStar` × (stars − 1)),
   *  rounded to `round` teeth; an alpha or albino × `rareMult`; a legend `legend`. Tuning. */
  reward: { base: 40, perLevel: 1.1, power: 1.85, perStar: 0.15, rareMult: 2.5, round: 10, legend: 10000 },
};

export type BountyKind = 'comune' | 'rara' | 'leggendaria';

/** The market's requests for beasts (systems/economy/beastRequests.ts): how many a harbour asks for, × the price it
 *  pays, every how many seconds of play they change, how far along your path they may reach. Tuning. */
export const BEAST_REQUESTS = { count: 4, priceMult: 2, refreshSeconds: 1800, ahead: 12 };

export const BOUNTY_TEXT = {
  rows: { comune: 'Bestie comuni', rara: 'Alfa e albini', leggendaria: 'Leggendari' } as Record<BountyKind, string>,
  hint: 'Accetta una taglia e la bestia entra nel Diario: battila o catturala e i denti arrivano subito, ovunque tu sia. Dalle più facili alle più difficili.',
  closed: (name: string, how: string, teeth: number): string => `Taglia chiusa: ${name} ${how} · +${teeth} denti`,
  full: (kind: BountyKind, n: number): string =>
    kind === 'comune'
      ? `Segui già ${n} bestie comuni: chiudine una o smetti di seguirla nel Diario.`
      : kind === 'rara'
        ? `Segui già ${n} alfa o albini.`
        : 'Segui già un leggendario.',
  onlyAtPort: 'Le taglie si accettano solo al porto.',
  requests: 'Richieste del mercato',
  requestsHint: 'Il porto compra queste bestie e paga il doppio. Mettile in riserva e vendile da qui.',
};

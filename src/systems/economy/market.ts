// The fish market (owner, 15 ottobre 2026: "la sacca non deve avere un tetto" — but on 8 ottobre the sardines made
// thousands of teeth in minutes). The bag holds any number of fish; the market pays less for a kind it has just
// bought a lot of: each fish of a kind sold pushes its price down (MARKET_RULES.saturation fish to the floor), and
// the price comes back as real time passes (recoverPerMinute fish a minute). Pure logic.
import { MARKET_RULES } from '../../data/economy';
import { FISH } from '../../data/world';

export interface MarketState {
  /** How many fish of each kind the market still "remembers" buying. */
  sold: Record<string, number>;
  /** When it was last brought up to date (ms since 1970). */
  at: number;
}

export const newMarket = (): MarketState => ({ sold: {}, at: 0 });

/** The market's memory fades with the minutes gone by since the last sale. */
export function recover(m: MarketState, now: number): void {
  const minutes = m.at ? Math.max(0, (now - m.at) / 60000) : 0;
  for (const id of Object.keys(m.sold)) {
    m.sold[id] = Math.max(0, m.sold[id]! - minutes * MARKET_RULES.recoverPerMinute);
    if (m.sold[id] === 0) delete m.sold[id];
  }
  m.at = now;
}

/** The price of one more fish of this kind now (teeth, may be a fraction). */
export function unitPrice(m: MarketState, fishId: string): number {
  const base = FISH.find((f) => f.id === fishId)?.sellPrice ?? 0;
  const share = Math.max(MARKET_RULES.floor, 1 - (m.sold[fishId] ?? 0) / MARKET_RULES.saturation);
  return base * share;
}

/** What `n` fish of a kind fetch, one after the other (each pushes the price down), without selling them. */
export function quote(m: MarketState, fishId: string, n: number): number {
  const probe: MarketState = { sold: { ...m.sold }, at: m.at };
  let teeth = 0;
  for (let i = 0; i < n; i++) {
    teeth += unitPrice(probe, fishId);
    probe.sold[fishId] = (probe.sold[fishId] ?? 0) + 1;
  }
  return teeth;
}

/** Sells the whole bag: returns how many fish and teeth (rounded down once, at the end). */
export function sellAll(
  m: MarketState,
  bag: Record<string, number>,
  now: number,
): { count: number; teeth: number } {
  recover(m, now);
  let count = 0;
  let teeth = 0;
  for (const [id, n] of Object.entries(bag)) {
    if (n <= 0) continue;
    teeth += quote(m, id, n);
    m.sold[id] = (m.sold[id] ?? 0) + n;
    count += n;
  }
  return { count, teeth: Math.floor(teeth) };
}

/** What the bag is worth now (for the market's card). */
export function bagWorth(m: MarketState, bag: Record<string, number>, now: number): number {
  const probe: MarketState = { sold: { ...m.sold }, at: m.at };
  recover(probe, now);
  return Math.floor(Object.entries(bag).reduce((a, [id, n]) => a + quote(probe, id, n), 0));
}

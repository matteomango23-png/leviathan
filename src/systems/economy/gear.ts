// The diver's side of progress: teeth, the fish bag, suits and upgrades, weapons, items,
// the backpack (base harpoon + BACKPACK_SLOTS chosen at the port) and bound swarms.
import { MARKET, UPGRADE_EFFECTS } from '../../data/economy';
import { RELICS } from '../../data/temples';
import {
  BACKPACK_SLOTS,
  FISH,
  ITEMS,
  SUITS,
  SUIT_UPGRADES,
  SWARMS,
  WEAPONS,
  type SuitDef,
  START_INVENTORY,
} from '../../data/world';
import { DIVER } from '../../data/diver';

export interface MissionState {
  active: string[];
  done: string[];
  progress: Record<string, number>;
}

export interface GearState {
  teeth: number;
  bag: Record<string, number>; // fish waiting to be sold
  suit: string;
  suits: string[];
  upgrades: string[];
  weapons: string[]; // owned (the base harpoon is always there)
  activeWeapon: string;
  inventory: Record<string, number>;
  backpack: (string | null)[];
  swarms: string[]; // bound swarms
  wrecks: string[]; // opened wrecks and chests
  missions: MissionState;
  shopBought: Record<string, number>; // items bought during this port visit (stockPerVisit)
  mythicStock: number;
  deepestM: number;
  relics: string[]; // relics found in the sunken temples (tappa 14): their effect lasts for ever
}

export function newGear(): GearState {
  return {
    teeth: 0,
    bag: {},
    suit: SUITS[0]!.id,
    suits: [SUITS[0]!.id],
    upgrades: [],
    weapons: ['arpione'],
    activeWeapon: 'arpione',
    inventory: { ...START_INVENTORY },
    backpack: Array.from({ length: BACKPACK_SLOTS }, () => null),
    swarms: [],
    wrecks: [],
    missions: { active: [], done: [], progress: {} },
    shopBought: {},
    mythicStock: MARKET.mythicHarpoonStock,
    deepestM: 0,
    relics: [],
  };
}

export type SlotKind = 'weapon' | 'swarm' | 'item';
export function slotKind(id: string): SlotKind | null {
  if (WEAPONS.some((w) => w.id === id)) return 'weapon';
  if (SWARMS.some((s) => s.id === id)) return 'swarm';
  if (ITEMS.some((i) => i.id === id && !i.battleOnly)) return 'item';
  return null;
}

export function suitOf(g: GearState): SuitDef {
  return SUITS.find((s) => s.id === g.suit) ?? SUITS[0]!;
}

/** What the suit and upgrades do to the diver. */
export function diverModifiers(g: GearState): {
  maxHp: number;
  speedMult: number;
  o2DrainMult: number;
  canDash: boolean;
  maxDepthM: number;
  coneMult: number;
  coneWidthMult: number;
} {
  const s = suitOf(g);
  let o2 = s.o2Mult;
  if (g.upgrades.includes('apnea')) o2 *= UPGRADE_EFFECTS.apnea.o2DrainMult;
  for (const r of RELICS) if (g.relics.includes(r.id)) o2 *= r.o2DrainMult ?? 1;
  let cone = 1;
  let width = 1;
  if (g.upgrades.includes('lampada_2')) {
    cone = UPGRADE_EFFECTS.lampada_2.coneMult;
    width = UPGRADE_EFFECTS.lampada_2.widthMult;
  } else if (g.upgrades.includes('lampada_1')) cone = UPGRADE_EFFECTS.lampada_1.coneMult;
  return {
    maxHp: DIVER.maxHp + s.hpBonus,
    speedMult: s.speedMult,
    o2DrainMult: o2,
    canDash: s.dash,
    maxDepthM: s.maxDepth,
    coneMult: cone,
    coneWidthMult: width,
  };
}

export type BuyResult = { ok: true } | { ok: false; reason: string };
const fail = (reason: string): BuyResult => ({ ok: false, reason });

function pay(g: GearState, price: number): BuyResult {
  if (g.teeth < price) return fail(`Servono ${price} denti (ne hai ${g.teeth}).`);
  g.teeth -= price;
  return { ok: true };
}

export function buySuit(g: GearState, id: string): BuyResult {
  const s = SUITS.find((x) => x.id === id);
  if (!s) return fail('Muta sconosciuta.');
  if (g.suits.includes(id)) {
    g.suit = id;
    return { ok: true };
  }
  const r = pay(g, s.price);
  if (!r.ok) return r;
  g.suits.push(id);
  g.suit = id;
  return r;
}

export function buyUpgrade(g: GearState, id: string): BuyResult {
  const u = SUIT_UPGRADES.find((x) => x.id === id);
  if (!u) return fail('Potenziamento sconosciuto.');
  if (!MARKET.upgradesReady.includes(id)) return fail('Non ancora disponibile.');
  if (g.upgrades.includes(id)) return fail('Già tuo.');
  if (id === 'lampada_2' && !g.upgrades.includes('lampada_1'))
    return fail('Prima serve la Lampada potenziata.');
  const r = pay(g, u.price);
  if (r.ok) g.upgrades.push(id);
  return r;
}

/** How many of an item can still be bought during this visit (Infinity when unlimited). */
export function stockLeft(g: GearState, id: string): number {
  const it = ITEMS.find((x) => x.id === id);
  if (!it) return 0;
  if (id === 'arpione_mitico') return Math.max(0, g.mythicStock);
  return it.stockPerVisit === undefined ? Infinity : Math.max(0, it.stockPerVisit - (g.shopBought[id] ?? 0));
}

export function buyItem(g: GearState, id: string): BuyResult {
  const it = ITEMS.find((x) => x.id === id);
  if (!it || !MARKET.items.includes(id)) return fail('Non in vendita.');
  if (stockLeft(g, id) <= 0) return fail('Esaurito per ora.');
  const r = pay(g, it.price);
  if (!r.ok) return r;
  g.inventory[id] = (g.inventory[id] ?? 0) + 1;
  g.shopBought[id] = (g.shopBought[id] ?? 0) + 1;
  if (id === 'arpione_mitico') g.mythicStock--;
  return r;
}

/** Sells the whole bag. Returns how many fish and teeth. */
export function sellBag(g: GearState): { count: number; teeth: number } {
  let count = 0;
  let teeth = 0;
  for (const [id, n] of Object.entries(g.bag)) {
    const f = FISH.find((x) => x.id === id);
    if (!f || n <= 0) continue;
    count += n;
    teeth += n * f.sellPrice;
  }
  g.bag = {};
  g.teeth += teeth;
  return { count, teeth };
}

export const bagCount = (g: GearState): number => Object.values(g.bag).reduce((a, b) => a + b, 0);

/** Can this id go in a backpack slot right now? */
export function canEquip(g: GearState, id: string): boolean {
  const k = slotKind(id);
  if (k === 'weapon') return id !== 'arpione' && g.weapons.includes(id);
  if (k === 'swarm') return g.swarms.includes(id);
  if (k === 'item') return (g.inventory[id] ?? 0) > 0;
  return false;
}

export function setSlot(g: GearState, slot: number, id: string | null): boolean {
  if (slot < 0 || slot >= g.backpack.length) return false;
  if (id !== null && (!canEquip(g, id) || g.backpack.includes(id))) return false;
  const old = g.backpack[slot];
  g.backpack[slot] = id;
  if (old && old === g.activeWeapon) g.activeWeapon = 'arpione';
  return true;
}

/** Items that ran out leave their slot empty. */
export function cleanBackpack(g: GearState): void {
  g.backpack = g.backpack.map((id) =>
    id && slotKind(id) === 'item' && (g.inventory[id] ?? 0) <= 0 ? null : id,
  );
}

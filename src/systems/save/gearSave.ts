// Checking the saved equipment (v3). Unknown ids (e.g. from a newer game) are dropped, numbers are clamped.
import { MISSIONS } from '../../data/economy';
import { FISH, ITEMS, SUITS, SUIT_UPGRADES, SWARMS, WEAPONS, BACKPACK_SLOTS } from '../../data/world';
import { WRECKS } from '../../data/economy';
import { UNIQUE_VARIANTS } from '../../data/species';

export interface SavedGear {
  teeth: number;
  bag: Record<string, number>;
  suit: string;
  suits: string[];
  upgrades: string[];
  weapons: string[];
  activeWeapon: string;
  inventory: Record<string, number>;
  backpack: (string | null)[];
  swarms: string[];
  wrecks: string[];
  missions: { active: string[]; done: string[]; progress: Record<string, number> };
  mythicStock: number;
  deepestM: number;
  /** Guardians already beaten (their reward is given once). */
  guardians: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, min = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, v) : min;
const ids = (v: unknown, known: string[]): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === 'string' && known.includes(x)))]
    : [];
const counts = (v: unknown, known: string[]): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!isObj(v)) return out;
  for (const [k, n] of Object.entries(v)) if (known.includes(k) && num(n) > 0) out[k] = Math.floor(num(n));
  return out;
};

export function validateGear(raw: unknown): SavedGear {
  if (!isObj(raw)) throw new Error('Equipaggiamento non valido.');
  const suitIds = SUITS.map((s) => s.id);
  const weaponIds = WEAPONS.map((w) => w.id);
  const itemIds = ITEMS.map((i) => i.id);
  const swarmIds = SWARMS.map((s) => s.id);
  const suits = ids(raw.suits, suitIds);
  if (!suits.includes(SUITS[0]!.id)) suits.unshift(SUITS[0]!.id);
  const weapons = ids(raw.weapons, weaponIds);
  if (!weapons.includes('arpione')) weapons.unshift('arpione');
  const suit = typeof raw.suit === 'string' && suits.includes(raw.suit) ? raw.suit : SUITS[0]!.id;
  const activeWeapon =
    typeof raw.activeWeapon === 'string' && weapons.includes(raw.activeWeapon) ? raw.activeWeapon : 'arpione';
  const slotIds = [...weaponIds, ...itemIds, ...swarmIds];
  const bp = Array.isArray(raw.backpack) ? raw.backpack : [];
  const backpack = Array.from({ length: BACKPACK_SLOTS }, (_, i) => {
    const v = bp[i];
    return typeof v === 'string' && slotIds.includes(v) ? v : null;
  });
  const missionIds = MISSIONS.map((m) => m.id);
  const m = isObj(raw.missions) ? raw.missions : {};
  const progress: Record<string, number> = {};
  if (isObj(m.progress))
    for (const [k, v] of Object.entries(m.progress)) if (missionIds.includes(k)) progress[k] = num(v);
  return {
    teeth: Math.floor(num(raw.teeth)),
    bag: counts(
      raw.bag,
      FISH.map((f) => f.id),
    ),
    suit,
    suits,
    upgrades: ids(
      raw.upgrades,
      SUIT_UPGRADES.map((u) => u.id),
    ),
    weapons,
    activeWeapon,
    inventory: counts(raw.inventory, itemIds),
    backpack,
    swarms: ids(raw.swarms, swarmIds),
    wrecks: ids(
      raw.wrecks,
      WRECKS.map((w) => w.id),
    ),
    missions: { active: ids(m.active, missionIds), done: ids(m.done, missionIds), progress },
    mythicStock: Math.floor(num(raw.mythicStock)),
    deepestM: num(raw.deepestM),
    guardians: ids(
      raw.guardians,
      UNIQUE_VARIANTS.map((u) => u.id),
    ),
  };
}

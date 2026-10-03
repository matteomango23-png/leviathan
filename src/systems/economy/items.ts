// Medicine and battle items, like Pokémon's (data/world.ts ITEMS, ItemDef.use): health, reviving, curing conditions,
// PP; used on a team beast from the backpack, or on a fighter in battle. Pokémon's rules: a potion does nothing to a
// worn-out beast or one already at full health, a revive works only on a worn-out one, a cure only on its condition.
import { ITEMS, type ItemDef, type ItemUse } from '../../data/world';
import type { StatusId } from '../../data/moveBattle';
import { BATTLE_MOVE_BY_ID } from '../../data/battleMoves';
import type { Fighter } from '../battle/fighter';
import { maxHpOf, type TeamBeast } from '../beasts/team';

export const itemDef = (id: string): ItemDef | undefined => ITEMS.find((i) => i.id === id);

/** What an item can change on a beast. */
export interface Care {
  hp: number;
  maxHp: number;
  ko: boolean;
  status: StatusId | null;
  pp: number[]; // PP left of each move
  maxPp: number[];
}

/** What an item did. */
export interface CareResult {
  healed: number;
  revived: boolean;
  cured: StatusId | null;
  pp: number;
}

/** Whether the item would do anything (`move`: the move an Etere is for; none: the one with the fewest PP). */
export function canApply(use: ItemUse, c: Care, move?: number): boolean {
  if (use.revive) return c.ko;
  if (c.ko) return false;
  if (use.heal && c.hp < c.maxHp) return true;
  if (use.cure && c.status && (use.cure === 'all' || use.cure.includes(c.status))) return true;
  if (use.pp) {
    if (use.pp.all) return c.pp.some((p, i) => p < c.maxPp[i]!);
    const i = move ?? lowestPp(c);
    return i >= 0 && c.pp[i]! < c.maxPp[i]!;
  }
  return false;
}

const lowestPp = (c: Care): number => {
  let best = -1;
  c.pp.forEach((p, i) => {
    if (p < c.maxPp[i]! && (best < 0 || p / c.maxPp[i]! < c.pp[best]! / c.maxPp[best]!)) best = i;
  });
  return best;
};

/** Uses the item on `c` (check canApply first). */
export function applyCare(use: ItemUse, c: Care, move?: number): CareResult {
  const r: CareResult = { healed: 0, revived: false, cured: null, pp: 0 };
  if (use.revive && c.ko) {
    c.ko = false;
    c.hp = Math.max(1, Math.floor(c.maxHp * use.revive));
    c.status = null;
    r.revived = true;
    r.healed = c.hp;
    return r;
  }
  if (use.heal) {
    const want = use.heal === 'full' ? c.maxHp : use.heal;
    r.healed = Math.min(c.maxHp - c.hp, want);
    c.hp += r.healed;
  }
  if (use.cure && c.status && (use.cure === 'all' || use.cure.includes(c.status))) {
    r.cured = c.status;
    c.status = null;
  }
  if (use.pp) {
    const give = (i: number): void => {
      const add = Math.min(c.maxPp[i]! - c.pp[i]!, use.pp!.amount === 'full' ? Infinity : use.pp!.amount);
      c.pp[i]! += add;
      r.pp += add;
    };
    if (use.pp.all) c.pp.forEach((_p, i) => give(i));
    else {
      const i = move ?? lowestPp(c);
      if (i >= 0) give(i);
    }
  }
  return r;
}

/** A team beast seen as Care, and written back. */
export function careOfBeast(b: TeamBeast): Care {
  const maxPp = b.known.map((id) => BATTLE_MOVE_BY_ID[id]?.pp ?? 0);
  return {
    hp: b.hp,
    maxHp: maxHpOf(b),
    ko: b.ko,
    status: b.status ?? null,
    pp: maxPp.map((m, i) => Math.max(0, m - (b.ppUsed?.[i] ?? 0))),
    maxPp,
  };
}
export function writeBeast(b: TeamBeast, c: Care): void {
  b.hp = c.hp;
  b.ko = c.ko;
  b.status = c.status ?? undefined;
  if (!b.status) b.sleepTurns = undefined;
  const used = c.maxPp.map((m, i) => m - c.pp[i]!);
  b.ppUsed = used.some((n) => n > 0) ? used : undefined;
}

/** A fighter in battle seen as Care, and written back. */
export function careOfFighter(f: Fighter): Care {
  return {
    hp: f.hp,
    maxHp: f.maxHp,
    ko: f.hp <= 0,
    status: f.status,
    pp: f.moves.map((m) => m.pp),
    maxPp: f.moves.map((m) => m.maxPp),
  };
}
export function writeFighter(f: Fighter, c: Care): void {
  f.hp = c.ko ? 0 : c.hp;
  f.status = c.status;
  if (!f.status) f.sleepTurns = 0;
  f.moves.forEach((m, i) => (m.pp = c.pp[i]!));
}

/** Uses an item from the backpack on a team beast. False when it would do nothing (it is not spent then). */
export function useOnBeast(
  inventory: Record<string, number>,
  id: string,
  b: TeamBeast,
  move?: number,
): CareResult | null {
  const use = itemDef(id)?.use;
  if (!use || (inventory[id] ?? 0) <= 0) return null;
  const c = careOfBeast(b);
  if (!canApply(use, c, move)) return null;
  const r = applyCare(use, c, move);
  writeBeast(b, c);
  inventory[id] = (inventory[id] ?? 0) - 1;
  return r;
}

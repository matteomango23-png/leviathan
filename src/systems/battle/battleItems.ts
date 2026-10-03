// Items in battle, like Pokémon: medicine on one of your beasts (a revive on a worn-out one), X items on the one in
// the water, the mythic harpoon on the next taming attempt. Using an item costs your turn.
import { BATTLE_TEXT } from '../../data/battleText';
import { STAGE_NAMES } from '../../data/moveBattle';
import { applyCare, canApply, careOfFighter, itemDef, writeFighter } from '../economy/items';
import { you, type BattleState } from './battle';
import { named } from './fighter';
import { changeStage } from './status';

/** Which items of the backpack can be used in battle (medicine and battle items, not the shells: Doma). */
export const usableInBattle = (id: string): boolean => {
  const it = itemDef(id);
  return !!it?.use && (it.pocket === 'cure' || it.pocket === 'battaglia');
};

/** Whether the item would do anything on team beast `target` (its index; none: the one in the water). */
export function battleItemUseful(s: BattleState, id: string, target = s.active, move?: number): boolean {
  const use = itemDef(id)?.use;
  if (!use) return false;
  if (use.stage) return you(s).stages[use.stage.stat] < 6;
  if (use.tameMult) return true;
  const f = s.team[target];
  return !!f && canApply(use, careOfFighter(f), move);
}

/** Uses the item; returns what the battle says, and the taming bonus it gives (1: none). */
export function useBattleItem(
  s: BattleState,
  id: string,
  target = s.active,
  move?: number,
): { lines: string[]; tameMult: number } {
  const use = itemDef(id)?.use;
  if (!use) return { lines: [], tameMult: 1 };
  if (use.tameMult) return { lines: [], tameMult: use.tameMult };
  if (use.stage) {
    const me = you(s);
    const moved = changeStage(me, use.stage.stat, use.stage.by);
    return {
      lines: [BATTLE_TEXT.stage(named(me), STAGE_NAMES[use.stage.stat], moved, use.stage.by)],
      tameMult: 1,
    };
  }
  const f = s.team[target];
  if (!f) return { lines: [], tameMult: 1 };
  const c = careOfFighter(f);
  if (!canApply(use, c, move)) return { lines: [BATTLE_TEXT.noEffect], tameMult: 1 };
  const r = applyCare(use, c, move);
  writeFighter(f, c);
  const who = named(f);
  const lines: string[] = [];
  if (r.revived) lines.push(BATTLE_TEXT.revived(who));
  else if (r.healed) lines.push(BATTLE_TEXT.healed(who, r.healed));
  if (r.cured) lines.push(BATTLE_TEXT.cured(who));
  if (r.pp) lines.push(BATTLE_TEXT.ppBack(who));
  return { lines, tameMult: 1 };
}

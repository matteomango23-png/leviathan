// The battle's last panel: its title (won, tamed, lost, fled) and the experience your beast earned.
import { BATTLE_TEXT, type Named } from '../data/battleText';
import { you, type BattleState, type Side } from '../systems/battle/battle';
import { xpReward } from '../systems/beasts/growth';

export function resultText(s: BattleState, name: (side: Side) => Named): { title: string; lines: string[] } {
  const lines: string[] = [];
  let title: string = BATTLE_TEXT.won;
  if (s.over === 'won' || s.over === 'caught')
    lines.push(BATTLE_TEXT.xp(name('you'), xpReward(s.foe.form, s.foe.level, you(s).level)));
  if (s.over === 'caught') title = BATTLE_TEXT.tamed(name('foe'));
  if (s.over === 'lost') title = BATTLE_TEXT.lost;
  if (s.over === 'fled') title = BATTLE_TEXT.fleeOk;
  if (s.over === 'escaped') title = BATTLE_TEXT.foeEscaped;
  return { title, lines };
}

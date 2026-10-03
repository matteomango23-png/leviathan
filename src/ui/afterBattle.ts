// After a battle won, like Pokémon: each beast that grew shows its level-up panel, then the moves it wants to learn
// with 4 already known open the "learn a move" screen.
import type { Stats } from '../data/stats';
import { formName, formStats } from '../systems/beasts/forms';
import type { TeamBeast } from '../systems/beasts/team';
import { levelUpPanel } from './levelUpPanel';
import { learnScreen } from './movePanel';

export interface Snapshot {
  level: number;
  stats: Stats;
}

/** Each beast's level and statistics before the battle's experience. */
export function snapshotTeam(team: TeamBeast[]): Map<string, Snapshot> {
  return new Map(team.map((b) => [b.uid, { level: b.level, stats: formStats(b.form, b.level) }]));
}

export async function afterBattleScreens(
  parent: HTMLElement,
  team: TeamBeast[],
  before: Map<string, Snapshot>,
): Promise<void> {
  for (const b of team) {
    const was = before.get(b.uid);
    if (was && b.level > was.level)
      await levelUpPanel(
        parent,
        `${formName(b.form)} sale al Lv. ${b.level}!`,
        was.stats,
        formStats(b.form, b.level),
      );
    for (const id of [...(b.pendingMoves ?? [])])
      await new Promise<void>((done) => learnScreen(parent, b, id, done));
  }
}

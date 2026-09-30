// Tools for the test panel (open the game with ?prove in the link). Not part of normal play.
import { SPECIES } from '../data/species';
import type { GameState } from './game';
import { formLengthUnits, type BeastForm } from './beasts/forms';
import { raiseLevel } from './beasts/growth';
import type { GameEvent } from './events';
import { addTamed, makeTeamBeast, maxHpOf, teamMembers } from './beasts/team';
import { spawnWild } from './beasts/wild';

/** Makes a wild beast of this form appear near the diver, wherever the diver is. */
export function spawnTestBeast(g: GameState, form: BeastForm, level = 5): void {
  const w = g.beasts.wilds.find((x) => x.spawn.speciesId === form.speciesId) ?? g.beasts.wilds[0];
  if (!w) return;
  w.spawn = { ...w.spawn, area: [0, 0, g.map.width, g.map.height] };
  spawnWild(w, form, level, g.rng, 0.3);
  g.beasts.taming = null;
}

/** Adds a tamed beast to your team (or reserve) directly. */
export function giveTestBeast(g: GameState, form: BeastForm, level: number): void {
  if (!SPECIES.some((s) => s.id === form.speciesId)) return;
  addTamed(g.beasts.team, makeTeamBeast(`b${g.beasts.nextUid++}`, { ...form }, level, true));
}

/** Full hearts, air and team health. */
export function healAll(g: GameState): void {
  g.diver.hp = g.diver.maxHp;
  g.diver.o2 = g.diver.maxO2;
  for (const b of g.beasts.team) {
    b.hp = maxHpOf(b);
    b.ko = false;
  }
}

export const testMode = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).has('prove');
  } catch {
    return false;
  }
};

/** Every team beast gains levels (for trying moves, growth and final forms). */
export function raiseTeam(g: GameState, levels: number): void {
  const events: GameEvent[] = [];
  for (const b of teamMembers(g.beasts.team)) raiseLevel(b, levels, events);
  const c = g.beasts.companion;
  const b = g.beasts.team.find((x) => x.uid === c?.uid);
  if (c && b) c.length = formLengthUnits(b.form, b.level);
}

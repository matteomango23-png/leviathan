// Tools for the test panel (open the game with ?prove in the link). Not part of normal play.
import { LAIR } from '../data/guardians';
import { DELTA } from '../data/worldLayout';
import { PORTO_FANGO } from '../data/economy';
import { portStart } from './economy/places';
import { SPECIES } from '../data/species';
import type { GameState } from './game';
import { formLengthUnits, type BeastForm } from './beasts/forms';
import { raiseLevel } from './beasts/growth';
import { addTamed, makeTeamBeast, maxHpOf, teamMembers } from './beasts/team';
import { spawnWild } from './beasts/wildState';

/** Makes a wild beast of this form appear a little ahead of the diver, wherever the diver is. */
export function spawnTestBeast(g: GameState, form: BeastForm, level = 5): void {
  const w = g.beasts.wilds.find((x) => !x.arena && x.spawn.speciesId === form.speciesId) ?? g.beasts.wilds[0];
  if (!w) return;
  const d = g.diver;
  w.spawn = { ...w.spawn, area: [d.x - 600, d.y - 300, d.x + 600, d.y + 300] };
  const p = g.map.nearestOpen(d.x + d.face * 160, d.y, 10);
  spawnWild(w, form, level, p.x, p.y, d.face > 0 ? -1 : 1);
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
    b.ppUsed = undefined;
    b.status = undefined;
    b.sleepTurns = undefined;
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
  // the level-ups (and evolutions) are shown in the sea, like in play
  for (const b of teamMembers(g.beasts.team)) raiseLevel(b, levels, g.story.pending);
  const c = g.beasts.mount;
  const b = g.beasts.team.find((x) => x.uid === c?.uid);
  if (c && b) c.length = formLengthUnits(b.form, b.level);
}

/** Straight into the Guardian's lair (the fight starts at once). */
export function goToLair(g: GameState): void {
  Object.assign(g.diver, { x: LAIR.x - LAIR.rx * 0.6, y: LAIR.y, vx: 0, vy: 0 });
  g.guardian.ready = true;
}

/** Into the Delta delle Mangrovie, under the middle island. */
export function goToDelta(g: GameState): void {
  const x = (DELTA.x0 + DELTA.x1) / 2;
  Object.assign(g.diver, { x, y: g.map.surfaceY + 50, vx: 0, vy: 0 });
}

/** At the pier of Porto Fango, on the east shore of the Isola delle Mangrovie. */
export function goToPortoFango(g: GameState): void {
  Object.assign(g.diver, { ...portStart(PORTO_FANGO), vx: 0, vy: 0 });
}

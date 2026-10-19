// Tamed beasts: the team (up to PROGRESSION.teamSize, the ones that fight in battle); the others are in the ship's
// hold or at a harbour's pen (hold.ts).
import { TEAM_RULES } from '../../data/beasts';
import { movesOf, type MoveDef } from '../../data/moves';
import { PROGRESSION } from '../../data/rules';
import type { StatusId } from '../../data/moveBattle';
import { defaultMoves } from './battleMoves';
import { formStats, type BeastForm, moveSpeciesOf } from './forms';

export interface TeamBeast {
  uid: string;
  form: BeastForm;
  level: number;
  /** Experience towards the next level. */
  xp: number;
  /** Fish eaten towards the next growth level (31–50). */
  food: number;
  hp: number;
  ko: boolean;
  inTeam: boolean;
  /** Out of the team: in the ship's hold (true) or waiting at a harbour's pen (beasts/hold.ts, 16 ottobre). */
  aboard?: boolean;
  /** Its battle moves (data/battleMoves.ts), at most 4, like Pokémon. */
  known: string[];
  /** PP each of its moves has spent (same order as `known`); back to full when the beast is fully healed. */
  ppUsed?: number[];
  /** Moves it could learn but has no room for: you choose what to forget (or give them up). */
  pendingMoves?: string[];
  /** Its lasting condition: like Pokémon it stays after the battle, until cured (items, port, ship). */
  status?: StatusId;
  /** Turns of sleep left, with 'stordito'. */
  sleepTurns?: number;
  /** It reached its evolution level: it evolves after the battle, or from its sheet (you can stop it). */
  evolveReady?: boolean;
  /** Where and at what level you tamed it (shown in its sheet). */
  met?: { level: number; place: string };
}

export function maxHpOf(b: TeamBeast): number {
  return formStats(b.form, b.level).hp;
}

export function makeTeamBeast(uid: string, form: BeastForm, level: number, inTeam: boolean): TeamBeast {
  const b: TeamBeast = {
    uid,
    form,
    level,
    xp: 0,
    food: 0,
    hp: 0,
    ko: false,
    inTeam,
    known: defaultMoves(form, level),
  };
  b.hp = maxHpOf(b);
  return b;
}

export const teamMembers = (all: TeamBeast[]): TeamBeast[] => all.filter((b) => b.inTeam);

/** Adds a newly tamed beast: to the team if there is room, then to the ship's hold (`holdRoom` places free), else
 *  to a harbour's pen. */
export function addTamed(all: TeamBeast[], b: TeamBeast, holdRoom = 0): TeamBeast {
  b.inTeam = teamMembers(all).length < PROGRESSION.teamSize;
  b.aboard = !b.inTeam && holdRoom > 0 ? true : undefined;
  all.push(b);
  return b;
}

/** Level of your strongest team beast (taming difficulty is measured against it). */
export function strongestLevel(all: TeamBeast[]): number {
  const m = teamMembers(all);
  return m.length ? Math.max(...m.map((b) => b.level)) : TEAM_RULES.levelWithoutTeam;
}

/** A form's moves in the open sea (riding), in slot order, with their unlock level and whether it has them at this
 *  level (its sheet shows them, beasts/sheet.ts). */
export function seaMovesOf(
  form: BeastForm,
  level: number,
): { move: MoveDef; unlockLevel: number; unlocked: boolean }[] {
  return movesOf(moveSpeciesOf(form))
    .sort((a, b) => a.slot - b.slot)
    .map((move) => {
      const unlockLevel = PROGRESSION.moveUnlockLevels[move.slot - 1] ?? 1;
      return { move, unlockLevel, unlocked: level >= unlockLevel };
    });
}

/** Moves a team member one place up (-1) or down (+1) in the team order (the first one leads in battle). */
export function moveInTeam(all: TeamBeast[], uid: string, dir: -1 | 1): boolean {
  const members = teamMembers(all);
  const i = members.findIndex((b) => b.uid === uid);
  const other = members[i + dir];
  if (i < 0 || !other) return false;
  const a = all.indexOf(members[i]!);
  const b = all.indexOf(other);
  [all[a], all[b]] = [all[b]!, all[a]!];
  return true;
}

/** Two team members change places (dragging a ball onto another in the sea, owner 15 ottobre): the first leads in
 *  battle. False if either is not in the team. */
export function swapInTeam(all: TeamBeast[], uidA: string, uidB: string): boolean {
  const a = all.findIndex((b) => b.uid === uidA && b.inTeam);
  const b = all.findIndex((x) => x.uid === uidB && x.inTeam);
  if (a < 0 || b < 0 || a === b) return false;
  [all[a], all[b]] = [all[b]!, all[a]!];
  return true;
}

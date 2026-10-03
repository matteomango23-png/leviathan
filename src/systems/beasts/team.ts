// Tamed beasts: the team (up to PROGRESSION.teamSize, the ones that fight in battle) and the reserve.
import { TEAM_RULES } from '../../data/beasts';
import { movesOf, type MoveDef } from '../../data/moves';
import { PROGRESSION } from '../../data/rules';
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
  /** PP each move has spent (battle, like Pokémon); back to full when the beast is fully healed. */
  ppUsed?: number[];
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
  };
  b.hp = maxHpOf(b);
  return b;
}

export const teamMembers = (all: TeamBeast[]): TeamBeast[] => all.filter((b) => b.inTeam);

/** Adds a newly tamed beast: to the team if there is room, otherwise to the reserve. */
export function addTamed(all: TeamBeast[], b: TeamBeast): TeamBeast {
  b.inTeam = teamMembers(all).length < PROGRESSION.teamSize;
  all.push(b);
  return b;
}

/** Level of your strongest team beast (taming difficulty is measured against it). */
export function strongestLevel(all: TeamBeast[]): number {
  const m = teamMembers(all);
  return m.length ? Math.max(...m.map((b) => b.level)) : TEAM_RULES.levelWithoutTeam;
}

/** Moves in slot order, with their unlock level and whether this beast has unlocked them. */
export function movesFor(b: TeamBeast): { move: MoveDef; unlockLevel: number; unlocked: boolean }[] {
  return movesOf(moveSpeciesOf(b.form)).map((move) => {
    const unlockLevel = PROGRESSION.moveUnlockLevels[move.slot - 1] ?? 1;
    return { move, unlockLevel, unlocked: b.level >= unlockLevel };
  });
}

/** Damage to a team beast; returns true when it goes KO. */
export function damageTeamBeast(b: TeamBeast, dmg: number): boolean {
  if (b.ko) return false;
  b.hp = Math.max(0, b.hp - dmg);
  if (b.hp <= 0) {
    b.ko = true;
    return true;
  }
  return false;
}

/** Moves a beast between team and reserve (the team never exceeds its size). */
export function toggleInTeam(all: TeamBeast[], uid: string): boolean {
  const b = all.find((x) => x.uid === uid);
  if (!b) return false;
  if (b.inTeam) {
    b.inTeam = false;
    return true;
  }
  if (teamMembers(all).length >= PROGRESSION.teamSize) return false;
  b.inTeam = true;
  return true;
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

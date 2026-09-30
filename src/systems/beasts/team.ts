// Tamed beasts: the team (up to PROGRESSION.teamSize, one in the water at a time) and the reserve.
import { TAMING_FLOW, TEAM_RULES } from '../../data/beasts';
import { movesOf, type MoveDef } from '../../data/moves';
import { PROGRESSION } from '../../data/rules';
import { formStats, type BeastForm } from './forms';

export interface TeamBeast {
  uid: string;
  form: BeastForm;
  level: number;
  hp: number;
  ko: boolean;
  inTeam: boolean;
  /** Seconds before it can be called again after a recall. */
  cooldown: number;
  /** Seconds before each move (slot 1..3) can be used again. */
  moveCooldowns: [number, number, number];
}

export function maxHpOf(b: TeamBeast): number {
  return formStats(b.form, b.level).hp;
}

export function makeTeamBeast(uid: string, form: BeastForm, level: number, inTeam: boolean): TeamBeast {
  const b: TeamBeast = { uid, form, level, hp: 0, ko: false, inTeam, cooldown: 0, moveCooldowns: [0, 0, 0] };
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
  return m.length ? Math.max(...m.map((b) => b.level)) : TAMING_FLOW.levelWithoutTeam;
}

/** You already own the common version of this species (a common duplicate flees when exhausted). */
export function ownsCommon(all: TeamBeast[], speciesId: string): boolean {
  return all.some(
    (b) => b.form.speciesId === speciesId && b.form.variant === 'comune' && !b.form.unique && !b.form.final,
  );
}

export function isTameable(all: TeamBeast[], form: BeastForm): boolean {
  const common = form.variant === 'comune' && !form.unique && !form.final;
  return !(common && ownsCommon(all, form.speciesId));
}

/** Moves in slot order, with their unlock level and whether this beast has unlocked them. */
export function movesFor(b: TeamBeast): { move: MoveDef; unlockLevel: number; unlocked: boolean }[] {
  return movesOf(b.form.speciesId).map((move) => {
    const unlockLevel = PROGRESSION.moveUnlockLevels[move.slot - 1] ?? 1;
    return { move, unlockLevel, unlocked: b.level >= unlockLevel };
  });
}

export function canSummon(b: TeamBeast): boolean {
  return b.inTeam && !b.ko && b.cooldown <= 0;
}

export function stepTeam(all: TeamBeast[], dt: number): void {
  for (const b of all) {
    b.cooldown = Math.max(0, b.cooldown - dt);
    for (let i = 0; i < 3; i++) b.moveCooldowns[i] = Math.max(0, b.moveCooldowns[i]! - dt);
  }
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

export function startRecallCooldown(b: TeamBeast): void {
  b.cooldown = TEAM_RULES.recallCooldown;
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

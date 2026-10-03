// Everything shown on a beast's card sheet: rarity, type, role, stats, its battle moves (and the next ones it
// learns), its moves in the open sea, size, habitat. Pure data, rendered by ui/beastSheet.ts.
import { RARITY, ROLE_NAMES, SPECIAL_FRAMES } from '../../data/cards';
import { SPECIES } from '../../data/species';
import { MOVES } from '../../data/moves';
import { PROGRESSION, TYPES } from '../../data/rules';
import { REGIONS } from '../../data/world';
import type { SpeciesDef, Stats } from '../../data/species';
import { BATTLE_MOVE_BY_ID } from '../../data/battleMoves';
import { learnedAt } from '../../data/learnsets';
import { CATEGORY_NAMES, type BattleMoveDef } from '../../data/moveBattle';
import type { MoveTypeId } from '../../data/rules';
import { defaultMoves, evolvedAtOf } from './battleMoves';
import { ABILITIES } from '../../data/beasts';
import {
  breaksBones,
  formLengthM,
  formName,
  formStars,
  formStats,
  formType,
  wildLevelRange,
  speciesOf,
  type BeastForm,
  moveSpeciesOf,
} from './forms';

/** A battle move, like Pokémon: power (0: no damage), accuracy (null: never misses), PP and category. */
export interface SheetMove {
  name: string;
  typeName: string;
  typeColor: string;
  power: number;
  accuracy: number | null;
  /** PP left (a tamed beast) and in all. */
  pp: number;
  maxPp: number;
  category: string;
  text: string;
}

/** A move of the open sea (riding), unlocked at 1, 7 and 15. */
export interface SeaMove {
  name: string;
  unlockLevel: number;
  unlocked: boolean;
  text: string;
}

export interface Sheet {
  name: string;
  stars: number;
  rarityName: string;
  rarityColor: string;
  special: keyof typeof SPECIAL_FRAMES | null;
  typeName: string;
  typeColor: string;
  roleName: string;
  level: number;
  levelLabel: string;
  stats: Stats;
  lengthM: number;
  habitat: string;
  trait: string;
  moves: SheetMove[];
  /** The next moves it learns, with their level. */
  nextMoves: { level: number; name: string; typeColor: string }[];
  seaMoves: SeaMove[];
  /** A starter line: its stages, with the level each is reached at (empty for other beasts). */
  evolution: { name: string; level: number | null; current: boolean }[];
  /** Sfondamento (breaks ancient bones in the sea), for the beasts that learn it; null for the others. */
  fieldMove: { name: string; level: number; unlocked: boolean } | null;
}

/** The stages of the line a species belongs to, first to last. */
export function evolutionLine(speciesId: string): { id: string; name: string; level: number | null }[] {
  const byId = (id: string | undefined): SpeciesDef | undefined => SPECIES.find((x) => x.id === id);
  let first = byId(speciesId);
  // walk back to the first stage
  let prev = first && SPECIES.find((x) => x.evolvesTo === first!.id);
  while (prev) {
    first = prev;
    prev = SPECIES.find((x) => x.evolvesTo === first!.id);
  }
  const line: { id: string; name: string; level: number | null }[] = [];
  let level: number | null = null;
  for (let st = first; st; st = byId(st.evolvesTo)) {
    line.push({ id: st.id, name: st.name, level });
    level = st.evolveLevel ?? null;
  }
  return line.length > 1 ? line : [];
}

function specialOf(form: BeastForm): Sheet['special'] {
  if (form.unique) return 'unique';
  if (form.final) return 'final';
  if (form.variant === 'albino') return 'albino';
  if (form.variant === 'alfa') return 'alfa';
  return null;
}

/**
 * @param level the beast's level (a tamed beast), or undefined for a species seen in the bestiary
 *   (then the sheet shows it at the bottom of its wild level range)
 * @param known a tamed beast's battle moves (and the PP they spent); otherwise the ones it knows in the wild
 */
export function buildSheet(form: BeastForm, level?: number, known?: string[], ppUsed: number[] = []): Sheet {
  const s = speciesOf(form);
  const range = wildLevelRange(form);
  const lv = level ?? range[0];
  const stars = formStars(form) as 1 | 2 | 3 | 4 | 5;
  const type = formType(form);
  const typeDef = type === 'variabile' ? null : TYPES[type];
  const stats = formStats(form, lv);
  const moves = (known ?? defaultMoves(form, lv))
    .map((id) => BATTLE_MOVE_BY_ID[id])
    .filter((m): m is BattleMoveDef => !!m)
    .map((m, i) => ({
      name: m.name,
      typeName: typeNameOf(m.type),
      typeColor: typeColorOf(m.type),
      power: m.power,
      accuracy: m.accuracy,
      pp: Math.max(0, m.pp - (ppUsed[i] ?? 0)),
      maxPp: m.pp,
      category: CATEGORY_NAMES[m.category],
      text: m.text,
    }));
  const evolvedAt = evolvedAtOf(s.id);
  const nextMoves: Sheet['nextMoves'] = [];
  for (let l = lv + 1; l <= PROGRESSION.maxLevel && nextMoves.length < 3; l++)
    for (const id of [...learnedAt(s.id, l), ...(l === evolvedAt ? learnedAt(s.id, 0) : [])]) {
      const m = BATTLE_MOVE_BY_ID[id];
      if (m) nextMoves.push({ level: l, name: m.name, typeColor: typeColorOf(m.type) });
    }
  const seaMoves = MOVES.filter((m) => m.species === moveSpeciesOf(form))
    .sort((a, b) => a.slot - b.slot)
    .map((m) => {
      const unlockLevel = PROGRESSION.moveUnlockLevels[m.slot - 1] ?? 1;
      return { name: m.name, unlockLevel, unlocked: lv >= unlockLevel, text: m.text };
    });
  return {
    name: formName(form),
    stars,
    rarityName: RARITY[stars].name,
    rarityColor: RARITY[stars].color,
    special: specialOf(form),
    typeName: typeDef?.name ?? 'Variabile',
    typeColor: typeDef?.color ?? '#e6ede8',
    roleName: ROLE_NAMES[s.role],
    level: lv,
    levelLabel: level === undefined ? `Liv. ${range[0]}–${range[1]} in natura` : `Livello ${lv}`,
    stats,
    lengthM: Math.round(formLengthM(form, lv) * 10) / 10,
    habitat: REGIONS.find((r) => r.id === s.region)?.name ?? s.region,
    trait: s.trait,
    moves,
    nextMoves,
    seaMoves,
    fieldMove: fieldMoveOf(form, lv),
    evolution: evolutionLine(form.speciesId).map((x) => ({
      name: x.name,
      level: x.level,
      current: x.id === form.speciesId,
    })),
  };
}

const typeNameOf = (t: MoveTypeId): string => (t === 'variabile' ? 'Variabile' : TYPES[t].name);
const typeColorOf = (t: MoveTypeId): string => (t === 'variabile' ? '#e6ede8' : TYPES[t].color);

function fieldMoveOf(form: BeastForm, level: number): Sheet['fieldMove'] {
  const s = speciesOf(form);
  const S = ABILITIES.sfondamento;
  const born = !!s.abilities?.includes('sfondaOssa');
  if (!born && !S.types.includes(s.type)) return null;
  return { name: S.name, level: born ? 1 : S.level, unlocked: breaksBones(form, level) };
}

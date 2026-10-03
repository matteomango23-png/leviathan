// Everything shown on a beast's card sheet: rarity, type, role, stats, moves with unlock levels
// and damage now / at the next level, size, habitat. Pure data, rendered by ui/beastSheet.ts.
import { RARITY, ROLE_NAMES, SPECIAL_FRAMES } from '../../data/cards';
import { SPECIES } from '../../data/species';
import { MOVES } from '../../data/moves';
import { PROGRESSION, TYPES } from '../../data/rules';
import { REGIONS } from '../../data/world';
import type { SpeciesDef, Stats } from '../../data/species';
import { moveBattleOf } from '../../data/moveBattle';
import { powerOf } from './combat';

const CATEGORY_NAMES = { fisico: 'fisica', speciale: 'speciale', stato: 'di stato' } as const;
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

export interface SheetMove {
  slot: number;
  name: string;
  typeName: string;
  typeColor: string;
  unlockLevel: number;
  unlocked: boolean;
  cooldown: number;
  /** Like Pokémon: power (0: no damage), accuracy (null: never misses), PP and category. */
  power: number;
  accuracy: number | null;
  pp: number;
  category: string;
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
 */
export function buildSheet(form: BeastForm, level?: number): Sheet {
  const s = speciesOf(form);
  const range = wildLevelRange(form);
  const lv = level ?? range[0];
  const stars = formStars(form) as 1 | 2 | 3 | 4 | 5;
  const type = formType(form);
  const typeDef = type === 'variabile' ? null : TYPES[type];
  const stats = formStats(form, lv);
  const moves = MOVES.filter((m) => m.species === moveSpeciesOf(form))
    .sort((a, b) => a.slot - b.slot)
    .map((m) => {
      const unlockLevel = PROGRESSION.moveUnlockLevels[m.slot - 1] ?? 1;
      const mt = m.type === 'variabile' ? null : TYPES[m.type];
      return {
        slot: m.slot,
        name: m.name,
        typeName: mt?.name ?? 'Variabile',
        typeColor: mt?.color ?? '#e6ede8',
        unlockLevel,
        unlocked: lv >= unlockLevel,
        cooldown: m.cooldown,
        power: powerOf(m),
        accuracy: moveBattleOf(m).accuracy,
        pp: moveBattleOf(m).pp,
        category: CATEGORY_NAMES[moveBattleOf(m).category],
        text: m.text,
      };
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
    fieldMove: fieldMoveOf(form, lv),
    evolution: evolutionLine(form.speciesId).map((x) => ({
      name: x.name,
      level: x.level,
      current: x.id === form.speciesId,
    })),
  };
}

function fieldMoveOf(form: BeastForm, level: number): Sheet['fieldMove'] {
  const s = speciesOf(form);
  const S = ABILITIES.sfondamento;
  const born = !!s.abilities?.includes('sfondaOssa');
  if (!born && !S.types.includes(s.type)) return null;
  return { name: S.name, level: born ? 1 : S.level, unlocked: breaksBones(form, level) };
}

// Everything shown on a beast's card sheet: rarity, type, role, stats, moves with unlock levels
// and damage now / at the next level, size, habitat. Pure data, rendered by ui/beastSheet.ts.
import { RARITY, ROLE_NAMES, SPECIAL_FRAMES } from '../../data/cards';
import { MOVES } from '../../data/moves';
import { PROGRESSION, TYPES } from '../../data/rules';
import { REGIONS } from '../../data/world';
import type { Stats } from '../../data/species';
import { moveDamage } from './combat';
import {
  formLengthM,
  formName,
  formStars,
  formStats,
  formType,
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
  damageNow: number;
  damageNext: number;
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
  const lv = level ?? s.wildLevel[0];
  const stars = formStars(form) as 1 | 2 | 3 | 4 | 5;
  const type = formType(form);
  const typeDef = type === 'variabile' ? null : TYPES[type];
  const stats = formStats(form, lv);
  const next = formStats(form, Math.min(PROGRESSION.maxLevel, lv + 1));
  const neutral = { type: 'variabile' as const, defense: 0, hp: 1, maxHp: 1 };
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
        damageNow: moveDamage({ type, bite: stats.bite, defense: 0 }, m, neutral),
        damageNext: moveDamage({ type, bite: next.bite, defense: 0 }, m, neutral),
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
    levelLabel: level === undefined ? `Liv. ${s.wildLevel[0]}–${s.wildLevel[1]} in natura` : `Livello ${lv}`,
    stats,
    lengthM: Math.round(formLengthM(form, lv) * 10) / 10,
    habitat: REGIONS.find((r) => r.id === s.region)?.name ?? s.region,
    trait: s.trait,
    moves,
  };
}

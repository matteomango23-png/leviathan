// The bounties' path (data/bounties.ts; owner, 26 ottobre 2026): every beast that lives in the sea, common and in
// its alpha or albino version, ordered from the easiest to the hardest, with where it lives (where the game really
// spawns it: the coast's spawns, the regions' kinds of stretches) and what it pays. No weather. Pure, from the data.
import { SPECIES_DEPTH, WILD_SPAWNS } from '../../data/beasts';
import { BOUNTY_RULES } from '../../data/bounties';
import { BIOMES } from '../../data/endless';
import { SEA_REGIONS } from '../../data/regions';
import { SPECIES } from '../../data/species';
import { SPRITE_KEYS } from '../../data/sprites.generated';
import { WORLD } from '../../data/worldLayout';
import {
  dangerOf,
  formKey,
  formName,
  hasAlbinoArt,
  hasAlfaArt,
  wildLevelRange,
  type BeastForm,
} from '../beasts/forms';
import { zoneAt } from '../world/zones';

export interface BountyDef {
  /** Its form's key (formKey): the same beast, the same bounty. */
  id: string;
  kind: 'comune' | 'rara';
  form: BeastForm;
  name: string;
  levels: [number, number];
  reward: number;
  /** Where and how deep it lives. */
  where: string;
}

const metres = (y: number): number => Math.max(0, Math.round((y - WORLD.surfaceY) / WORLD.unitsPerMetre));

/** Where a species lives: the first place of the coast that spawns it, else the first region of the open sea. */
export function whereOf(speciesId: string): string | null {
  const spawn = WILD_SPAWNS.find((s) => s.speciesId === speciesId && !s.endless && !s.hunt);
  if (spawn) {
    const [x0, y0, x1, y1] = spawn.area;
    return `${zoneAt((x0 + x1) / 2, (y0 + y1) / 2)} · di solito tra ${metres(y0)} e ${metres(y1)} m`;
  }
  const region = SEA_REGIONS.find((r) => BIOMES.some((b) => r.biomes[b.id] && b.beasts[speciesId]));
  if (!region) return null;
  const floor = Math.max(...BIOMES.filter((b) => region.biomes[b.id]).map((b) => metres(b.floorY)));
  const d = SPECIES_DEPTH[speciesId];
  return `${region.name} (${region.fromKm}-${region.toKm} km) · di solito tra ${d?.minM ?? 0} e ${d?.maxM ?? floor} m`;
}

/** Teeth for beating or taming it: more the harder it is (data/bounties.ts BOUNTY_RULES.reward). */
export function bountyReward(form: BeastForm): number {
  const R = BOUNTY_RULES.reward;
  const [lo, hi] = wildLevelRange({ ...form, variant: 'comune' });
  const stars = SPECIES.find((s) => s.id === form.speciesId)?.rarity ?? 1;
  const raw = (R.base + R.perLevel * ((lo + hi) / 2) ** R.power) * (1 + R.perStar * (stars - 1));
  const teeth = raw * (form.variant === 'comune' ? 1 : R.rareMult);
  return Math.round(teeth / R.round) * R.round;
}

/** The species that live in the sea and can be hunted for a bounty: no legends, starters or story beasts. */
const huntable = SPECIES.filter(
  (s) => !s.legendary && !s.starter && !s.storyOnly && SPRITE_KEYS.includes(s.id) && whereOf(s.id) !== null,
);

const byDifficulty = (a: BountyDef, b: BountyDef): number =>
  a.levels[0] - b.levels[0] ||
  dangerOf(a.form.speciesId) - dangerOf(b.form.speciesId) ||
  a.reward - b.reward ||
  a.id.localeCompare(b.id);

function make(form: BeastForm, kind: BountyDef['kind']): BountyDef {
  return {
    id: formKey(form),
    kind,
    form,
    name: formName(form),
    levels: wildLevelRange(form),
    reward: bountyReward(form),
    where: whereOf(form.speciesId)!,
  };
}

let paths: Record<BountyDef['kind'], BountyDef[]> | null = null;

/** The whole path of a kind, easiest first. */
export function bountyPath(kind: BountyDef['kind']): BountyDef[] {
  paths ??= {
    comune: huntable.map((s) => make({ speciesId: s.id, variant: 'comune' }, 'comune')).sort(byDifficulty),
    rara: huntable
      .flatMap((s) => [
        ...(hasAlfaArt(s.id) ? [make({ speciesId: s.id, variant: 'alfa' }, 'rara')] : []),
        ...(hasAlbinoArt(s.id) ? [make({ speciesId: s.id, variant: 'albino' }, 'rara')] : []),
      ])
      .sort(byDifficulty),
  };
  return paths[kind];
}

/** A bounty of the path by its id. */
export const bountyById = (id: string): BountyDef | undefined =>
  bountyPath('comune').find((b) => b.id === id) ?? bountyPath('rara').find((b) => b.id === id);

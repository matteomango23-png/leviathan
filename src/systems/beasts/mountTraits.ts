// What sets one mount apart from another (docs/PROPOSTA-RUOLI.md, owner 21 ottobre 2026): its speed, stamina, bite and
// depth on a 1 … 5 bar, its talent in the sea by its type, and the fear a superpredator puts in smaller game. All from
// its data (length, real speed, type, stars): no table per species. Numbers in data/beasts.ts RIDE_TALENTS. Pure logic.
import {
  FEEDING,
  FILTER_FEEDERS,
  RIDE_KMH,
  RIDE_REF_KMH,
  RIDE_TALENTS,
  RIDEABLE_FORMS,
  TEAM_RULES,
} from '../../data/beasts';
import { DIVER } from '../../data/diver';
import { speciesById, swimSpeedOf } from '../../data/species';
import type { TypeId } from '../../data/rules';
import { rideProfile } from '../rideMotion';
import { formKey, formLengthM, formLengthUnits, speciesOf, type BeastForm } from './forms';
import { isLegend, LEGEND_GIANTS } from './legends';

const T = RIDE_TALENTS;

/** How fast it carries you (u/s): its real speed, softened, measured against the white shark's (RIDE_KMH). */
export function rideSpeedOf(form: BeastForm): number {
  const sp = speciesOf(form);
  const kmh = RIDE_KMH[sp.id];
  const ref = swimSpeedOf(speciesById('squalo_bianco')!);
  const base =
    kmh !== undefined
      ? ref * Math.sqrt(kmh / RIDE_REF_KMH) * (form.variant === 'albino' ? 1.1 : 1)
      : swimSpeedOf(sp, form.variant);
  const mult = kmh !== undefined ? 1 : (sp.rideSpeedMult ?? 1);
  // never slower than swimming yourself
  return Math.max(DIVER.maxSpeed * 1.1, base * TEAM_RULES.rideSpeedMult * mult);
}

/** Its riding speed over the white shark's. */
export const speedShareOf = (form: BeastForm): number =>
  rideSpeedOf(form) / rideSpeedOf({ speciesId: 'squalo_bianco', variant: 'comune' });

/** How its swimming feels (rideMotion.ts) at this level. */
export const profileOf = (form: BeastForm, level: number) =>
  rideProfile(formLengthM(form, level), speedShareOf(form));

/** How far its mouth reaches when it bites a school (units): wider for filter feeders. */
export function biteReach(form: BeastForm, length: number): number {
  const r = Math.max(FEEDING.minReach, length * FEEDING.reachFrac);
  return FILTER_FEEDERS.includes(speciesOf(form).id) ? r * T.filterReachMult : r;
}

/** How deep it takes you without the pressure hurting (metres): by its type, deeper for a giant. */
export function mountDepthM(form: BeastForm, level: number): number {
  const sp = speciesOf(form);
  const base = T.depthM[sp.type] ?? T.depthM.predatore!;
  return base * (1 + (T.giantDepthMult - 1) * profileOf(form, level).size);
}

const bar = (v: number, [lo, hi]: [number, number], log = false): number => {
  const k = log ? Math.log(v / lo) / Math.log(hi / lo) : (v - lo) / (hi - lo);
  return Math.max(1, Math.min(5, 1 + Math.round(Math.max(0, Math.min(1, k)) * 4)));
};

export interface MountBars {
  speed: number;
  stamina: number;
  bite: number;
  depth: number;
}

/** Its four bars on the sheet, 1 … 5. */
export function mountBars(form: BeastForm, level: number): MountBars {
  const B = T.bars;
  return {
    speed: bar(speedShareOf(form), B.speed),
    stamina: bar(1 / profileOf(form, level).dashCost, B.stamina),
    bite: bar(biteReach(form, formLengthUnits(form, level)), B.bite, true),
    depth: bar(mountDepthM(form, level), B.depth),
  };
}

/** Can this form carry you (a mount, a rideable second stage or final form)? */
export function ridesForm(form: BeastForm): boolean {
  const sp = speciesOf(form);
  return (
    sp.role === 'cavalcatura' || sp.rideSpeedMult !== undefined || RIDEABLE_FORMS.includes(formKey(form))
  );
}

/** Its talent in the sea: its type's (RIDE_TALENT_TEXT). The Leviatano takes none. */
export const talentOf = (form: BeastForm): TypeId | null => {
  const t = speciesOf(form).type;
  return t === 'variabile' ? null : t;
};

/** Who has the upper hand when you touch a wild beast riding: a Predatore dashing into it takes it by surprise (its
 *  Assalto: it loses its first turn); else `otherwise` (encounters.ts ambush). */
export function openingFor<T extends string>(
  ridden: { form: BeastForm } | null,
  dashing: boolean,
  otherwise: T,
): T | 'you' {
  return ridden && dashing && talentOf(ridden.form) === 'predatore' ? 'you' : otherwise;
}

/** A superpredator: a Predatore of apexRarity stars or more, or one of apexExtra (the orca). */
export function isApex(form: BeastForm): boolean {
  const sp = speciesOf(form);
  return (sp.type === 'predatore' && sp.rarity >= T.apexRarity) || T.apexExtra.includes(sp.id);
}

/** A legend: legendary species, a legendary unique, or a prehistoric giant with a hunt. */
export const isLegendary = (form: BeastForm): boolean =>
  !!speciesOf(form).legendary ||
  isLegend(form.unique) ||
  LEGEND_GIANTS.some((l) => l.speciesId === form.speciesId);

export interface Fear {
  /** It keeps away from you in the water. */
  keepAway: boolean;
  /** Times it tries to flee in battle (0: none). */
  fleeTries: number;
  /** Frozen with fear for its first turn. */
  frozen: boolean;
}

/**
 * The fear the beast you ride puts in a wild one (owner, 21 ottobre: "un superpredatore… con almeno una trentina di
 * livelli in più… cercherà di starti lontano e di fuggire 1, max 2 volte… bloccati dalla paura un turno solo se è un
 * predatore leggendario con almeno una decina di livelli in più"). A boss is never afraid. @param roll 0 … 1
 */
export function fearOf(
  mount: { form: BeastForm; level: number } | null,
  wild: { level: number; boss?: string },
  roll = 0,
): Fear {
  const none: Fear = { keepAway: false, fleeTries: 0, frozen: false };
  if (!mount || wild.boss || !isApex(mount.form)) return none;
  const over = mount.level - wild.level;
  const scared = over >= T.fearLevels;
  const [lo, hi] = T.fleeTries;
  return {
    keepAway: scared,
    fleeTries: scared ? lo + Math.floor(roll * (hi - lo + 1)) : 0,
    frozen: over >= T.frozenLevels && isLegendary(mount.form) && speciesOf(mount.form).type === 'predatore',
  };
}

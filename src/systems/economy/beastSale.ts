// Selling a tamed beast at a harbour's pen (owner, 15 ottobre 2026: "magari catturare e vendere pesci che domi", "un
// mercato dove vendi animali"): only one waiting in the reserve, never a legend nor your last beast. Its price by
// its stars and level, more for a rare version. Pure logic.
import { BEAST_SALE } from '../../data/economy';
import { speciesOf } from '../beasts/forms';
import type { TeamBeast } from '../beasts/team';

export function beastPrice(b: TeamBeast): number {
  const stars = speciesOf(b.form).rarity;
  const rare = b.form.final ? BEAST_SALE.finalMult : b.form.variant !== 'comune' ? BEAST_SALE.variantMult : 1;
  return Math.round(BEAST_SALE.byStars[stars]! * (1 + b.level / BEAST_SALE.levelDivisor) * rare);
}

/** Why it cannot be sold (null: it can). */
export function cannotSell(team: readonly TeamBeast[], b: TeamBeast): string | null {
  if (b.form.unique) return 'Una leggenda non si vende.';
  if (b.inTeam) return 'Toglila prima dalla squadra.';
  if (team.length <= 1) return 'È la tua unica bestia.';
  return null;
}

/** Sells it: out of your beasts, its teeth to you. Returns the teeth (0: not sold). */
export function sellBeast(
  g: { beasts: { team: TeamBeast[] }; gear: { teeth: number } },
  uid: string,
): number {
  const b = g.beasts.team.find((x) => x.uid === uid);
  if (!b || cannotSell(g.beasts.team, b)) return 0;
  const teeth = beastPrice(b);
  g.beasts.team.splice(g.beasts.team.indexOf(b), 1);
  g.gear.teeth += teeth;
  return teeth;
}

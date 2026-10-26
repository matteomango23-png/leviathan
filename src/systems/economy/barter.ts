// The barter of the harbour's market (data/bounties.ts BARTER; owner, 26 ottobre 2026: "scambia 5 squali bianchi
// normali e lui ti da 1 squalo bianco albino base"): each harbour offers a few trades, changing every so often like
// its requests; one gives several common beasts of a species, waiting in the pen, and takes back that species' albino
// or alpha at the lowest level of its wild ones. Rarer species ask more. Never legends, starters, unique beasts or
// final forms (the path has none of them); never a beast of the team. Pure logic.
import { BARTER } from '../../data/bounties';
import { SPECIES } from '../../data/species';
import { hash2 } from '../math';
import { formKey, formName, hasAlbinoArt, hasAlfaArt, wildLevelRange, type BeastForm } from '../beasts/forms';
import { addTamed, makeTeamBeast, type TeamBeast } from '../beasts/team';
import { epochOf, nearPath, portSeed, type RequestWorld } from './beastRequests';

export interface BarterOffer {
  id: string;
  give: number;
  from: BeastForm;
  to: BeastForm;
  fromName: string;
  toName: string;
}

interface BarterWorld extends RequestWorld {
  gear: RequestWorld['gear'] & { barterDone: string[] };
  beasts: { team: TeamBeast[]; nextUid: number };
}

const doneKey = (port: string, epoch: number, id: string): string => `${port}:${epoch}:${id}`;

/** How many common ones a trade asks: by the species' stars, one more for an alpha. */
export function barterGive(to: BeastForm): number {
  const stars = SPECIES.find((s) => s.id === to.speciesId)?.rarity ?? 1;
  return (BARTER.giveByStars[stars] ?? 3) + (to.variant === 'alfa' ? BARTER.alfaExtra : 0);
}

/** The trades a harbour offers now: species of your path that have an albino or an alpha. */
export function barterOffers(g: BarterWorld, port: string): BarterOffer[] {
  const epoch = epochOf(g);
  const out: BarterOffer[] = [];
  for (const b of nearPath(g, 'comune', port, epoch, 11, BARTER.ahead)) {
    if (out.length >= BARTER.count) break;
    const id = b.form.speciesId;
    const albino = hasAlbinoArt(id);
    const alfa = hasAlfaArt(id);
    if (!albino && !alfa) continue;
    if (g.gear.barterDone.includes(doneKey(port, epoch, id))) continue;
    const variant = albino && (!alfa || hash2(portSeed(port) + epoch, b.levels[0]) < 0.6) ? 'albino' : 'alfa';
    const to: BeastForm = { speciesId: id, variant };
    out.push({
      id,
      give: barterGive(to),
      from: b.form,
      to,
      fromName: formName(b.form),
      toName: formName(to),
    });
  }
  return out;
}

/** Your beasts a trade could take: that species, common, in the pen (not in the team), lowest level first. */
export function barterStock(g: BarterWorld, o: BarterOffer): TeamBeast[] {
  return g.beasts.team
    .filter((b) => formKey(b.form) === formKey(o.from) && !b.form.final && !b.form.unique && !b.inTeam)
    .sort((a, b) => a.level - b.level);
}

/** Makes the trade at this harbour. Returns the beast received, or null when it cannot be done. */
export function barter(g: BarterWorld, port: string, id: string): TeamBeast | null {
  const o = barterOffers(g, port).find((x) => x.id === id);
  if (!o) return null;
  const stock = barterStock(g, o);
  if (stock.length < o.give) return null;
  for (const b of stock.slice(0, o.give)) g.beasts.team.splice(g.beasts.team.indexOf(b), 1);
  const got = addTamed(
    g.beasts.team,
    makeTeamBeast(`b${g.beasts.nextUid++}`, { ...o.to }, wildLevelRange(o.to)[0], true),
  );
  g.gear.barterDone = [
    ...g.gear.barterDone.filter((k) => Number(k.split(':')[1]) >= epochOf(g)),
    doneKey(port, epochOf(g), id),
  ];
  return got;
}

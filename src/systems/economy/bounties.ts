// The bounties you follow (data/bounties.ts; owner, 26 ottobre 2026): taken only at a harbour, at most 5 common and 2
// alpha or albino (the legend: the one hunt you follow, huntPinned); paid at once when a followed beast is beaten in
// battle or tamed. A beast you have already beaten or tamed closes its bounty without pay, and the next one of the
// path takes its place. Pure logic; the path is bountyPath.ts.
import { BOUNTY_RULES, BOUNTY_TEXT, type BountyKind } from '../../data/bounties';
import { HUNTS } from '../../data/hunts';
import { formKey, formName, type BeastForm } from '../beasts/forms';
import type { TeamBeast } from '../beasts/team';
import type { GameEvent } from '../events';
import { bountyById, bountyPath, type BountyDef } from './bountyPath';

/** What the bounties remember (saved): the ones followed, the ones closed, every form beaten or tamed. */
export interface BountyState {
  followed: string[];
  done: string[];
  beaten: string[];
}

export const newBounties = (): BountyState => ({ followed: [], done: [], beaten: [] });

interface BountyWorld {
  gear: { teeth: number; bounties: BountyState };
  beasts: { team: TeamBeast[] };
  port: { id: string } | null;
  huntPinned: string | null;
}

/** Closed: paid, or that beast already beaten or tamed (also one you own from before the bounties). */
export function bountyClosed(g: BountyWorld, id: string): boolean {
  const s = g.gear.bounties;
  return s.done.includes(id) || s.beaten.includes(id) || g.beasts.team.some((b) => formKey(b.form) === id);
}

/** The next ones of a row of the board: the first not closed, at most BOUNTY_RULES.visible. */
export function boardBounties(g: BountyWorld, kind: 'comune' | 'rara'): BountyDef[] {
  return bountyPath(kind)
    .filter((b) => !bountyClosed(g, b.id))
    .slice(0, BOUNTY_RULES.visible);
}

/** The ones you follow of a kind. */
export const followedBounties = (g: BountyWorld, kind: 'comune' | 'rara'): BountyDef[] =>
  g.gear.bounties.followed.map((id) => bountyById(id)).filter((b): b is BountyDef => !!b && b.kind === kind);

/** Takes a bounty (at a harbour, within the limit of its kind). Returns why not, or null. */
export function acceptBounty(g: BountyWorld, id: string): string | null {
  const b = bountyById(id);
  if (!b) return null;
  if (!g.port) return BOUNTY_TEXT.onlyAtPort;
  const s = g.gear.bounties;
  if (s.followed.includes(id) || bountyClosed(g, id)) return null;
  const max = BOUNTY_RULES.follow[b.kind];
  if (followedBounties(g, b.kind).length >= max) return BOUNTY_TEXT.full(b.kind, max);
  s.followed.push(id);
  return null;
}

export function unfollowBounty(g: BountyWorld, id: string): void {
  g.gear.bounties.followed = g.gear.bounties.followed.filter((x) => x !== id);
}

/** A beast beaten in battle or tamed: remembered, and its followed bounty (or legend) paid at once. */
export function bountyBeaten(
  g: Pick<BountyWorld, 'gear' | 'huntPinned'>,
  form: BeastForm,
  tamed: boolean,
  events: GameEvent[],
): void {
  const s = g.gear.bounties;
  const how = tamed ? 'catturato' : 'sfiancato';
  // the legend you follow: its own price (data/bounties.ts BOUNTY_RULES.reward.legend), once
  if (form.unique) {
    const hunt = HUNTS.find((h) => h.form.unique === form.unique && h.id === g.huntPinned);
    const key = `L:${hunt?.id}`;
    if (hunt && !s.done.includes(key)) {
      s.done.push(key);
      pay(g, formName(form), how, BOUNTY_RULES.reward.legend, events);
    }
    return;
  }
  const id = formKey({ speciesId: form.speciesId, variant: form.variant });
  if (!s.beaten.includes(id)) s.beaten.push(id);
  if (!s.followed.includes(id)) return;
  const b = bountyById(id);
  s.followed = s.followed.filter((x) => x !== id);
  s.done.push(id);
  if (b) pay(g, b.name, how, b.reward, events);
}

function pay(
  g: Pick<BountyWorld, 'gear'>,
  name: string,
  how: string,
  teeth: number,
  events: GameEvent[],
): void {
  g.gear.teeth += teeth;
  events.push({ type: 'bountyClosed', text: BOUNTY_TEXT.closed(name, how, teeth), teeth });
}

/** The kind of a bounty id (a legend's hunt ids are not bounties of the path). */
export const bountyKind = (id: string): BountyKind | null => bountyById(id)?.kind ?? null;

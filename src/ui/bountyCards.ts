// The bounties' cards (owner, 26 ottobre 2026): on the harbour's board, the next ones of each row of the path to take;
// in the diary, the ones you follow. A beast never seen is a shadow with its name hidden, like the bestiary.
import { BOUNTY_RULES, BOUNTY_TEXT } from '../data/bounties';
import { formKey } from '../systems/beasts/forms';
import { acceptBounty, unfollowBounty } from '../systems/economy/bounties';
import type { BountyDef } from '../systems/economy/bountyPath';
import type { GameState } from '../systems/game';
import { setArt } from './art';
import { el } from './dom';
import { icon } from './icons';

interface CardContext {
  g: GameState;
  say: (text: string, error?: boolean) => void;
  redraw: () => void;
}

/** One bounty: picture, name, levels, where, the reward, and its button (take it, or stop following it). */
export function bountyCard(row: HTMLElement, ctx: CardContext, b: BountyDef, followed: boolean): void {
  const g = ctx.g;
  const seen = g.seen.has(b.form.speciesId) || g.seen.has(formKey(b.form));
  const c = el('div', `bounty-card${followed ? ' on' : ''}${seen ? '' : ' unseen'}`, row);
  const img = el('img', 'bounty-art', c);
  img.alt = '';
  img.loading = 'lazy';
  setArt(img, b.form);
  const body = el('div', 'bounty-body', c);
  el('div', 'bounty-title', body, seen ? b.name : '???');
  el('div', 'bounty-text', body, `Livello ${b.levels[0]}-${b.levels[1]} · ${b.where}`);
  const foot = el('div', 'bounty-foot', body);
  const p = el('span', 'price bounty-reward', foot);
  p.append(icon('tooth'), document.createTextNode(` ${b.reward}`));
  const btn = el('button', `pbtn${followed ? '' : ' primary'}`, foot, followed ? 'Smetti' : 'Accetta');
  btn.addEventListener('click', () => {
    if (followed) unfollowBounty(g, b.id);
    else {
      const why = acceptBounty(g, b.id);
      if (why) ctx.say(why, true);
      else ctx.say(`Taglia accettata: ${seen ? b.name : 'una bestia nuova'}. La trovi nel Diario.`);
    }
    ctx.redraw();
  });
}

/** A row of cards under its title, with how many you follow of that kind. */
export function bountyRow(
  b: HTMLElement,
  ctx: CardContext,
  kind: 'comune' | 'rara',
  cards: BountyDef[],
  following: number,
): void {
  el('h3', '', b, `${BOUNTY_TEXT.rows[kind]} · seguite ${following} di ${BOUNTY_RULES.follow[kind]}`);
  const row = el('div', 'bounty-row', b);
  const followed = ctx.g.gear.bounties.followed;
  for (const card of cards) bountyCard(row, ctx, card, followed.includes(card.id));
}

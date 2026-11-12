// The bounties' cards (owner, 26 ottobre 2026): on the harbour's board, the next ones of each row of the path to take;
// in the diary, the ones you follow. Always with the beast's name and picture, seen or not (owner, 12 novembre 2026:
// "lasciare a tutti il nome e l'immagine in modo che sai cosa stai cercando"). Taking or dropping one changes only
// its card and its row's count: redrawing the page made it jump.
import { BOUNTY_RULES, BOUNTY_TEXT } from '../data/bounties';
import { acceptBounty, followedBounties, unfollowBounty } from '../systems/economy/bounties';
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

/**
 * One bounty: picture, name, levels, where, the reward, and its button (take it, or stop following it).
 * @param changed called after it is taken or dropped (its row's count)
 * @param dropRemoves in the diary a card dropped goes away
 */
export function bountyCard(
  row: HTMLElement,
  ctx: CardContext,
  b: BountyDef,
  changed: () => void = () => {},
  dropRemoves = false,
): void {
  const g = ctx.g;
  const c = el('div', 'bounty-card', row);
  const img = el('img', 'bounty-art', c);
  img.alt = '';
  img.loading = 'lazy';
  setArt(img, b.form);
  const body = el('div', 'bounty-body', c);
  el('div', 'bounty-title', body, b.name);
  el('div', 'bounty-text', body, `Livello ${b.levels[0]}-${b.levels[1]} · ${b.where}`);
  const foot = el('div', 'bounty-foot', body);
  const p = el('span', 'price bounty-reward', foot);
  p.append(icon('tooth'), document.createTextNode(` ${b.reward}`));
  const btn = el('button', 'pbtn', foot);
  const show = (): void => {
    const on = g.gear.bounties.followed.includes(b.id);
    c.classList.toggle('on', on);
    btn.classList.toggle('primary', !on);
    btn.textContent = on ? 'Smetti' : 'Accetta';
  };
  show();
  btn.addEventListener('click', () => {
    if (g.gear.bounties.followed.includes(b.id)) {
      unfollowBounty(g, b.id);
      if (dropRemoves) c.remove();
    } else {
      const why = acceptBounty(g, b.id);
      if (why) ctx.say(why, true);
      else ctx.say(`Taglia accettata: ${b.name}. La trovi nel Diario.`);
    }
    show();
    changed();
  });
}

/** A row of cards under its title, with how many you follow of that kind. */
export function bountyRow(
  b: HTMLElement,
  ctx: CardContext,
  kind: 'comune' | 'rara',
  cards: BountyDef[],
): void {
  const head = el('h3', '', b);
  const count = (): void => {
    head.textContent = `${BOUNTY_TEXT.rows[kind]} · seguite ${followedBounties(ctx.g, kind).length} di ${BOUNTY_RULES.follow[kind]}`;
  };
  count();
  const row = el('div', 'bounty-row', b);
  for (const card of cards) bountyCard(row, ctx, card, count);
}

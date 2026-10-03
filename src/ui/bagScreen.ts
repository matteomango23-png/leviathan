// The backpack, like Pokémon's bag: pockets (Cure, Battaglia, Esche, Varie), each item with how many you have and
// what it does. Medicine asks which beast (and an Etere which move); battle items say they are for battle.
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { STATUS_NAMES } from '../data/moveBattle';
import { ITEMS, POCKET_NAMES, type Pocket } from '../data/world';
import { formName } from '../systems/beasts/forms';
import { maxHpOf, type TeamBeast } from '../systems/beasts/team';
import { useItemNow } from '../systems/economy/backpack';
import { canApply, careOfBeast, itemDef, useOnBeast } from '../systems/economy/items';
import type { GameState } from '../systems/game';
import { el } from './dom';
import './screens.css';

const POCKETS: Pocket[] = ['cure', 'battaglia', 'esche', 'varie'];

/** A beast of yours in a list: name, level, health bar, condition. */
export function beastLine(
  parent: HTMLElement,
  b: TeamBeast,
  onClick: () => void,
  disabled = false,
): HTMLButtonElement {
  const r = el('button', 'bagbeast', parent);
  el('span', 'bagbeast-name', r, `${formName(b.form)}  Lv. ${b.level}`);
  const bar = el('span', 'bagbeast-bar', r);
  const frac = Math.max(0, b.hp / maxHpOf(b));
  const fill = el('span', 'bagbeast-fill', bar);
  fill.style.width = `${frac * 100}%`;
  fill.classList.toggle('low', frac < 0.25);
  fill.classList.toggle('mid', frac >= 0.25 && frac < 0.5);
  el('span', 'bagbeast-hp', r, b.ko ? 'KO' : `${Math.ceil(b.hp)}/${maxHpOf(b)}`);
  if (b.status) el('span', `bagbeast-status ${b.status}`, r, STATUS_NAMES[b.status]);
  r.disabled = disabled;
  r.addEventListener('click', onClick);
  return r;
}

/**
 * Opens the backpack. `only`: a team beast chosen first (from the team list): it shows just the medicine that would
 * help it. `onChange` after an item is used.
 */
export function openBag(parent: HTMLElement, g: GameState, onChange?: () => void, only?: TeamBeast): void {
  const inv = g.gear.inventory;
  const root = el('div', 'mscreen bag', parent);
  const card = el('div', 'mscreen-card bag-card', root);
  const head = el('div', 'bag-head', card);
  el('h2', 'mscreen-title', head, only ? `Oggetto per ${formName(only.form)}` : 'Zaino');
  el('button', 'menu-btn small', head, 'Chiudi').addEventListener('click', () => root.remove());
  const msg = el('p', 'mscreen-line bag-msg', card);
  const tabs = el('div', 'sheet-tabs', card);
  const body = el('div', 'bag-body', card);
  let pocket: Pocket = 'cure';
  const say = (text: string): void => {
    msg.textContent = text;
  };
  const used = (text: string): void => {
    say(text);
    onChange?.();
    draw();
  };
  // medicine on beast b (an Etere asks which move first)
  const give = (id: string, b: TeamBeast): void => {
    const use = itemDef(id)!.use!;
    if (use.pp && !use.pp.all) {
      body.replaceChildren();
      el('p', 'mscreen-line', body, `${itemDef(id)!.name}: quale mossa di ${formName(b.form)}?`);
      const c = careOfBeast(b);
      b.known.forEach((mid, i) => {
        const btn = el(
          'button',
          'menu-btn',
          body,
          `${BATTLE_MOVE_BY_ID[mid]?.name ?? mid}  PP ${c.pp[i]}/${c.maxPp[i]}`,
        );
        btn.disabled = !canApply(use, c, i);
        btn.addEventListener('click', () =>
          useOnBeast(inv, id, b, i)
            ? used(`I PP di ${formName(b.form)} tornano a salire.`)
            : say('Non ha effetto.'),
        );
      });
      el('button', 'menu-btn small', body, 'Indietro').addEventListener('click', draw);
      return;
    }
    const r = useOnBeast(inv, id, b);
    if (!r) return say('Non ha effetto.');
    const name = formName(b.form);
    used(
      r.revived
        ? `${name} si riprende!`
        : r.healed
          ? `${name} recupera ${r.healed} PS.`
          : r.cured
            ? `${name} sta di nuovo bene!`
            : `I PP di ${name} tornano a salire.`,
    );
  };
  const chooseBeast = (id: string): void => {
    if (only) return give(id, only);
    body.replaceChildren();
    el('p', 'mscreen-line', body, `${itemDef(id)!.name}: su chi?`);
    for (const b of g.beasts.team)
      beastLine(body, b, () => give(id, b), !canApply(itemDef(id)!.use!, careOfBeast(b)));
    el('button', 'menu-btn small', body, 'Indietro').addEventListener('click', draw);
  };
  const draw = (): void => {
    tabs.replaceChildren();
    if (!only)
      for (const p of POCKETS) {
        const t = el('button', `sheet-tab${p === pocket ? ' on' : ''}`, tabs, POCKET_NAMES[p]);
        t.addEventListener('click', () => ((pocket = p), draw()));
      }
    body.replaceChildren();
    const list = ITEMS.filter(
      (it) =>
        (inv[it.id] ?? 0) > 0 &&
        (only
          ? !!it.use && !it.battleOnly && canApply(it.use, careOfBeast(only))
          : (it.pocket ?? 'varie') === pocket),
    );
    if (!list.length)
      el(
        'p',
        'mscreen-line',
        body,
        only ? 'Nessun oggetto le servirebbe adesso.' : 'Niente in questa tasca.',
      );
    for (const it of list) {
      const row = el('div', 'bag-row', body);
      const text = el('div', 'bag-text', row);
      el('strong', '', text, `${it.name}  ×${inv[it.id]}`);
      el('span', 'bag-desc', text, it.text);
      if (it.battleOnly) {
        el('span', 'bag-note', row, 'In battaglia');
        continue;
      }
      const btn = el('button', 'menu-btn small', row, 'Usa');
      btn.addEventListener('click', () => {
        if (it.use) return chooseBeast(it.id);
        const events: Parameters<typeof useItemNow>[2] = [];
        if (useItemNow(g, it.id, events)) {
          g.story.pending.push(...events);
          used(`Hai usato ${it.name}.`);
        } else say('Adesso non serve.');
      });
    }
  };
  draw();
}

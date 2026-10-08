// Move screens like Pokémon: a move's details (type, category, power, accuracy, PP, description), the "learn a move"
// screen with the 4 known moves and the new one side by side ("1, 2 e… puff!"), and the Ricordamosse at the port.
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { FEMININE_SPECIES } from '../data/battleText';
import { CATEGORY_NAMES, MOVE_SLOTS, type BattleMoveDef } from '../data/moveBattle';
import { TYPES, type MoveTypeId } from '../data/rules';
import { decideMove, rememberable } from '../systems/beasts/battleMoves';
import { formName } from '../systems/beasts/forms';
import type { TeamBeast } from '../systems/beasts/team';
import { typeIcon } from './battleIcons';
import { el } from './dom';
import './screens.css';

export const typeColor = (type: MoveTypeId): string => (type === 'variabile' ? '#d9e4e6' : TYPES[type].color);
export const typeName = (type: MoveTypeId): string => (type === 'variabile' ? 'Variabile' : TYPES[type].name);

/** A type pill: its icon and name on its colour. */
export function typePill(parent: HTMLElement, type: MoveTypeId): HTMLSpanElement {
  const pill = el('span', 'mtype', parent);
  pill.style.setProperty('--tc', typeColor(type));
  pill.append(typeIcon(type, '#fff'), document.createTextNode(typeName(type)));
  return pill;
}

/** Everything about a move, like Pokémon's summary: type, category, power, accuracy, PP, what it does. */
export function moveDetail(
  parent: HTMLElement,
  m: BattleMoveDef,
  pp?: { left: number; max: number },
  /** In battle: what one hit does to the beast in front of you (lowest–highest roll). */
  damage?: [number, number] | null,
): HTMLDivElement {
  const box = el('div', 'mdetail', parent);
  const head = el('div', 'mdetail-head', box);
  el('strong', 'mdetail-name', head, m.name);
  typePill(head, m.type);
  const grid = el('div', 'mdetail-grid', box);
  const cell = (label: string, value: string): void => {
    const c = el('div', 'mdetail-cell', grid);
    el('span', 'mdetail-label', c, label);
    el('span', 'mdetail-value', c, value);
  };
  cell('Categoria', CATEGORY_NAMES[m.category]);
  cell('Potenza', m.power ? String(m.power) : '—');
  if (damage) cell('Danno', damage[0] === damage[1] ? String(damage[0]) : `${damage[0]}–${damage[1]}`);
  cell('Precisione', m.accuracy === null ? '—' : String(m.accuracy));
  cell('PP', pp ? `${pp.left}/${pp.max}` : String(m.pp));
  if (m.priority) cell('Priorità', m.priority > 0 ? `+${m.priority}` : String(m.priority));
  el('p', 'mdetail-text', box, m.text);
  return box;
}

const named = (b: TeamBeast) => ({ name: formName(b.form), f: FEMININE_SPECIES.includes(b.form.speciesId) });

function screen(parent: HTMLElement, title: string): { body: HTMLDivElement; close: () => void } {
  const root = el('div', 'mscreen', parent);
  const card = el('div', 'mscreen-card', root);
  el('h2', 'mscreen-title', card, title);
  const body = el('div', 'mscreen-body', card);
  return { body, close: () => root.remove() };
}

/** A last word on the screen (a choice was made); `done` after the tap. */
function finale(body: HTMLElement, text: string, done: () => void): void {
  body.replaceChildren();
  el('p', 'mscreen-line', body, text);
  el('button', 'menu-btn mscreen-ok', body, 'OK').addEventListener('click', done);
}

/**
 * Pokémon's "learn a move" screen. With a free slot the move is learned at once; with 4 it shows the 4 known moves
 * and the new one: tap one to see it, then forget it (or give the new one up). `done` after the last tap.
 */
export function learnScreen(parent: HTMLElement, b: TeamBeast, move: string, done: () => void): void {
  const m = BATTLE_MOVE_BY_ID[move];
  if (!m) return done();
  const who = named(b);
  if (b.known.length < MOVE_SLOTS) {
    decideMove(b, move, 0);
    const { body, close } = screen(parent, `${who.name} impara ${m.name}!`);
    moveDetail(body, m);
    finale(body, `${who.name} ha imparato ${m.name}!`, () => (close(), done()));
    return;
  }
  const { body, close } = screen(parent, `${who.name} vuole imparare ${m.name}`);
  el('p', 'mscreen-line', body, 'Conosce già 4 mosse. Quale deve dimenticare?');
  const cols = el('div', 'mscreen-cols', body);
  const list = el('div', 'mlist', cols);
  const side = el('div', 'mside', cols);
  const actions = el('div', 'mscreen-actions', body);
  let chosen = -1; // -1: the new move
  const show = (): void => {
    side.replaceChildren();
    const id = chosen < 0 ? move : b.known[chosen]!;
    const left =
      chosen < 0
        ? undefined
        : { left: BATTLE_MOVE_BY_ID[id]!.pp - (b.ppUsed?.[chosen] ?? 0), max: BATTLE_MOVE_BY_ID[id]!.pp };
    moveDetail(side, BATTLE_MOVE_BY_ID[id]!, left);
    for (const r of list.children) r.classList.toggle('on', Number((r as HTMLElement).dataset.i) === chosen);
    actions.replaceChildren();
    if (chosen >= 0) {
      const old = BATTLE_MOVE_BY_ID[b.known[chosen]!]!.name;
      el('button', 'menu-btn mscreen-go', actions, `Dimentica ${old}`).addEventListener('click', () => {
        decideMove(b, move, chosen);
        finale(
          body,
          `1, 2 e… puff! ${who.name} ha dimenticato ${old}… e ha imparato ${m.name}!`,
          () => (close(), done()),
        );
      });
    }
    el('button', 'menu-btn', actions, 'Non imparare').addEventListener('click', () => {
      decideMove(b, move, null);
      finale(body, `${who.name} non ha imparato ${m.name}.`, () => (close(), done()));
    });
  };
  const row = (id: string, i: number, fresh: boolean): void => {
    const d = BATTLE_MOVE_BY_ID[id]!;
    const r = el('button', `mrow${fresh ? ' fresh' : ''}`, list);
    r.dataset.i = String(i);
    r.style.setProperty('--tc', typeColor(d.type));
    r.append(typeIcon(d.type, '#fff'));
    el('span', 'mrow-name', r, d.name);
    el('span', 'mrow-side', r, fresh ? 'NUOVA' : `PP ${d.pp - (b.ppUsed?.[i] ?? 0)}/${d.pp}`);
    r.addEventListener('click', () => {
      chosen = i;
      show();
    });
  };
  b.known.forEach((id, i) => row(id, i, false));
  row(move, -1, true);
  show();
}

/** The Ricordamosse (port): the moves it learned by its level and no longer knows; pick one, then learn it. */
export function rememberScreen(parent: HTMLElement, b: TeamBeast, done: () => void): void {
  const list = rememberable(b.form, b.level, b.known);
  const { body, close } = screen(parent, 'Ricordamosse');
  if (!list.length) {
    finale(body, `${formName(b.form)} non ha mosse da ricordare.`, () => (close(), done()));
    return;
  }
  el('p', 'mscreen-line', body, `Quale mossa deve ricordare ${formName(b.form)}?`);
  const cols = el('div', 'mscreen-cols', body);
  const rows = el('div', 'mlist', cols);
  const side = el('div', 'mside', cols);
  const actions = el('div', 'mscreen-actions', body);
  const pick = (id: string, r: HTMLElement): void => {
    for (const x of rows.children) x.classList.toggle('on', x === r);
    side.replaceChildren();
    moveDetail(side, BATTLE_MOVE_BY_ID[id]!);
    actions.replaceChildren();
    el('button', 'menu-btn mscreen-go', actions, `Ricorda ${BATTLE_MOVE_BY_ID[id]!.name}`).addEventListener(
      'click',
      () => {
        close();
        learnScreen(parent, b, id, done);
      },
    );
    el('button', 'menu-btn', actions, 'Chiudi').addEventListener('click', () => (close(), done()));
  };
  list.forEach((id, i) => {
    const d = BATTLE_MOVE_BY_ID[id]!;
    const r = el('button', 'mrow', rows);
    r.style.setProperty('--tc', typeColor(d.type));
    r.append(typeIcon(d.type, '#fff'));
    el('span', 'mrow-name', r, d.name);
    el('span', 'mrow-side', r, d.power ? `potenza ${d.power}` : CATEGORY_NAMES.stato);
    r.addEventListener('click', () => pick(id, r));
    if (i === 0) pick(id, r);
  });
}

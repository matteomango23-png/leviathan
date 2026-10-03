// Learning a move with 4 already known, like Pokémon: "Zanna vuole imparare Stritolamorso. Quale deve dimenticare?"
// Used for the moves waiting after a level up and for the Ricordamosse at the port (systems/beasts/battleMoves.ts).
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { BATTLE_TEXT, FEMININE_SPECIES } from '../data/battleText';
import { CATEGORY_NAMES, MOVE_SLOTS } from '../data/moveBattle';
import { TYPES } from '../data/rules';
import { decideMove, rememberable } from '../systems/beasts/battleMoves';
import { formName } from '../systems/beasts/forms';
import type { TeamBeast } from '../systems/beasts/team';
import { el } from './dom';

const named = (b: TeamBeast) => ({ name: formName(b.form), f: FEMININE_SPECIES.includes(b.form.speciesId) });

/** One line about a move: type, power, PP. */
function moveLine(id: string): string {
  const m = BATTLE_MOVE_BY_ID[id]!;
  const type = m.type === 'variabile' ? 'Variabile' : TYPES[m.type].name;
  const power = m.power ? ` · potenza ${m.power}` : '';
  return `${type} · ${CATEGORY_NAMES[m.category]}${power} · PP ${m.pp}`;
}

function modal(parent: HTMLElement, title: string): { box: HTMLDivElement; close: () => void } {
  const root = el('div', 'sheet move-chooser', parent);
  const box = el('div', 'chooser-card', root);
  el('p', 'chooser-title', box, title);
  return { box, close: () => root.remove() };
}

/** Asks which move to forget for `move` (or learns it into a free slot); `done` after the choice. */
export function chooseForget(parent: HTMLElement, b: TeamBeast, move: string, done: () => void): void {
  const m = BATTLE_MOVE_BY_ID[move];
  if (!m) return;
  if (b.known.length < MOVE_SLOTS) {
    decideMove(b, move, 0);
    done();
    return;
  }
  const { box, close } = modal(parent, BATTLE_TEXT.wantsToLearn(named(b), m.name));
  el('p', 'chooser-new', box, `${m.name}: ${moveLine(move)}. ${m.text}`);
  b.known.forEach((id, i) => {
    const btn = el('button', 'menu-btn chooser-btn', box);
    el('strong', '', btn, `Dimentica ${BATTLE_MOVE_BY_ID[id]?.name ?? id}`);
    el('span', 'chooser-meta', btn, moveLine(id));
    btn.addEventListener('click', () => {
      decideMove(b, move, i);
      close();
      done();
    });
  });
  const no = el('button', 'menu-btn chooser-btn', box, BATTLE_TEXT.giveUp);
  no.addEventListener('click', () => {
    decideMove(b, move, null);
    close();
    done();
  });
}

/** The Ricordamosse (port): the moves it learned by its level and no longer knows. */
export function openRemember(parent: HTMLElement, b: TeamBeast, done: () => void): void {
  const list = rememberable(b.form, b.level, b.known);
  const { box, close } = modal(
    parent,
    list.length
      ? `Quale mossa deve ricordare ${formName(b.form)}?`
      : `${formName(b.form)} non ha mosse da ricordare.`,
  );
  for (const id of list) {
    const btn = el('button', 'menu-btn chooser-btn', box);
    el('strong', '', btn, BATTLE_MOVE_BY_ID[id]!.name);
    el('span', 'chooser-meta', btn, moveLine(id));
    btn.addEventListener('click', () => {
      close();
      chooseForget(parent, b, id, done);
    });
  }
  el('button', 'menu-btn chooser-btn', box, 'Chiudi').addEventListener('click', close);
}

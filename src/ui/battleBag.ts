// The backpack in battle, like Pokémon's bag: two pockets (Cure, Battaglia), each item with its description; medicine
// asks which beast (a revive only the worn-out ones), an Etere which move.
import { BATTLE_MOVE_BY_ID } from '../data/battleMoves';
import { POCKET_NAMES, type Pocket } from '../data/world';
import type { Action, BattleState } from '../systems/battle/battle';
import { battleItemUseful, usableInBattle } from '../systems/battle/battleItems';
import type { Fighter } from '../systems/battle/fighter';
import { itemDef } from '../systems/economy/items';
import { el } from './dom';

/** What the bag needs from the battle interface. */
export interface BagHost {
  page(kind: string, caption?: string): HTMLDivElement;
  button(parent: HTMLElement, label: string, onClick: () => void, cls?: string): HTMLButtonElement;
  back(m: HTMLElement, onClick: () => void): void;
  teamRow(m: HTMLElement, f: Fighter, onClick: () => void, disabled: boolean): void;
}

const POCKETS: Pocket[] = ['cure', 'battaglia'];

export function battleBag(
  host: BagHost,
  s: BattleState,
  items: Record<string, number>,
  done: (a: Action) => void,
  backToMain: () => void,
): void {
  let pocket: Pocket = 'cure';
  const list = (): void => {
    const m = host.page('list bag', 'Zaino');
    const tabs = el('div', 'bbag-tabs', m);
    for (const p of POCKETS) {
      const t = host.button(tabs, POCKET_NAMES[p], () => ((pocket = p), list()), 'bbag-tab');
      t.classList.toggle('on', p === pocket);
    }
    const ids = Object.keys(items).filter(
      (k) => (items[k] ?? 0) > 0 && usableInBattle(k) && itemDef(k)!.pocket === pocket,
    );
    for (const id of ids) {
      const it = itemDef(id)!;
      const b = host.button(m, it.name, () => pick(id), 'brow bbag-item');
      el('span', 'brow-side', b, `×${items[id]}`);
      el('span', 'bbag-text', b, it.text);
    }
    if (!ids.length) el('div', 'bempty', m, 'Niente in questa tasca.');
    host.back(m, backToMain);
  };
  const pick = (id: string): void => {
    const use = itemDef(id)!.use!;
    if (use.stage || use.tameMult) return done({ kind: 'item', id });
    // medicine: on which beast?
    const m = host.page('list', `${itemDef(id)!.name}: su chi?`);
    s.team.forEach((f, i) =>
      host.teamRow(
        m,
        f,
        () => (use.pp && !use.pp.all ? whichMove(id, i) : done({ kind: 'item', id, target: i })),
        !battleItemUseful(s, id, i),
      ),
    );
    host.back(m, list);
  };
  const whichMove = (id: string, target: number): void => {
    const f = s.team[target]!;
    const m = host.page('list', 'Quale mossa?');
    f.moves.forEach((bm, i) => {
      const b = host.button(
        m,
        BATTLE_MOVE_BY_ID[bm.move.id]?.name ?? bm.move.name,
        () => done({ kind: 'item', id, target, move: i }),
        'brow',
      );
      el('span', 'brow-side', b, `PP ${bm.pp}/${bm.maxPp}`);
      b.disabled = !battleItemUseful(s, id, target, i);
    });
    host.back(m, () => pick(id));
  };
  list();
}

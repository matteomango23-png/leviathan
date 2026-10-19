// Team list, like Pokémon's party screen: each beast with its level, health bar and condition. Where you are decides
// what you see (owner, 16 ottobre 2026): in the water only the team; at the helm the team and the ship's hold; at a
// harbour's pen also the beasts waiting there (beasts/hold.ts). Anywhere you can put the team in order (the first
// one leads in battle), open a sheet and give an item from the backpack.
import { PROGRESSION } from '../data/rules';
import { STATUS_NAMES } from '../data/moveBattle';
import { knowsForm } from '../systems/beasts/bestiaryEntries';
import { formName, formStars } from '../systems/beasts/forms';
import { isHungry } from '../systems/beasts/growth';
import { cannotMove, holdSize, inPlace, moveBeast, reachable, type Place } from '../systems/beasts/hold';
import { maxHpOf, moveInTeam, teamMembers, type TeamBeast } from '../systems/beasts/team';
import { beastPrice, cannotSell, sellBeast } from '../systems/economy/beastSale';
import { feedFromBag } from '../systems/feeding';
import { canRefuel } from '../systems/fuel';
import type { GameState } from '../systems/game';
import { setArt } from './art';
import { openBag } from './bagScreen';
import { openBeastSheet } from './beastSheet';
import { el } from './dom';
import { growthBars } from './growthBars';

/** Where the panel is open: in the water (pause), at the helm, at a harbour's pen. */
export type TeamPanelMode = 'dive' | 'ship' | 'port';

const MOVE_LABEL: Record<Place, string> = { team: 'In squadra', hold: 'In stiva', pen: 'Al recinto' };

export function renderTeamPanel(parent: HTMLElement, g: GameState, mode: TeamPanelMode): void {
  const box = el('div', 'team-panel', parent);
  const draw = (): void => {
    box.innerHTML = '';
    const shipHere = mode === 'port' && g.ship.owned && canRefuel(g, 'ship');
    const open: Place[] = mode === 'dive' ? [] : reachable(mode, shipHere);
    const team = teamMembers(g.beasts.team);
    el('h3', '', box, `Squadra (${team.length}/${PROGRESSION.teamSize})`);
    if (!g.beasts.team.length) {
      el('p', '', box, 'Nessuna bestia ancora. Sfiancane una con l’arpione nella Baia e domala.');
      return;
    }
    for (const b of team) row(b, open);
    if (mode === 'dive') return;
    // the ship's hold
    const size = holdSize(g);
    if (g.ship.owned) {
      const hold = inPlace(g, 'hold');
      el('h3', '', box, `Stiva della nave (${hold.length}/${size})`);
      if (!size)
        el(
          'p',
          'port-hint',
          box,
          'Questa nave non ha posti per altre bestie: solo la squadra viaggia con te.',
        );
      else if (mode === 'port' && !shipHere)
        el('p', 'port-hint', box, 'La nave non è ormeggiata qui: le bestie in stiva sono a bordo.');
      else if (!hold.length) el('p', 'port-hint', box, 'Vuota.');
      for (const b of hold) row(b, open);
    }
    const pen = inPlace(g, 'pen');
    if (mode === 'ship') {
      if (pen.length)
        el('p', 'port-hint', box, `Al Recinto del porto: ${pen.length} bestie. Le scambi quando attracchi.`);
      return;
    }
    el('h3', '', box, `Recinto del porto (${pen.length})`);
    if (!pen.length) el('p', 'port-hint', box, 'Nessuna bestia ad aspettarti qui.');
    for (const b of pen) row(b, open);
  };

  const row = (b: TeamBeast, open: Place[]): void => {
    const editable = mode !== 'dive';
    const r = el('div', 'team-row', box);
    r.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      openBeastSheet(document.getElementById('ui') ?? document.body, b.form, b.level, {
        hp: b.hp,
        ko: b.ko,
        beast: b,
        remember: mode === 'port', // the Ricordamosse is at the port
        onChange: draw,
        events: g.story.pending,
        known: (f) => knowsForm(f, g),
      });
    });
    const img = el('img', '', r);
    setArt(img, b.form);
    img.alt = '';
    const info = el('div', 'team-info', r);
    el('div', 'team-name', info, `${formName(b.form)} ${'★'.repeat(formStars(b.form))}`);
    el('div', 'team-sub', info, `Liv. ${b.level}`);
    // like Pokémon's party: the health bar and the condition
    const hp = el('div', 'team-row-hp', info);
    const bar = el('span', 'bagbeast-bar', hp);
    const frac = Math.max(0, b.hp / maxHpOf(b));
    const fill = el('span', 'bagbeast-fill', bar);
    fill.style.width = `${frac * 100}%`;
    fill.classList.toggle('low', frac < 0.25);
    fill.classList.toggle('mid', frac >= 0.25 && frac < 0.5);
    el('span', 'bagbeast-hp', hp, b.ko ? 'KO' : `${Math.ceil(b.hp)}/${maxHpOf(b)}`);
    if (b.status) el('span', `bagbeast-status ${b.status}`, hp, STATUS_NAMES[b.status]);
    if (b.evolveReady) el('span', 'bagbeast-status evolve', hp, 'EVOLVE');
    growthBars(info, b);
    if (b.inTeam) {
      const members = teamMembers(g.beasts.team);
      const i = members.indexOf(b);
      const order = el('div', 'team-order', r);
      const up = el('button', 'menu-btn small', order, '▲');
      up.title = 'Più avanti nella squadra';
      up.disabled = i <= 0;
      up.addEventListener('click', () => moveInTeam(g.beasts.team, b.uid, -1) && draw());
      const down = el('button', 'menu-btn small', order, '▼');
      down.title = 'Più indietro nella squadra';
      down.disabled = i >= members.length - 1;
      down.addEventListener('click', () => moveInTeam(g.beasts.team, b.uid, 1) && draw());
    }
    const item = el('button', 'menu-btn small', r, 'Oggetto');
    item.addEventListener('click', () => openBag(document.getElementById('ui') ?? document.body, g, draw, b));
    if (!editable) return;
    if (isHungry(b)) {
      const feed = el('button', 'menu-btn small', r, 'Nutri');
      feed.disabled = !Object.values(g.gear.bag).some((n) => n > 0);
      if (feed.disabled) feed.title = 'La sacca è vuota: pesca qualcosa';
      feed.addEventListener('click', () => {
        feedFromBag(g.gear.bag, b, []);
        draw();
      });
    }
    // moving it: to the team, the hold, the pen (only the places reachable from here)
    for (const to of open) {
      if (b.inTeam ? to === 'team' : (b.aboard ? 'hold' : 'pen') === to) continue;
      const why = cannotMove(g, b, to, open);
      if (why === 'Da qui non ci arrivi.') continue;
      const btn = el('button', 'menu-btn small', r, MOVE_LABEL[to]);
      btn.disabled = !!why;
      if (why) btn.title = why;
      btn.addEventListener('click', () => moveBeast(g, b.uid, to, open) && draw());
    }
    // at the harbour a beast of the pen can be sold (owner, 15 ottobre: "vendere animali")
    if (mode === 'port' && !b.inTeam && !b.aboard && !b.form.unique) {
      const price = beastPrice(b);
      const sell = el('button', 'menu-btn small', r, `Vendi · ${price} denti`);
      const why = cannotSell(g.beasts.team, b);
      sell.disabled = !!why;
      if (why) sell.title = why;
      sell.addEventListener('click', () => {
        if (!window.confirm(`Vendere ${formName(b.form)} per ${price} denti? Non torna più.`)) return;
        if (sellBeast(g, b.uid) > 0) draw();
      });
    }
  };
  draw();
}

// Team list, like Pokémon's party screen: every tamed beast with its level, health bar and condition. Anywhere you can
// put the team in order (the first one leads in battle), open its sheet and give it an item from the backpack; at
// the port (the pen) you can also move beasts between team and reserve.
import { PROGRESSION } from '../data/rules';
import { formName, formStars } from '../systems/beasts/forms';
import { maxHpOf, moveInTeam, teamMembers, toggleInTeam } from '../systems/beasts/team';
import type { GameState } from '../systems/game';
import { isHungry } from '../systems/beasts/growth';
import { feedFromBag } from '../systems/feeding';
import { setArt } from './art';
import { growthBars } from './growthBars';
import { el } from './dom';
import { openBeastSheet } from './beastSheet';
import { openBag } from './bagScreen';
import { STATUS_NAMES } from '../data/moveBattle';

export function renderTeamPanel(parent: HTMLElement, g: GameState, editable: boolean): void {
  const box = el('div', 'team-panel', parent);
  const draw = (): void => {
    box.innerHTML = '';
    const all = [...g.beasts.team].sort((a, b) => Number(b.inTeam) - Number(a.inTeam));
    el('h3', '', box, `Squadra (${teamMembers(g.beasts.team).length}/${PROGRESSION.teamSize})`);
    if (!all.length) {
      el('p', '', box, 'Nessuna bestia ancora. Sfiancane una con l’arpione nella Baia e domala.');
      return;
    }
    if (!editable && all.some((b) => !b.inTeam))
      el('p', '', box, 'La squadra si cambia al recinto del porto.');
    for (const b of all) {
      const row = el('div', 'team-row', box);
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        openBeastSheet(document.getElementById('ui') ?? document.body, b.form, b.level, {
          hp: b.hp,
          ko: b.ko,
          beast: b,
          remember: editable, // the Ricordamosse is at the port
          onChange: draw,
          events: g.story.pending,
        });
      });
      const img = el('img', '', row);
      setArt(img, b.form);
      img.alt = '';
      const info = el('div', 'team-info', row);
      el('div', 'team-name', info, `${formName(b.form)} ${'★'.repeat(formStars(b.form))}`);
      el('div', 'team-sub', info, `Liv. ${b.level} · ${b.inTeam ? 'in squadra' : 'in riserva'}`);
      // like Pokémon's party: the health bar and the condition
      const hp = el('div', 'team-hp', info);
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
        const order = el('div', 'team-order', row);
        const up = el('button', 'menu-btn small', order, '▲');
        up.title = 'Più avanti nella squadra';
        up.disabled = i <= 0;
        up.addEventListener('click', () => moveInTeam(g.beasts.team, b.uid, -1) && draw());
        const down = el('button', 'menu-btn small', order, '▼');
        down.title = 'Più indietro nella squadra';
        down.disabled = i >= members.length - 1;
        down.addEventListener('click', () => moveInTeam(g.beasts.team, b.uid, 1) && draw());
      }
      const item = el('button', 'menu-btn small', row, 'Oggetto');
      item.addEventListener('click', () =>
        openBag(document.getElementById('ui') ?? document.body, g, draw, b),
      );
      if (!editable) continue;
      if (isHungry(b)) {
        const feed = el('button', 'menu-btn small', row, 'Nutri');
        feed.disabled = !Object.values(g.gear.bag).some((n) => n > 0);
        if (feed.disabled) feed.title = 'La sacca è vuota: pesca qualcosa';
        feed.addEventListener('click', () => {
          feedFromBag(g.gear.bag, b, []);
          draw();
        });
      }
      const inWater = g.beasts.mount?.uid === b.uid;
      const btn = el('button', 'menu-btn small', row, b.inTeam ? 'In riserva' : 'In squadra');
      btn.disabled = inWater;
      if (inWater) btn.title = 'È in acqua: richiamala prima';
      btn.addEventListener('click', () => {
        if (toggleInTeam(g.beasts.team, b.uid)) draw();
        else btn.textContent = 'Squadra piena';
      });
    }
  };
  draw();
}

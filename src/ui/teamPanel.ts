// Team list: every tamed beast. Anywhere you can put the team in order (the first one leads in battle) and heal
// one beast with an Alga curativa; at the port (the pen) you can also move beasts between team and reserve.
import { PROGRESSION } from '../data/rules';
import { formName, formStars } from '../systems/beasts/forms';
import { maxHpOf, moveInTeam, teamMembers, toggleInTeam } from '../systems/beasts/team';
import { useItemOn } from '../systems/economy/backpack';
import type { GameState } from '../systems/game';
import { isHungry } from '../systems/beasts/growth';
import { feedFromBag } from '../systems/feeding';
import { setArt } from './art';
import { growthBars } from './growthBars';
import { el } from './dom';
import { openBeastSheet } from './beastSheet';

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
        });
      });
      const img = el('img', '', row);
      setArt(img, b.form);
      img.alt = '';
      const info = el('div', 'team-info', row);
      el('div', 'team-name', info, `${formName(b.form)} ${'★'.repeat(formStars(b.form))}`);
      el(
        'div',
        'team-sub',
        info,
        `Liv. ${b.level} · Vita ${Math.ceil(b.hp)}/${maxHpOf(b)}${b.ko ? ' · KO' : ''} · ${b.inTeam ? 'in squadra' : 'in riserva'}`,
      );
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
      const algae = g.gear.inventory.alga_curativa ?? 0;
      if ((b.ko || b.hp < maxHpOf(b)) && algae > 0) {
        const heal = el('button', 'menu-btn small', row, `Cura (alga ×${algae})`);
        heal.addEventListener('click', () => useItemOn(g, 'alga_curativa', b.uid, []) && draw());
      }
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

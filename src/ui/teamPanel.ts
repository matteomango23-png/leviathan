// Team list: every tamed beast. At the port (the pen) you can move beasts between team and reserve.
import { PROGRESSION } from '../data/rules';
import { formName, formStars } from '../systems/beasts/forms';
import { maxHpOf, teamMembers, toggleInTeam } from '../systems/beasts/team';
import type { GameState } from '../systems/game';
import { artUrl } from './art';
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
        });
      });
      const img = el('img', '', row);
      img.src = artUrl(b.form);
      img.alt = '';
      const info = el('div', 'team-info', row);
      el('div', 'team-name', info, `${formName(b.form)} ${'★'.repeat(formStars(b.form))}`);
      el(
        'div',
        'team-sub',
        info,
        `Liv. ${b.level} · Vita ${Math.ceil(b.hp)}/${maxHpOf(b)}${b.ko ? ' · KO' : ''} · ${b.inTeam ? 'in squadra' : 'in riserva'}`,
      );
      if (!editable) continue;
      const inWater = g.beasts.companion?.uid === b.uid;
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

// Team list in the pause menu: every tamed beast, with the button to move it between team and reserve.
import { PROGRESSION } from '../data/rules';
import { formKey, formName, formStars } from '../systems/beasts/forms';
import { maxHpOf, teamMembers, toggleInTeam } from '../systems/beasts/team';
import type { GameState } from '../systems/game';
import { el } from './dom';

export function renderTeamPanel(parent: HTMLElement, g: GameState): void {
  const box = el('div', 'team-panel', parent);
  const draw = (): void => {
    box.innerHTML = '';
    const all = [...g.beasts.team].sort((a, b) => Number(b.inTeam) - Number(a.inTeam));
    el('h3', '', box, `Squadra (${teamMembers(g.beasts.team).length}/${PROGRESSION.teamSize})`);
    if (!all.length) {
      el('p', '', box, 'Nessuna bestia ancora. Sfianca uno squalo bianco con l’arpione nella Baia e domalo.');
      return;
    }
    for (const b of all) {
      const row = el('div', 'team-row', box);
      const img = el('img', '', row);
      img.src = `art/${formKey(b.form)}.webp`;
      img.alt = '';
      const info = el('div', 'team-info', row);
      el('div', 'team-name', info, `${formName(b.form)} ${'★'.repeat(formStars(b.form))}`);
      el(
        'div',
        'team-sub',
        info,
        `Liv. ${b.level} · Vita ${Math.ceil(b.hp)}/${maxHpOf(b)}${b.ko ? ' · KO' : ''} · ${b.inTeam ? 'in squadra' : 'in riserva'}`,
      );
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

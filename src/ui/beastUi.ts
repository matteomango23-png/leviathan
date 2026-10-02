// Interface for beasts in the open sea: the team bar at the top (tap a mount to call it and ride it, tap it
// again to climb down) and the context button (Apri, Porto, Sfonda, Scendi). Fights are turn-based battles.
import { PROGRESSION } from '../data/rules';
import { activeBeast, canRide } from '../systems/beastPlay';
import { formKey, formName } from '../systems/beasts/forms';
import { maxHpOf, teamMembers } from '../systems/beasts/team';
import { currentAction, type GameState } from '../systems/game';
import { setArt } from './art';
import type { Session } from '../scenes/session';
import { el } from './dom';

const LABELS = {
  sfonda: 'Sfonda',
  scendi: 'Scendi',
  apri: 'Apri',
  porto: 'Porto',
  barca: 'Sali',
  tuffati: 'Tuffati',
} as const;

function press(btn: HTMLElement, fn: () => void): void {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  });
}

export class BeastUi {
  private readonly slotsEl: HTMLDivElement;
  private readonly slots: {
    root: HTMLButtonElement;
    img: HTMLImageElement;
    fill: HTMLDivElement;
    note: HTMLSpanElement;
  }[] = [];
  private readonly ctxBtn: HTMLButtonElement;

  constructor(
    root: HTMLElement,
    private readonly session: Session,
  ) {
    this.slotsEl = el('div', 'team-slots', root);
    for (let i = 0; i < PROGRESSION.teamSize; i++) {
      const b = el('button', 'team-slot', this.slotsEl);
      const img = el('img', '', b);
      img.alt = '';
      const bar = el('div', 'team-hp', b);
      const fill = el('div', 'team-hp-fill', bar);
      const note = el('span', 'team-note', b);
      press(b, () => {
        this.session.input.summon = i;
      });
      this.slots.push({ root: b, img, fill, note });
    }
    this.ctxBtn = el('button', 'act act-ctx', root);
    this.ctxBtn.hidden = true;
    press(this.ctxBtn, () => {
      this.session.input.action = true;
    });
  }

  update(g: GameState): void {
    const team = teamMembers(g.beasts.team);
    const out = g.beasts.mount;
    this.slotsEl.hidden = team.length === 0;
    this.slots.forEach((s, i) => {
      const b = team[i];
      s.root.hidden = !b;
      if (!b) return;
      const key = formKey(b.form);
      if (s.img.dataset.key !== key) {
        s.img.dataset.key = key;
        setArt(s.img, b.form);
      }
      s.root.title = `${formName(b.form)} · liv. ${b.level} · tocca per ${canRide(b) ? 'cavalcarlo' : 'farti seguire'}`;
      s.fill.style.width = `${Math.round((b.hp / maxHpOf(b)) * 100)}%`;
      s.root.classList.toggle('out', !!out && out.uid === b.uid && out.state !== 'leaving');
      s.root.classList.toggle('ko', b.ko);
      s.root.classList.toggle('rideable', canRide(b));
      s.note.textContent = b.ko ? 'KO' : '';
    });
    const act = currentAction(g);
    this.ctxBtn.hidden = act === null;
    if (act) this.ctxBtn.textContent = LABELS[act];
    document.getElementById('ui')?.classList.toggle('riding', !!(g.beasts.riding && activeBeast(g)));
  }
}

// Interface for beasts in the open sea: the team bar at the top (tap a mount to call it and ride it, tap it
// again to climb down) and the context button (Apri, Porto, Sfonda, Scendi). Fights are turn-based battles.
import { PROGRESSION } from '../data/rules';
import { isOut } from '../systems/beastState';
import { activeBeast, canRide } from '../systems/beastPlay';
import { formKey, formName } from '../systems/beasts/forms';
import { maxHpOf, swapInTeam, teamMembers } from '../systems/beasts/team';
import { currentAction, type GameState } from '../systems/game';
import { setArt } from './art';
import type { Session } from '../scenes/session';
import { el } from './dom';

const LABELS = {
  sfonda: 'Sfonda',
  scendi: 'Scendi',
  apri: 'Apri',
  porto: 'Porto',
  sali: 'Sali',
  esci: 'Esci',
  aggancia: 'Aggancia',
  abordo: 'A bordo',
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
      this.dragSlot(b, i);
      this.slots.push({ root: b, img, fill, note });
    }
    this.ctxBtn = el('button', 'act act-ctx', root);
    this.ctxBtn.hidden = true;
    press(this.ctxBtn, () => {
      this.session.input.action = true;
    });
  }

  /**
   * A ball of the team: a tap (down and up without moving) calls the beast, as before; held and dragged onto another
   * ball, the two change places (owner, 15 ottobre: "trascinare l'ordine delle sfere"); the ball follows the finger.
   */
  private dragSlot(b: HTMLButtonElement, i: number): void {
    let start: { x: number; id: number } | null = null;
    let dragging = false;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      start = { x: e.clientX, id: e.pointerId };
      dragging = false;
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        // a pointer that cannot be captured: the drag simply ends where it leaves
      }
    });
    b.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      if (!dragging && Math.abs(dx) > 10) {
        dragging = true;
        b.classList.add('dragging');
      }
      if (dragging) b.style.transform = `translateX(${dx}px)`;
    });
    const end = (e: PointerEvent, cancel: boolean): void => {
      if (!start || e.pointerId !== start.id) return;
      e.stopPropagation();
      start = null;
      b.style.transform = '';
      b.classList.remove('dragging');
      if (cancel) return;
      if (!dragging) {
        this.session.input.summon = i;
        return;
      }
      // the ball it was dropped on
      const g = this.session.game;
      const j = this.slots.findIndex((s, k) => {
        if (k === i || s.root.hidden) return false;
        const r = s.root.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right;
      });
      const team = g ? teamMembers(g.beasts.team) : [];
      if (g && j >= 0 && team[i] && team[j]) swapInTeam(g.beasts.team, team[i]!.uid, team[j]!.uid);
    };
    b.addEventListener('pointerup', (e) => end(e, false));
    b.addEventListener('pointercancel', (e) => end(e, true));
  }

  update(g: GameState): void {
    const team = teamMembers(g.beasts.team);
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
      s.root.classList.toggle('out', isOut(g, b.uid)); // ridden, or swimming in your pack
      s.root.classList.toggle('ko', b.ko);
      s.root.classList.toggle('rideable', canRide(b));
      s.note.textContent = b.ko ? 'KO' : '';
    });
    const act = currentAction(g);
    this.ctxBtn.hidden = act === null;
    if (act) {
      this.ctxBtn.textContent = LABELS[act];
      // a long word (Aggancia, A bordo) smaller, inside the round button (owner, 10 ottobre)
      this.ctxBtn.classList.toggle('long', LABELS[act].length > 5);
    }
    document.getElementById('ui')?.classList.toggle('riding', !!(g.beasts.riding && activeBeast(g)));
  }
}

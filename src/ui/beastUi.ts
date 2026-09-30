// Interface for beasts: team slots (call / recall), the context button (Doma, Cavalca, Scendi),
// the three move buttons while riding, and the taming minigame.
import { PROGRESSION, TAMING } from '../data/rules';
import { activeBeast, contextAction } from '../systems/beastPlay';
import { formKey, formName } from '../systems/beasts/forms';
import { needle } from '../systems/beasts/taming';
import { maxHpOf, movesFor, teamMembers } from '../systems/beasts/team';
import type { GameEvent } from '../systems/events';
import type { GameState } from '../systems/game';
import type { Session } from '../scenes/session';
import { el } from './dom';

const LABELS = { doma: 'Doma', cavalca: 'Cavalca', scendi: 'Scendi' } as const;

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
  private readonly moveRow: HTMLDivElement;
  private readonly moveBtns: HTMLButtonElement[] = [];
  private readonly tame: HTMLDivElement;
  private readonly tameTitle: HTMLDivElement;
  private readonly tameZone: HTMLDivElement;
  private readonly tameNeedle: HTMLDivElement;
  private readonly tamePips: HTMLSpanElement[] = [];
  private readonly tameMsg: HTMLDivElement;
  private cacheKey = '';

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
    this.moveRow = el('div', 'move-row', root);
    for (let i = 1; i <= 3; i++) {
      const b = el('button', 'act act-move', this.moveRow);
      press(b, () => {
        this.session.input.move = i;
      });
      this.moveBtns.push(b);
    }
    this.moveRow.hidden = true;

    this.tame = el('div', 'tame', root);
    this.tame.hidden = true;
    this.tameTitle = el('div', 'tame-title', this.tame);
    const bar = el('div', 'tame-bar', this.tame);
    this.tameZone = el('div', 'tame-zone', bar);
    this.tameNeedle = el('div', 'tame-needle', bar);
    const pips = el('div', 'tame-pips', this.tame);
    for (let i = 0; i < TAMING.hitsNeeded; i++) this.tamePips.push(el('span', '', pips));
    this.tameMsg = el('div', 'tame-msg', this.tame);
    press(this.tame, () => {
      this.session.input.tameTap = true;
    });
  }

  onEvents(events: GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'tamingMiss') this.tame.classList.add('shake');
      if (e.type === 'tamingHit' || e.type === 'tamingMiss')
        setTimeout(() => this.tame.classList.remove('shake'), 250);
    }
  }

  update(g: GameState): void {
    // team slots
    const team = teamMembers(g.beasts.team);
    const out = g.beasts.companion;
    this.slotsEl.hidden = team.length === 0;
    this.slots.forEach((s, i) => {
      const b = team[i];
      s.root.hidden = !b;
      if (!b) return;
      const key = formKey(b.form);
      if (s.img.dataset.key !== key) {
        s.img.dataset.key = key;
        s.img.src = `art/${key}.webp`;
      }
      s.root.title = `${formName(b.form)} · liv. ${b.level}`;
      s.fill.style.width = `${Math.round((b.hp / maxHpOf(b)) * 100)}%`;
      const inWater = !!out && out.uid === b.uid && out.state !== 'leaving';
      s.root.classList.toggle('out', inWater);
      s.root.classList.toggle('ko', b.ko);
      s.note.textContent = b.ko ? 'KO' : b.cooldown > 0 ? String(Math.ceil(b.cooldown)) : '';
    });

    // context button and moves
    const act = contextAction(g);
    this.ctxBtn.hidden = act === null;
    if (act) this.ctxBtn.textContent = LABELS[act];
    const mount = g.beasts.riding ? activeBeast(g) : undefined;
    this.moveRow.hidden = !mount;
    document.getElementById('ui')?.classList.toggle('riding', !!mount);
    if (mount) {
      const moves = movesFor(mount);
      const key = `${mount.uid}:${mount.level}`;
      if (key !== this.cacheKey) {
        this.cacheKey = key;
        moves.forEach((m, i) => {
          const b = this.moveBtns[i]!;
          b.textContent = m.unlocked ? m.move.name : `🔒 ${m.unlockLevel}`;
          b.title = m.unlocked ? m.move.text : `Si sblocca al livello ${m.unlockLevel}`;
          b.classList.toggle('locked', !m.unlocked);
        });
      }
      moves.forEach((m, i) => {
        const cd = mount.moveCooldowns[i]!;
        this.moveBtns[i]!.classList.toggle('cooldown', m.unlocked && cd > 0);
        this.moveBtns[i]!.style.setProperty(
          '--cd',
          m.unlocked && cd > 0 ? String(cd / m.move.cooldown) : '0',
        );
      });
    }

    // taming minigame
    const t = g.beasts.taming;
    this.tame.hidden = !t;
    if (t) {
      const w = g.beasts.wilds.find((x) => x.id === t.beastId);
      this.tameTitle.textContent = w ? `Doma: ${formName(w.form)} (liv. ${w.level})` : 'Doma';
      this.tameZone.style.left = `${(t.centre - t.width / 2) * 100}%`;
      this.tameZone.style.width = `${t.width * 100}%`;
      this.tameNeedle.style.left = `${needle(t) * 100}%`;
      this.tamePips.forEach((p, i) => p.classList.toggle('ok', i < t.hits));
      const left = TAMING.missesAllowed - t.misses;
      this.tameMsg.textContent =
        t.misses === 0
          ? 'Tocca quando l’ago è nella fascia chiara'
          : left > 0
            ? `Mancato. Puoi sbagliare ancora ${left} ${left === 1 ? 'volta' : 'volte'}`
            : 'Mancato. Ultima possibilità';
    }
  }
}

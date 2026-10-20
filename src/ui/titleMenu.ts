// The title menu (owner, 19 ottobre 2026): the painted sea behind, three buttons in the middle (Riprendi, Nuova
// partita, Carica partita) and the list of games, each kept, renamed, exported or deleted. Only drawing and taps:
// the games themselves are systems/save/slots.ts.
import { SLOTS } from '../data/diver';
import { assetUrl } from '../data/assets';
import { UI_ICON_KEYS } from '../data/sprites.generated';
import {
  createSlot,
  deleteSlot,
  importSlot,
  lastSlot,
  listSlots,
  nextGameName,
  renameSlot,
  slotText,
  storageUse,
  type SlotMeta,
} from '../systems/save/slots';
import { testMode } from '../systems/testTools';
import { el } from './dom';
import { exportText, pickSaveFile } from './saveTransfer';
import { SaveError } from '../systems/save/saveData';
import './title.css';

interface TitleActions {
  /** Open this game; returns an error to show if it cannot be read. */
  play(id: string): string | null;
  /** The test gallery (with the test tools on). */
  gallery(): void;
}

const hours = (s: number): string => {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

const when = (iso: string): string => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return 'mai salvata';
  return `${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
};

/** One line under a game's name: its first beast, teeth, time played, last save. */
function slotDetails(s: SlotMeta): string {
  if (s.broken) return `Non leggibile (${s.broken.replace(/\.$/, '')}): puoi esportarla`;
  if (!s.savedAt) return 'Appena iniziata';
  return [
    s.lead ?? 'Nessuna bestia',
    `${s.teeth.toLocaleString('it-IT')} denti`,
    hours(s.playTime),
    when(s.savedAt),
  ].join(' · ');
}

export class TitleMenu {
  private readonly root: HTMLDivElement;
  private readonly box: HTMLDivElement;

  constructor(private readonly actions: TitleActions) {
    this.root = el('div', 'title-screen', document.body);
    // the owner's painting when it is there (public/ui/menu_sfondo.webp), the painted sea under it meanwhile
    const painted = UI_ICON_KEYS.includes('menu_sfondo') ? 'ui/menu_sfondo.webp' : 'bg/tana_far.webp';
    this.root.style.backgroundImage = `linear-gradient(180deg, rgba(2,7,12,0.15), rgba(2,7,12,0.55)), url(${assetUrl(painted)})`;
    el('h1', 'title-name', this.root, 'Leviatano');
    this.box = el('div', 'title-box', this.root);
    this.home();
  }

  private clear(): HTMLDivElement {
    this.box.replaceChildren();
    this.box.classList.remove('wide');
    return this.box;
  }

  private button(parent: HTMLElement, text: string, onTap: () => void, cls = ''): HTMLButtonElement {
    const b = el('button', `title-btn ${cls}`.trim(), parent, text);
    b.addEventListener('click', onTap);
    return b;
  }

  private note(parent: HTMLElement, text: string, error = false): HTMLParagraphElement {
    return el('p', `title-note${error ? ' error' : ''}`, parent, text);
  }

  private open(id: string, msgAt: HTMLElement): void {
    const error = this.actions.play(id);
    if (error)
      this.note(
        msgAt,
        `Questa partita non si legge (${error.replace(/\.$/, '')}). È rimasta nell'elenco: puoi esportarla.`,
        true,
      );
  }

  /** Riprendi, Nuova partita, Carica partita. */
  home(): void {
    const box = this.clear();
    const last = lastSlot();
    if (last) {
      const b = this.button(box, 'Riprendi', () => this.open(last.id, box), 'primary');
      el('span', 'title-sub', b, last.name);
    }
    this.button(box, 'Nuova partita', () => this.newGame(), last ? '' : 'primary');
    // (always: from there a game can also be imported from a file)
    this.button(box, 'Carica partita', () => this.list());
    // every beast one after another, never saved (test tools on: 5 taps on the version in the pause menu)
    if (testMode()) this.button(box, 'Galleria di prova', () => this.actions.gallery());
    if (storageUse() > SLOTS.warnAt)
      this.note(box, 'La memoria del gioco è quasi piena: esporta ed elimina le partite che non usi.', true);
  }

  private newGame(): void {
    const box = this.clear();
    el('p', 'title-label', box, 'Nome della nuova partita');
    const input = el('input', 'title-input', box);
    input.value = nextGameName();
    input.maxLength = SLOTS.maxNameLength;
    const start = (): void => {
      const id = createSlot(input.value);
      if (id) this.open(id, box);
      else this.note(box, 'Non riesco a salvare: la memoria del browser è bloccata.', true);
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && start());
    this.note(box, 'Le altre partite restano dove sono.');
    const row = el('div', 'title-row', box);
    this.button(row, 'Indietro', () => this.home());
    this.button(row, 'Inizia', start, 'primary');
  }

  /** Every game: play, rename, export, delete (with a second tap to be sure). */
  private list(): void {
    const box = this.clear();
    box.classList.add('wide');
    const games = listSlots();
    const rows = el('div', 'title-list', box);
    const msg = el('div', '', box);
    for (const s of games) {
      const row = el('div', `title-game${s.broken ? ' broken' : ''}`, rows);
      const text = el('div', 'title-game-text', row);
      el('div', 'title-game-name', text, s.name);
      el('div', 'title-game-info', text, slotDetails(s));
      const acts = el('div', 'title-game-acts', row);
      if (!s.broken) this.button(acts, 'Gioca', () => this.open(s.id, msg), 'primary small');
      this.button(acts, 'Rinomina', () => this.rename(s, text), 'small');
      this.button(acts, 'Esporta', () => void this.exportGame(s), 'small');
      const del = this.button(
        acts,
        'Elimina',
        () => {
          if (!del.classList.contains('sure')) {
            del.classList.add('sure');
            del.textContent = 'Sicuro?';
            return;
          }
          deleteSlot(s.id);
          if (listSlots().length) this.list();
          else this.home();
        },
        'small danger',
      );
    }
    if (!games.length) this.note(box, 'Nessuna partita salvata.');
    // a game from a file joins the list (owner, 20 ottobre: export and import here, not in the pause menu)
    this.button(box, 'Importa partita', () => void this.importGame(msg));
    this.button(box, 'Indietro', () => this.home());
  }

  private rename(s: SlotMeta, text: HTMLElement): void {
    text.replaceChildren();
    const input = el('input', 'title-input', text);
    input.value = s.name;
    input.maxLength = SLOTS.maxNameLength;
    const done = (): void => {
      renameSlot(s.id, input.value);
      this.list();
    };
    input.addEventListener('keydown', (e) => e.key === 'Enter' && done());
    input.addEventListener('blur', done);
    input.focus();
    input.select();
  }

  private async importGame(msgAt: HTMLElement): Promise<void> {
    try {
      const file = await pickSaveFile();
      if (!file) return;
      if (!importSlot(file.name, file.save)) {
        this.note(msgAt, 'Non riesco a salvare: la memoria del browser è bloccata o piena.', true);
        return;
      }
      this.list();
      this.note(this.box, `Partita "${file.name}" aggiunta all'elenco.`);
    } catch (e) {
      this.note(msgAt, e instanceof SaveError ? e.message : 'Impossibile leggere il file.', true);
    }
  }

  private async exportGame(s: SlotMeta): Promise<void> {
    const text = slotText(s.id);
    if (text === null) return;
    const safe =
      s.name
        .replace(/[^\w\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '-') || 'partita';
    await exportText(text, `leviatano-${safe}.json`);
  }

  destroy(): void {
    this.root.remove();
  }
}

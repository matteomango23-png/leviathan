// Pause menu: resume, bestiary, replay the opening, export and import the save.
import type { GameState } from '../systems/game';
import { SaveError } from '../systems/save/saveData';
import { toSave } from '../systems/game';
import type { Session } from '../scenes/session';
import { replayIntro } from '../systems/story';
import { testMode } from '../systems/testTools';
import { el } from './dom';
import { openBestiary } from './bestiary';
import { icon } from './icons';
import { exportSave, pickSaveFile } from './saveTransfer';
import { renderTeamPanel } from './teamPanel';
import { renderTestPanel } from './testPanel';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export class PauseMenu {
  private readonly root: HTMLDivElement;
  private readonly msg: HTMLParagraphElement;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    private readonly game: GameState,
    onResume: () => void,
  ) {
    this.root = el('div', 'menu', parent);
    const panel = el('div', 'menu-panel', this.root);
    el('h2', '', panel, 'Pausa');
    const caught = game.fishCaught.sardina ?? 0;
    el('p', '', panel, `Tempo di gioco: ${formatTime(game.playTime)} · Sardine catturate: ${caught}`);
    const resume = el('button', 'menu-btn primary', panel, 'Riprendi');
    const book = el('button', 'menu-btn', panel);
    book.append(icon('book'), document.createTextNode(' Bestiario'));
    book.addEventListener('click', () => openBestiary(parent, game));
    const replay = el('button', 'menu-btn', panel, 'Rivedi l’inizio');
    replay.addEventListener('click', () => {
      replayIntro(game);
      onResume();
    });
    const exp = el('button', 'menu-btn', panel, 'Esporta salvataggio');
    const imp = el('button', 'menu-btn', panel, 'Importa salvataggio');
    this.msg = el('p', 'menu-msg', panel);
    renderTeamPanel(panel, game, false);
    if (testMode())
      renderTestPanel(panel, game, (m) => {
        this.say(m);
        onResume();
      });
    el(
      'p',
      '',
      panel,
      'La partita si salva da sola. Esporta ogni tanto una copia: serve per non perdere i progressi e per ' +
        'spostarli tra Safari, il gioco installato sulla Home e un altro telefono (hanno salvataggi separati).',
    );

    resume.addEventListener('click', onResume);
    exp.addEventListener('click', () => void this.doExport());
    imp.addEventListener('click', () => void this.doImport());
  }

  private say(text: string, error = false): void {
    this.msg.textContent = text;
    this.msg.classList.toggle('error', error);
  }

  private async doExport(): Promise<void> {
    this.session.emit('saveNow');
    const result = await exportSave(toSave(this.game, new Date()));
    if (result === 'shared') this.say('Salvataggio condiviso.');
    else if (result === 'downloaded') this.say('File del salvataggio scaricato.');
  }

  private async doImport(): Promise<void> {
    try {
      const save = await pickSaveFile();
      if (!save) return;
      const ok = window.confirm('Sostituire la partita attuale con quella del file?');
      if (!ok) return;
      this.session.emit('importSave', save);
      this.say('Salvataggio caricato.');
    } catch (e) {
      this.say(e instanceof SaveError ? e.message : 'Impossibile leggere il file.', true);
    }
  }

  destroy(): void {
    this.root.remove();
  }
}

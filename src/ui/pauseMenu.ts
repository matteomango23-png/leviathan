// Pause menu: resume, bestiary, bag, card, map, guide, sound, back to the title menu (where the games are
// exported and imported, owner 20 ottobre).
import type { GameState } from '../systems/game';
import pkg from '../../package.json';
import type { Session } from '../scenes/session';
import { testMode, toggleTestMode } from '../systems/testTools';
import { el } from './dom';
import { openSeaMap } from './seaMapPanel';
import { openBestiary } from './bestiary';
import { icon } from './icons';
import { renderTeamPanel } from './teamPanel';
import { renderMissions } from './missionList';
import { openBag } from './bagScreen';
import { formatTime, openHunterCard } from './hunterCardView';
import { renderTestPanel } from './testPanel';
import { openGuide } from './guide';
import { freeVehicles } from '../systems/ship/unstuck';

export class PauseMenu {
  private readonly root: HTMLDivElement;
  private readonly msg: HTMLParagraphElement;

  constructor(
    parent: HTMLElement,
    private readonly session: Session,
    game: GameState,
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
    const bag = el('button', 'menu-btn', panel);
    bag.append(icon('backpack'), document.createTextNode(' Zaino'));
    bag.addEventListener('click', () => openBag(parent, game));
    const card = el('button', 'menu-btn', panel);
    card.append(icon('star'), document.createTextNode(' Tessera'));
    card.addEventListener('click', () => openHunterCard(parent, game));
    const map = el('button', 'menu-btn', panel);
    map.append(icon('dive'), document.createTextNode(' Mappa'));
    map.addEventListener('click', () => openSeaMap(parent, game));
    const guide = el('button', 'menu-btn', panel);
    guide.append(icon('scroll'), document.createTextNode(' Guida'));
    guide.addEventListener('click', () => openGuide(parent, game));
    const sound = el('button', 'menu-btn', panel);
    const soundLabel = (): string => `Suono: ${this.session.sound.enabled ? 'sì' : 'no'}`;
    sound.textContent = soundLabel();
    sound.addEventListener('click', () => {
      this.session.sound.setEnabled(!this.session.sound.enabled);
      sound.textContent = soundLabel();
    });
    // new games, loading, renaming, export and import: in the title menu, where every game stays (owner, 19 and
    // 20 ottobre)
    // a safety net (owner, 26 ottobre: stuck in the rock with no way out): back to the pier, free
    const stuck = el('button', 'menu-btn', panel, 'Sono bloccato');
    stuck.addEventListener('click', () => {
      freeVehicles(game, true);
      this.session.emit('saveNow');
      this.say(
        game.ship.owned ? 'Sei al molo di Porto Fango, con la nave e i suoi mezzi.' : 'Sei a Portofosco.',
      );
      onResume();
    });
    const title = el('button', 'menu-btn', panel, 'Menu iniziale');
    title.addEventListener('click', () => this.session.emit('toTitle'));
    this.msg = el('p', 'menu-msg', panel);
    renderTeamPanel(panel, game, 'dive');
    renderMissions(panel, game.gear);
    if (testMode())
      renderTestPanel(
        panel,
        game,
        (m) => {
          this.say(m);
          onResume();
        },
        () => this.session.emit('skipWeather'),
      );
    el(
      'p',
      '',
      panel,
      'La partita si salva da sola. Esporta ogni tanto una copia: serve per non perdere i progressi e per ' +
        'spostarli tra Safari, il gioco installato sulla Home e un altro telefono (hanno salvataggi separati). ' +
        'Prima di eliminare il gioco dalla Home esporta sempre: eliminandolo, il salvataggio si cancella.',
    );
    const version = el('p', 'menu-version', panel, `Versione ${pkg.version}`); // to check that the phone has the latest one
    // TEMPORARY (owner, 8 ottobre): 5 taps on the version switch the test tools on or off (testTools.ts)
    let taps = 0;
    version.addEventListener('click', () => {
      if (++taps < 5) return;
      taps = 0;
      this.say(
        toggleTestMode()
          ? 'Strumenti di prova accesi: chiudi e riapri la pausa, li trovi qui sopra.'
          : 'Strumenti di prova spenti.',
      );
    });

    resume.addEventListener('click', onResume);
  }

  private say(text: string, error = false): void {
    this.msg.textContent = text;
    this.msg.classList.toggle('error', error);
  }

  destroy(): void {
    this.root.remove();
  }
}

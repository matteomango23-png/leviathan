// UI: HUD and touch/keyboard controls, drawn as HTML over the game canvas (crisp text, safe areas).
import Phaser from 'phaser';
import { BackpackBar } from '../ui/backpackBar';
import { BeastUi } from '../ui/beastUi';
import { Controls } from '../ui/controls';
import { HelmControls } from '../ui/helmControls';
import { helmInfo } from '../ui/helmInfo';
import { DialogueBox } from '../ui/dialogueBox';
import { el } from '../ui/dom';
import { Hud } from '../ui/hud';
import type { GameEvent } from '../systems/events';
import { canDashNow } from '../systems/game';
import { storyHoldsDiver } from '../systems/story';
import { needsStarter } from '../systems/starter';
import { StarterPicker } from '../ui/starterPicker';
import { Compass } from '../ui/compass';
import { SubScope } from '../ui/subScope';
import type { SceneData, Session } from './session';

export class UIScene extends Phaser.Scene {
  private session!: Session;
  private root!: HTMLDivElement;
  private hud!: Hud;
  private controls!: Controls;
  private helm!: HelmControls;
  private beastUi!: BeastUi;
  private backpack!: BackpackBar;
  private dialogue!: DialogueBox;
  private starter!: StarterPicker;
  private compass!: Compass;
  /** The submarine's 360° sonar and the arrow home (block 5c). */
  private subScope!: SubScope;

  constructor() {
    super('UI');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    this.root = el('div', '', document.body);
    this.root.id = 'ui';
    this.hud = new Hud(this.root);
    this.controls = new Controls(this.root, this.session, () => this.openPause());
    this.helm = new HelmControls(this.root, this.session);
    this.beastUi = new BeastUi(this.root, this.session);
    this.backpack = new BackpackBar(this.root, this.session);
    this.dialogue = new DialogueBox(this.root);
    this.starter = new StarterPicker(this.root, () => this.session.game);
    this.compass = new Compass(this.root, this.session);
    this.subScope = new SubScope(this.root);
    const rotate = el('div', 'rotate', document.body);
    el('div', '', rotate, '⟳');
    el('div', '', rotate, 'Ruota il telefono in orizzontale');

    this.session.on('gameEvents', this.onGameEvents, this);
    this.session.on('toast', this.onToast, this);
    this.session.on('resume', this.onResume, this);
    this.session.on('openPort', this.openPort, this);
    this.session.on('openCockpit', this.openCockpit, this);
    this.session.on('battle', this.onBattle, this);
    this.events.once('shutdown', () => {
      this.session.off('gameEvents', this.onGameEvents, this);
      this.session.off('toast', this.onToast, this);
      this.session.off('resume', this.onResume, this);
      this.session.off('openPort', this.openPort, this);
      this.session.off('openCockpit', this.openCockpit, this);
      this.session.off('battle', this.onBattle, this);
      this.controls.destroy();
      this.helm.destroy();
      this.dialogue.destroy();
      this.root.remove();
      rotate.remove();
    });
    // pause automatically when the app goes to the background
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') this.openPause();
    };
    document.addEventListener('visibilitychange', onHide);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', onHide));
  }

  private onGameEvents(events: GameEvent[]): void {
    if (!this.session.game) return;
    this.hud.onEvents(events, this.session.game);
  }

  private onToast(text: string): void {
    this.hud.toast(text, 4);
  }

  /** During a battle the sea's interface hides (the battle has its own). */
  private onBattle(on: boolean): void {
    this.controls.releaseAll();
    this.helm.releaseAll();
    this.root.style.display = on ? 'none' : '';
  }

  private openMenus(mode: 'pause' | 'port' | 'cockpit'): void {
    const s = this.session;
    if (s.paused || s.inCockpit || s.inBattle || !s.game) return;
    this.controls.releaseAll();
    this.helm.releaseAll();
    // the cockpit does not stop the sea: the ship sails on while you watch the sonar
    if (mode === 'cockpit') s.inCockpit = true;
    else {
      s.paused = true;
      this.scene.pause('World');
      s.sound.silence(); // owner, 8 ottobre: the engine went on in the pause menu
    }
    this.scene.launch('Menus', { session: s, mode });
  }

  private openPause(): void {
    this.openMenus('pause');
  }

  private openPort(): void {
    this.openMenus('port');
  }

  private openCockpit(): void {
    this.openMenus('cockpit');
  }

  private onResume(): void {
    this.session.paused = false;
    this.session.inCockpit = false;
    this.controls.releaseAll();
    this.helm.releaseAll();
    this.scene.stop('Menus');
    this.scene.resume('World');
  }

  override update(_time: number, deltaMs: number): void {
    const g = this.session.game;
    if (!g) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    // off the helm (rescued, a battle) the cockpit closes by itself
    if (this.session.inCockpit && (!g.ship.aboard || this.session.inBattle)) this.session.emit('resume');
    const helm = helmInfo(g, this.session.input.helm.throttle);
    this.root.classList.toggle('driving', !!helm);
    this.controls.update(g.diver.dashCooldown <= 0, canDashNow(g), !!helm);
    this.helm.update(helm, dt);
    this.hud.update(g, dt);
    this.dialogue.update(g, dt);
    this.starter.setVisible(needsStarter(g) && !g.story.dialogue);
    // story scenes: only the story on screen (the controls do nothing then)
    this.root.classList.toggle('in-scene', !!g.story.dialogue || storyHoldsDiver(g));
    this.beastUi.update(g);
    this.backpack.update(g);
    this.compass.update(g);
    this.subScope.update(g, dt);
  }
}

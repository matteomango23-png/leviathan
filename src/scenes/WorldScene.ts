// World: runs the game step, turns its events into saves, battles and sounds, and lets WorldViews draw the sea
// (worldViews.ts) and show the events (worldEvents.ts). No rules live here, only wiring.
import Phaser from 'phaser';
import { DIVER, SAVE } from '../data/diver';
import { ENGINE_SOUND } from '../data/audio';
import { engineHeard } from '../systems/ship/ship';
import { boatEngineLevel } from '../systems/boat';
import type { GameEvent } from '../systems/events';
import { createGame, enterPort, stepGame, toSave, type GameState } from '../systems/game';
import { consumePresses } from '../systems/input';
import { startNewGame } from '../systems/story';
import type { BeastForm } from '../systems/beasts/forms';
import {
  fightIt,
  fightWithIt,
  makeCompanion,
  newGalleryState,
  rideIt,
  setUpGallery,
  showInSea,
} from '../systems/gallery';
import { healAll } from '../systems/testTools';
import { writeSlot } from '../systems/save/slots';
import { skipWeather, weatherName } from '../systems/weather';
import { generateWorld } from '../systems/world/worldGen';
import { depthMetres } from '../systems/world/zones';
import { kmFromCoast } from '../systems/world/stretches';
import { beepEvery, obstacleAhead } from '../systems/ship/radar';
import { inVehicle } from '../systems/vehicles';
import { showEvent } from './worldEvents';
import { WorldViews } from './worldViews';
import type { SceneData, Session } from './session';

export class WorldScene extends Phaser.Scene {
  private session!: Session;
  private state!: GameState;
  private views!: WorldViews;
  /** Seconds to the radar's next beep. */
  private beepT = 0;
  private saveTimer = 0;

  constructor() {
    super('World');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    const map = generateWorld();
    // the game the title menu chose (TitleScene): already read, an unreadable one never gets here
    const saved = this.session.startSave;
    this.session.startSave = null;
    this.state = createGame(map, saved);
    // the test gallery: in open water with a strong beast, no story; otherwise a brand new game begins on Aurelio's boat
    if (this.session.gallery) setUpGallery(this.state);
    else if (!saved) startNewGame(this.state);
    this.session.game = this.state;
    this.views = new WorldViews(this, map, this.state);

    this.scale.on('resize', this.onResize, this);
    this.session.on('saveNow', this.save, this);
    this.session.on('toTitle', this.onToTitle, this);
    this.session.on('gallery', this.onGallery, this);
    this.session.on('battle', this.onBattleOver, this);
    this.session.on('skipWeather', this.onSkipWeather, this);
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') this.save();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', this.save);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.session.off('saveNow', this.save, this);
      this.session.off('toTitle', this.onToTitle, this);
      this.session.off('gallery', this.onGallery, this);
      this.session.off('battle', this.onBattleOver, this);
      this.session.off('skipWeather', this.onSkipWeather, this);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', this.save);
    });
  }

  private onSkipWeather(): void {
    skipWeather(this.state.weather);
    this.session.emit('toast', `Meteo: ${weatherName(this.state.weather, this.state.diver.x)}`);
  }

  private onResize(size: Phaser.Structs.Size): void {
    this.views.rig.resize(size.width, size.height);
    this.views.terrain.update(this.views.rig.worldView(), true);
  }

  /** Set when leaving this game: nothing may be saved over the new choice any more. */
  private switching = false;

  private readonly save = (): void => {
    if (this.switching || !this.session.slotId) return; // (the test gallery is never saved)
    writeSlot(this.session.slotId, toSave(this.state, new Date()));
  };

  private readonly galleryState = newGalleryState();

  /** The test gallery's buttons (systems/gallery.ts). */
  private onGallery(act: 'sea' | 'fight' | 'companion' | 'ride' | 'withIt', form: BeastForm): void {
    const g = this.state;
    const events: GameEvent[] = [];
    if (act === 'sea') showInSea(g, this.galleryState, form);
    else if (act === 'fight') fightIt(g, this.galleryState, form, events);
    else if (act === 'ride') rideIt(g, this.galleryState, form, events);
    else if (act === 'withIt') fightWithIt(g, this.galleryState, form, events);
    else this.session.input.summon = makeCompanion(g, this.galleryState, form, events); // called at your side
    this.handleEvents(events);
  }

  /** In the test gallery every battle ends with the team healed. */
  private onBattleOver(on: boolean): void {
    if (!on && this.session.gallery) healAll(this.state);
  }

  /** Back to the title menu: saved, then the page starts again from the menu (nothing of this game left running). */
  private onToTitle(): void {
    this.save();
    this.switching = true;
    window.location.reload();
  }

  /** A wild beast touched you or your weapon hit it: the sea stops and the battle opens. */
  private openBattle(): void {
    if (!this.state.beasts.battle || this.session.inBattle) return;
    this.save();
    this.session.inBattle = true;
    this.session.emit('battle', true);
    this.scene.pause();
    this.scene.launch('Battle', { session: this.session });
  }

  private handleEvents(events: GameEvent[]): void {
    const g = this.state;
    const v = this.views;
    const looks = { effects: v.effects, echo: v.echo, rig: v.rig, terrain: v.terrain, g };
    for (const e of events) {
      showEvent(e, looks); // bubbles, spray, dust, jolts (worldEvents.ts)
      if (e.type === 'hurt') v.hurtFlash = 0.5;
      else if (e.type === 'battleStart') this.openBattle();
      else if (
        e.type === 'gateOpened' ||
        e.type === 'fishCaught' ||
        e.type === 'tamed' ||
        e.type === 'relicFound' ||
        e.type === 'beastKo' ||
        e.type === 'wreckOpened' ||
        e.type === 'swarmBound' ||
        e.type === 'missionComplete'
      )
        this.save();
      else if (e.type === 'respawned') v.rig.follow(g.diver.x, g.diver.y, 0, true);
      else if (e.type === 'sonarPing') this.session.sound.sonarPing();
      else if (e.type === 'chargeWarn') this.session.sound.chargeWarn();
      else if (e.type === 'engineStarted' || e.type === 'engineStopped') {
        const near =
          e.vehicle === 'boat'
            ? 1
            : (engineHeard({ ...g.ship, engineOn: true }, g.diver, 0, ENGINE_SOUND.ship.hearRange)?.near ??
              0);
        this.session.sound.engineStartStop(e.type === 'engineStarted', near);
      } else if (e.type === 'rescued' && g.ship.aboard) v.ship.towed(g.ship);
      else if (e.type === 'portArrived') {
        const port: GameEvent[] = [];
        enterPort(g, port);
        if (port.length) this.session.emit('gameEvents', port);
        this.save();
        this.session.emit('openPort');
      }
    }
    if (events.length) this.session.emit('gameEvents', events);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    const g = this.state;
    const input = this.session.input;
    const sound = this.session.sound;
    if (this.session.tapScreen) {
      const dpr = this.scale.width / Math.max(1, this.sys.game.canvas.clientWidth);
      input.shotAt = this.views.rig.toWorld(this.session.tapScreen.x * dpr, this.session.tapScreen.y * dpr);
      this.session.tapScreen = null;
    }
    const dashBefore = g.diver.dashTime;
    g.beasts.view = this.views.rig.worldView(); // beasts come out of the dark only off screen
    const events = stepGame(g, input, dt);
    consumePresses(input);
    this.handleEvents(events);
    // the radar's parking sensor: beeps for an obstacle ahead, the closer the more often (ship/radar.ts)
    const ahead = g.ship.aboard ? obstacleAhead(g) : null;
    if (ahead === null) this.beepT = 0;
    else if ((this.beepT -= dt) <= 0) {
      sound.radarBeep();
      this.beepT = beepEvery(ahead);
    }
    const d = g.diver;
    // a hunter stalking you: the battle music rises while it waits and charges (beasts/stalk.ts)
    sound.stalkTension(g.beasts.wilds.some((w) => !!w.stalk && w.stalk.phase !== 'away'));
    sound.updateSea(
      {
        // in a vehicle you do not swim: no bubbles (the engines sound instead)
        speed: d.dead || inVehicle(g) ? 0 : Math.min(1, Math.hypot(d.vx, d.vy) / DIVER.maxSpeed),
        depthM: depthMetres(d.y),
        dash: d.dashTime > 0 && dashBefore <= 0,
        km: kmFromCoast(d.x),
      },
      dt,
    );
    const lever = input.helm;
    const shipSound = engineHeard(g.ship, d, lever.throttle, ENGINE_SOUND.ship.hearRange);
    sound.updateEngines(
      shipSound?.level ?? null,
      g.sub.aboard ? Math.max(lever.throttle, Math.abs(lever.dive)) : boatEngineLevel(g.boat, lever.throttle),
      shipSound?.near ?? 0,
    );

    this.saveTimer += dt;
    if (this.saveTimer >= SAVE.autosaveSeconds) {
      this.saveTimer = 0;
      // not while a broken vehicle is sinking: a moment later it is back in its hold
      if (!d.dead && !g.beasts.battle && !g.boat.sinkT && !g.sub.sinkT) this.save();
    }

    this.views.update(
      g,
      input,
      dt,
      (loud) => sound.thunder(loud),
      (rain) => sound.setRain(rain),
    );
  }
}

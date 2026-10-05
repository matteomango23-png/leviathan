// World: runs the game step and draws the sea. No rules live here, only wiring and drawing.
import Phaser from 'phaser';
import { CAMERA, DIVER, SAVE } from '../data/diver';
import type { GameEvent } from '../systems/events';
import { applySave, createGame, enterPort, stepGame, toSave, type GameState } from '../systems/game';
import { diverModifiers } from '../systems/economy/gear';
import { lampAim } from '../systems/submarine';
import { consumePresses } from '../systems/input';
import type { SaveData } from '../systems/save/saveData';
import { startNewGame, storyHoldsDiver } from '../systems/story';
import {
  backupBrokenSave,
  loadFromStorage,
  startOverInStorage,
  swapWithPreviousGame,
  writeToStorage,
} from '../systems/save/storage';
import { createBirds, stepBirds, type BirdsState } from '../systems/birds';
import { coldAt, skipWeather, stepWeather, weatherLook, weatherName } from '../systems/weather';
import { generateWorld } from '../systems/world/worldGen';
import { depthMetres, murkAt } from '../systems/world/zones';
import { DELTA, WORLD } from '../data/worldLayout';
import { SHIP } from '../data/ship';
import { inVehicle } from '../systems/vehicles';
import { ShipView } from '../views/shipView';
import { HuntView } from '../views/huntView';
import { BackgroundView } from '../views/backgroundView';
import { BeastsLayer } from '../views/beastsLayer';
import { CameraRig } from '../views/cameraRig';
import { DiverView } from '../views/diverView';
import { EffectsView } from '../views/effectsView';
import { FishView } from '../views/fishView';
import { GearFxView } from '../views/gearFxView';
import { PlacesView } from '../views/placesView';
import { KelpView } from '../views/kelpView';
import { VentView } from '../views/ventView';
import { TempleView } from '../views/templeView';
import { WorldArtView } from '../views/worldArtView';
import { SubmarineView } from '../views/submarineView';
import { LightView } from '../views/lightView';
import { StoryView } from '../views/storyView';
import { Chapter3View } from '../views/chapter3View';
import { Chapter4View } from '../views/chapter4View';
import { DeltaView } from '../views/deltaView';
import { TerrainView } from '../views/terrainView';
import { BirdsView } from '../views/birdsView';
import { WeatherView, weatherReach } from '../views/weatherView';
import type { SceneData, Session } from './session';

export class WorldScene extends Phaser.Scene {
  private session!: Session;
  private state!: GameState;
  private rig!: CameraRig;
  private bg!: BackgroundView;
  private terrain!: TerrainView;
  private kelp!: KelpView;
  private vents!: VentView;
  private temple!: TempleView;
  private worldArt!: WorldArtView;
  private sub!: SubmarineView;
  private ship!: ShipView;
  private wasAboard = false;
  private hunts!: HuntView;
  private fishView!: FishView;
  private beasts!: BeastsLayer;
  private places!: PlacesView;
  private story!: StoryView;
  private chapter3!: Chapter3View;
  private chapter4!: Chapter4View;
  private gearFx!: GearFxView;
  private diverView!: DiverView;
  private effects!: EffectsView;
  private light!: LightView;
  private weatherView!: WeatherView;
  private birdsView!: BirdsView;
  /** Weather and sea birds: look only, not part of the game state and not saved. */
  private readonly birds: BirdsState = createBirds();
  private saveTimer = 0;
  private hurtFlash = 0;
  private lampAngle = 0;

  constructor() {
    super('World');
  }

  init(data: SceneData): void {
    this.session = data.session;
  }

  create(): void {
    const map = generateWorld();
    const loaded = loadFromStorage();
    if (!loaded.ok) {
      backupBrokenSave();
      this.time.delayedCall(800, () =>
        this.session.emit('toast', `Salvataggio non leggibile (${loaded.error}). Ne ho tenuto una copia.`),
      );
    }
    this.state = createGame(map, loaded.ok ? loaded.save : null);
    if (loaded.ok && !loaded.save) startNewGame(this.state); // a brand new game begins on Aurelio's boat
    this.session.game = this.state;
    const g = this.state;
    const d = g.diver;

    this.rig = new CameraRig(this, map.width, map.height, d.x, d.y);
    const L = this.rig.layers;
    this.bg = new BackgroundView(this, L.bg);
    this.terrain = new TerrainView(this, L.world, map);
    this.places = new PlacesView(this, L.world, g.wrecks);
    this.story = new StoryView(this, L.world);
    this.chapter3 = new Chapter3View(this, L.world);
    this.chapter4 = new Chapter4View(this, L.world);
    new DeltaView(this, L.world, L.front);
    this.kelp = new KelpView(this, L.world, L.front, map);
    this.vents = new VentView(this, L.world);
    this.temple = new TempleView(this, L.world);
    this.worldArt = new WorldArtView(this, L.world, map);
    this.ship = new ShipView(this, L.world);
    this.hunts = new HuntView(this, L.world);
    this.sub = new SubmarineView(this, L.world);
    this.fishView = new FishView(this, L.world, g.fish);
    this.beasts = new BeastsLayer(this, L.world, g);
    this.birdsView = new BirdsView(this, L.world);
    this.diverView = new DiverView(this, L.world);
    this.effects = new EffectsView(this, L.world);
    this.gearFx = new GearFxView(this, L.world);
    this.light = new LightView(this, L.overlay);
    this.weatherView = new WeatherView(this, L.bg, L.overlay);
    this.lampAngle = d.aim;

    this.rig.follow(d.x + d.face * CAMERA.lookAhead, d.y, 0, true);
    this.wasAboard = this.state.ship.aboard; // a game saved at the helm starts there, with no glide
    this.terrain.update(this.rig.worldView(), true);

    this.scale.on('resize', this.onResize, this);
    this.session.on('importSave', this.onImport, this);
    this.session.on('saveNow', this.save, this);
    this.session.on('switchGame', this.onSwitchGame, this);
    this.session.on('skipWeather', this.onSkipWeather, this);
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') this.save();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', this.save);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.session.off('importSave', this.onImport, this);
      this.session.off('saveNow', this.save, this);
      this.session.off('switchGame', this.onSwitchGame, this);
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
    this.rig.resize(size.width, size.height);
    this.terrain.update(this.rig.worldView(), true);
  }

  /** Set when leaving this game: nothing may be saved over the new choice any more. */
  private switching = false;

  private readonly save = (): void => {
    if (this.switching) return;
    writeToStorage(toSave(this.state, new Date()));
  };

  /** New game or back to the previous one: the storage is switched, then the game starts again from it. */
  private onSwitchGame(to: 'new' | 'previous'): void {
    this.save();
    const ok = to === 'new' ? startOverInStorage() : swapWithPreviousGame();
    if (!ok) {
      this.session.emit('toast', 'Non riesco a cambiare partita: la memoria del browser è bloccata.');
      return;
    }
    this.switching = true;
    window.location.reload();
  }

  private onImport(save: SaveData): void {
    applySave(this.state, save);
    writeToStorage(toSave(this.state, new Date()));
    const d = this.state.diver;
    this.rig.follow(d.x, d.y, 0, true);
    this.terrain.invalidateTiles(this.state.brokenTiles);
    this.terrain.update(this.rig.worldView(), true);
    this.session.emit('toast', 'Salvataggio caricato.');
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
    for (const e of events) {
      if (e.type === 'bubble') this.effects.bubble(e.x, e.y);
      else if (e.type === 'dash')
        for (let i = 0; i < 5; i++) this.effects.bubble(e.x + Math.random() * 8 - 4, e.y);
      else if (e.type === 'hurt') {
        this.hurtFlash = 0.5;
        this.rig.shake();
      } else if (e.type === 'harpoonHitRock') this.effects.puff(e.x, e.y, 3, 0x9aaaaa, 30);
      else if (e.type === 'battleStart') this.openBattle();
      else if (e.type === 'bonesBroken' || e.type === 'gateOpened') {
        this.terrain.invalidateTiles(e.tiles);
        const dust = e.type === 'gateOpened' ? 0x8a9488 : 0xd8ccb0;
        for (const i of e.tiles.slice(0, 6))
          this.effects.puff(g.map.tileOf(i).tx * 8 + 4, g.map.tileOf(i).ty * 8 + 4, 3, dust, 60);
        this.rig.shake();
        if (e.type === 'gateOpened') this.save();
      } else if (
        e.type === 'fishCaught' ||
        e.type === 'tamed' ||
        e.type === 'relicFound' ||
        e.type === 'beastKo'
      )
        this.save();
      else if (e.type === 'beastGulp') {
        // a mouthful of fish: silver scales and bubbles burst from its jaws
        this.effects.puff(e.x, e.y, Math.min(12, 4 + e.count), 0xcfdde4, 26);
        for (let i = 0; i < Math.min(10, e.count); i++)
          this.effects.bubble(e.x + Math.random() * 12 - 6, e.y + Math.random() * 6 - 3);
      } else if (e.type === 'subRammed') {
        // a blow on the hull: a light jolt and a few bubbles (owner, 4 ottobre: much lighter than before)
        this.rig.shake(e.by === 'beast' ? 0.45 : 0.2);
        this.effects.puff(e.x, e.y, 2, 0x2a2b2e, 10);
        for (let i = 0; i < 3; i++) this.effects.bubble(e.x + Math.random() * 12 - 6, e.y - 4);
      } else if (e.type === 'respawned') this.rig.follow(g.diver.x, g.diver.y, 0, true);
      else if (e.type === 'tilesChanged') this.terrain.invalidateTiles(e.tiles);
      else if (e.type === 'iceCracked' && Math.random() < 0.3)
        this.effects.puff(e.x, WORLD.surfaceY + 2, 3, 0xe6f2f8, 20 + e.speed * 0.2);
      else if (e.type === 'hatchMoved') this.rig.shake(0.15);
      else if (e.type === 'sonarPing') this.session.sound.sonarPing();
      else if (e.type === 'rescued' && g.ship.aboard) this.ship.towed(g.ship);
      else if (e.type === 'portArrived') {
        const port: GameEvent[] = [];
        enterPort(g, port);
        if (port.length) this.session.emit('gameEvents', port);
        this.save();
        this.session.emit('openPort');
      } else if (e.type === 'wreckOpened' || e.type === 'swarmBound' || e.type === 'missionComplete')
        this.save();
    }
    if (events.length) this.session.emit('gameEvents', events);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    const g = this.state;
    const input = this.session.input;
    if (this.session.tapScreen) {
      const dpr = this.scale.width / Math.max(1, this.sys.game.canvas.clientWidth);
      input.shotAt = this.rig.toWorld(this.session.tapScreen.x * dpr, this.session.tapScreen.y * dpr);
      this.session.tapScreen = null;
    }
    const dashBefore = g.diver.dashTime;
    const events = stepGame(g, input, dt);
    consumePresses(input);
    this.handleEvents(events);
    const d0 = g.diver;
    this.session.sound.updateSea(
      {
        // in a vehicle you do not swim: no bubbles (the engines sound instead)
        speed: d0.dead || inVehicle(g) ? 0 : Math.min(1, Math.hypot(d0.vx, d0.vy) / DIVER.maxSpeed),
        depthM: depthMetres(d0.y),
        dash: d0.dashTime > 0 && dashBefore <= 0,
      },
      dt,
    );
    const lever = input.helm;
    this.session.sound.updateEngines(
      g.ship.aboard ? lever.throttle : null,
      g.sub.aboard ? Math.max(lever.throttle, Math.abs(lever.dive)) : null,
    );

    this.saveTimer += dt;
    if (this.saveTimer >= SAVE.autosaveSeconds) {
      this.saveTimer = 0;
      if (!g.diver.dead && !g.beasts.battle) this.save();
    }

    const d = g.diver;
    const ship = g.ship;
    // climbing aboard, diving off, going down or up the ramp: one smooth glide of zoom and position together
    // (owner, 5 ottobre: two separate easings made the ship look as if it slid sideways; a cut was too abrupt)
    if (ship.aboard !== this.wasAboard) this.rig.startBlend();
    this.wasAboard = ship.aboard;
    if (ship.aboard) {
      // at the helm: a wider view on the ship, looking ahead where it sails
      const C = SHIP.camera;
      this.rig.setView(C.viewHeightUnits, C.minY, dt);
      this.rig.follow(ship.x + ship.face * C.lookAhead * (ship.speed / SHIP.maxSpeed), C.y, dt);
    } else {
      this.rig.setView(CAMERA.viewHeightUnits, CAMERA.minY, dt);
      const ahead = g.beasts.riding ? CAMERA.lookAhead * 2 : CAMERA.lookAhead;
      this.rig.follow(d.x + d.face * ahead, d.y, dt);
    }
    const view = this.rig.worldView();
    const info = this.rig.viewInfo();
    this.terrain.update(view);
    if (stepWeather(g.weather, dt)) this.weatherView.lightning(info);
    const sky = weatherLook(g.weather);
    for (const s of stepBirds(
      this.birds,
      dt,
      { x: view.centerX, halfW: view.width / 2 },
      sky.birds,
      sky.wind,
      g.fish.schools,
    ))
      this.effects.puff(s.x, s.y, 5, 0xd8e6ee, 18);
    this.bg.update(info, g.time, sky);
    this.kelp.update(view, g.time);
    this.vents.update(view, g.time);
    this.temple.update(view, g, g.time);
    this.worldArt.update(view);
    this.ship.update(g.ship, g.time, dt, sky.waves);
    this.hunts.update(g, view, g.time);
    this.sub.update(g.sub, g.time, dt, g.ship.bay === 'docked' && g.ship.hatch < 0.6);
    this.fishView.update(g.fish, view, g.time, dt);
    this.beasts.update(g, g.time);
    const rider = this.beasts.riderPose(g);
    this.diverView.update(d, g.harpoon, input.fireHeld ? input.aim : null, dt, g.time, rider);
    this.birdsView.update(this.birds, view);
    this.effects.update(view, g.time, dt, sky.waves);
    this.places.update(g.gear, g.time);
    this.story.update(g.story, g.chapter2.anchors, g.time);
    this.chapter3.update(g, g.time);
    this.chapter4.update(g, g.time);
    this.diverView.setHidden(storyHoldsDiver(g) || inVehicle(g)); // at the helm or inside the submarine
    this.gearFx.update(g, rider ?? d, g.time);

    let da = lampAim(g) - this.lampAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.lampAngle += da * Math.min(1, dt * 6);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const lowO2 =
      d.o2 < d.maxO2 * DIVER.oxygen.lowFraction && !d.dead ? 0.25 + 0.18 * Math.sin(g.time * 6) : 0;
    const fade = d.dead ? Phaser.Math.Clamp(1.4 - d.deadTime * 0.6, 0, 1) : 0;
    const lamp = rider ?? d;
    const glows = [
      ...this.places.glowSpots(g.gear),
      ...this.story.glowSpots(g.story, g.chapter2.anchors),
      ...this.chapter3.glowSpots(g),
      ...this.beasts.glowSpots(g),
      ...this.ship.glowSpots(g.ship),
    ];
    const mods = diverModifiers(g.gear);
    const murk = murkAt(info.cx, info.cy);
    this.light.update(
      info,
      {
        x: lamp.x,
        y: lamp.y,
        angle: this.lampAngle,
        face: d.face,
        // no lamp while sitting on the boat; shorter in murky water
        lengthMult:
          storyHoldsDiver(g) || g.ship.aboard ? 0 : mods.coneMult * (1 - (1 - DELTA.murk.lampMult) * murk),
        widthMult: mods.coneWidthMult,
      },
      Math.max(this.hurtFlash, lowO2),
      fade,
      glows,
      murk,
      sky.dim * weatherReach(info.cy),
    );
    this.weatherView.update(info, sky, coldAt(info.cx), g.time, dt);
  }
}

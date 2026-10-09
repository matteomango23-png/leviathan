// World: runs the game step and draws the sea. No rules live here, only wiring and drawing.
import Phaser from 'phaser';
import { turbidityAt } from '../systems/clarity';
import { SeaSurfaceView } from '../views/seaSurfaceView';
import { lampOf } from '../systems/lamp';
import { NightmareView } from '../views/nightmareView';
import { reconOut } from '../systems/ship/gadgets';
import { CAMERA, DIVER, SAVE } from '../data/diver';
import { ENGINE_SOUND } from '../data/audio';
import { engineHeard, hatchT } from '../systems/ship/ship';
import { boatBay, subBay } from '../systems/ship/model';
import { boatEngineLevel } from '../systems/boat';
import { BoatView } from '../views/boatView';
import type { GameEvent } from '../systems/events';
import { applySave, createGame, enterPort, stepGame, toSave, type GameState } from '../systems/game';
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
import { depthMetres } from '../systems/world/zones';
import { kmFromCoast } from '../systems/world/stretches';
import { WORLD } from '../data/worldLayout';
import { inVehicle } from '../systems/vehicles';
import { ShipView } from '../views/shipView';
import { atHelmView, cameraAim } from '../systems/shipCamera';
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
import { SceneryView } from '../views/sceneryView';
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
  private boat!: BoatView;
  private ship!: ShipView;
  private helmView = false;
  private hunts!: HuntView;
  private fishView!: FishView;
  private beasts!: BeastsLayer;
  private places!: PlacesView;
  private story!: StoryView;
  private gearFx!: GearFxView;
  private diverView!: DiverView;
  private effects!: EffectsView;
  private light!: LightView;
  private weatherView!: WeatherView;
  private nightmare!: NightmareView;
  private surface!: SeaSurfaceView;
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
    new SceneryView(this, L.world);
    new DeltaView(this, L.world, L.front);
    this.kelp = new KelpView(this, L.world, L.front, map);
    this.vents = new VentView(this, L.world);
    this.temple = new TempleView(this, L.world);
    this.worldArt = new WorldArtView(this, L.world, map);
    this.surface = new SeaSurfaceView(this, L.world); // behind the vehicles that ride its waves
    this.ship = new ShipView(this, L.world);
    this.hunts = new HuntView(this, L.world);
    this.boat = new BoatView(this, L.world);
    this.sub = new SubmarineView(this, L.world);
    this.nightmare = new NightmareView(this, L.world);
    this.fishView = new FishView(this, L.world, g.fish);
    this.beasts = new BeastsLayer(this, L.world, g);
    this.birdsView = new BirdsView(this, L.world);
    this.diverView = new DiverView(this, L.world);
    this.effects = new EffectsView(this, L.world);
    this.gearFx = new GearFxView(this, L.world);
    this.light = new LightView(this, L.overlay);
    this.weatherView = new WeatherView(this, L.bg, L.overlay);
    this.lampAngle = d.aim;

    const aim0 = cameraAim(this.state, CAMERA.lookAhead);
    this.rig.setView(aim0.viewH, aim0.minY, 0, true);
    this.rig.follow(aim0.x, aim0.y, 0, true);
    this.helmView = atHelmView(this.state);
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
      else if (e.type === 'engineStarted' || e.type === 'engineStopped') {
        const g = this.state;
        const near =
          e.vehicle === 'boat'
            ? 1
            : (engineHeard({ ...g.ship, engineOn: true }, g.diver, 0, ENGINE_SOUND.ship.hearRange)?.near ??
              0);
        this.session.sound.engineStartStop(e.type === 'engineStarted', near);
      } else if (e.type === 'rescued' && g.ship.aboard) this.ship.towed(g.ship);
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
        km: kmFromCoast(d0.x),
      },
      dt,
    );
    const lever = input.helm;
    const shipSound = engineHeard(g.ship, g.diver, lever.throttle, ENGINE_SOUND.ship.hearRange);
    this.session.sound.updateEngines(
      shipSound?.level ?? null,
      g.sub.aboard ? Math.max(lever.throttle, Math.abs(lever.dive)) : boatEngineLevel(g.boat, lever.throttle),
      shipSound?.near ?? 0,
    );

    this.saveTimer += dt;
    if (this.saveTimer >= SAVE.autosaveSeconds) {
      this.saveTimer = 0;
      if (!g.diver.dead && !g.beasts.battle) this.save();
    }

    const d = g.diver;
    // the helm's view or yours (systems/shipCamera.ts): a change cuts at once behind a short fade, never a glide
    // (owner, 5 ottobre: any glide made the ship slide sideways)
    const helmView = atHelmView(g);
    const cut = helmView !== this.helmView;
    this.helmView = helmView;
    if (cut) this.rig.fadeCut(CAMERA.cutFadeMs);
    const aim = cameraAim(g, g.beasts.riding ? CAMERA.lookAhead * 2 : CAMERA.lookAhead);
    this.rig.setView(aim.viewH, aim.minY, dt, true);
    this.rig.follow(aim.x, aim.y, dt, cut);
    const view = this.rig.worldView();
    const info = this.rig.viewInfo();
    this.terrain.update(view);
    const under = Math.max(0, Math.min(1, depthMetres(g.diver.y) / 20)); // under water the weather is muffled
    if (stepWeather(g.weather, dt)) {
      this.weatherView.lightning(info);
      this.session.sound.thunder(1 - under * 0.7);
    }
    const sky = weatherLook(g.weather);
    this.session.sound.setRain(sky.precip * (1 - under));
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
    this.surface.update(view, g.time, sky, sky.clouds);
    this.ship.update(g.ship, g.time, dt, sky);
    this.hunts.update(g, view, g.time);
    this.boat.update(
      g.boat,
      g.time,
      g.boat.bay === 'docked' && hatchT(g.ship, boatBay(g.ship)) < 0.6,
      sky,
      dt,
    );
    // the drone away on its round is drawn by the Nightmare's view, not in the hold
    const inHold = g.ship.bay === 'docked' && (hatchT(g.ship, subBay(g.ship)) < 0.6 || reconOut(g));
    this.sub.update(g.sub, g.time, dt, inHold);
    this.nightmare.update(g, g.time);
    this.fishView.update(g.fish, view, g.time, dt);
    // murky water (clarity.ts): the beasts far from you are dark shapes
    const murkHere = turbidityAt(d.x, d.y, g.time, sky);
    this.beasts.update(g, g.time, { murk: murkHere, x: d.x, y: d.y });
    const rider = this.beasts.riderPose(g);
    this.diverView.update(d, g.harpoon, input.fireHeld ? input.aim : null, dt, g.time, rider);
    this.birdsView.update(this.birds, view);
    this.effects.update(g.time, dt);
    this.places.update(g.gear, g.time);
    this.story.update(g.story);
    this.diverView.setHidden(storyHoldsDiver(g) || inVehicle(g)); // at the helm or inside the submarine
    this.gearFx.update(g, rider ?? d, g.time);

    let da = lampAim(g) - this.lampAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    // the boat's headlight turns with it at once (owner, 8 ottobre: "direttamente"), the diver's lamp gently
    this.lampAngle += g.boat.aboard ? da : da * Math.min(1, dt * 6);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const lowO2 =
      d.o2 < d.maxO2 * DIVER.oxygen.lowFraction && !d.dead ? 0.25 + 0.18 * Math.sin(g.time * 6) : 0;
    const fade = d.dead ? Phaser.Math.Clamp(1.4 - d.deadTime * 0.6, 0, 1) : 0;
    const glows = [
      ...this.places.glowSpots(g.gear),
      ...this.beasts.glowSpots(g),
      ...this.ship.glowSpots(g.ship),
      ...this.nightmare.glowSpots(g),
    ];
    const murk = turbidityAt(info.cx, info.cy, g.time, sky);
    this.light.update(
      info,
      { ...lampOf(g, rider, murk), angle: this.lampAngle, face: d.face },
      Math.max(this.hurtFlash, lowO2),
      fade,
      glows,
      murk,
      sky.dim * weatherReach(info.cy),
    );
    this.weatherView.update(info, sky, coldAt(info.cx), g.time, dt);
  }
}

// World: runs the game step and draws the sea. No rules live here, only wiring and drawing.
import Phaser from 'phaser';
import { SANCTUARY_RULES } from '../data/beasts';
import { CAMERA, DIVER, SAVE } from '../data/diver';
import type { GameEvent } from '../systems/events';
import { applySave, createGame, enterPort, stepGame, toSave, type GameState } from '../systems/game';
import { diverModifiers } from '../systems/economy/gear';
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
import { generateWorld } from '../systems/world/worldGen';
import { depthMetres, murkAt } from '../systems/world/zones';
import { DELTA } from '../data/worldLayout';
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
import { BoatView } from '../views/boatView';
import { LightView } from '../views/lightView';
import { SanctuaryView } from '../views/sanctuaryView';
import { StoryView } from '../views/storyView';
import { DeltaView } from '../views/deltaView';
import { TerrainView } from '../views/terrainView';
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
  private boat!: BoatView;
  private fishView!: FishView;
  private beasts!: BeastsLayer;
  private sanctuaries!: SanctuaryView;
  private places!: PlacesView;
  private story!: StoryView;
  private gearFx!: GearFxView;
  private diverView!: DiverView;
  private effects!: EffectsView;
  private light!: LightView;
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
    this.sanctuaries = new SanctuaryView(this, L.world, g.sanctuaries);
    this.places = new PlacesView(this, L.world, g.wrecks);
    this.story = new StoryView(this, L.world);
    new DeltaView(this, L.world, L.front);
    this.kelp = new KelpView(this, L.world, L.front, map);
    this.vents = new VentView(this, L.world);
    this.temple = new TempleView(this, L.world);
    this.worldArt = new WorldArtView(this, L.world, map);
    this.boat = new BoatView(this, L.world);
    this.fishView = new FishView(this, L.world, g.fish);
    this.beasts = new BeastsLayer(this, L.world, g);
    this.diverView = new DiverView(this, L.world);
    this.effects = new EffectsView(this, L.world);
    this.gearFx = new GearFxView(this, L.world);
    this.light = new LightView(this, L.overlay);
    this.lampAngle = d.aim;

    this.rig.follow(d.x + d.face * CAMERA.lookAhead, d.y, 0, true);
    this.terrain.update(this.rig.worldView(), true);

    this.scale.on('resize', this.onResize, this);
    this.session.on('importSave', this.onImport, this);
    this.session.on('saveNow', this.save, this);
    this.session.on('switchGame', this.onSwitchGame, this);
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
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', this.save);
    });
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
        e.type === 'sanctuaryReached' ||
        e.type === 'beastKo'
      )
        this.save();
      else if (e.type === 'respawned') this.rig.follow(g.diver.x, g.diver.y, 0, true);
      else if (e.type === 'portArrived') {
        enterPort(g);
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
        speed: d0.dead ? 0 : Math.min(1, Math.hypot(d0.vx, d0.vy) / DIVER.maxSpeed),
        depthM: depthMetres(d0.y),
        dash: d0.dashTime > 0 && dashBefore <= 0,
      },
      dt,
    );

    this.saveTimer += dt;
    if (this.saveTimer >= SAVE.autosaveSeconds) {
      this.saveTimer = 0;
      if (!g.diver.dead && !g.beasts.battle) this.save();
    }

    const d = g.diver;
    const ahead = g.beasts.riding ? CAMERA.lookAhead * 2 : CAMERA.lookAhead;
    this.rig.follow(d.x + d.face * ahead, d.y, dt);
    const view = this.rig.worldView();
    const info = this.rig.viewInfo();
    this.terrain.update(view);
    this.bg.update(info, g.time);
    this.sanctuaries.update(g.sanctuaries, g.time);
    this.kelp.update(view, g.time);
    this.vents.update(view, g.time);
    this.temple.update(view, g, g.time);
    this.worldArt.update(view);
    this.boat.update(g.boat, g.diver.face, g.time);
    this.fishView.update(g.fish, view, g.time, dt);
    this.beasts.update(g, g.time);
    const rider = this.beasts.riderPose(g);
    this.diverView.update(d, g.harpoon, input.fireHeld ? input.aim : null, dt, g.time, rider);
    this.effects.update(view, g.time, dt);
    this.places.update(g.gear, g.time);
    this.story.update(g.story, g.chapter2.anchors, g.time);
    this.diverView.setHidden(storyHoldsDiver(g) || g.boat.aboard); // aboard, the boat view draws you
    this.gearFx.update(g, rider ?? d, g.time);

    let da = d.aim - this.lampAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.lampAngle += da * Math.min(1, dt * 6);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    const lowO2 =
      d.o2 < d.maxO2 * DIVER.oxygen.lowFraction && !d.dead ? 0.25 + 0.18 * Math.sin(g.time * 6) : 0;
    const fade = d.dead ? Phaser.Math.Clamp(1.4 - d.deadTime * 0.6, 0, 1) : 0;
    const lamp = rider ?? d;
    const glows = [
      ...g.sanctuaries.list.map((s) => ({ x: s.x, y: s.y, r: SANCTUARY_RULES.radius * 1.4 })),
      ...this.places.glowSpots(g.gear),
      ...this.story.glowSpots(g.story, g.chapter2.anchors),
      ...this.beasts.glowSpots(g),
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
        lengthMult: storyHoldsDiver(g) ? 0 : mods.coneMult * (1 - (1 - DELTA.murk.lampMult) * murk),
        widthMult: mods.coneWidthMult,
      },
      Math.max(this.hurtFlash, lowO2),
      fade,
      glows,
      murk,
    );
  }
}
